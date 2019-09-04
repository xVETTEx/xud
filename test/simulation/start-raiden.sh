#!/bin/bash
set -ex
source .env
RAIDEN_DATA_DIR=$1
RAIDEN_PORT=$2
RESOLVER_PORT=$3
echo "starting raiden with resolver port $RESOLVER_PORT"
CONF_FILE="$RAIDEN_DATA_DIR/config.toml"
# shellcheck source=/dev/null
source "$RAIDEN_PATH/venv/bin/activate"
cd "$RAIDEN_PATH"
python raiden --config-file "$CONF_FILE" --eth-rpc-endpoint "$GETH_PROVIDER" --no-sync-check --api-address "localhost:$RAIDEN_PORT" --resolver-endpoint "http://127.0.0.1:$RESOLVER_PORT/resolveraiden" >> "$RAIDEN_DATA_DIR/raiden.log" 2>&1 &
# python raiden --config-file "$CONF_FILE" --eth-rpc-endpoint "$GETH_PROVIDER" --no-sync-check --api-address "localhost:$RAIDEN_PORT" &
deactivate
