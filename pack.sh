#!/bin/sh
# Package the extension to a version-numbered Zip file.

version=$(awk -F: '/"version"/ {print $2}' src/manifest.json | tr -d ' ,"')
target=../dist/doqment-v$version.zip

mkdir -p dist && cd src || exit
git submodule update --init
echo 'Packaging to dist/...'
zip -r -FS "$target" ./* -x@../.zipexclude && echo 'Success.'
