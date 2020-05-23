class Swap {
  /**
   * Handles a request from a peer to create a swap deal. Checks if the order for the requested swap
   * is available and if a route exists to determine if the request should be accepted or rejected.
   * Responds to the peer with a swap response packet containing either an accepted quantity or rejection reason.
   */
  private handleSwapRequest = async (requestPacket: SwapRequestPacket, peer: Peer) => {
    assert(requestPacket.body, 'SwapRequestPacket does not contain a body');
    assert(this.swaps, 'swaps module is disabled');
    const { rHash, proposedQuantity, orderId, pairId } = requestPacket.body!;

    if (!Swaps.validateSwapRequest(requestPacket.body!)) {
      // TODO: penalize peer for invalid swap request
      await peer.sendPacket(new SwapFailedPacket({
        rHash,
        failureReason: SwapFailureReason.InvalidSwapRequest,
      }, requestPacket.header.id));
      return;
    }

    const order = this.tryGetOwnOrder(orderId, pairId);
    if (!order) {
      await peer.sendPacket(new SwapFailedPacket({
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
      await this.repository.addOrderIfNotExists(order);

      // try to accept the deal
      const orderToAccept = {
        quantity,
        localId: order.localId,
        price: order.price,
        isBuy: order.isBuy,
      };
      const dealAccepted = await this.swaps.acceptDeal(orderToAccept, requestPacket, peer);
      if (!dealAccepted) {
        this.removeOrderHold(order.id, pairId, quantity);
      }
    } else {
      await peer.sendPacket(new SwapFailedPacket({
        rHash,
        failureReason: SwapFailureReason.OrderOnHold,
      }, requestPacket.header.id));
    }
  }
}
