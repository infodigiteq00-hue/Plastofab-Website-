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
python3 stamp.py dist   # every css/js/image link gets ?v=<hash of the file>, so a changed file is always fetched fresh
# hashed css/js links can be kept a year in dist/ (pages stay re-checked)
awk '/^\/(css|js)\/\*$/{b=1} b && /^  Cache-Control: no-cache$/{sub(/no-cache/,"public, max-age=31536000, immutable"); b=0} 1' dist/_headers > dist/_headers.tmp && mv dist/_headers.tmp dist/_headers
(cd dist && zip -qr -9 ../plasto-fab-site.zip .)
echo "dist/: $(find dist -type f | wc -l) files, $(du -sh dist | cut -f1)   plasto-fab-site.zip: $(du -h plasto-fab-site.zip | cut -f1)"
