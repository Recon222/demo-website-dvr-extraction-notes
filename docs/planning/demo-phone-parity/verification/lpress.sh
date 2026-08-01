#!/bin/bash
# lpress.sh <x%> <y%> -- long-press a point (Maestro longPressOn)
SP="$(cd "$(dirname "$0")" && pwd)"
F="$SP/.tmp-lpress.yaml"
cat > "$F" <<YAML
appId: com.kris.dvrextractionnotes
---
- longPressOn:
    point: "$1,$2"
YAML
"$SP/mrun.sh" "$F"
