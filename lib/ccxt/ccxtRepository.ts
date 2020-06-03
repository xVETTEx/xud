
//tää soittaa db:n lisäks myös serviceen ja orderbookkiin.
class ccxtRepository {
  service;
  orderbook;
  constructor(service, orderbook){
  }
  public getBalance(){
    return service.getBalance()
  }
}
