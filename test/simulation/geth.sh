#!/bin/bash
set -xe
declare -xp
eval "$(GIMME_GO_VERSION=1.12 gimme)"
export GOPATH="$PWD/go"
export CI=false
rm -rf "$PWD/go"
rm -rf "$PWD/temp"
git clone https://github.com/ethereum/go-ethereum "$GOPATH/src/github.com/ethereum/go-ethereum"
cd "$GOPATH/src/github.com/ethereum/go-ethereum" || exit 1
# git checkout v1.9.2
go run build/ci.go install ./cmd/geth
