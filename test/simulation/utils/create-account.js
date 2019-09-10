var password = "";
var account = personal.newAccount(password);
miner.setEtherbase(account)
// TODO: generate funds for the account later?
miner.start(500);
console.log("account:", account.slice(2));
