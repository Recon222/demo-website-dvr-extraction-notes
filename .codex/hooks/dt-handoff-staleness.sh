#!/usr/bin/env bash
# Dreamteam handoff-staleness (PostToolUse:Bash) — Demo<->Phone UI Parity v2
#
# Detects state-changing git operations — merges and pushes — and warns loudly when
# HANDOFF.md's `state-as-of` stamp has fallen behind HEAD, naming how many commits it is
# behind rather than emitting a generic "remember to update docs".
#
# Scoped deliberately to state-changing operations. A reminder that prints on every command
# gets tuned out, which is the failure it exists to prevent.
#
# STDOUT, NOT STDERR. Exit 0 plus stderr is the one combination that reaches nobody: stdout
# is injected as context, exit 2 blocks and feeds the message back, and exit 0 + stderr goes
# to a reader that does not exist. This hook does not block; it warns, on stdout.

set -u
input="$(cat 2>/dev/null || true)"
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"

rel_state="docs/planning/demo-phone-ui-parity/HANDOFF.md"
state="$root/$rel_state"

if command -v jq >/dev/null 2>&1; then
  cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
else
  cmd=""
fi
if [ -z "${cmd:-}" ]; then
  cmd="$(printf '%s' "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' | head -1)"
fi
[ -z "${cmd:-}" ] && exit 0

# Only react to state-changing operations.
printf '%s' "$cmd" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]+(merge|push)([[:space:]]|$)' \
  || printf '%s' "$cmd" | grep -Eq 'gh[[:space:]]+pr[[:space:]]+merge' \
  || exit 0

# HANDOFF.md may still be living on the planning branch. Absent is not an error here — say
# nothing rather than nagging about a file this checkout is not supposed to have yet.
[ -f "$state" ] || exit 0

stamp="$(grep -m1 -i 'state-as-of:' "$state" 2>/dev/null \
         | sed 's/.*[Ss]tate-as-of:[[:space:]]*//' \
         | grep -oE '[0-9a-fA-F]{7,40}' | head -1)"

if [ -z "${stamp:-}" ]; then
  echo "DREAMTEAM: $rel_state has no state-as-of stamp — staleness cannot be detected."
  echo "Add a \`state-as-of: <short sha>\` line to its header and keep it current."
  exit 0
fi

git -C "$root" cat-file -e "${stamp}^{commit}" 2>/dev/null || {
  echo "DREAMTEAM: $rel_state's state-as-of stamp ($stamp) is not a commit in this repo."
  echo "Re-stamp it with the sha the snapshot actually describes."
  exit 0
}

head_sha="$(git -C "$root" rev-parse --short HEAD 2>/dev/null || echo unknown)"
behind="$(git -C "$root" rev-list --count "${stamp}..HEAD" -- . ":(exclude)$rel_state" 2>/dev/null || echo 0)"

if [ "${behind:-0}" -gt 0 ]; then
  short_stamp="$(printf '%s' "$stamp" | cut -c1-7)"
  echo "=================================================================="
  echo " DREAMTEAM: HANDOFF.md IS STALE"
  echo "   state-as-of: $short_stamp   HEAD: $head_sha   ($behind commits behind)"
  echo ""
  git -C "$root" log --oneline "${stamp}..HEAD" -- . ":(exclude)$rel_state" 2>/dev/null | head -10 | sed 's/^/   /'
  echo ""
  echo "   You just changed shared state. The next instance is instructed to trust this"
  echo "   pointer over any summary. Update HANDOFF.md §5 + its state-as-of stamp before it"
  echo "   becomes someone else's confidently-wrong starting point."
  echo "=================================================================="
fi
exit 0
