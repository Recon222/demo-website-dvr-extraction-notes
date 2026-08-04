#!/bin/bash
# look.sh [savepath] -- capture sim screen, print OCR text with tap coords
SP="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-$SP/state.png}"
xcrun simctl io booted screenshot "$OUT" >/dev/null 2>&1
"$SP/ocr" "$OUT"
