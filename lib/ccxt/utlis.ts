//onkohan utils sopiva nimi tälle folderille?

function getTimestamp(){
  return Date.now();
}

function getDaytime(){
  var date = new Date();
  return date.toISOString(); 
}

function getSymbol(pair string){
  //eli tää niinku tradinpair, mut ccxt:ssä kutsutaan symboliksi. ja uppercase lettereillä. BTC/LTC.
}

function getBase(pair string){
}

function getQuote(pair string){
}

function getopen(pair string, timeframe string){
}

function getHighest(pair string, timeframe string){
}

function getLowest(pair string, timeframe string){
}

function getVolume(pair string, timeframe string){
}

function getPresicion(currency: string){
  //db:stä se et montako nollaa.
  curency = await this.models.Currency.findOne({ where: { //tarviiko awaittia?
        currency,
      },
    });
  //sit pitäis currencysta saada decimalPlaces
}
