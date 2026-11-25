#!/usr/bin/env bash
set -euo pipefail
umask 022

archive=$1
release_id=$2
root=/var/www/crm-executive
if [[ ! "$release_id" =~ ^[a-z0-9-]+$ ]]; then
  echo "Invalid executive release ID." >&2
  exit 2
fi

release="$root/releases/$release_id"
pending="$root/.current-$release_id"

mkdir "$release"
tar -xzf "$archive" -C "$release"
test -s "$release/executive/index.html"
test -d "$release/_next/static"
cp -an "$release/_next/static/." "$root/_next/static/"
ln -s "$release" "$pending"
mv -Tf "$pending" "$root/current"
