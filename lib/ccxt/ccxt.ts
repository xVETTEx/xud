type market {
}

function fillMarket(symbol){
    'id':     ' btcusd',  // string literal for referencing within an exchange
    'symbol':  'BTC/USD', // uppercase string literal of a pair of currencies
    'base':    'BTC',     // uppercase string, unified base currency code, 3 or more letters
    'quote':   'USD',     // uppercase string, unified quote currency code, 3 or more letters
    'baseId':  'btc',     // any string, exchange-specific base currency id
    'quoteId': 'usd',     // any string, exchange-specific quote currency id
    'active': true,       // boolean, market status
    'precision': {        // number of decimal digits "after the dot"
        'price': 8,       // integer or float for TICK_SIZE roundingMode, might be missing if not supplied by the exchange
        'amount': 8,      // integer, might be missing if not supplied by the exchange
        'cost': 8,        // integer, very few exchanges actually have it
    },
    'limits': {           // value limits when placing orders on this market
        'amount': {
            'min': 0.01,  // order amount should be > min
            'max': 1000,  // order amount should be < max
        },
        'price': { ... }, // same min/max limits for the price of the order
        'cost':  { ... }, // same limits for order cost = price * amount
    },
    'info':      { ... }, // ei varmaan mitään tähän?
}

type currency {
}

function fillCurrency(currency){
    'id':       'btc',     // saadaan db:stä currency modelista
    'code':     'BTC',     // id vaa muutetaan uppercaseksi
    'name':     'Bitcoin', // tämmöstä tuskin xudista saa?
    'active':    true,     // varmaan aina on vaa true, ku ei palauta muita ku aktiivisia?
    'fee':       0.123    // Onko näissä mitään feetä? Tai tietty ainaki lightningis pieni fee
    'precision': 8,       // currency modelsin decimalPlaces on tää varmaan? (depends on exchange.precisionMode)
    'limits': {           // value limits when placing orders on this market
        'amount': {
            'min': 0.01,  // order amount should be > min
            'max': 1000,  // order amount should be < max
        },
        'price':    { ... }, // same min/max limits for the price of the order
        'cost':     { ... }, // same limits for order cost = price * amount
        'withdraw': { ... }, // ei taida olla limittejä
    },
    'info': { ... }, // the original unparsed currency info from the exchange
}

    
type trade {
}

function fillTrade(){
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

type status {
}

function fillStatus(){
    'status': 'ok', // 'ok', 'shutdown', 'error', 'maintenance'
    'updated': undefined, // integer, last updated timestamp in milliseconds if updated via the API
    'eta': undefined, // when the maintenance or outage is expected to end
    'url': undefined, // jätetään tyhjäks
}
