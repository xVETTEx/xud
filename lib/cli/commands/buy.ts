
.cmd(
	name: "buy",
	description: "place a buy order",
	message: buy,
	handler: .,
)

export const builder = (argv: Argv) => placeOrderBuilder(argv, OrderSide.BUY);

export const handler = (argv: Arguments) => placeOrderHandler(argv, OrderSide.BUY);
