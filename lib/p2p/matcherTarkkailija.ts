class matcherTarkkailija {

  bindPool = () => {
    this.pool.on('packet.newOrderEvent', );
    this.pool.on('packet.orderInvalidationEvent', );
    this.pool.on('packet.swapRequestEvent', );
    this.pool.on('packet.swapFailed', );
    this.pool.on('packet,swapCompleted', );
  }
}
