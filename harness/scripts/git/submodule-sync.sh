#!/bin/bash
# Vendor submodule sync — pulls the latest v* release tag from oh-my-claudecode
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
VENDOR="$ROOT/harness/vendor/oh-my-claudecode"
VERSION_FILE="$ROOT/harness/.omc-vendor-version"

cd "$VENDOR"
git fetch --tags origin

CURRENT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "unknown")
LATEST_TAG=$(git tag -l 'v*' --sort=-version:refname | head -1)

if [ "$CURRENT_TAG" = "$LATEST_TAG" ]; then
  echo "vendor 최신: $CURRENT_TAG"
  exit 0
fi

echo "vendor 업데이트: $CURRENT_TAG → $LATEST_TAG"
git checkout "$LATEST_TAG"

cd "$ROOT"
echo "${LATEST_TAG#v}" > "$VERSION_FILE"

git add harness/vendor/oh-my-claudecode harness/.omc-vendor-version
git diff --staged --quiet && echo "변경 없음" && exit 0
git commit -m "chore(harness): bump vendor oh-my-claudecode ${CURRENT_TAG} → ${LATEST_TAG}"
echo "커밋 완료. git push origin main 으로 반영"
