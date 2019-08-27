#!/bin/bash
eval "$(GIMME_GO_VERSION=1.12 gimme)"
cd /home/travis/builds || exit 1
export GOPATH="/home/travis/builds/xud/test/simulation/go"
mkdir -p $GOPATH
git clone https://github.com/ethereum/go-ethereum "$GOPATH/src/github.com/ethereum/go-ethereum"
cd "$GOPATH/src/github.com/ethereum/go-ethereum" || exit 1
GO111Module=on go run build/ci.go install ./cmd/geth
