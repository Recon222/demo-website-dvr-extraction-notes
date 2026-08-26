#!/bin/bash
# swipe.sh <x1%> <y1%> <x2%> <y2%>
SP="$(cd "$(dirname "$0")" && pwd)"
F="$SP/.tmp-swipe.yaml"
cat > "$F" <<YAML
appId: com.kris.dvrextractionnotes
---
- swipe:
    start: "$1,$2"
    end: "$3,$4"
YAML
"$SP/mrun.sh" "$F"
