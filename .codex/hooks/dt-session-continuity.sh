#!/usr/bin/env bash
# Dreamteam session-continuity — Demo<->Phone UI Parity v2
#
# Wired to SessionStart (startup|resume|compact) and PreCompact. The pointer-trail
# principle, mechanized: a fresh or freshly-compacted instance must find the current
# implementation in its FIRST context window, without being told to look.
#
# THE DIRECTORY IS THE SIGNAL. `docs/planning/demo-phone-ui-parity/` exists -> the campaign
# is live. There is no <slug> to scan for and no stamp to go stale: this effort has exactly
# one campaign directory and it is named here, on purpose. A repo without it gets nothing.
#
# This hook BRANCHES ON THE TRIGGER, because compaction drops the SKILL but leaves the WORK.
# HANDOFF.md reconstructs *state* and reconstructs no *process* at all (dispatch shape, lane
# selection, warm-resumption rules, output contracts, ledger discipline). A post-compaction
# orchestrator therefore recovers WHAT and silently loses HOW — and the failure is
# self-confident, because it has a pointer, a summary, and working greps.
#
# HANDOFF.md is injected WHOLE, both branches. It is the runbook; head -40 would cut it off
# mid-roster, which is exactly the half a recovering instance cannot reconstruct.
#
# Stdout is injected as session context.

set -u
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
CAMPAIGN="$root/docs/planning/demo-phone-ui-parity"
rel="docs/planning/demo-phone-ui-parity"

handoff="$CAMPAIGN/HANDOFF.md"
gates="$CAMPAIGN/GATES.md"

# Determine the trigger. jq is NOT assumed present -- relying on it silently drops the
# compact branch, which is the single most important path in this hook. sed fallback.
src=""
if [ ! -t 0 ]; then
  input="$(cat 2>/dev/null || true)"
  if [ -n "${input:-}" ]; then
    if command -v jq >/dev/null 2>&1; then
      src="$(printf '%s' "$input" | jq -r '.source // empty' 2>/dev/null)"
    fi
    if [ -z "${src:-}" ]; then
      src="$(printf '%s' "$input" \
             | sed -n 's/.*"source"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
    fi
  fi
fi
# PreCompact carries a trigger ("manual"|"auto") rather than a source. Either way the
# instance is about to lose its context, so it gets the recovery branch.
if [ -z "${src:-}" ] && [ -n "${input:-}" ]; then
  case "$input" in
    *'"hook_event_name"'*'PreCompact'*|*'"trigger"'*) src="compact" ;;
  esac
fi

# A checkout without the campaign directory gets nothing, not an error.
[ -d "$CAMPAIGN" ] || exit 0

branch="$(git -C "$root" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
head_sha="$(git -C "$root" rev-parse --short HEAD 2>/dev/null || echo unknown)"

if [ "$src" = "compact" ]; then
  cat <<MSG
DREAMTEAM POST-COMPACTION RECOVERY — Demo<->Phone UI Parity v2. Run this before acting on anything.
Branch: $branch @ $head_sha

Compaction dropped your operating skill but left the work. You will NOT feel under-informed:
you have a pointer, a summary, and working greps, and everything will look recovered. Run the
procedure anyway.

  1. Re-invoke .claude/skills/fleet-orchestration/SKILL.md and read §5 (Post-compaction
     recovery) in full, plus its "Mapping to THIS repo" table — the kit's generic names
     (STATE.md, AGENTS-LOG.md, dt-handoff) resolve through that table, not literally.
  2. OPEN $rel/HANDOFF.md. It is the only rewritten file in the campaign — if it does not
     describe reality, fix it before you trust it. Check its \`state-as-of:\` stamp against
     \`git log\`: behind HEAD means the snapshot is stale and you must reconstruct the delta
     from git before acting on it.
  3. OPEN $rel/GATES.md. Blocking conditions live there precisely so a HANDOFF rewrite can
     never delete them. Read them before deciding anything is finished.
  4. At a MILESTONE BOUNDARY, OPEN BOTH PLAN DOCS IN FULL:
       $rel/01-master-ui-parity-plan.md
       $rel/00-ui-parity-matrix.md
     "Read" means open the file. Grep confirms what you already suspect; it cannot surface
     what you do not know to look for. Then update HANDOFF.md's \`last-full-plan-read:\` line.
  5. Rebuild the agent roster from HANDOFF.md §6 — treat it as append-only; it holds every
     handle spawned. Ping live IDs with one line: "identify your lane and the F-numbers you
     authored." IDs are resumable; names are not.
  6. Read docs/code-reviews/deferred.md before re-flagging anything (sole writer:
     dt-review-aggregator), and the newest vetted review under docs/code-reviews/ui-parity/
     before assuming any round's state.
  7. Run \`git status\`, \`git log --oneline -15\`, and \`git worktree list\` before resuming
     any task. Continue from committed progress; never redo work blindly.
MSG
else
  cat <<MSG
DREAMTEAM CONTINUITY: Demo<->Phone UI Parity v2 is in motion.
Branch: $branch @ $head_sha

Read $rel/HANDOFF.md before acting on any prior plan or summary — it is the current pointer
and it outranks any conversation summary. If you were mid-task, check \`git status\`,
\`git log\` and \`git worktree list\` first and continue from committed progress rather than
redoing work.

READ-FIRST DOCUMENTS, in order:
  1. $rel/HANDOFF.md
     — the runbook; injected whole below.
  2. $rel/01-master-ui-parity-plan.md
     — phases U0-U8, ratified decisions, binding conventions, progress tracker.
  3. $rel/00-ui-parity-matrix.md
     — the per-surface gap matrix + the owner's rulings.
  4. $rel/GATES.md
     — the blocking conditions. Never optional, never inferred from HANDOFF.md.
  5. .claude/skills/fleet-orchestration/SKILL.md
     — operating doctrine; its "Mapping to THIS repo" table resolves the kit's generic
       names. Plus hazard-playbook.md for every repo-writing agent and
       reviewer-contract.md for every review lane.
  6. features/demo/CLAUDE.md
     — the demo architecture contract. Binding.
MSG
fi

echo ""
if [ -f "$handoff" ]; then
  echo "--- $rel/HANDOFF.md (whole) ---"
  cat "$handoff"
else
  echo "!! $rel/HANDOFF.md is MISSING. The campaign directory exists but has no runbook."
  echo "   It may still be on the planning branch — check \`git branch -a\` and"
  echo "   \`git worktree list\` before assuming it was lost."
fi

# GATES.md rides along only on the recovery branch. At startup it is a pointer in the
# read-first list; after compaction the blocking conditions are exactly what a confident,
# half-recovered instance skips, so they go in whole.
if [ "$src" = "compact" ]; then
  echo ""
  if [ -f "$gates" ]; then
    echo "--- $rel/GATES.md (whole) ---"
    cat "$gates"
  else
    echo "!! $rel/GATES.md is MISSING — the blocking conditions are unreadable. Do not declare"
    echo "   any phase done until it is restored."
  fi
fi
exit 0
