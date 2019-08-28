#!/bin/bash
set -xe

export GO_PATH=$PWD/go
# GETH_SOURCE="https://github.com/ExchangeUnion/go-ethereum"
# GETH_PATH="$GO_PATH/src/github.com/ethereum/go-ethereum"
# GETH_COMMIT_HASH="e0bb1631c21042336d230c11de0dfe8580aa28c4"
# ./install-geth.sh "$GETH_SOURCE" "$GETH_PATH" "$GETH_COMMIT_HASH"

SOLC_SOURCE="https://github.com/ethereum/solidity/releases/download/v0.4.23/solidity-ubuntu-trusty.zip"
SOLC_PATH="$PWD/cache/solc"
SOLC_SHA256SUM="1006dc09dc46f396641931b0494383b8d73b3fd2b447f5300f5d2dbe5fd23368"
./install-solc.sh "$SOLC_SOURCE" "$SOLC_PATH" "$SOLC_SHA256SUM"
