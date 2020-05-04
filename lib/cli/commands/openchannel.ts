.cmd(
  name: 'Open Channel';
  description: 'open a payment channel with a peer';
  message: open_channel;
  handler: ;
)

.cmd_descriptions(
  node_id: 'the node key or alias of the connected peer to open the channel with';
  currency: 'the ticker symbol for the currency';
  amount: 'the amount to be deposited into the channel';
)



export const handler = (argv: Arguments<any>) => {
  const request = new OpenChannelRequest();
  request.setNodeIdentifier(argv.node_identifier);
  request.setCurrency(argv.currency.toUpperCase());
  request.setAmount(coinsToSats(argv.amount));
  loadXudClient(argv).openChannel(request, callback(argv));
};
