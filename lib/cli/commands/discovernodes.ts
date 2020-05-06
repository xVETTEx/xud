import { callback, loadXudClient } from '../command';
import { Arguments } from 'yargs';
import { DiscoverNodesRequest } from '../../proto/xudrpc_pb';

.cmd(
	name: "discovernodes",
	description: "discover nodes from a specific peer",
	message: order,
	handler: .add_order,
)

.cmd_descriptions(
  name: "discovernodes",
  node_id: "the node key or alias of the connected peer to discover nodes from",
)

export const handler = (argv: Arguments<any>) => {
  const request = new DiscoverNodesRequest();
  request.setNodeIdentifier(argv.node_identifier);
  loadXudClient(argv).discoverNodes(request, callback(argv));
};
