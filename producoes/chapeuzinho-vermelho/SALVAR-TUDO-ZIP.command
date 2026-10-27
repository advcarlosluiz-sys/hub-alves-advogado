#!/bin/sh
cd "$(dirname "$0")" || exit 1
node scripts/package.mjs
read -r answer
