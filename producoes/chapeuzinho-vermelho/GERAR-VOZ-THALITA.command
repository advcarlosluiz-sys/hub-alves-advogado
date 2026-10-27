#!/bin/sh
cd "$(dirname "$0")" || exit 1
export POPUP_PYTHON=python3
node scripts/narrate.mjs
read -r answer
