#!/bin/bash
# tap.sh <x%> <y%> [more x y pairs...] -- tap points via maestro
SP="$(cd "$(dirname "$0")" && pwd)"
F="$SP/.tmp-tap.yaml"
{ echo "appId: com.kris.dvrextractionnotes"; echo "---"; } > "$F"
while [ $# -ge 2 ]; do
  echo "- tapOn:" >> "$F"
  echo "    point: \"$1,$2\"" >> "$F"
  shift 2
done
"$SP/mrun.sh" "$F"
