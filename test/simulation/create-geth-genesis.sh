#!/bin/bash
set -ex
GETH_BINARY_PATH=$1
GETH_DATA_DIR=$2
GENESIS_JSON=$3
if [ ! -d "$GETH_DATA_DIR" ]; then
  echo "Cleaning geth data directory"
  rm -Rf "$GETH_DATA_DIR"
fi
GOPATH="$GO_PATH" "$GETH_BINARY_PATH" --datadir "$GETH_DATA_DIR" init "$GENESIS_JSON"
