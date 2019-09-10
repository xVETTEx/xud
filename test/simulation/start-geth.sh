#!/bin/bash
set -ex
source .env
if [ ! -d "$DAG_DIR" ]; then
  echo "DAG dir does not exist"
  WAIT_FOR_DAG=true
fi
GOPATH="$GO_PATH" "$GETH_BINARY_PATH" --datadir "$GETH_DATA_DIR" --networkid "$GETH_NETWORK_ID" --rpcapi "eth,net,web3,txpool" --rpc --rpcaddr "$GETH_RPCADDR" --rpcport "$GETH_PORT" --nodiscover --maxpeers 0 --etherbase=0x0000000000000000000000000000000000000000 --ethash.dagdir "$DAG_DIR" >> "$TEMP_PATH/geth.log" 2>&1&
# wait for geth to boot
sleep 5
if [ $WAIT_FOR_DAG ]; then
  # TODO: use ./generate-ethereum-blocks.sh
  $GETH_BINARY_PATH --datadir "$GETH_DATA_DIR" --networkid "$GETH_NETWORK_ID" --exec "var acc = personal.newAccount(''); miner.start(500)" attach
  echo "waiting for DAG"
  EXPECTED_CI_DAG_GENERATION_TIME=540
  sleep $EXPECTED_CI_DAG_GENERATION_TIME
else
  # TODO: use ./generate-ethereum-blocks.sh
  $GETH_BINARY_PATH --datadir "$GETH_DATA_DIR" --networkid "$GETH_NETWORK_ID" --exec "var acc = personal.newAccount(''); miner.start(100)" attach
  sleep 1
fi
