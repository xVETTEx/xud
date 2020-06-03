type market {
    id: string,
    symbol: string,
    base: string,
    quote: string,
    baseId: string,
    quoteId: string,
    active: boolean,
    precision: presicion,
    limits: limits,
}

type precision {
    price: float,
    amount: int,
    cost: int,
}

type limits {
    amount: amount,
    price: int,
    cost: int,
}

type amount {
    min: int,
    max: int,
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
            'min': 0,  
            'max': 1000,  //tällä hetkellä jossai saattaa olla max jopa?
        },
        'price': { ... }, // same min/max limits for the price of the order
        'cost':  { ... }, // same limits for order cost = price * amount
    },
    'info':      { ... }, // ei varmaan mitään tähän?
}

type currency {
    id: stirng,
    code: string,
    name: string,
    active: boolean,
    fee: float,
    precision: int,
    limits: cyrrency_limits,
    
}

type currency_limita {
    amount: amoun,
    price: int,
    cost: int,
    withdraw: int,
}


function fillCurrency(currency){
    response = currency(
        id = ,
        code = ,
        name = ,
        active = ,
        fee = ,
        precision = ,
        lmiits = ,
        
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

type status {
}

function fillStatus(){
    'status': 'ok', // 'ok', 'shutdown', 'error', 'maintenance'
    'updated': undefined, // integer, last updated timestamp in milliseconds if updated via the API
    'eta': undefined, // when the maintenance or outage is expected to end
    'url': undefined, // jätetään tyhjäks
}
