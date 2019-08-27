#!/bin/bash
set -xe
declare -xp
export GOPATH="$PWD/go"
export CI=false
GETH_SOURCE="https://github.com/ExchangeUnion/go-ethereum"
if [ ! -d "$GETH_SOURCE" ]; then
  git clone $GETH_SOURCE "$GOPATH/src/github.com/ethereum/go-ethereum"
  cd "$GOPATH/src/github.com/ethereum/go-ethereum" || exit 1
  go run build/ci.go install ./cmd/geth
fi
echo "Geth installed $($GETH_SOURCE/build/bin/geth --version)"
