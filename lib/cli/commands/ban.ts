.cmd(
  name: 'Ban';
  description: 'ban a remote node' ;
  message: Ban;
  handler: ;
)

.cmd_descriptions(
  node_id: 'the node key or alias of the remote node to ban';
)

export const handler = (argv: Arguments<any>) => {
  const request = new BanRequest();
  request.setNodeIdentifier(argv.node_identifier);
  loadXudClient(argv).ban(request, callback(argv));
};
