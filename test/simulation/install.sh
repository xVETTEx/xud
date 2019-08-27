#!/bin/bash
set -xe

export GO_PATH=$PWD/go
GETH_SOURCE="https://github.com/ExchangeUnion/go-ethereum"
GETH_PATH="$GO_PATH/src/github.com/ethereum/go-ethereum"
./install-geth.sh "$GETH_SOURCE" "$GETH_PATH"
