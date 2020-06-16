//tää pistää listenerit ku peer tai ownorder on filled.
//onko tämmönen class vaan yks vai eri joka pairille? No ainaki se joak handlaa filled eventin ni pitää olla sama kaikille? Vai osaako
//ts optimoida ite nin ettei tartte?

//mut siis tän pitää olla semmonen et toimii myös liquihin.

class stopOrders {
  function filledHandler(){
    //no pitäis toimia niin että otetaan queuesta paras hinta, jos kuuluu pistää orderbookkiin ni pistetään.
    //sit jos edellinen hinta meni ni katotaan seuraavaks paras hinta myös.
    //jos ei menny ni return.
    
    result =
    if (result == true){
      
    } 
  }
  
  function checkIfShouldPlaceOrder(price: stirng){
    queue_price = peek()
    if (queue_price == price){ //tossa ei kyllä ainakaan yhtäsuuruusmerkkiä pitäis olla.
      array = pop_array()
      //sit pitäis orderbookkiin placee yksittäin. Ja pitää oikeessa järjestyksessä laittaa. ELi siinä kun tulikin. Pitää viel tutkii et mille
      //funktiolle annetaan orderit.
    }
  }
}
