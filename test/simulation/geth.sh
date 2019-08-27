#!/bin/bash
set -xe
declare -xp
export GOPATH="$PWD/go"
export CI=false
GETH_SOURCE="https://github.com/ExchangeUnion/go-ethereum"
GETH_PATH="$GOPATH/src/github.com/ethereum/go-ethereum"
if [ ! -d "$GETH_PATH" ]; then
  git clone $GETH_SOURCE "$GETH_PATH"
  cd "$GOPATH/src/github.com/ethereum/go-ethereum" || exit 1
  go run build/ci.go install ./cmd/geth
fi
echo "Geth installed $("$GETH_PATH"/build/bin/geth --version)"
