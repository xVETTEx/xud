
source ~/wip/venv/bin/activate
cd ~/wip/raiden-contracts

private_key="/home/xud/eth/blkchain1/keystore/UTC--2019-04-05T12-48-38Z--349ee87c-e8a9-46c5-9553-8021edf29e18"
version="0.4.0" #"" #"0.4.0" #"0.3._"
provider="http://127.0.0.1:8547"
#provider="https://ropsten.infura.io/v3/7237cf0eba094fff98336bad8a062870"
MAX_TOTAL_AMOUNT_OF_TOKENS_DEPOSITED_IN_USER_DEPOSIT=10000000
token1_supply=1000000000
token1_name="WETH"
token1_symbol="WETH"

token2_supply=200000000000
token2_name="Dai (DAI)"
token2_symbol="DAI"

MAX_UINT256=115792089237316195423570985008687907853269984665640564039457584007913129639935
let "seconds_per_day=60*60*24"
let "decay=200*$seconds_per_day"
let "duration=200*$seconds_per_day"
export Deposit=2000000000000000000000

python -m raiden_contracts.deploy raiden --rpc-provider $provider --private-key $private_key --gas-price 10 --gas-limit 6000000 --max-token-networks 10

TokenNetworkRegistry=`cat 'raiden_contracts/data/deployment_private_net.json'|jq -r '. | .contracts.TokenNetworkRegistry.address'`

python -m raiden_contracts.deploy token --rpc-provider $provider --private-key $private_key --gas-price 10 --token-supply 20000000 --token-name ServiceToken --token-decimals 18 --token-symbol SVT > /tmp/servicetoken.log

ServiceToken=`cat /tmp/servicetoken.log |tail -3 |jq -r '. | .CustomToken'`

python -m raiden_contracts.deploy services --rpc-provider $provider --private-key $private_key --gas-price 10 --gas-limit 6000000 --token-address $ServiceToken --user-deposit-whole-limit $MAX_UINT256 --service-deposit-bump-numerator 6 --service-deposit-bump-denominator 5 --service-deposit-decay-constant $decay --initial-service-deposit-price $Deposit --service-deposit-min-price 1000 --service-registration-duration $duration --token-network-registry-address $TokenNetworkRegistry


python -m raiden_contracts.deploy token --rpc-provider $provider --private-key $private_key --gas-price 10 --token-supply $token1_supply --token-name $token1_name --token-decimals 18 --token-symbol $token1_symbol > /tmp/data0-7-0_token1.log

CustomToken=`cat /tmp/data0-7-0_token1.log |tail -3 |jq -r '. | .CustomToken'`

python -m raiden_contracts.deploy register --rpc-provider $provider --private-key $private_key --gas-price 10 --token-address $CustomToken --token-network-registry-address $TokenNetworkRegistry --channel-participant-deposit-limit 115792089237316195423570985008687907853269984665640564039457584007913129639935 --token-network-deposit-limit 115792089237316195423570985008687907853269984665640564039457584007913129639935
#python -m raiden_contracts.deploy register --rpc-provider http://127.0.0.1:8545 --private-key /path/to/your/private_key/file --gas-price 10 --token-address TOKEN_TO_BE_REGISTERED_ADDRESS --token-network-registry-address TOKEN_NETWORK_REGISTRY_ADDRESS --channel-participant-deposit-limit 115792089237316195423570985008687907853269984665640564039457584007913129639935 --token-network-deposit-limit 115792089237316195423570985008687907853269984665640564039457584007913129639935

if [ ! -z "$token2_supply" ]
then
	python -m raiden_contracts.deploy token --rpc-provider $provider --private-key $private_key --gas-price 10 --token-supply $token2_supply --token-name "$token2_name" --token-decimals 18 --token-symbol $token2_symbol  > /tmp/data0-7-0_token2.log

	CustomToken=`cat /tmp/data0-7-0_token2.log |tail -3 |jq -r '. | .CustomToken'`
python -m raiden_contracts.deploy register --rpc-provider $provider --private-key $private_key --gas-price 10  --token-address $CustomToken --token-network-registry-address $TokenNetworkRegistry --channel-participant-deposit-limit 115792089237316195423570985008687907853269984665640564039457584007913129639935 --token-network-deposit-limit 115792089237316195423570985008687907853269984665640564039457584007913129639935
fi	

deactivate
