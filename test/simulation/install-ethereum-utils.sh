#!/bin/bash
set -e
CACHE_PATH=$1
VENV_DIR=$2
SOURCE=$3
install_ethereum_utils () {
  echo "installing ethereum utils"
  cd "$CACHE_PATH"
  python3.7 -m venv "$VENV_DIR"
  # shellcheck source=/dev/null
  source "$VENV_DIR/bin/activate"
  cd "$SOURCE"
  pip install --upgrade pip
  pip install -r requirements.txt
  deactivate
}
if [ ! -d "$CACHE_PATH/$VENV_DIR" ]; then
  install_ethereum_utils
else
  echo "ethereum utils already installed"
fi
