#!/bin/bash
set -e
CACHE_PATH=$1
AUTOMINER_VENV_DIR=$2
AUTOMINER_SOURCE=$3
create_virtualenv () {
  echo "creating virtualenv for autominer"
  cd "$CACHE_PATH"
  python3.7 -m venv "$AUTOMINER_VENV_DIR"
  # shellcheck source=/dev/null
  source autominer-venv/bin/activate
  cd "$AUTOMINER_SOURCE"
  pip install -r requirements.txt
  deactivate
}
if [ ! -d "$CACHE_PATH/$AUTOMINER_VENV_DIR" ]; then
  create_virtualenv
else
  echo "geth autominer already installed"
fi
