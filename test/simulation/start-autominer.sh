#!/bin/bash
set -e
AUTOMINER_SOURCE=$1
AUTOMINER_VENV_DIR=$2
GETH_IPC=$3
CACHE_PATH=$4
# shellcheck source=/dev/null
source "$CACHE_PATH/$AUTOMINER_VENV_DIR/bin/activate"
python "$AUTOMINER_SOURCE/geth-autominer.py" "$GETH_IPC" &
deactivate
sleep 1
