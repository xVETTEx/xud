#!/bin/bash
set -ex
GETH_BINARY_PATH=$1
GETH_DATA_DIR=$2
GETH_NETWORK_ID=$3
GETH_RPCADDR=$4
GETH_PORT=$5
DAG_DIR=$6
if [ ! -d "$DAG_DIR" ]; then
  echo "DAG dir does not exist"
  WAIT_FOR_DAG=true
fi
GOPATH="$GO_PATH" "$GETH_BINARY_PATH" --datadir "$GETH_DATA_DIR" --networkid "$GETH_NETWORK_ID" --rpcapi "eth,net,web3,txpool" --rpc --rpcaddr "$GETH_RPCADDR" --rpcport "$GETH_PORT" --nodiscover --maxpeers 0 --etherbase=0x0000000000000000000000000000000000000000 --ethash.dagdir "$DAG_DIR" &
# wait for geth to boot
sleep 5
if [ $WAIT_FOR_DAG ]; then
  $GETH_BINARY_PATH --datadir "$GETH_DATA_DIR" --networkid "$GETH_NETWORK_ID" --exec "var acc = personal.newAccount(''); miner.start(500)" attach
  echo "waiting for DAG"
  EXPECTED_CI_DAG_GENERATION_TIME=540
  sleep $EXPECTED_CI_DAG_GENERATION_TIME
fi
