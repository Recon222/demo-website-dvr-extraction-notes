---
name: author-reviewer-coms
description: >-
  Use whenever you are ONE of TWO Claude Code terminals coordinating an async author↔reviewer
  code-review loop through file-drop inboxes — so the human never has to relay messages between
  terminals. Load this BEFORE setting up any inbox watcher or writing any coordination note, so the
  bash mechanics (one-shot watcher, temp→move atomic delivery, archive, re-arm, session-boundary
  recovery) are exactly right the first time. Triggers on: "watch the/my inbox", "the other
  terminal/instance", "author↔reviewer coms", "drop a note to the reviewer/author", "set up the
  watcher", "re-arm the watcher", "review-request", "fixes-done", "fix-delta", "done-ack", or any
  turn where you are playing the author half or the reviewer half of a two-terminal review handshake.
  Applies even when the user just says "coordinate with the other terminal" or "ping me when they
  reply" without naming the protocol.
---

# Author ↔ Reviewer Terminal Coms

Two Claude Code terminals — an **Author** (writes code, opens PRs, applies fixes) and a **Reviewer**
(runs code review, returns findings, declares done) — coordinate entirely through two file-drop
inboxes. Each side runs a one-shot **watcher** on its own inbox that pings the instant a note lands.
The point: the human sets it up once and then stays out of the loop — no copy-pasting messages
between windows.

This skill is loaded by BOTH sides. First figure out which role you are (below), then follow the
shared mechanics + your role's playbook.

## Which role are you?

The human tells you ("you're the reviewer for this project") — or infer it: **you read from your own
inbox and write to the other side's inbox.**

- **Author** → reads `author-inbox`, writes to `reviewer-inbox`.
- **Reviewer** → reads `reviewer-inbox`, writes to `author-inbox`.

If you're ever unsure, ask once — getting this backwards means you're watching the wrong inbox.

## Paths (this project)

```
docs/coms/
├── author-inbox/      ← Author reads here;   Reviewer delivers here
├── reviewer-inbox/    ← Reviewer reads here; Author delivers here
└── archive/           ← processed notes moved here (create with mkdir -p on first use)
```

Absolute base for this project:
`D:/Work Coding Projects/CCTV Recovery Notes App/demo-website-dvr-extraction-notes/demo-website-dvr-extraction-notes`

Staging files live directly in `docs/coms/` as `.staging-*.md` (same drive as the inboxes — this is
what makes delivery atomic; see below).

**Adapting to another project:** keep the same shape — `docs/coms/{author-inbox,reviewer-inbox,archive}`
— and update the absolute base. Nothing else changes.

## The mechanics — get these exactly right (both roles)

These four bash patterns are the whole engine. The failure modes below are real ones that have
bitten this setup; the code is written to avoid them.

### 1. The watcher (one-shot, re-armed after every send)

Run this as a **background** command. It blocks until a real note file appears in your inbox, then
exits — and a completed background command re-invokes you automatically. That exit *is* the ping.

```bash
INBOX="<absolute path to YOUR inbox>"
until [ -n "$(find "$INBOX" -maxdepth 1 -type f 2>/dev/null)" ]; do sleep 2; done
echo "NOTE(S) ARRIVED:"; find "$INBOX" -maxdepth 1 -type f
```

Why `find -maxdepth 1 -type f` and not `ls`: it fires **only on an actual note file**, ignoring the
`archive/` subdirectory if one happens to sit inside the inbox. A plain `ls`/`ls -A` would see the
`archive` dir as "content" and the watcher would fire instantly in a busy-loop. `find -type f` is
immune to that.

Launch it with the tool's background flag (e.g. `run_in_background: true`). Do **not** foreground it —
you need to keep working (or idle) while it waits. The watch ending each cycle is normal; it's
one-shot **by design**, which is why you re-arm after every note you send.

### 2. Delivering a note (temp → move, atomic — never write into the inbox directly)

```bash
# Step A: write the FINISHED note with the Write tool to a staging path OUTSIDE any watched inbox,
#         on the SAME drive as the inboxes:
#   docs/coms/.staging-<name>.md
# Step B: atomically move it in:
mv "docs/coms/.staging-<name>.md" "docs/coms/<recipient>-inbox/<name>.md"
```

Why: a watcher fires the instant a file appears. If you wrote the note **directly** into the inbox,
the other side could be pinged and read it while it's still half-written. `mv` between two paths on
the **same filesystem** is an atomic rename — the file appears complete or not at all. That's why the
staging file must be on the same drive (a cross-drive `mv` degrades to copy+delete and loses
atomicity). Name files with an incrementing sender prefix so they sort oldest-first:
`reviewer-001-*.md`, `reviewer-002-*.md`, … / `author-001-*.md`, …

### 3. After reading a note — archive, THEN re-arm

```bash
mkdir -p "docs/coms/archive"
mv "docs/coms/<your>-inbox/<note>.md" "docs/coms/archive/"
```

Clear your inbox before re-arming so the next watch starts on an empty inbox (otherwise it fires
immediately on the note you already handled). Process oldest-first if two ever land. Keeping the
archive gives you and the human a full audit trail of the exchange.

### 4. Re-arm immediately after you dispatch your reply

The cadence is always: **read → (do the work) → deliver your note → re-arm the watcher → wait.**
Re-arm right after delivering, so you're listening again before the other side can respond. If you
forget to re-arm, you'll miss their next note and the loop stalls.

### Session-boundary recovery (important)

The background watcher is a process — it **dies when the Claude Code process exits** (session end,
restart, teardown). It leaves no marker. So at the **start of any session where you're mid-protocol**,
do NOT assume the watcher survived:

```bash
find "docs/coms/<your>-inbox" -maxdepth 1 -type f    # did a note land while the watcher was down?
```

Handle anything you find, then re-arm. This is the one failure that silently breaks the loop across
restarts — check the inbox first, every time you come back.

## The note format

Every note is a short `key: value` header, then freeform markdown. Keep it self-contained so the
recipient can act without hunting for context.

```
type:      review-request | review | fixes-done | done-ack | question
from:      author | reviewer
to:        reviewer | author
pr:        <number / URL / n/a>
milestone: <short id, e.g. M2-transport>
round:     <N / n/a>
verdict:   <REVISE | clean — milestone approved>   # reviewer 'review' notes only
```

Body: for a `review-request`, the PR number + the exact commit range/SHA to review. For a `review`,
the verdict + findings (a few no-code lines each) + a pointer to the full review doc. For
`fixes-done`, the commit→finding map + the single fix SHA. Keep it tight.

## The protocol (per milestone)

1. **Author** finishes a milestone, pushes the PR with a complete body, drops
   `type: review-request` (PR # + commit range) into `reviewer-inbox`. Re-arms.
2. **Reviewer** reviews the **pushed** diff (`gh pr diff <n>` / `git show`, not the local tree),
   writes the review, drops `type: review` with a **verdict** into `author-inbox`. Re-arms.
3. **Author** reads it (apply the `receiving-code-review` discipline — verify before agreeing),
   posts a short plan, implements fixes, pushes, maps commits→findings in a PR comment, drops
   `type: fixes-done` naming the **single fix SHA**. Re-arms.
4. **Reviewer** runs a **fix-delta** review scoped to just that delta, and returns a verdict:
   - `findings remain` → back to step 3 as the next round.
   - `clean — milestone approved` → the reviewer declares the milestone done.
5. On `clean — milestone approved`, **Author** replies `type: done-ack` and moves to the next
   milestone. Repeat from step 1.

**The reviewer declares "done."** The author doesn't guess — it waits for `clean — milestone
approved`. If the author disagrees with a finding, it pushes back in the note (with reasoning)
rather than silently skipping it.

**Round cap: 3.** If a milestone is still trading notes after 3 fix rounds, escalate to the human
instead of looping — a persistent disagreement is theirs to break.

## Reviewer playbook

- **Review the pushed branch, not the local tree** — the author's working copy isn't yours and may
  be dirty. Use `gh pr diff <n>` or `git show <sha>`.
- **Fan out**, then adjudicate. If this project has a `/code-review` command / reviewer agents, use
  them; aggregate their findings, dedupe, and surface cross-lane conflicts. Decide a single verdict
  (BLOCK/REVISE on any HIGH; APPROVE otherwise). Write the full review to a durable doc (e.g.
  `docs/code-reviews/pr-<n>-review.md`) and put a concise version + the verdict in the note.
- **Scope a fix-delta to the exact fix commit — `git show <sha>`.** Do **not** use a two-dot range
  like `<base>..<tip>`: two-dot *excludes* the base commit, and if other commits landed interleaved
  in history, the range silently pulls them in or drops the ones you want. When in doubt, review the
  named SHA and verify the file list matches what the author said they changed.
- **Verify fixes closed, don't rubber-stamp.** Re-run the gates; where you can, mutation-test a fix
  (break it, confirm a test goes red, restore) before calling it closed.

## Author playbook

- Push a **complete PR body** before requesting review (summary, what changed, how to verify) — the
  reviewer scopes off it. On round 2+, append a "Round N — review fixes" section so the fix-delta
  scopes to just the new work.
- After fixes: push, **map each commit to the finding(s) it closes** in a PR comment, and name the
  **single fix SHA** in your `fixes-done` note so the reviewer's delta is unambiguous.
- Applying review feedback is not performative agreement — verify each finding is real before
  implementing, and push back with reasoning if one is wrong. RED-first fixes (write the failing
  test first) make the reviewer's job — and yours — much easier.

## Gotchas (the short list)

- **Archive lives OUTSIDE the watched inbox** (a `docs/coms/archive/` sibling). The `find -type f`
  watcher tolerates an archive subdir too, but a sibling keeps the inbox clean.
- **Staging on the same drive** as the inboxes, or `mv` isn't atomic.
- **Re-arm every cycle**, right after you deliver.
- **On session restart, check your inbox before trusting the watcher** — it died with the last process.
- **Fix-deltas scope to one SHA** (`git show`), never a loose range.
- The `docs/coms/` channel is ephemeral coordination — gitignoring it is reasonable so the notes
  don't clutter history (the review docs under `docs/code-reviews/` are the durable record).
