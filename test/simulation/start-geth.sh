#!/bin/bash
set -ex
source .env
if [ ! -d "$DAG_DIR" ]; then
  echo "DAG dir does not exist"
  WAIT_FOR_DAG=true
fi
GOPATH="$GO_PATH" "$GETH_BINARY_PATH" --datadir "$GETH_DATA_DIR" --networkid "$GETH_NETWORK_ID" --rpcapi "eth,net,web3,txpool" --rpc --rpcaddr "$GETH_RPCADDR" --rpcport "$GETH_PORT" --nodiscover --maxpeers 0 --etherbase=0x778c58e06fb57d93411b1c329c64cdfc5d984da4 --ethash.dagdir "$DAG_DIR" >> "$TEMP_PATH/geth.log" 2>&1&
# TODO: check geth.ipc -> geth has been booted
sleep 5
# TODO: add etherebase to params
./generate-ethereum-blocks.sh 100
if [ $WAIT_FOR_DAG ]; then
  echo "waiting for DAG"
  EXPECTED_CI_DAG_GENERATION_TIME=240
  sleep $EXPECTED_CI_DAG_GENERATION_TIME
fi
