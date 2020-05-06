import { Arguments } from 'yargs';
import { callback, loadXudClient } from '../command';
import { AddPairRequest } from '../../proto/xudrpc_pb';

.cmd(
	name: "addpair",
	description: "add a trading pair",
	message: add_pair,
	handler: ,
)

.cmd_descriptions(
  name: "addpair",
  base_currency: "the currency bought and sold for this trading pair",
  quote_currency: "the currency used to quote a price",
)

export const handler = (argv: Arguments<any>) => {
  const request = new AddPairRequest();
  request.setBaseCurrency(argv.base_currency.toUpperCase());
  request.setQuoteCurrency(argv.quote_currency.toUpperCase());
  loadXudClient(argv).addPair(request, callback(argv));
};
