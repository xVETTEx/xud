#!/bin/bash
set -xe
declare -xp
GOPATH="$PWD/go"
GETH_SOURCE="https://github.com/ExchangeUnion/go-ethereum"
GETH_PATH="$GOPATH/src/github.com/ethereum/go-ethereum"
if [ ! -d "$GETH_PATH" ]; then
  git clone $GETH_SOURCE "$GETH_PATH"
  cd "$GOPATH/src/github.com/ethereum/go-ethereum" || exit 1
  CI=false GO111MODULE=off go run build/ci.go install ./cmd/geth
fi
echo "Geth installed $("$GETH_PATH"/build/bin/geth --version)"
