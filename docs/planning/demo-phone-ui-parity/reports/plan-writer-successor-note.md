# Successor note — editing the UI-parity planning docs

Nine invariants you cannot infer by reading `00-ui-parity-matrix.md` / `01-master-ui-parity-plan.md`.
Everything else is in the docs themselves.

## 1. All ID series are append-only, across rounds

- **Findings:** r1 used `V-1…V-46`; the r1 fix-delta used `VD-1…VD-11` (closed, never reused); r2 **continued at `V-47`**. A later round continues from the highest `V-*`. Never renumber, never recycle — the hazard playbook's "cross-referenced numbered lists are append-only" binds finding IDs, ledger §§ and runbook steps alike.
- **Tier-A rows** are `A1…A97`, **contiguous, no gaps**. A new token/recipe row takes `A98`. Do not renumber to group things.
- **Tier-B rows** carry *two* join keys: the v1 matrix row `#` and the `ui-mapping` doc number. Both inventories join on those. A row with only one is unfindable.
- **Decisions** are `D1…D20`. D18 is an *override*, D2/D5/D10/D15 carry *amendments* — the original recommendation stays visible (struck or quoted) so a reader sees what was rejected.

## 2. Totals are machine-derived. Never hand-patch them.

Re-run this after **any** edit that touches a Tier-A row, and paste its output:

```python
import io,re,collections
s=io.open('00-ui-parity-matrix.md',encoding='utf-8').read().split('\n')
r={}
for ln in s:
    m=re.match(r'^\| \*\*(A\d+)\*\* \|',ln)
    if m: c=[x.strip() for x in ln.split(' | ')]; r[m.group(1)]=(c[3],c[-2])
print(len(r), sorted(int(k[1:]) for k in r)==list(range(1,98)))
print(collections.Counter(re.sub(r'[*`]','',v[0]).split('(')[0].split('—')[0].strip() for v in r.values()))
print(collections.Counter(re.sub(r'[*`]','',v[1]).strip() for v in r.values()))
```

Current truth: **97 rows · DRIFTED 41 · MISSING 24 · MISSING-SEAM 21 · COMPLETE 7 · OPTIONAL/PARTIAL/N-A/OUT 1 each · effort S53 M35 L5 —4.** Three r1 findings (V-38, V-42, V-44) were nothing but hand-tallied totals drifting from the rows.

## 3. Some cells are pasted verbatim into implementer briefs

§6.4's briefing template pastes: **item 2** = the package's whole `§5` row; **item 3** = its **Matrix-rows** cell, expanded to full Delta text; **item 1** = §2 and §4 entire; **item 8** = the §3 Blocks column.

So: **a package's Matrix-rows cell lists only ITS OWN rows.** Pasting the phase-wide list there (as U0.1 once did) silently hands one implementer five packages' work. Same reason the Scope cell must not contradict the row body — it is the first line the implementer reads.

## 4. One anchor number set, and it counts KEYS

`~15 → +24 → +4 → +1 = ~44 keys`. Each key is pinned in **both scheme halves**, so ~44 keys are **~88 anchor rows**. Every figure in both docs is a **key** count; say "keys" or say "rows", never a bare number. U1.1's 24 = 4 per tier (2 gradient stops + `border` + `highlightTop`) × 6 tiers — `innerShadow` is deliberately unanchored.

## 5. Every owner ruling lives in triplicate and must stay identical

Matrix `§DECISIONS` body · matrix `§OWNER RATIFICATION` row · plan `§3` row. Edit one, edit all three. The D1 checkpoint conflict survived two review rounds because only two of the three were updated.

## 6. Hex sweeps are case-insensitive

`#4BA3D4`/`#4ba3d4`, `#34C759`/`#34c759`, `#fff`/`#FFFFFF`. A case-sensitive replace misses live sites and the banned-literal guard then passes over real drift.

## 7. Traps that cost time here

- **Grep the BARE phrase.** "22 anchors" survived a round because the sweep grepped the r1 *pattern*, not the words.
- **`grep -c` lies twice:** phone diffstats (`+129/-49`) match numeric estimate patterns, and BRE `\?` matches unexpectedly. Confirm any residual count with a Python regex before believing it.
- **Scripted edits assert their own match.** `assert s.count(a) == 1` before every replace — a silent no-op plus a report claiming success is how a mapping ends up contradicting the tree.
- **Encode before you open for write.** `open(p,'w')` truncates *first*; a bad character then raises and leaves an empty file. Build the string, `s.encode('utf-8')`, then `open(p,'wb')`. I truncated the plan this way once and recovered from HEAD.

## 8. The fidelity bar outranks the gates

§9 clause 11 is the *definition* of done; clauses 1–10 are its floor. Do not add prose restating it per phase — §4.7's anti-restatement rule applies to these docs too (V-53 was exactly that).

## 9. Do not edit `GATES.md` or anything on `master` from this branch

`GATES.md` lives on `master`. Hand the orchestrator the replacement sentence in your reply instead.
