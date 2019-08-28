#!/bin/bash
set -xe

export GO_PATH=$PWD/go
CACHE_PATH="$PWD/cache"

GETH_SOURCE="https://github.com/ExchangeUnion/go-ethereum"
GETH_PATH="$GO_PATH/src/github.com/ethereum/go-ethereum"
GETH_COMMIT_HASH="e0bb1631c21042336d230c11de0dfe8580aa28c4"
./install-geth.sh "$GETH_SOURCE" "$GETH_PATH" "$GETH_COMMIT_HASH"

SOLC_SOURCE="https://github.com/ethereum/solidity/releases/download/v0.4.23/solidity-ubuntu-trusty.zip"
SOLC_PATH="$CACHE_PATH/solc"
SOLC_SHA256SUM="1006dc09dc46f396641931b0494383b8d73b3fd2b447f5300f5d2dbe5fd23368"
./install-solc.sh "$SOLC_SOURCE" "$SOLC_PATH" "$SOLC_SHA256SUM"
export PATH="$SOLC_PATH:$PATH"
echo "solc version: $(solc --version)"
RAIDEN_CONTRACTS_REPOSITORY="https://github.com/ExchangeUnion/raiden-contracts.git"
RAIDEN_CONTRACTS_BRANCH="simnet-contracts"
RAIDEN_CONTRACTS_PATH="$CACHE_PATH/raiden-contracts"
RAIDEN_CONTRACTS_COMMIT_HASH="8a705ba98da0b6ab1a53282a9ac330930850201a"
./install-raiden-contracts.sh \
  "$RAIDEN_CONTRACTS_REPOSITORY" \
  "$RAIDEN_CONTRACTS_BRANCH" \
  "$RAIDEN_CONTRACTS_PATH" \
  "$RAIDEN_CONTRACTS_COMMIT_HASH"

AUTOMINER_VENV_DIR="autominer-venv"
AUTOMINER_SOURCE="$PWD/utils/autominer"
./install-autominer.sh "$CACHE_PATH" "$AUTOMINER_VENV_DIR" "$AUTOMINER_SOURCE"
