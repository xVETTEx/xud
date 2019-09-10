#!/bin/bash
set -ex
source .env
BLOCKS_TO_GENERATE=$1
echo "Generating $BLOCKS_TO_GENERATE blocks..."
$GETH_BINARY_PATH --datadir "$GETH_DATA_DIR" --networkid "$GETH_NETWORK_ID" --exec "miner.stop()" attach
CURRENT_HEIGHT=$($GETH_BINARY_PATH --datadir "$GETH_DATA_DIR" --networkid "$GETH_NETWORK_ID" --exec "eth.blockNumber" attach)
TARGET_HEIGHT=$((CURRENT_HEIGHT + BLOCKS_TO_GENERATE))
CURRENT_HEIGHT=$($GETH_BINARY_PATH --datadir "$GETH_DATA_DIR" --networkid "$GETH_NETWORK_ID" --exec "miner.start($BLOCKS_TO_GENERATE)" attach)
HEIGHT=$($GETH_BINARY_PATH --datadir "$GETH_DATA_DIR" --networkid "$GETH_NETWORK_ID" --exec "eth.blockNumber" attach)
until [ "$HEIGHT" -ge "$TARGET_HEIGHT" ]; do
  echo "Waiting for blocks to be mined (current: $HEIGHT, target $TARGET_HEIGHT)..."
  sleep 1s;
  HEIGHT=$($GETH_BINARY_PATH --datadir "$GETH_DATA_DIR" --networkid "$GETH_NETWORK_ID" --exec "eth.blockNumber" attach)
done
echo "Target height $TARGET_HEIGHT reached. Generated $BLOCKS_TO_GENERATE blocks."
