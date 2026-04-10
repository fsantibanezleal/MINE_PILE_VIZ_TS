#!/usr/bin/env bash
# Fix cPanel symlinked node_modules before Next.js build.
#
# cPanel Setup Node.js creates node_modules as a symlink pointing to
# a virtual environment directory. Turbopack (Next.js 16 default bundler)
# rejects symlinks that point outside the project root.
#
# This script replaces the symlink with a real copy, then builds.
# Run this from cPanel terminal or via "Run Script" after npm install.

set -euo pipefail

cd "$(dirname "$0")/.."

# Add cPanel Node.js to PATH (skip activate script — it has unbound vars)
NODEVENV="$HOME/nodevenv/public_html/minepile.fasl-work.com/24"
export PATH="$NODEVENV/bin:$PATH"

# Fix symlinked node_modules
if [ -L "node_modules" ]; then
  TARGET=$(readlink -f node_modules)
  echo "Replacing node_modules symlink -> $TARGET"
  rm node_modules
  cp -r "$TARGET" node_modules
  echo "node_modules is now a real directory"
fi

echo "Building Next.js..."
npm run build

echo "Build complete."
