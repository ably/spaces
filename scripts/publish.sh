#!/bin/bash

# See https://coderwall.com/p/fkfaqq/safer-bash-scripts-with-set-euxo-pipefail
set -euo pipefail
env

echo "Install packages, making sure they are up to date"
npm ci

echo "Build package"
npm run build

echo "Create version"
npm --no-git-tag-version version from-git

echo "Publish"
npm publish --access=public
