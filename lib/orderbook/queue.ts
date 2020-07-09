//ainaki stop price ja liqu price queueiden käyttöön täs helpper funktiot. Ehkä tää vois perus queueenki toimia?
//sen kuka ttä käyttää ni pitää joka pairille luoda queue.
//voisko tää olla nii et se kuka tänne soittaa ni luo jokaiselle pairille ja pubkeylle oman queuen?

/** A map between orders and their order ids. */
type OrderMap<T extends Order> = Map<string, T>;

type OrderSidesMaps<T extends Order> = {
  buyMap: OrderMap<T>,
  sellMap: OrderMap<T>,
};

type OrderSidesArrays<T extends Order> = {
  buyArray: T[],
  sellArray: T[],
};

type OrderSidesQueues = {
  buyQueue: FastPriorityQueue<Order>,
  sellQueue: FastPriorityQueue<Order>,
};

class gueue {
  map orders<string>; //pitäiskö olla orderid: vai koko orderin tossa mapissa?
  
  function addItem(){ //pitäiskö olla async?
    //lisää viimiseks jonku itemin.
    //mutta ethän sä aina lisää viimiseks. Ku eka hinnan mukaan, ja sit sen hinnan viimiseks.
  }
  
  function getItem(nth: string){
    //palauttaako hinnan/mapin nimen, vai noin omnennen orderin? Hetkonen, kuka tämmöstä muka käyttäis???? Ehkä jos privaten joku tarttee.
  }
  
  function peek(){
    //parhaan hinnan palauttaa, mutta ei poista.
  }
  
  function pop_array(){
    //tietylle hinnalle palauttaa arrayn sen hinnan ordereista.
  }
  
}
