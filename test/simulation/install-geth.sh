#!/bin/bash
set -e
GETH_SOURCE=$1
GETH_PATH=$2
if [ ! -d "$GETH_PATH" ]; then
  git clone "$GETH_SOURCE" "$GETH_PATH"
  cd "$GETH_PATH" || exit 1
  GOPATH=$GO_PATH CI=false GO111MODULE=off go run build/ci.go install ./cmd/geth
fi
echo "Geth installed $("$GETH_PATH"/build/bin/geth --version)"
