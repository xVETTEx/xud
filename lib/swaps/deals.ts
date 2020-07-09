//tää pitää kirjaa käynnissä olevista diileistä.

class deals {
  array deals;
  public addDeal(deal: SwapDeal) => {
    this.deals.set(deal.rHash, deal);
    this.usedHashes.add(deal.rHash); //mut onko toi lista nyt vääräs paikas?
    this.logger.debug(`New deal: ${JSON.stringify(deal)}`);
  }
  
  public getDeal(rHash: string): SwapDeal | undefined => {
    return this.deals.get(rHash);
  }
  
  public removeDeal(){
  }
  
  public setDealPhase(deal: SwapDeal, newPhase: SwapPhase){
    assert(deal.state === SwapState.Active, 'deal is not Active. Can not change deal phase');
    switch (newPhase) {
      case SwapPhase.SwapCreated:
        assert(false, 'can not set deal phase to SwapCreated.');
        break;
      case SwapPhase.SwapRequested:
        assert(deal.role === SwapRole.Taker, 'SwapRequested can only be set by the taker');
        assert(deal.phase === SwapPhase.SwapCreated, 'SwapRequested can be only be set after SwapCreated');
        this.logger.debug(`Requesting deal: ${JSON.stringify(deal)}`);
        break;
      case SwapPhase.SwapAccepted:
        assert(deal.role === SwapRole.Maker, 'SwapAccepted can only be set by the maker');
        assert(deal.phase === SwapPhase.SwapCreated, 'SwapAccepted can be only be set after SwapCreated');
        break;
      case SwapPhase.SendingPayment:
        assert(deal.role === SwapRole.Taker && deal.phase === SwapPhase.SwapRequested ||
          deal.role === SwapRole.Maker && deal.phase === SwapPhase.SwapAccepted,
            'SendingPayment can only be set after SwapRequested (taker) or SwapAccepted (maker)');
        deal.executeTime = Date.now();
        break;
      case SwapPhase.PaymentReceived:
        assert(deal.phase === SwapPhase.SendingPayment, 'PaymentReceived can be only be set after SendingPayment');
        this.logger.debug(`Payment received for deal with payment hash ${deal.rPreimage}`);
        break;
      case SwapPhase.SwapCompleted:
        assert(deal.phase === SwapPhase.PaymentReceived, 'SwapCompleted can be only be set after PaymentReceived');
        deal.completeTime = Date.now();
        deal.state = SwapState.Completed;
        this.logger.debug(`Swap completed. preimage = ${deal.rPreimage}`);
        break;
      default:
        assert.fail('unknown deal phase');
        break;
    }
    deal.phase = newPhase;

    if (deal.phase !== SwapPhase.SwapCreated && deal.phase !== SwapPhase.SwapRequested) {
      // once a deal is accepted, we persist its state to the database on every phase update
      await this.persistDeal(deal);
    }

    if (deal.phase === SwapPhase.PaymentReceived) {
      const wasMaker = deal.role === SwapRole.Maker;
      const swapSuccess = {
        orderId: deal.orderId,
        localId: deal.localId,
        pairId: deal.pairId,
        quantity: deal.quantity!,
        amountReceived: wasMaker ? deal.makerAmount : deal.takerAmount,
        amountSent: wasMaker ? deal.takerAmount : deal.makerAmount,
        currencyReceived: wasMaker ? deal.makerCurrency : deal.takerCurrency,
        currencySent: wasMaker ? deal.takerCurrency : deal.makerCurrency,
        rHash: deal.rHash,
        rPreimage: deal.rPreimage,
        price: deal.price,
        peerPubKey: deal.peerPubKey,
        role: deal.role,
      };
      this.emit('swap.paid', swapSuccess);

      clearTimeout(this.timeouts.get(deal.rHash));
      this.timeouts.delete(deal.rHash);
  }
  
}
