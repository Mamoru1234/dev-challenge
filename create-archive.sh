#!/usr/bin/env sh

set -eu;

echo "Building task archive"

zip FileName.zip $(git ls-files | xargs)