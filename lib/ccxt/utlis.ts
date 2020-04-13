import { Models } from '../db/DB';
import { CurrencyAttributes, CurrencyInstance } from '../db/types';
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
  //pitää jotenki löytää / merkki, ja sit poistetaan / ja siitä aiemmat, ni jää base.
  pair.split("/").pop());
}

function getQuote(pair string){
  //pitää jotenki löytää / merkki ja sit poistetaan se ja sen jälkeiset ni jää quote.
  pair.split("/").shift
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
  return currency.decimalPlaces; //en tiiä toimiiko
}
