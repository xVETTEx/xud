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

type orderbook {
}

function fillOrderbook(){
    'bids': [
        [ price, amount ], // joku map pitäis kai olla, jossa price avaimena?
        [ price, amount ],
        ...
    ],
    'asks': [
        [ price, amount ],
        [ price, amount ],
        ...
    ],
    'timestamp' = Date.now() / 1000;, // Unix Timestamp in milliseconds, jostai saa kyl tän?
    'datetime': '2017-07-05T18:47:14.692Z', // josati saa tän kyl?
    'nonce': 1499280391811, // eli miten tää määräytyy tarkemmin?
}
    
type ticker {
    symbol string;
    info string;
    timestamp string;
    datetime int;
    high float;
    
}

function fillTicker(symbol){
    //Tuotetaan 24h ticker. Tätä ei välttis oo järkevää tuottaa ku ei ainakaa saa high tai low mitenkään. Eikä open. Volumet ois kyl mahist saada, joten ehkä tää on ihan järkevä.
    symbol: getSymbol(symbol);  
    'info':        { the original non-modified unparsed reply from exchange API },
    timestamp: getTimestamp();
    datetime: getDatetime();
    'high':          float, // haetaan vaan kaikki treidit 24h ajalta ja katotaan korkein hinta
    'low':           float, // haetaan vaan kaikki treidit 24h ajalta ja katotaan matalin hinta
    'bid':           float, // orderbookista haetaan paras hinta
    'bidVolume':     float, // orderbookista haetaan amountti paljon on parhaalla hinnalla
    'ask':           float, // orderbookista haetaan paras hnita
    'askVolume':     float, // orderbookista haetaan amountti paljon on parhaalla hinnalla
    'vwap':          float, // volume weighed average price
    'open':          float, // lista joka oli ku tää 24h aikajakso alko
    'close':         float, // viimisimmän tehdyn traden hinta
    'last':          float, // same as `close`, duplicated for convenience
    'previousClose': float, // closing price for the previous period
    'change':        float, // absolute change, `last - open`
    'percentage':    float, // relative change, `(change/open) * 100`
    'average':       float, // average price, `(last + open) / 2`
    'baseVolume':    float, // volume of base currency traded for last 24 hours
    'quoteVolume':   float, // volume of quote currency traded for last 24 hours
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

type OHLCV {
}

function fillOHLCV(){
    //Tääki on aika mahotonta tuottaa jos ei treidin yhteydessä tuoteta hintaa? Paitsi jos tradet säilyy ikuisesti ni niistähän saa oikeestaan hinnan.
    {
    [
        1504541580000, // jostai utc timestamppi
        4235.4,        // eka tänä aikana tehdyn kaupan hinta
        4240.6,        // korkein hinta jolla tehty kauppa tänä aikana
        4230.0,        // matalin hinta jollla tehty kauppa tänä aikana
        4230.7,        // vikan tänä aikana tehdyn kaupan hinta
        37.72941911    // lasketaan yhteen sinä aikana tässä symbolissa tehtyjen treidien amountit.
    ],
    ...
    }
}
