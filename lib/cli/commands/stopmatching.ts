import { Arguments } from 'yargs';
import { callback, loadXudClient } from '../command';
import { Currency } from '../../proto/xudrpc_pb';

export const command = 'stopmatching';

export const describe = 'stop matching';

export const builder = {
  //tarviiko tätä tyhjänä ollenkaan?
};

export const handler = (argv: Arguments<any>) => {
  stopMatching() //sinne grpc:ssä olevaan soitetaan?
  const request = new Currency();
  request.setCurrency(argv.currency.toUpperCase());
  request.setSwapClient(Number(SwapClientType[argv.swap_client]));
  request.setTokenAddress(argv.token_address);
  request.setDecimalPlaces(argv.decimal_places);
  loadXudClient(argv).addCurrency(request, callback(argv));
};
