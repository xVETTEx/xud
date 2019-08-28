#!/bin/bash
set -e
SOLC_SOURCE=$1
SOLC_PATH=$2
EXPECTED_SHA256SUM=$3
install_solc () {
  echo "installing solc"
  mkdir -p "$SOLC_PATH"
  cd "$SOLC_PATH"
  wget "$SOLC_SOURCE"
  unzip ./*.zip
  export PATH="$SOLC_PATH:$PATH"
}
if [ ! -d "$SOLC_PATH" ]; then
  install_solc
else
  ROOT=$PWD
  cd "$SOLC_PATH"
  CURRENT_SHA256SUM=$(sha256sum solc | awk '{print $1}')
  if [ "$CURRENT_SHA256SUM" == "$EXPECTED_SHA256SUM" ]; then
    echo "solc already installed"
  else
    echo "updating solc"
    cd "$ROOT"
    rm -Rf "$SOLC_PATH"
    install_solc
  fi
fi
