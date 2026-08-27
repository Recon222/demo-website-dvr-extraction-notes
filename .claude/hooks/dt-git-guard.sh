#!/usr/bin/env bash
# Dreamteam git guard (PreToolUse:Bash) — the mechanical half of the hazard playbook.
#
# `.claude/skills/fleet-orchestration/hazard-playbook.md` opens with "Git — the two that
# destroy work". Both were paid for by real incidents: a shared stash stack swapping two
# agents' changesets, and one uninspected blanket restore destroying a sibling agent's
# uncommitted work unrecoverably. A rule in a file only binds the agents that read it; this
# hook binds every Bash call in the session.
#
# Exit 2 blocks the call AND feeds this message back to the model, so the refusal doubles as
# the instruction for what to do instead. Everything else exits 0 silently — a guard that
# comments on ordinary commands gets ignored on the one command that matters.
#
# What is deliberately NOT blocked: a file-SPECIFIC restore (`git checkout -- path/to/file`).
# The carve-out's reasoning is that naming a path means you know what you are discarding —
# which the playbook itself records as only partly true, so it carries a written rule instead
# of a hook: commit the fix FIRST, then probe, and probe in a throwaway worktree.

set -u

input="$(cat 2>/dev/null || true)"
[ -z "${input:-}" ] && exit 0

if command -v jq >/dev/null 2>&1; then
  cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
else
  cmd=""
fi
if [ -z "${cmd:-}" ]; then
  cmd="$(printf '%s' "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' | head -1)"
fi
[ -z "${cmd:-}" ] && exit 0

# `git` possibly preceded by a chain operator, and possibly with -C <dir> / -c k=v options.
G='(^|[;&|(){}[:space:]])git([[:space:]]+-[cC][[:space:]]+[^[:space:]]+)*[[:space:]]+'

# PreToolUse feeds the hook's STDERR back to the model on exit 2 (hooks reference), while
# every other Dreamteam hook here writes to stdout. Emit on BOTH so the refusal reaches the
# model whichever stream the harness reads — a blocked call with an invisible reason is just
# an unexplained failure.
block() {
  msg="$(cat <<MSG
BLOCKED by dt-git-guard: $1

$2

Rule: .claude/skills/fleet-orchestration/hazard-playbook.md — "Git — the two that destroy
work". Every rule in that file was paid for by a real incident; this one is enforced
mechanically because the damage is unrecoverable and instant. Re-read the section before
reaching for another shape of the same command.
MSG
)"
  echo "$msg"
  echo "$msg" >&2
  exit 2
}

# --- 1. Mutating git stash ------------------------------------------------------------
# The stash stack is shared across ALL worktrees of a repo, so two agents stashing
# concurrently swap each other's changesets. `list` and `show` are read-only and allowed.
if printf '%s' "$cmd" | grep -Eq "${G}stash([[:space:]]+(push|pop|apply|drop|clear|save|branch)([[:space:]]|$)|[[:space:]]*($|[;&|]))"; then
  block "mutating \`git stash\`." \
"The stash stack is SHARED ACROSS EVERY WORKTREE of this repo. Two agents stashing
concurrently swap each other's changesets, and the loss is silent. Commit work-in-progress to
your own branch instead:

    git add <named paths> && git commit -m \"wip: <what>\"

Read-only \`git stash list\` and \`git stash show\` are allowed and were not blocked."
fi

# --- 2. Blanket working-tree discard ---------------------------------------------------
# One uninspected restore has already destroyed a sibling agent's uncommitted work.
if printf '%s' "$cmd" | grep -Eq "${G}checkout([[:space:]]+--)?[[:space:]]+\.([[:space:]]|$)" \
   || printf '%s' "$cmd" | grep -Eq "${G}restore([[:space:]]+(--staged|--worktree|--source[= ][^[:space:]]+))*[[:space:]]+\.([[:space:]]|$)" \
   || printf '%s' "$cmd" | grep -Eq "${G}clean[[:space:]]+-[a-zA-Z]*f"; then
  block "a blanket working-tree discard." \
"This discards changes you have not read, in a tree other agents may be live in. One
uninspected restore has already destroyed a sibling agent's uncommitted work, unrecoverably.

Run \`git status\` and \`git diff\` FIRST, then restore only the files you own, NAMED
EXPLICITLY — a file-specific \`git checkout -- path/to/file\` is not blocked. If you genuinely
need a clean tree, cut your own worktree:

    git worktree add <scratch>/probe-<topic> -b probe/<topic> <head>

And note the companion rule a hook cannot enforce: commit your fix BEFORE you probe. A named
restore that reverts a probe mutation also destroys the uncommitted fix living in the same
file. Naming the path is not knowing the contents."
fi

# --- 3. Indiscriminate staging -------------------------------------------------------
# An orchestrator's `commit -a` on a doc change once swept an implementer's in-flight edit
# into an unrelated commit, leaving a review finding with no traceable fix.
if printf '%s' "$cmd" | grep -Eq "${G}add[[:space:]]+(-A|--all|\.)([[:space:]]|$)" \
   || printf '%s' "$cmd" | grep -Eq "${G}commit([[:space:]]+-[a-zA-Z]*a[a-zA-Z]*|[[:space:]]+--all)([[:space:]]|$)"; then
  block "indiscriminate staging (\`git add -A\` / \`git add .\` / \`git commit -a\`)." \
"This sweeps up every modified file in the tree, including files another agent is editing
right now. An orchestrator's \`commit -a\` on a doc change once swept an implementer's
in-flight edit into an unrelated commit, leaving a review finding with no traceable fix.

Stage NAMED PATHS only:

    git add path/one path/two && git commit -m \"...\"

Run \`git status --short\` first if you are not sure what is dirty."
fi

exit 0
