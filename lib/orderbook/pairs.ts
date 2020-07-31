
class Pairs {
  /** A map of supported currency tickers to currency instances. */
  private currencyInstances = new Map<string, CurrencyInstance>();
  /** A map of supported trading pair tickers and pair database instances. */
  private pairInstances = new Map<string, PairInstance>();
  
    /** Gets an array of supported pair ids. */
  public get pairIds() {
    return Array.from(this.pairInstances.keys());
  }

  public get currencies() {
    return this.currencyInstances;
  }
  
  private bind = () => {
    this.pool.on('packet.order', this.addPeerOrder);
    this.pool.on('packet.orderInvalidation', this.handleOrderInvalidation);
    this.pool.on('packet.swapRequest', this.handleSwapRequest);
    this.pool.on('peer.close', this.removePeerOrders);
    this.pool.on('peer.pairDropped', this.removePair);
    this.pool.on('peer.nodeStateUpdate', this.verifyPeerPairs);
    this.pool.on('peer.nodeStateUpdate', this.checkPeerCurrencies);
  }
  
  private removePair = (peerPubKey: string, pairId: string) => {
    const tp = this.getTradingPair(pairId);
    const orders = tp.removeOrdersByPubkey(peerPubKey);
    orders.forEach((order) => {
      this.emit('peerOrder.invalidation', order);
    });
  }
  
  private checkPeerCurrencies = (peer: Peer) => {
    const advertisedCurrencies = peer.getAdvertisedCurrencies();

    advertisedCurrencies.forEach((advertisedCurrency) => {
      if (!this.isPeerCurrencySupported(peer, advertisedCurrency)) {
        peer.disableCurrency(advertisedCurrency);
      } else {
        peer.enableCurrency(advertisedCurrency);
      }
    });
  }
  
   /**
   * Verifies the advertised trading pairs of a peer. Checks that the peer has advertised
   * lnd pub keys for both the base and quote currencies for each pair, and optionally attempts a
   * "sanity swap" for each currency which is a 1 satoshi for 1 satoshi swap of a given currency
   * that demonstrates that we can both accept and receive payments for this peer.
   * @param pairIds the list of trading pair ids to verify
   */
  private verifyPeerPairs = async (peer: Peer) => {
    /** An array of inactive trading pair ids that don't involve a disabled currency for this peer. */
    const pairIdsToVerify = peer.advertisedPairs.filter((pairId) => {
      if (peer.isPairActive(pairId)) {
        return false; // don't verify a pair that is already active
      }
      const [baseCurrency, quoteCurrency] = pairId.split('/');
      const peerCurrenciesEnabled = !peer.disabledCurrencies.has(baseCurrency)
        && !peer.disabledCurrencies.has(quoteCurrency);
      const ownCurrenciesConnected = this.swaps.swapClientManager.isConnected(baseCurrency)
        && this.swaps.swapClientManager.isConnected(quoteCurrency);
      return peerCurrenciesEnabled && ownCurrenciesConnected;
    });

    // identify the unique currencies we need to verify for specified trading pairs
    /** A map between currencies we are verifying and whether the currency is swappable. */
    const currenciesToVerify = new Map<string, boolean>();
    pairIdsToVerify.forEach((pairId) => {
      const [baseCurrency, quoteCurrency] = pairId.split('/');
      if (!peer.isCurrencyActive(baseCurrency)) {
        currenciesToVerify.set(baseCurrency, true);
      }
      if (!peer.isCurrencyActive(quoteCurrency)) {
        currenciesToVerify.set(quoteCurrency, true);
      }
    });

    currenciesToVerify.forEach(async (_, currency) => {
      const canRoute = await this.swaps.swapClientManager.canRouteToPeer(peer, currency);
      if (!canRoute) {
        // don't attempt to verify if we can use a currency if a route to peer is impossible
        currenciesToVerify.set(currency, false);
      }
    });

    // activate verified currencies
    currenciesToVerify.forEach((swappable, currency) => {
      if (swappable) {
        peer.activateCurrency(currency);
      }
    });

    // activate pairs that have both currencies active
    const activationPromises: Promise<void>[] = [];
    pairIdsToVerify.forEach((pairId) => {
      const [baseCurrency, quoteCurrency] = pairId.split('/');
      if (peer.isCurrencyActive(baseCurrency) && peer.isCurrencyActive(quoteCurrency)) {
        activationPromises.push(peer.activatePair(pairId));
      }
    });
    await Promise.all(activationPromises);
  }
  
  public getCurrencyAttributes(currency: string) {
    const currencyInstance = this.currencyInstances.get(currency);
    return currencyInstance ? currencyInstance.toJSON() : undefined;
  }

  public addPair = async (pair: Pair) => {
    const pairId = derivePairId(pair);
    if (this.pairInstances.has(pairId)) {
      throw errors.PAIR_ALREADY_EXISTS(pairId);
    }
    if (!this.currencyInstances.has(pair.baseCurrency)) {
      throw errors.CURRENCY_DOES_NOT_EXIST(pair.baseCurrency);
    }
    if (!this.currencyInstances.has(pair.quoteCurrency)) {
      throw errors.CURRENCY_DOES_NOT_EXIST(pair.quoteCurrency);
    }

    const pairInstance = await this.repository.addPair(pair);
    this.pairInstances.set(pairInstance.id, pairInstance);
    this.tradingPairs.set(pairInstance.id, new TradingPair(this.logger, pairInstance.id, this.nomatching)); //own_address pitäis kai kertoo?

    this.pool.updatePairs(this.pairIds);
    return pairInstance;
  }

  public addCurrency = async (currency: CurrencyFactory) => {
    if (this.currencyInstances.has(currency.id)) {
      throw errors.CURRENCY_ALREADY_EXISTS(currency.id);
    }
    if (currency.swapClient === SwapClientType.Raiden && !currency.tokenAddress) {
      throw errors.CURRENCY_MISSING_ETHEREUM_CONTRACT_ADDRESS(currency.id);
    }
    const currencyInstance = await this.repository.addCurrency({ ...currency, decimalPlaces: currency.decimalPlaces || 8 });
    this.currencyInstances.set(currencyInstance.id, currencyInstance);
    this.swaps.swapClientManager.add(currencyInstance);
  }

  public removeCurrency = async (currencyId: string) => {
    const currency = this.currencyInstances.get(currencyId);
    if (currency) {
      for (const pair of this.pairInstances.values()) {
        if (currencyId === pair.baseCurrency || currencyId === pair.quoteCurrency) {
          throw errors.CURRENCY_CANNOT_BE_REMOVED(currencyId, pair.id);
        }
      }
      this.currencyInstances.delete(currencyId);
      this.swaps.swapClientManager.remove(currencyId);
      await currency.destroy();
    } else {
      throw errors.CURRENCY_DOES_NOT_EXIST(currencyId);
    }
  }

  public removePair = (pairId: string) => {
    const pair = this.pairInstances.get(pairId);
    if (!pair) {
      throw errors.PAIR_DOES_NOT_EXIST(pairId);
    }

    this.pairInstances.delete(pairId);
    this.tradingPairs.delete(pairId);

    this.pool.updatePairs(this.pairIds);
    return pair.destroy();
  }
  
    /**
   * Checks that a currency advertised by a peer is known to us, has a swap client identifier,
   * and that their token identifier matches ours.
   */
  private isPeerCurrencySupported = (peer: Peer, currency: string) => {
    const currencyAttributes = this.getCurrencyAttributes(currency);
    if (!currencyAttributes) {
      return false; // we don't know about this currency
    }

    if (!peer.getIdentifier(currencyAttributes.swapClient, currency)) {
      return false; // peer did not provide a swap client identifier for this currency
    }

    // ensure that our token identifiers match
    const ourTokenIdentifier = this.pool.getTokenIdentifier(currency);
    const peerTokenIdentifier = peer.getTokenIdentifier(currency);
    return ourTokenIdentifier === peerTokenIdentifier;
  }
  
   /** Loads the supported pairs and currencies from the database. */
  public init = async () => {
    const [pairs, currencies] = await Promise.all([this.repository.getPairs(), this.repository.getCurrencies()]);

    currencies.forEach(currency => this.currencyInstances.set(currency.id, currency));
    pairs.forEach((pair) => {
      this.pairInstances.set(pair.id, pair);
      this.tradingPairs.set(pair.id, new TradingPair(this.logger, pair.id, this.nomatching));
    });

    this.pool.updatePairs(this.pairIds);
  }
}
