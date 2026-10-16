#!/usr/bin/env sh
# Regenerates all icons in public/ from the SVG sources in this directory.
# Requires: rsvg-convert (librsvg) and ImageMagick (magick).
set -eu
cd "$(dirname "$0")"
out=../public
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

cp icon.svg "$out/favicon.svg"
for s in 192 512; do rsvg-convert -w $s -h $s icon.svg -o "$out/icon-$s.png"; done
rsvg-convert -w 512 -h 512 icon-maskable.svg -o "$out/icon-maskable-512.png"
rsvg-convert -w 180 -h 180 icon-apple.svg -o "$out/apple-touch-icon.png"
for s in 16 32 48; do rsvg-convert -w $s -h $s icon-small.svg -o "$tmp/$s.png"; done
magick "$tmp/16.png" "$tmp/32.png" "$tmp/48.png" "$out/favicon.ico"
echo "Icons updated in public/"
