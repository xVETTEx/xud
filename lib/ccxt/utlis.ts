import { Models } from '../db/DB';
import { CurrencyAttributes, CurrencyInstance } from '../db/types';
function getTimestamp(){
  return Date.now();
}

function getDaytime(){
  var date = new Date();
  return date.toISOString(); 
}

function getSymbol(pair: string){
  //eli tää niinku tradinpair, mut ccxt:ssä kutsutaan symboliksi. ja uppercase lettereillä. BTC/LTC.
  return pair.toUpperCase();
}

function getBase(pair: string){ //pitäiskö palauttaa uppercase vai lowercase?
  //pitää jotenki löytää / merkki, ja sit poistetaan / ja siitä aiemmat, ni jää base.
  return pair.split("/").pop());
}

function getQuote(pair: string){ //pitäiskö palauttaa uppercase vai lowercase?
  //pitää jotenki löytää / merkki ja sit poistetaan se ja sen jälkeiset ni jää quote.
  return pair.split("/").shift
}

function getCode(currency: string){
  return currency.toUpperCase()
}

function getName(currency: string){
  //niinku BTC pitäis muuttaa muotoon Bitcoin
}

function getTrades(pair: string, timeframe: string){
  //tietylle aikavälille hakee kaikki tämän symbolin treidit. Palauttaa arrayn niistä, jossa aika järjestyksessä.
  trades = await this.models.Trade.findAll({ where: { //tarviiko awaittia?
        currency, //jotain tähän
      },
    });
}

function getOpen(pair: string, timeframe: string){
  trades = getTrades();
  return trades.shift(); //mut pitäis viel vaan hinta palauttaa.
}

function getHigh(pair: string, timeframe: string){ //timeframe sekunteina
}

function getLow(pair: string, timeframe: string){ //timeframe sekunteina
}

function getClose(pair: string, timeframe: string)}
  trades = getTrades();
  return trades.pop(); //pitäis viel vaan hinta palauttaa
}

function getVolume(pair: string, timeframe: string){
}

function getPresicion(currency: string){
  //db:stä se et montako nollaa.
  curency = await this.models.Currency.findOne({ where: { //tarviiko awaittia?
        currency,
      },
    });
  return currency.decimalPlaces; //en tiiä toimiiko
}
