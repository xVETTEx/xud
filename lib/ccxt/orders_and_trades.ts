type Order {
  {
    'id':                '12345-67890:09876/54321', // string
    'datetime':          '2017-08-17 12:42:48.000', // ISO8601 datetime of 'timestamp' with milliseconds
    'timestamp':          1502962946216, // order placing/opening Unix timestamp in milliseconds
    'lastTradeTimestamp': 1502962956216, // Unix timestamp of the most recent trade on this order
    'status':     'open',         // 'open', 'closed', 'canceled'
    'symbol':     'ETH/BTC',      // symbol
    'type':       'limit',        // 'market', 'limit'
    'side':       'buy',          // 'buy', 'sell'
    'price':       0.06917684,    // float price in quote currency
    'amount':      1.5,           // ordered amount of base currency
    'filled':      1.1,           // filled amount of base currency
    'remaining':   0.4,           // remaining amount to fill
    'cost':        0.076094524,   // 'filled' * 'price' (filling price used where available)
    'trades':    [ ... ],         // a list of order trades/executions
    'fee': {                      // fee info, if available
        'currency': 'BTC',        // which currency the fee is (usually quote)
        'cost': 0.0009,           // the fee amount in that currency
        'rate': 0.002,            // the fee rate (if available)
    },
    'info': { ... },              // the original unparsed order structure as is
}
}

function fetchOrder(){
}

function fetchOrders(){
}

function fetchOpenOrders(){
}

function fetchClosedOrders(){
}

function createOrder(){
}

function createMarketBuyOrder(){
}

function createMarketSellOrder(){
}

function createLimitBuyOrder(){
}

function createLimitSellOrder(){
}

function cancelOrder(){
}

type trade {
}

function fillMyTrades(){
    'info':         { ... },                    // ei varmaa tämmöstä oo
    'id':           '12345-67890:09876/54321',  // onko tämmösiä? Jos ei oo ni voisko tän generoida sillai et orderId + orderId = tradeId?
    'timestamp':    1502962946216,              // 
    'datetime':     '2017-08-17 12:42:48.000',  // 
    'symbol':       'ETH/BTC',                  // symbol
    'order':        '12345-67890:09876/54321',  // string order id or undefined/None/null
    'type':         'limit',                    // order type, 'market', 'limit' or undefined/None/null
    'side':         'buy',                      // direction of the trade, 'buy' or 'sell'
    'takerOrMaker': 'taker',                    // string, 'taker' or 'maker'
    'price':        0.06917684,                 // float price in quote currency
    'amount':       1.5,                        // amount of base currency
    'cost':         0.10376526,                 // total cost (including fees), `price * amount`
    'fee':          {                           // provided by exchange or calculated by ccxt
        'cost':  0.0015,                        // eikö tähän voida paymentchanneleista kattoo et paljonko fee oli?
        'currency': 'ETH',                      // usually base currency for buys, quote currency for sells
        'rate': 0.002,                          // ei kai mitään kiinteää fee ratea?
    },
}

function fillFetchTrades(){
}
