#!/bin/sh
# Bundles js/tank-story.js with Three.js (only the parts it uses) into one minified file.
# Needs esbuild: any install works, e.g. `npm i -g esbuild`, or set ESBUILD=/path/to/esbuild
set -e
cd "$(dirname "$0")"
ESBUILD=${ESBUILD:-$(command -v esbuild || echo /home/kali/VS_Code/OpenSea/node_modules/.bin/esbuild)}
"$ESBUILD" js/tank-story.js --bundle --minify --format=esm --target=es2020 \
  --alias:three=./js/vendor/three.module.js --outfile=js/tank-story.min.js
