import { Arguments } from 'yargs';
import { callback, loadXudClient } from '../command';
import { Currency } from '../../proto/xudrpc_pb';

export const command = 'startmatching <subscribe_orderbook_events>';

export const describe = 'start matching';

export const builder = {
  subscribe_orderbook_events: {
    description: 'does users who use matching service, can subscribe orderbook events',
    type: 'boolean', //oikee tapa merkata boolean?
  },
};

export const handler = (argv: Arguments<any>) => {
  startMatching(argv.subscribe_orderbook_events); //sinne grpc moduuliin soittaa
  const request = new Currency();
  request.setCurrency(argv.currency.toUpperCase());
  request.setSwapClient(Number(SwapClientType[argv.swap_client]));
  request.setTokenAddress(argv.token_address);
  request.setDecimalPlaces(argv.decimal_places);
  loadXudClient(argv).addCurrency(request, callback(argv));
};
