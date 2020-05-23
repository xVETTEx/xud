class localId {
  private idMaps: new Map<string, string>
  private orderbook: Orderbook;
  private ownAddress: OwnAddress;
  
  constructor(orderbook, ownAddress)
    this.orderbook = orderbook;
    this.ownAddress = OwnAddress;
  }
  
  //tänne funktiot jotka generoi globalin id:n localille, ja globalista localin?
  //jossain vaiheessa pitäis poistaakki sit ku orderiki poistettu?
  public GetownOrderByLocalId = async (localId: string) => {
    const orderIdentifier = this.localIdMap.get(localId);
    if (!orderIdentifier) {
      throw errors.LOCAL_ID_DOES_NOT_EXIST(localId);
    }
    const order = orderbook.getOrder(orderIdentifier.id, orderIdentifier.pairId, this.OwnAddress);
    return order;
  }
  
  public AddOwnOrderByLocalId = async (order: OwnOrder) => {
    this.localIdMap.set(order.localId, { id: order.id, pairId: order.pairId });
    orderbook.AddOrder(order)
    this.emit('ownOrder.added', order); //miks pitää erikseen emittaa et ownOrder added?
    const outgoingOrder = OrderBook.createOutgoingOrder(order);
    this.pool.broadcastOrder(outgoingOrder);
  }
  
  public RemoveOwnOrderByLocalId = async (localId: string, quantityToRemove?: number) => {
    const order = this.getOwnOrderByLocalId(localId);
    QuantityToRemove = quantityToRemove || order.quantity; //kyl removeOrderki vois tän tehdä?
    removeOrder = orderbook.removeOrder(order.id, order.pairId, this.OwnAddress, QuantityToRemove); //ei saa olla async, 
    //ettei poisteta localId:tä liian aikasin. Ku saattaa olla kesken swappi.
    this.localIdMap.delete(removeResult.order.localId);
    this.pool.broadcastOrderInvalidation(removeResult.order, takerPubKey);
  }
}
