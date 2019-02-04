import assert from 'assert';
import uuidv1 from 'uuid/v1';
import { EventEmitter } from 'events';
import OrderBookRepository from './OrderBookRepository';
import TradingPair from './TradingPair';
import errors from './errors';
import Pool from '../p2p/Pool';
import Peer from '../p2p/Peer';
import Logger from '../Logger';
import { ms, derivePairId } from '../utils/utils';
import { Models } from '../db/DB';
import Swaps from '../swaps/Swaps';
import { SwapRole, SwapFailureReason, SwapPhase } from '../constants/enums';
import { CurrencyInstance, PairInstance, CurrencyFactory } from '../db/types';
import { Pair, OrderIdentifier, OwnOrder, OrderPortion, OwnLimitOrder, PeerOrder, Order, PlaceOrderEvent,
  PlaceOrderEventType, PlaceOrderResult, OutgoingOrder, OwnMarketOrder, isOwnOrder, IncomingOrder } from './types';
import { SwapRequestPacket, SwapFailedPacket } from '../p2p/packets';
import { SwapSuccess, SwapDeal } from 'lib/swaps/types';
import Bluebird from 'bluebird';

interface OrderBook {
  /** Adds a listener to be called when a remote order was added. */
  on(event: 'peerOrder.incoming', listener: (order: PeerOrder) => void): this;
  /** Adds a listener to be called when all or part of a remote order was invalidated and removed */
  on(event: 'peerOrder.invalidation', listener: (order: OrderPortion) => void): this;
  /** Adds a listener to be called when all or part of a remote order was filled by an own order and removed */
  on(event: 'peerOrder.filled', listener: (order: OrderPortion) => void): this;
  /** Adds a listener to be called when all or part of a local order was swapped and removed, after it was filled and executed remotely */
  on(event: 'ownOrder.swapped', listener: (order: OrderPortion) => void): this;
  /** Adds a listener to be called when all or part of a local order was filled by an own order and removed */
  on(event: 'ownOrder.filled', listener: (order: OrderPortion) => void): this;
  /** Adds a listener to be called when a local order was added */
  on(event: 'ownOrder.added', listener: (order: OwnOrder) => void): this;

  /** Notifies listeners that a remote order was added */
  emit(event: 'peerOrder.incoming', order: PeerOrder): boolean;
  /** Notifies listeners that all or part of a remote order was invalidated and removed */
  emit(event: 'peerOrder.invalidation', order: OrderPortion): boolean;
  /** Notifies listeners that all or part of a remote order was filled by an own order and removed */
  emit(event: 'peerOrder.filled', order: OrderPortion): boolean;
  /** Notifies listeners that all or part of a local order was swapped and removed, after it was filled and executed remotely */
  emit(event: 'ownOrder.swapped', order: OrderPortion): boolean;
  /** Notifies listeners that all or part of a local order was filled by an own order and removed */
  emit(event: 'ownOrder.filled', order: OrderPortion): boolean;
  /** Notifies listeners that a local order was added */
  emit(event: 'ownOrder.added', order: OwnOrder): boolean;
}

/** A class representing an orderbook containing all orders for all active trading pairs. */
class OrderBook extends EventEmitter {
  /** A map of supported currency tickers to currency instances. */
  public currencies = new Map<string, CurrencyInstance>();
  /** A map of supported trading pair tickers and pair database instances. */
  public pairs = new Map<string, PairInstance>();

  /** A map between active trading pair ids and trading pair instances. */
  public tradingPairs = new Map<string, TradingPair>();
  /** A map between own orders local id and their global id. */
  private localIdMap = new Map<string, OrderIdentifier>();

  private repository: OrderBookRepository;

  /** Max time for placeOrder iterations (due to swaps failures retries). */
  private static readonly MAX_PLACEORDER_ITERATIONS_TIME = 10000; // 10 sec

  /** Gets an array of supported pair ids. */
  public get pairIds() {
    return Array.from(this.pairs.keys());
  }

  constructor(private logger: Logger, models: Models, public nomatching = false, private pool?: Pool, private swaps?: Swaps) {
    super();

    this.repository = new OrderBookRepository(logger, models);

    this.bindPool();
    this.bindSwaps();
  }

  private static createOutgoingOrder = (order: OwnOrder): OutgoingOrder => {
    const { createdAt, localId, initialQuantity, hold, ...outgoingOrder } = order;
    return outgoingOrder ;
  }

  private bindPool = () => {
    if (this.pool) {
      this.pool.on('packet.order', this.addPeerOrder);
      this.pool.on('packet.orderInvalidation', this.handleOrderInvalidation);
      this.pool.on('packet.getOrders', this.sendOrders);
      this.pool.on('packet.swapRequest', this.handleSwapRequest);
      this.pool.on('peer.close', this.removePeerOrders);
      this.pool.on('peer.pairDropped', this.removePeerPair);
    }
  }

  private bindSwaps = () => {
    if (this.swaps) {
      this.swaps.on('swap.paid', async (swapSuccess) => {
        if (swapSuccess.role === SwapRole.Maker) {
          const { orderId, pairId, quantity, peerPubKey } = swapSuccess;

          // we must remove the amount that was put on hold while the swap was pending for the remaining order
          this.removeOrderHold(orderId, pairId, quantity);

          await this.persistTrade(swapSuccess.quantity, this.getOwnOrder(swapSuccess.orderId, swapSuccess.pairId), undefined, swapSuccess.rHash);
          this.removeOwnOrder(orderId, pairId, quantity, peerPubKey);
          this.emit('ownOrder.swapped', { pairId, quantity, id: orderId });
        }
      });
      this.swaps.on('swap.failed', (deal) => {
        if (deal.role === SwapRole.Maker && (deal.phase === SwapPhase.SwapAgreed || deal.phase === SwapPhase.SendingAmount)) {
          // if our order is the maker and the swap failed after it was agreed to but before it was executed
          // we must release the hold on the order that we set when we agreed to the deal
          this.removeOrderHold(deal.orderId, deal.pairId, deal.quantity!);
        }
      });
    }
  }

  /** Loads the supported pairs and currencies from the database. */
  public init = async () => {
    const promises: PromiseLike<any>[] = [this.repository.getPairs(), this.repository.getCurrencies()];
    const results = await Promise.all(promises);
    const pairs = results[0] as PairInstance[];
    const currencies = results[1] as CurrencyInstance[];

    currencies.forEach(currency => this.currencies.set(currency.id, currency));
    pairs.forEach((pair) => {
      this.pairs.set(pair.id, pair);
      this.tradingPairs.set(pair.id, new TradingPair(this.logger, pair.id, this.nomatching));
    });
  }

  /**
   * Get lists of buy and sell orders of peers.
   */
  public getPeersOrders = (pairId: string) => {
    const tp = this.getTradingPair(pairId);
    return tp.getPeersOrders();
  }

  /**
   * Get lists of this node's own buy and sell orders.
   */
  public getOwnOrders = (pairId: string) => {
    const tp = this.getTradingPair(pairId);
    return tp.getOwnOrders();
  }

  /** Get the trading pair instance for a given pairId, or throw an error if none exists. */
  private getTradingPair = (pairId: string): TradingPair => {
    const tp = this.tradingPairs.get(pairId);
    if (!tp) {
      throw errors.PAIR_DOES_NOT_EXIST(pairId);
    }
    return tp;
  }

  /**
   * Gets an own order by order id and pair id.
   * @returns The order matching parameters, or undefined if no order could be found.
   */
  public getOwnOrder = (orderId: string, pairId: string): OwnOrder => {
    const tp = this.getTradingPair(pairId);
    return tp.getOwnOrder(orderId);
  }

  private tryGetOwnOrder = (orderId: string, pairId: string): OwnOrder | undefined => {
    try {
      return this.getOwnOrder(orderId, pairId);
    } catch (err) {
      return;
    }
  }

  public getPeerOrder = (orderId: string, pairId: string, peerPubKey: string): PeerOrder => {
    const tp = this.getTradingPair(pairId);
    return tp.getPeerOrder(orderId, peerPubKey);
  }

  public addPair = async (pair: Pair) => {
    const pairId = derivePairId(pair);
    if (this.pairs.has(pairId)) {
      throw errors.PAIR_ALREADY_EXISTS(pairId);
    }
    if (!this.currencies.has(pair.baseCurrency)) {
      throw errors.CURRENCY_DOES_NOT_EXIST(pair.baseCurrency);
    }
    if (!this.currencies.has(pair.quoteCurrency)) {
      throw errors.CURRENCY_DOES_NOT_EXIST(pair.quoteCurrency);
    }

    const pairInstance = await this.repository.addPair(pair);
    this.pairs.set(pairInstance.id, pairInstance);
    this.tradingPairs.set(pairInstance.id, new TradingPair(this.logger, pairInstance.id, this.nomatching));

    if (this.pool) {
      this.pool.updateNodeState({ pairs: this.pairIds });
    }
    return pairInstance;
  }

  public addCurrency = async (currency: CurrencyFactory) => {
    if (this.currencies.has(currency.id)) {
      throw errors.CURRENCY_ALREADY_EXISTS(currency.id);
    }
    const currencyInstance = await this.repository.addCurrency({ ...currency, decimalPlaces: currency.decimalPlaces || 8 });
    this.currencies.set(currencyInstance.id, currencyInstance);
  }

  public removeCurrency = (currencyId: string): Bluebird<void> => {
    const currency = this.currencies.get(currencyId);
    if (currency) {
      for (const pair of this.pairs.values()) {
        if (currencyId === pair.baseCurrency || currencyId === pair.quoteCurrency) {
          throw errors.CURRENCY_CANNOT_BE_REMOVED(currencyId, pair.id);
        }
      }
      this.currencies.delete(currencyId);
      return currency.destroy();
    } else {
      throw errors.CURRENCY_DOES_NOT_EXIST(currencyId);
    }
  }

  public removePair = (pairId: string) => {
    const pair = this.pairs.get(pairId);
    if (!pair) {
      throw errors.PAIR_DOES_NOT_EXIST(pairId);
    }

    this.pairs.delete(pairId);
    this.tradingPairs.delete(pairId);

    if (this.pool) {
      this.pool.updateNodeState({ pairs: this.pairIds });
    }
    return pair.destroy();
  }

  public placeLimitOrder = async (order: OwnLimitOrder, onUpdate?: (e: PlaceOrderEvent) => void): Promise<PlaceOrderResult> => {
    const stampedOrder = this.stampOwnOrder(order);
    if (this.nomatching) {
      this.addOwnOrder(stampedOrder);
      onUpdate && onUpdate({ type: PlaceOrderEventType.RemainingOrder, payload: stampedOrder });

      return {
        internalMatches: [],
        swapSuccesses: [],
        remainingOrder: stampedOrder,
      };
    }

    return this.placeOrder(stampedOrder, false, onUpdate, Date.now() + OrderBook.MAX_PLACEORDER_ITERATIONS_TIME);
  }

  public placeMarketOrder = async (order: OwnMarketOrder, onUpdate?: (e: PlaceOrderEvent) => void): Promise<PlaceOrderResult> => {
    if (this.nomatching) {
      throw errors.MARKET_ORDERS_NOT_ALLOWED();
    }

    const stampedOrder = this.stampOwnOrder({ ...order, price: order.isBuy ? Number.MAX_VALUE : 0 });
    const addResult = await this.placeOrder(stampedOrder, true, onUpdate, Date.now() + OrderBook.MAX_PLACEORDER_ITERATIONS_TIME);
    delete addResult.remainingOrder;
    return addResult;
  }

  /**
   * Places an order in the order book. This method first attempts to match the order with existing
   * orders by price and initiate swaps for any matches with peer orders. It can be called recursively
   * for any portions of the order that fail swaps.
   * @param order the order to place
   * @param discardRemaining whether to discard any unmatched portion of the order, if `false` the
   * unmatched portion will enter the order book.
   * @param onUpdate a callback for when there are updates to the matching and order placement
   * routine including internal matches, successful swaps, failed swaps, and remaining orders
   * @param maxTime the deadline in epoch milliseconds for this method to end recursive calls
   */
  private placeOrder = async (
    order: OwnOrder,
    discardRemaining = false,
    onUpdate?: (e: PlaceOrderEvent) => void,
    maxTime?: number,
  ): Promise<PlaceOrderResult> => {
    // this method can be called recursively on swap failures retries.
    // if max time exceeded, don't try to match
    if (maxTime && Date.now() > maxTime) {
      assert(discardRemaining, 'discardRemaining must be true on recursive calls where maxTime could exceed');
      this.logger.debug(`placeOrder max time exceeded. order (${JSON.stringify(order)}) won't be fully matched`);

      // returning the remaining order to be rolled back and handled by the initial call
      return {
        internalMatches: [],
        swapSuccesses: [],
        remainingOrder: order,
      };
    }

    // perform matching routine. maker orders that are matched will be removed from the order book.
    const tp = this.getTradingPair(order.pairId);
    const matchingResult = tp.match(order);

    /** Any portion of the placed order that could not be swapped or matched internally. */
    let { remainingOrder } = matchingResult;
    /** Local orders that matched with the placed order. */
    const internalMatches: OwnOrder[] = [];
    /** Successful swaps performed for the placed order. */
    const swapSuccesses: SwapSuccess[] = [];

    /**
     * The routine for retrying a portion of the order that failed a swap attempt.
     * @param failedSwapQuantity the quantity of the failed portion to retry
     */
    const retryFailedSwap = async (failedSwapQuantity: number) => {
      this.logger.debug(`repeating matching routine for ${order.id} for failed quantity of ${failedSwapQuantity}`);
      const orderToRetry: OwnOrder = { ...order, quantity: failedSwapQuantity };

      // invoke placeOrder recursively, append matches/swaps and any remaining order
      const retryResult = await this.placeOrder(orderToRetry, true, onUpdate, maxTime);
      internalMatches.push(...retryResult.internalMatches);
      swapSuccesses.push(...retryResult.swapSuccesses);
      if (retryResult.remainingOrder) {
        if (remainingOrder) {
          remainingOrder.quantity += retryResult.remainingOrder.quantity;
        } else {
          remainingOrder = retryResult.remainingOrder;
        }
      }
    };

    /**
     * The routine for handling matches found in the order book. This can be run in parallel
     * so that all matches, including those which require swaps with peers, can be executed
     * simultaneously.
     */
    const handleMatch = async (maker: Order, taker: OwnOrder) => {
      const portion: OrderPortion = { id: maker.id, pairId: maker.pairId, quantity: maker.quantity };
      if (isOwnOrder(maker)) {
        // this is an internal match which is effectively executed immediately upon being found
        this.logger.info(`internal match executed on taker ${taker.id} and maker ${maker.id} for ${maker.quantity}`);
        portion.localId = maker.localId;
        internalMatches.push(maker);
        this.emit('ownOrder.filled', portion);
        await this.persistTrade(portion.quantity, maker, taker);
        onUpdate && onUpdate({ type: PlaceOrderEventType.InternalMatch, payload: maker });
      } else {
        // this is a match with a peer order which cannot be considered executed until after a
        // successful swap, which is an asynchronous process that can fail for numerous reasons
        if (!this.swaps) {
          // the swaps module should only be undefined during integration testing of the order book
          // in this case we treat the swap as if it failed, but without retrying the failed portion
          this.emit('peerOrder.invalidation', portion);
          return;
        }

        try {
          this.logger.debug(`matched with peer ${maker.peerPubKey}, executing swap on taker ${taker.id} and maker ${maker.id} for ${maker.quantity}`);
          const swapSuccess = await this.executeSwap(maker, taker);

          if (swapSuccess.quantity < maker.quantity) {
            // swap was only partially completed
            portion.quantity = swapSuccess.quantity;
            const rejectedQuantity = maker.quantity - swapSuccess.quantity;
            this.logger.info(`match partially executed on taker ${taker.id} and maker ${maker.id} for ${swapSuccess.quantity} ` +
              `with peer ${maker.peerPubKey}, ${rejectedQuantity} quantity not accepted and will repeat matching routine`);
            await retryFailedSwap(rejectedQuantity);
          } else {
            this.logger.info(`match executed on taker ${taker.id} and maker ${maker.id} for ${maker.quantity} with peer ${maker.peerPubKey}`);
          }
          swapSuccesses.push(swapSuccess);
          onUpdate && onUpdate({ type: PlaceOrderEventType.SwapSuccess, payload: swapSuccess });
        } catch (err) {
          this.logger.warn(`swap for ${portion.quantity} failed during order matching, will repeat matching routine for failed swap quantity`);
          onUpdate && onUpdate({ type: PlaceOrderEventType.SwapFailure, payload: maker });
          await retryFailedSwap(portion.quantity);
        }
      }
    };

    // iterate over the matches to be executed in parallel
    const matchPromises: Promise<void>[] = [];
    for (const { maker, taker } of matchingResult.matches) {
      matchPromises.push(handleMatch(maker, taker));
    }

    // wait for all matches to complete execution, any portions that cannot be executed due to
    // failed swaps will be added to the remaining order which may be added to the order book.
    await Promise.all(matchPromises);

    if (remainingOrder && !discardRemaining) {
      this.addOwnOrder(remainingOrder);
      onUpdate && onUpdate({ type: PlaceOrderEventType.RemainingOrder, payload: remainingOrder });
    }

    return {
      internalMatches,
      swapSuccesses,
      remainingOrder,
    };
  }

  /**
   * Executes a swap between maker and taker orders. Emits the `peerOrder.filled` event if the swap
   * succeeds and `peerOrder.invalidation` if the swap fails.
   */
  public executeSwap = async (maker: PeerOrder, taker: OwnOrder): Promise<SwapSuccess> => {
    // make sure the order is in the database before we begin the swap
    await this.repository.addOrderIfNotExists(maker);
    try {
      const swapSuccess = await this.swaps!.executeSwap(maker, taker);
      this.emit('peerOrder.filled', maker);
      await this.persistTrade(swapSuccess.quantity, maker, taker, swapSuccess.rHash);
      return swapSuccess;
    } catch (err) {
      this.emit('peerOrder.invalidation', maker);
      // TODO: penalize peer for failed swap? penalty severity should depend on reason for failure
      throw err;
    }
  }

  /**
   * Adds an own order to the order book and broadcasts it to peers.
   * @returns false if it's a duplicated order or with an invalid pair id, otherwise true
   */
  private addOwnOrder = (order: OwnOrder): boolean => {
    const tp = this.getTradingPair(order.pairId);
    const result = tp.addOwnOrder(order);
    assert(result, 'own order id is duplicated');

    this.localIdMap.set(order.localId, { id: order.id, pairId: order.pairId });

    this.emit('ownOrder.added', order);

    this.broadcastOrder(order);
    return true;
  }

  private persistTrade = async (quantity: number, makerOrder: Order, takerOrder?: OwnOrder, rHash?: string) => {
    const addOrderPromises = [this.repository.addOrderIfNotExists(makerOrder)];
    if (takerOrder) {
      addOrderPromises.push(this.repository.addOrderIfNotExists(takerOrder));
    }
    await Promise.all(addOrderPromises);
    await this.repository.addTrade({
      quantity,
      rHash,
      makerOrderId: makerOrder.id,
      takerOrderId: takerOrder ? takerOrder.id : undefined,
    });
  }

  /**
   * Adds an incoming peer order to the local order book. It timestamps the order based on when it
   * enters the order book and also records its initial quantity upon being received.
   * @returns `false` if it's a duplicated order or with an invalid pair id, otherwise true
   */
  private addPeerOrder = (order: IncomingOrder): boolean => {
    const tp = this.tradingPairs.get(order.pairId);
    if (!tp) {
      // TODO: penalize peer
      return false;
    }

    const stampedOrder: PeerOrder = { ...order, createdAt: ms(), initialQuantity: order.quantity };

    if (!tp.addPeerOrder(stampedOrder)) {
      this.logger.debug(`incoming peer order is duplicated: ${order.id}`);
      // TODO: penalize peer
      return false;
    }

    this.emit('peerOrder.incoming', stampedOrder);

    return true;
  }

  /**
   * Removes an order from the order book by its local id. Throws an error if the specified pairId
   * is not supported or if the order to cancel could not be found.
   * @returns any quantity of the order that was on hold and could not be immediately removed.
   */
  public removeOwnOrderByLocalId = (localId: string) => {
    const orderIdentifier = this.localIdMap.get(localId);
    if (!orderIdentifier) {
      throw errors.LOCAL_ID_DOES_NOT_EXIST(localId);
    }

    const order = this.getOwnOrder(orderIdentifier.id, orderIdentifier.pairId);
    if (order.hold) {
      let remainingHold = order.hold;
      // we can't remove the entire order as some of it is on hold, start by removing any available portion
      this.logger.debug(`can't remove local order ${localId} yet because it has a hold of ${order.hold}`);
      const availableQuantity = order.quantity - order.hold;
      if (availableQuantity) {
        this.removeOwnOrder(orderIdentifier.id, orderIdentifier.pairId, availableQuantity);
      }

      const cleanup = (quantity: number) => {
        remainingHold -= quantity;
        this.logger.debug(`removed hold of ${quantity} on local order ${localId}, ${remainingHold} remaining`);
        if (remainingHold === 0) {
          // we can stop listening for swaps once all holds are cleared
          this.swaps!.removeListener('swap.failed', failedHandler);
          this.swaps!.removeListener('swap.paid', paidHandler);
        }
      };

      const failedHandler = (deal: SwapDeal) => {
        if (deal.orderId === orderIdentifier.id) {
          // remove the portion that failed now that it's not on hold
          this.removeOwnOrder(orderIdentifier.id, orderIdentifier.pairId, deal.quantity!);
          cleanup(deal.quantity!);
        }
      };

      const paidHandler = (result: SwapSuccess) => {
        if (result.orderId === orderIdentifier.id) {
          cleanup(result.quantity);
        }
      };

      this.swaps!.on('swap.failed', failedHandler);
      this.swaps!.on('swap.paid', paidHandler);
    }
    this.removeOwnOrder(orderIdentifier.id, orderIdentifier.pairId);
    return order.hold;
  }

  private addOrderHold = (orderId: string, pairId: string, holdAmount: number) => {
    const tp = this.getTradingPair(pairId);
    tp.addOrderHold(orderId, holdAmount);
  }

  private removeOrderHold = (orderId: string, pairId: string, holdAmount: number) => {
    const tp = this.getTradingPair(pairId);
    tp.removeOrderHold(orderId, holdAmount);
  }

  /**
   * Removes all or part of an own order from the order book and broadcasts an order invalidation packet.
   * @param quantityToRemove the quantity to remove from the order, if undefined then the full order is removed
   * @param takerPubKey the node pub key of the taker who filled this order, if applicable
   * @returns `true` if the order or portion thereof was removed, otherwise false
   */
  private removeOwnOrder = (orderId: string, pairId: string, quantityToRemove?: number, takerPubKey?: string): boolean => {
    const tp = this.getTradingPair(pairId);
    try {
      const removeResult = tp.removeOwnOrder(orderId, quantityToRemove);
      if (removeResult.fullyRemoved) {
        const localId = (removeResult.order).localId;
        this.localIdMap.delete(localId);
      }

      if (this.pool) {
        this.pool.broadcastOrderInvalidation(removeResult.order, takerPubKey);
      }

      return true;
    } catch (err) {
      this.logger.error(`attempted to remove non-existing orderId (${orderId})`);
      return false;
    }
  }

  /**
   * Removes all or part of a peer order from the order book and emits the `peerOrder.invalidation` event.
   * @param quantityToRemove the quantity to remove from the order, if undefined then the full order is removed
   */
  public removePeerOrder = (orderId: string, pairId: string, peerPubKey?: string, quantityToRemove?: number):
    { order: PeerOrder, fullyRemoved: boolean } => {
    const tp = this.getTradingPair(pairId);
    return tp.removePeerOrder(orderId, peerPubKey, quantityToRemove);
  }

  private removePeerOrders = (peerPubKey?: string) => {
    if (!peerPubKey) {
      return;
    }

    for (const pairId of this.pairs.keys()) {
      this.removePeerPair(peerPubKey, pairId);
    }

    this.logger.debug(`removed all orders for peer ${peerPubKey}`);
  }

  private removePeerPair = (peerPubKey: string, pairId: string) => {
    const tp = this.getTradingPair(pairId);
    const orders = tp.removePeerOrders(peerPubKey);
    orders.forEach((order) => {
      this.emit('peerOrder.invalidation', order);
    });
  }

  /**
   * Send local orders to a given peer in an [[OrdersPacket].
   * @param reqId the request id of a [[GetOrdersPacket]] packet that this method is responding to
   * @param pairIds a list of trading pair ids, only orders belonging to one of these pairs will be sent
   */
  private sendOrders = async (peer: Peer, reqId: string, pairIds: string[]) => {
    const outgoingOrders: OutgoingOrder[] = [];
    this.tradingPairs.forEach((tp) => {
      // send only requested pairIds
      if (pairIds.includes(tp.pairId)) {
        const orders = tp.getOwnOrders();
        orders.buy.forEach(order => outgoingOrders.push(OrderBook.createOutgoingOrder(order)));
        orders.sell.forEach(order => outgoingOrders.push(OrderBook.createOutgoingOrder(order)));
      }
    });
    peer.sendOrders(outgoingOrders, reqId);
  }

  /**
   * Create an outgoing order and broadcast it to all peers.
   */
  private broadcastOrder = (order: OwnOrder) => {
    if (this.pool) {
      if (this.swaps && this.swaps.isPairSupported(order.pairId)) {
        const outgoingOrder = OrderBook.createOutgoingOrder(order);
        this.pool.broadcastOrder(outgoingOrder);
      }
    }
  }

  public stampOwnOrder = (order: OwnLimitOrder): OwnOrder  => {
    const id = uuidv1();
    // verify localId isn't duplicated. use global id if blank
    if (order.localId === '') {
      order.localId = id;
    } else if (this.localIdMap.has(order.localId)) {
      throw errors.DUPLICATE_ORDER(order.localId);
    }

    return { ...order, id, initialQuantity: order.quantity, createdAt: ms() };
  }

  private handleOrderInvalidation = (oi: OrderPortion, peerPubKey: string) => {
    try {
      const removeResult = this.removePeerOrder(oi.id, oi.pairId, peerPubKey, oi.quantity);
      this.emit('peerOrder.invalidation', removeResult.order);
    } catch {
      this.logger.error(`failed to remove order (${oi.id}) of peer ${peerPubKey}`);
      // TODO: Penalize peer
    }
  }

  /**
   * Handles a request from a peer to create a swap deal. Checks if the order for the requested swap
   * is available and if a route exists to determine if the request should be accepted or rejected.
   * Responds to the peer with a swap response packet containing either an accepted quantity or rejection reason.
   */
  private handleSwapRequest = async (requestPacket: SwapRequestPacket, peer: Peer)  => {
    assert(requestPacket.body, 'SwapRequestPacket does not contain a body');
    assert(this.swaps, 'swaps module is disabled');
    const { rHash, proposedQuantity, orderId, pairId } = requestPacket.body!;

    if (!Swaps.validateSwapRequest(requestPacket.body!)) {
      // TODO: penalize peer for invalid swap request
      peer.sendPacket(new SwapFailedPacket({
        rHash,
        failureReason: SwapFailureReason.InvalidSwapRequest,
      }, requestPacket.header.id));
      return;
    }

    const order = this.tryGetOwnOrder(orderId, pairId);
    if (!order) {
      peer.sendPacket(new SwapFailedPacket({
        rHash,
        failureReason: SwapFailureReason.OrderNotFound,
      }, requestPacket.header.id));
      return;
    }

    const availableQuantity = order.quantity - order.hold;
    if (availableQuantity > 0) {
      /** The quantity of the order that we will accept */
      const quantity = Math.min(proposedQuantity, availableQuantity);

      this.addOrderHold(order.id, pairId, quantity);

      // try to accept the deal
      const orderToAccept = {
        quantity,
        localId: order.localId,
        price: order.price,
        isBuy: order.isBuy,
      };
      const dealAccepted = await this.swaps!.acceptDeal(orderToAccept, requestPacket, peer);
      if (dealAccepted) {
        await this.repository.addOrderIfNotExists(order);
      } else {
        this.removeOrderHold(order.id, pairId, quantity);
      }
    } else {
      peer.sendPacket(new SwapFailedPacket({
        rHash,
        failureReason: SwapFailureReason.OrderOnHold,
      }, requestPacket.header.id));
    }
  }
}

export default OrderBook;
