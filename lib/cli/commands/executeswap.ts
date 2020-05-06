

const displaySwapSuccess = (swap: SwapSuccess.AsObject) => {
  const table = new Table() as VerticalTable;
  const obj: any = swap;
  Object.keys(obj).forEach((key: any) => {
    table.push({ [key]: obj[key] });
  });
  console.log(colors.underline(colors.bold('\nSwap success result:')));
  console.log(table.toString());
};

.cmd(
	name: "executeswap",
	description: "",
	message: execute_swap,
	handler: ,
)

.cmd_descriptions(
  name: executeswap,
  quantity: "the quantity to swap; the whole order will be swapped if unspecified",
)


export const handler = (argv: Arguments<any>) => {
  const request = new ExecuteSwapRequest();
  request.setOrderId(argv.order_id);
  request.setPairId(argv.pair_id);
  if (argv.quantity) {
    request.setQuantity(coinsToSats(argv.quantity));
  }
  loadXudClient(argv).executeSwap(request, callback(argv, displaySwapSuccess));
};
