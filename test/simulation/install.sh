#!/bin/bash
set -xe

export GO_PATH=$PWD/go
GETH_SOURCE="https://github.com/ExchangeUnion/go-ethereum"
GETH_PATH="$GO_PATH/src/github.com/ethereum/go-ethereum"
GETH_COMMIT_HASH="e0bb1631c21042336d230c11de0dfe8580aa28c4"
./install-geth.sh "$GETH_SOURCE" "$GETH_PATH" "$GETH_COMMIT_HASH"
