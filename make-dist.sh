#!/bin/sh
# Copies just the website into dist/ and zips it as plasto-fab-site.zip, ready for Cloudflare Pages.
# Leaves out the sources (ref/, pages/), the build scripts and the unbundled Three.js.
# Run after build-pages.py / build.sh:   ./make-dist.sh
set -e
cd "$(dirname "$0")"
rm -rf dist plasto-fab-site.zip
rsync -a --prune-empty-dirs \
  --exclude='/ref/' --exclude='/pages/' --exclude='/dist/' --exclude='/js/vendor/' --exclude='/js/tank-story.js' \
  --exclude='__pycache__/' --exclude='*.py' --exclude='*.sh' --exclude='*.md' --exclude='*.zip' --exclude='.*' \
  ./ dist/
(cd dist && zip -qr -9 ../plasto-fab-site.zip .)
echo "dist/: $(find dist -type f | wc -l) files, $(du -sh dist | cut -f1)   plasto-fab-site.zip: $(du -h plasto-fab-site.zip | cut -f1)"
