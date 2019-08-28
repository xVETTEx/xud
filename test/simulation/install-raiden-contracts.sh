#!/bin/bash
set -ex
CONTRACTS_REPOSITORY=$1
CONTRACTS_BRANCH=$2
CONTRACTS_PATH=$3
EXPECTED_HASH=$4
install_contracts () {
  echo "installing raiden-contracts"
  git clone --depth 1 "$CONTRACTS_REPOSITORY" -b "$CONTRACTS_BRANCH" "$CONTRACTS_PATH"
  cd "$CONTRACTS_PATH"
  python3.7 -m venv venv
  # shellcheck source=/dev/null
  source venv/bin/activate
  pip install wheel
  make install
  make verify_contracts
  make compile_contracts
  pip uninstall web3 -y
  pip install web3==4.9.1
  pip install raiden_libs
  deactivate
}
if [ ! -d "$CONTRACTS_PATH" ]; then
  install_contracts
else
  ROOT=$PWD
  cd "$CONTRACTS_PATH"
  CURRENT_HASH=$(git rev-parse HEAD)
  if [ "$CURRENT_HASH" == "$EXPECTED_HASH" ]; then
    echo "raiden-contracts already installed"
  else
    echo "updating raiden-contracts"
    cd "$ROOT"
    rm -Rf "$CONTRACTS_PATH"
    install_contracts
  fi
fi
