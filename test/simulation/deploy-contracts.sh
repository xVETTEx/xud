#!/bin/bash
set -ex
RAIDEN_CONTRACTS_PATH=$1
GETH_PROVIDER=$2
TREASURY_ACCOUNT_PATH=$3
GETH_DATA_DIR=$4
TEMP_PATH=$5
PASSWORD_FILE="$GETH_DATA_DIR/passwd"
CONTRACTS_DEPLOYMENT_LOG_JSON="$RAIDEN_CONTRACTS_PATH/raiden_contracts/data/deployment_private_net.json"
CONTRACTS_WETH_LOG_JSON="$TEMP_PATH/weth.log"
touch "$PASSWORD_FILE"
chmod 600 "$PASSWORD_FILE"
cd "$RAIDEN_CONTRACTS_PATH"
# shellcheck source=/dev/null
source "venv/bin/activate"
python -m raiden_contracts.deploy raiden --rpc-provider "$GETH_PROVIDER" --private-key "$TREASURY_ACCOUNT_PATH" --password-file "$PASSWORD_FILE" --gas-price 10 --gas-limit 6000000
TokenNetworkRegistry=$(< "$CONTRACTS_DEPLOYMENT_LOG_JSON" jq -r .contracts.TokenNetworkRegistry.address)
python -m raiden_contracts.deploy token --rpc-provider "$GETH_PROVIDER" --private-key "$TREASURY_ACCOUNT_PATH" --gas-price 10 --token-supply 100000000000000000 --token-name WETH --token-decimals 18 --token-symbol WETH --password-file "$PASSWORD_FILE" > "$CONTRACTS_WETH_LOG_JSON"
WethToken=$(< "$CONTRACTS_WETH_LOG_JSON" tail -3 | jq -r .CustomToken)
# shellcheck disable=SC2086
python -m raiden_contracts.deploy register --rpc-provider "$GETH_PROVIDER" --private-key "$TREASURY_ACCOUNT_PATH" --gas-price 100 --gas-limit 6000000 --token-address $WethToken --registry-address $TokenNetworkRegistry --password-file "$PASSWORD_FILE"
