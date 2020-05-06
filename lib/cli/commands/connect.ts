.cmd(
	name: "connect",
	description: "connect to a remote node",
	message: connect,
	handler: ,
)

.cmd_descriptions(
  name: "connect",
  node_uri: "uri of remote node as [node_key]@[host]:[port]",
)

export const handler = (argv: Arguments<any>) => {
  const request = new ConnectRequest();
  request.setNodeUri(argv.node_uri);
  loadXudClient(argv).connect(request, callback(argv));
};
