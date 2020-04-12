type orderbook {
    //pitää olla map bids ja asks objekteilla, ja valuena lista.
    list = [price, amount}; //no siis syntaksi päin vittua tässä mut ei muuta.
}

function fillFetcOrderbook(){
            //tässä vaan parhaat orderit.
    'bids': [
        [ price, amount ], // joku map pitäis kai olla, jossa price avaimena?
        ...
    ],
    'asks': [
        [ price, amount ],
        ...
    ],
    'timestamp' = Date.now() / 1000;, // Unix Timestamp in milliseconds, jostai saa kyl tän?
    'datetime': '2017-07-05T18:47:14.692Z', // josati saa tän kyl?
    'nonce': 1499280391811, // eli miten tää määräytyy tarkemmin?
}
        
function fillFetchL2Orderbook(){
        //tässä kaikki orderit siinä orderbookissa
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

type OHLCV {
  timestamp: int;
  open_price: float;
  highest_price: float;
  lowest:price: float;
  close_price: float;
  volume: int;
}

function fillOHLCV(pair, timeframe, since, limit){
    //Tääki on aika mahotonta tuottaa jos ei treidin yhteydessä tuoteta hintaa? Paitsi jos tradet säilyy ikuisesti ni niistähän saa oikeestaan hinnan.
    {
    [
        timestamp: getTimestamp();
        open_price: 
        4235.4,        // eka tänä aikana tehdyn kaupan hinta
        4240.6,        // korkein hinta jolla tehty kauppa tänä aikana
        4230.0,        // matalin hinta jollla tehty kauppa tänä aikana
        4230.7,        // vikan tänä aikana tehdyn kaupan hinta
        volume: ;    // tätä ei välttis muut ku matcherit tarjoa? Tai sit vaa omien treidien volume.
    ],
    ...
    }
}
