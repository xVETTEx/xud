#!/bin/bash
set -ex
GETH_BINARY_PATH=$1
GETH_DATA_DIR=$2
GETH_NETWORK_ID=$3
GETH_RPCADDR=$4
GETH_PORT=$5
GOPATH="$GO_PATH" "$GETH_BINARY_PATH" --datadir "$GETH_DATA_DIR" --networkid "$GETH_NETWORK_ID" --rpcapi "eth,net,web3,txpool" --rpc --rpcaddr "$GETH_RPCADDR" --rpcport "$GETH_PORT" --nodiscover --maxpeers 0 &
