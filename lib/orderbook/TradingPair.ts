import assert from 'assert';
import FastPriorityQueue from 'fastpriorityqueue';
import { OrderingDirection } from '../constants/enums';
import Logger from '../Logger';
import { isOwnOrder, Order, OwnOrder, PeerOrder, OrderMatch, MatchingResult } from './types';
import errors from './errors';

/** A map between orders and their order ids. */
type OrderMap<T extends Order> = Map<string, T>;

type OrderSidesMaps<T extends Order> = {
  buyMap: OrderMap<T>,
  sellMap: OrderMap<T>,
};

type OrderSidesArrays<T extends Order> = {
  buyArray: T[],
  sellArray: T[],
};

type OrderSidesQueues = {
  buyQueue: FastPriorityQueue<Order>,
  sellQueue: FastPriorityQueue<Order>,
};

/**
 * Represents a single trading pair in the order book. Responsible for managing all active orders
 * and for matching orders according to their price and quantity.
 */
class TradingPair {
  /** A pair of priority queues for the buy and sell sides of this trading pair */
  public queues?: OrderSidesQueues;
  /** A map between peerPubKey and a pair of maps between active peer orders ids and orders for the buy and sell sides of this trading pair. */
  public orderMaps: Map<string, OrderSidesMaps<PeerOrder>>;
  /** Node's own address*/
  public ownAddress: string;

  constructor(private logger: Logger, public pairId: string, private nomatching = false) { //tohon own_address?
    if (!nomatching) {
      this.queues = {
        buyQueue: TradingPair.createPriorityQueue(OrderingDirection.Desc),
        sellQueue: TradingPair.createPriorityQueue(OrderingDirection.Asc),
      };
    }
    this.orders = new Map<string, OrderSidesMaps<PeerOrder>>();
    //tähän this.own_address = ;
  }

  private static createPriorityQueue = (orderingDirection: OrderingDirection): FastPriorityQueue<Order> => {
    const comparator = TradingPair.getOrdersPriorityQueueComparator(orderingDirection);
    return new FastPriorityQueue(comparator);
  }

  public static getOrdersPriorityQueueComparator = (orderingDirection: OrderingDirection) => {
    const directionComparator = orderingDirection === OrderingDirection.Asc
      ? (a: number, b: number) => a < b
      : (a: number, b: number) => a > b;

    return (a: Order, b: Order) => {
      if (a.price === b.price) {
        return a.createdAt < b.createdAt;
      } else {
        return directionComparator(a.price, b.price);
      }
    };
  }

  /**
   * Gets the quantity that can be matched between two orders.
   * @returns the smaller of the quantity between the two orders if their price matches, 0 otherwise
   */
  private static getMatchingQuantity = (buyOrder: Order, sellOrder: Order): number => {
    if (buyOrder.price >= sellOrder.price) {
      return Math.min(buyOrder.quantity, sellOrder.quantity);
    } else {
      return 0;
    }
  }

  /**
   * Splits an order by quantity into a matched portion and subtracts the matched quantity from the original order.
   * @param order the order that is being split
   * @param matchingQuantity the quantity for the split order and to subtract from the original order
   * @returns the split portion of the order with the matching quantity
   */
  private static splitOrderByQuantity = <T extends Order>(order: T, matchingQuantity: number): T => {
    assert(order.quantity > matchingQuantity, 'order quantity must be greater than matchingQuantity');

    order.quantity -= matchingQuantity;
    const matchedOrder = Object.assign({}, order, { quantity: matchingQuantity });
    return matchedOrder;
  }
  

  /**
   * Attempts to add an order for this trading pair.
   * @returns `true` if the order was added, `false` if it could not be added because there
   * already exists an order with the same order id
   */
  public addOrder = (order: Order): boolean => {
    map = getOrderMaps(order.peerPubKey)
    const map = order.isBuy ? maps.buyMap : maps.sellMap;
    if (map.has(order.id)) {
      return false;
    }
    map.set(order.id, order);
    this.logger.debug(`order added: ${JSON.stringify(order)}`);
    const queue = order.isBuy ? this.queues!.buyQueue : this.queues!.sellQueue;
    queue.add(order);
    

    return true;
  }

  /**
   * Removes all of a peer's orders.
   * @param peerPubKey the node pub key of the peer
   */
  public removeOrdersByPubkey = (pubKey?: string): PeerOrder[] => {
    // if incoming peerPubKey is undefined or empty, don't even try to find it in order queues
    if (!pubKey) return [];

    const orders = this.orderMaps.get(pubKey);
    if (!orders) return [];

    if (!this.nomatching) {
      const callback = (order: Order) => (order as PeerOrder).pubKey === pubKey; //eli mitä tää tekee?
      this.queues!.buyQueue.removeMany(callback);
      this.queues!.sellQueue.removeMany(callback);
    }

    this.peersOrders.delete(pubKey);
    return [...orders.buyMap.values(), ...orders.sellMap.values()]; //miks tommosia palautetaan? Kuka niitä tarvii?
  }
 

  /**
   * Removes all or part of an order.
   * @param quantityToRemove the quantity to remove, if undefined or if greater than or equal to the available
   * quantity then the entire order is removed
   * @returns the portion of the order that was removed, and a flag indicating whether the entire order was removed
   */
  public removeOrder = <T extends Order>(pubkey: string, orderId: string, quantityToRemove?: number): //string oikee pubkeylle?
    { order: T, fullyRemoved: boolean } => {
    assert(quantityToRemove === undefined || quantityToRemove > 0, 'quantityToRemove cannot be 0 or negative');
    maps = getOrderMaps(pubKey); //pitäsikö olla await?
    const order = maps.buyMap.get(orderId) || maps.sellMap.get(orderId);
    if (!order) {
      throw errors.ORDER_NOT_FOUND(orderId);
    }
    if (quantityToRemove && quantityToRemove < order.quantity) {
      // if quantityToRemove is below the order quantity, reduce the order quantity
      if (isOwnOrder(order)) {
        assert(quantityToRemove <= order.quantity - order.hold, 'cannot remove more than available quantity after holds');
      }
      order.quantity = order.quantity - quantityToRemove;
      this.logger.debug(`order quantity reduced by ${quantityToRemove}: ${orderId}`);
      return { order: { ...order, quantity: quantityToRemove } as T, fullyRemoved: false } ;
    } else {
      // otherwise, remove the order entirely
      if (isOwnOrder(order)) {
        assert(order.hold === 0, 'cannot remove an order with a hold'); //siis eikö sillon vaan pitäis oottaa et hold loppuu?
      }
      const map = order.isBuy ? maps.buyMap : maps.sellMap;
      map.delete(order.id); //täs poistetaan mapista
      const queue = order.isBuy ? this.queues!.buyQueue : this.queues!.sellQueue; 
      queue.remove(order); //eli täs poistetaan queuesta
      

      this.logger.debug(`order removed: ${orderId}`);
      return { order: order as T, fullyRemoved: true };
    }
  }

  private getOrderMaps = (pubkey: string): OrderMap<Order> | undefined => {
    const orderMaps = this.orderMaps.get(pubKey); //pitäsikö await olla tässä?
    if (!ordersMaps) {
        ordersMaps = {
        buyMap: new Map<string, PeerOrder>(), //onko hyvä et tos on peerOrder?
        sellMap: new Map<string, PeerOrder>(),
      };
    }
    return orderMaps;
  }

  private getOrders = <T extends Order>(lists: OrderSidesMaps<T>): OrderSidesArrays<T> => {
    //tää lienee turha funktio nykyään?
    return {
      buyArray: Array.from(lists.buyMap.values()),
      sellArray: Array.from(lists.sellMap.values()),
    };
  }

  public getOrders = (): OrderSidesArrays<PeerOrder> => { //ei välttis peerOrder? Voi olla ownOrderki?
    const res: OrderSidesArrays<PeerOrder> = { buyArray: [], sellArray: [] };
    this.orders.forEach((peerOrders) => {
      const peerOrdersArrs = this.getOrders(peerOrders);
      res.buyArray = res.buyArray.concat(peerOrdersArrs.buyArray); //okei mitä vittua tää tekee?
      res.sellArray = res.sellArray.concat(peerOrdersArrs.sellArray);
    });
    return res;
  }

  public getOrdersByPubkey = (pubkey): OrderSidesArrays<OwnOrder> => {
    //toimisko vähän samalla tavalla ku ylempi getPeerOrders?
    maps = getOrderMap(ownAddress); //onko tää nyt tommonen muoto joka pitää palauttaa?
    return maps; //tähän joku joka hakee ordermapit omalla keyllä
  }


  public getOrder = <T extends Order>(orderId: string, pubKey: string): T | undefined => { //string oikee keylle?
    maps = getOrderMap(pubKey);
    order = maps.buyMap.get(orderId) || maps.sellMap.get(orderId);
    if (!order) {
      throw errors.ORDER_NOT_FOUND(orderId, pubKey);
    }
    return order;
  }

  public addOrderHold = (orderId: string, holdAmount: number) => {
    const order = this.getOrder(orderId, ownAddress);
    assert(holdAmount > 0);
    assert(order.hold + holdAmount <= order.quantity, 'the amount of an order on hold cannot exceed the available quantity');
    order.hold += holdAmount;
    this.logger.debug(`added hold of ${holdAmount} on order ${orderId}`);
  }

  public removeOrderHold = (orderId: string, holdAmount: number) => {
    const order = this.getOrder(orderId, ownAddress);
    assert(holdAmount > 0);
    assert(order.hold >= holdAmount, 'cannot remove more than is currently on hold for an order');
    order.hold -= holdAmount;
    this.logger.debug(`removed hold of ${holdAmount} on order ${orderId}`);
  }

  /**
   * Matches an order against its opposite queue. Matched maker orders are removed immediately.
   * @returns a [[MatchingResult]] with the matches as well as the remaining, unmatched portion of the order
   */
  public match = (takerOrder: OwnOrder): MatchingResult => {
    const matches: OrderMatch[] = []; //eli tässä pidetään matcheista kirjaa.
    /** The unmatched remaining taker order, if there is still leftover quantity after matching is complete it will enter the queue. */
    let remainingOrder: OwnOrder | undefined = { ...takerOrder };

    const queue = takerOrder.isBuy ? this.queues!.sellQueue : this.queues!.buyQueue; //tässä queue jossa order on.
    const queueRemovedOrdersWithHold: OwnOrder[] = [];
    const getMatchingQuantity = (remainingOrder: OwnOrder, oppositeOrder: Order) => takerOrder.isBuy
      ? TradingPair.getMatchingQuantity(remainingOrder, oppositeOrder)
      : TradingPair.getMatchingQuantity(oppositeOrder, remainingOrder);

    // as long as we have remaining quantity to match and orders to match against, keep checking for matches
    while (remainingOrder && !queue.isEmpty()) {
      // get the best available maker order from the top of the queue
      const makerOrder = queue.peek()!; //queuesta parhaan orderin palauttaa, eli maker orderin.
      const makerAvailableQuantityOrder = isOwnOrder(makerOrder)
        ? { ...makerOrder, quantity: makerOrder.quantity - makerOrder.hold, hold: 0 }
        : makerOrder;

      const matchingQuantity = getMatchingQuantity(remainingOrder, makerAvailableQuantityOrder);
      if (matchingQuantity <= 0) {
        // there's no match with the best available maker order, so end the matching routine
        break;
      } else {
        /** Whether the maker order is fully matched and should be removed from the queue. */
        const makerFullyMatched = makerOrder.quantity === matchingQuantity;
        const makerAvailableQuantityFullyMatched = makerAvailableQuantityOrder.quantity === matchingQuantity;
        const remainingFullyMatched = remainingOrder.quantity === matchingQuantity;

        if (makerFullyMatched && remainingFullyMatched) {
          // maker & taker order quantities equal and fully matching
          matches.push({ maker: makerOrder, taker: remainingOrder });
        } else if (remainingFullyMatched) {
          // taker order quantity is not sufficient. maker order will split
          const matchedMakerOrder = TradingPair.splitOrderByQuantity(makerOrder, matchingQuantity);
          this.logger.debug(`reduced order ${makerOrder.id} by ${matchingQuantity} quantity while matching order ${takerOrder.id}`);
          matches.push({ maker: matchedMakerOrder, taker: remainingOrder });
        } else if (makerAvailableQuantityFullyMatched) {
          // maker order quantity is not sufficient. taker order will split
          const matchedTakerOrder = TradingPair.splitOrderByQuantity(remainingOrder, matchingQuantity);
          matches.push({ maker: makerAvailableQuantityOrder, taker: matchedTakerOrder });
        } else {
          assert(false, 'matchingQuantity should not be lower than both orders available quantity values');
        }

        if (remainingFullyMatched) {
          remainingOrder = undefined;
        }

        if (makerFullyMatched) {
          // maker order is fully matched, so remove it from the queue and map
          assert(queue.poll() === makerOrder);
          const map = this.getOrderMap(makerOrder)!; //haetaan map makerille jotta voidaanp oistaa se.
          map.delete(makerOrder.id); //poistetaan mapista, mutta siis maker, jos se on matchatty tän takerin kaa. Eikö pitäis poistaa myös queuesta?
          this.logger.debug(`removed order ${makerOrder.id} while matching order ${takerOrder.id}`);
        } else if (makerAvailableQuantityFullyMatched) {
          // only an own order can be fully matched for available quantity, but not fully matched in the overall
          assert(isOwnOrder(makerOrder));

          assert(queue.poll() === makerOrder);
          queueRemovedOrdersWithHold.push(makerOrder as OwnOrder);
        }
      }
    }

    // return the removed orders with hold to the queue.
    // their hold quantity might be released later
    queueRemovedOrdersWithHold.forEach(order => queue.add(order));

    return { matches, remainingOrder };
  }
}

export default TradingPair;
export { OrderSidesArrays };
