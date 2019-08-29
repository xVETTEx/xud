#!/bin/bash
set -e
NEW_ACCOUNT_PATH=$1
GETH_BINARY_PATH=$2
GETH_DATA_DIR=$3
GETH_NETWORK_ID=$4
CREATED_ACCOUNT=$($GETH_BINARY_PATH --datadir "$GETH_DATA_DIR" --networkid "$GETH_NETWORK_ID" --exec "loadScript(\"$PWD/utils/create-account.js\")" attach | grep "account:" | awk '{print $2}')
echo "created account is: $CREATED_ACCOUNT"
mv $GETH_DATA_DIR/keystore/*$CREATED_ACCOUNT "$NEW_ACCOUNT_PATH"
