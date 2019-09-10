#!/bin/bash
set -ex
source .env

# cleanup existing data directories to prevent errors
# during consecutive runs
rm -Rf $TEMP_PATH/xuddatadir*

./install-lnd.sh
./install-geth.sh
./install-solc.sh
./install-raiden-contracts.sh
./install-raiden.sh
./install-ethereum-utils.sh
./create-geth-genesis.sh
