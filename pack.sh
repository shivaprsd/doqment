#!/bin/sh
# Package the extension to a version-numbered Zip file.

variant=${1:-mv2}
if [ "$variant" != mv2 ] && [ "$variant" != mv3 ]; then
	echo "Unknown target: $variant"
	exit
fi
ln -sf "manifest-${variant#?}.json" src/manifest.json

version=$(awk -F: '/"version"/ {print $2}' src/manifest.json | tr -d ' ,"')
target=../dist/doqment-v$version-$variant.zip

mkdir -p dist && cd src || exit
git submodule update --init
echo 'Packaging to dist/...'
zip -rq -FS "$target" ./* -x@../.zipexclude -x'pdfjs-latest/*' || exit

pdfjs_SHA() {
	git -C pdfjs rev-parse $1
}
if [ $(pdfjs_SHA HEAD) != $(pdfjs_SHA main) ]; then
	echo 'Adding pdfjs-latest/...'
	git -C pdfjs checkout -q main
	zip -rq "$target" pdfjs-latest -x@../.zipexclude || exit
fi
echo 'Success.'
