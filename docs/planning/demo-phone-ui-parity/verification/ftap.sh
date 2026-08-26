#!/bin/bash
# ftap.sh <x%> <y%> -- FAST tap via a 1%-displacement 50ms swipe.
# Maestro's `tapOn: point:` intermittently holds long enough to fire onLongPress
# (the location row's Duplicate-Location sheet). A short swipe is a clean touch
# down/up well under the long-press threshold.
SP="$(cd "$(dirname "$0")" && pwd)"
F="$SP/.tmp-ftap.yaml"
cat > "$F" <<YAML
appId: com.kris.dvrextractionnotes
---
- swipe:
    start: "$1,$2"
    end: "$1,$(echo "$2" | sed 's/%//' | awk '{printf "%d%%", $1+1}')"
    duration: 50
YAML
"$SP/mrun.sh" "$F"
