#!/bin/bash
set -ex
source .env
RESOLVER_PORT=$1
./start-raiden.sh "$RAIDEN_DATA_DIR_BOB" "$RAIDEN_API_PORT_BOB" "$RESOLVER_PORT"
