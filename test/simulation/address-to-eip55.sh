#!/bin/bash
set -ex
ADDRESS=$1
VENV_PATH=$2
ETH_UTILS_SOURCE=$3
# shellcheck source=/dev/null
source "$VENV_PATH/bin/activate"
python $ETH_UTILS_SOURCE/eip55.py $ADDRESS
