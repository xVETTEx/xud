import { Arguments } from 'yargs';
import { callback, loadXudClient } from '../command';
import { Currency } from '../../proto/xudrpc_pb';
import { SwapClientType } from '../../constants/enums';

.cmd(
	name: "addcurrency",
	description: "add a currency",
	message: add_currency,
	handler: .,
)

.cmd_descriptions(
  name: "addcurrency",
  currency: "the ticker symbol for the currency",
  swap_client: "the payment channel network client for swaps",
  decimal_places: "the places to the right of the decimal point of the smallest subunit (e.g. satoshi)",
  token_address: "the contract address for tokens such as ERC20",
)

export const handler = (argv: Arguments<any>) => {
  const request = new Currency();
  request.setCurrency(argv.currency.toUpperCase());
  request.setSwapClient(Number(SwapClientType[argv.swap_client]));
  request.setTokenAddress(argv.token_address);
  request.setDecimalPlaces(argv.decimal_places);
  loadXudClient(argv).addCurrency(request, callback(argv));
};
