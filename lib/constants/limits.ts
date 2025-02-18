/** Mainnet order size limits denominated in satoshis. */
export const limits: { [currency: string]: number } = {
  BTC: 100000,
  LTC: 15000000,
  WETH: 5000000,
  DAI: 1000000000,
};

/** The maximum network channel sizes for each currency denominated in satoshis. */
export const maxLimits: { [currency: string]: number } = {
  BTC: 16777216, // 4294967 sat payment limit lifted as of 2019
  LTC: 16777216 * 60, // lnd uses fixed 60 to 1 btc conversion rate
  WETH: 11579208923731619542357098500868790785326998466564056403945758400791,
  DAI: 11579208923731619542357098500868790785326998466564056403945758400791,
};
