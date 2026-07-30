export const meta = {
  name: 'demo-phase-review',
  description: 'Phase-boundary multi-agent review: parallel Opus lanes write findings to disk, a Fable aggregator dedupes/settles and emits one vetted review doc',
  whenToUse: 'Run at each demo↔phone parity phase boundary (and for any PR review in this repo). Initial mode reviews a diff; fix-delta mode re-checks a fix round against the prior review.',
  phases: [
    { title: 'Review', detail: 'parallel Opus lane reviewers, full findings to disk', model: 'opus' },
    { title: 'Aggregate', detail: 'Fable aggregator dedupes, settles conflicts, writes the vetted review doc', model: 'fable' },
  ],
}

// args: {
//   repoDir:  absolute path of the checkout/worktree holding the code under review (required)
//   baseRef:  merge-base ref, e.g. 'master' (required)
//   headRef:  ref under review, e.g. 'feat/parity-p0' (required)
//   phaseId:  slug for doc naming, e.g. 'p0' (required)
//   reviewDir: absolute dir for lane files + final doc, e.g. <repo>/docs/code-reviews/parity/p0 (required)
//   mode:     'initial' (default) | 'fix-delta'
//   priorReviewDoc: absolute path of the previous vetted review doc (required for fix-delta)
//   context:  optional free-text context for reviewers (phase scope, deliberate choices not to re-flag)
// }
let a = args || {}
if (typeof a === 'string') {
  try { a = JSON.parse(a) } catch (e) { throw new Error('args arrived as an unparseable string: ' + e.message) }
}
const { repoDir, baseRef, headRef, phaseId, reviewDir } = a
const mode = a.mode || 'initial'
const priorReviewDoc = a.priorReviewDoc || null
const extraContext = a.context || ''
if (!repoDir || !baseRef || !headRef || !phaseId || !reviewDir) {
  throw new Error('required args: repoDir, baseRef, headRef, phaseId, reviewDir')
}
if (mode === 'fix-delta' && !priorReviewDoc) {
  throw new Error('fix-delta mode requires priorReviewDoc')
}

const LANES = [
  { key: 'typescript', def: '.claude/agents/typescript-reviewer.md', focus: 'TypeScript 5.7 strict + Next.js 15 App Router + React 19 correctness, RSC/use-client boundaries, and demo architecture compliance (store-bridge rule, engine purity, single barrel, registry-derived ordering, no Date.now/Math.random at render scope)' },
  { key: 'web', def: '.claude/agents/web-reviewer.md', focus: 'React/Next web performance (re-renders, memoization, dynamic imports, bundle), accessibility (focus management, ARIA, WCAG), browser-API correctness (mediaDevices, geolocation, sessionStorage, mapbox-gl, pdf.js), inline-style discipline incl. the do-not-restyle-lifted-rules rule, marketing/demo isolation' },
  { key: 'tests', def: '.claude/agents/test-analyzer.md', focus: 'test quality: behavioral meaningfulness vs framework-shape noise, Vitest 4 + jsdom + RTL patterns, injected-store component tests, the engine 80% coverage gate, the vitest.setup contracts (navigator.mediaDevices deliberately undefined)' },
  { key: 'silent-failures', def: '.claude/agents/silent-failure-hunter.md', focus: 'swallowed, downgraded, or hidden errors on the demo failure surfaces: pdf.js extraction, Ollama proxy + FallbackMode honesty machinery, mapbox token fallback, sessionStorage persistence, getUserMedia paths, import pipeline generation tokens' },
  { key: 'type-design', def: '.claude/agents/type-design-analyzer.md', focus: 'type design quality: invariant expression, discriminated-union exhaustiveness, unrepresentable-state modeling (RetentionView-style), Zod/validation boundary completeness' },
]

const LANE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lane', 'path', 'blockers', 'majors', 'minors', 'top'],
  properties: {
    lane: { type: 'string' },
    path: { type: 'string', description: 'absolute path of the lane findings file written to disk' },
    blockers: { type: 'integer' },
    majors: { type: 'integer' },
    minors: { type: 'integer' },
    top: { type: 'array', items: { type: 'string' }, description: 'one line per BLOCKER/MAJOR finding: "ID severity file:line — claim"' },
  },
}

const AGG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reviewDocPath', 'verdict', 'blockers', 'majors', 'minors', 'summary'],
  properties: {
    reviewDocPath: { type: 'string' },
    verdict: { type: 'string', enum: ['approve', 'approve-with-fixes', 'needs-work'] },
    blockers: { type: 'integer' },
    majors: { type: 'integer' },
    minors: { type: 'integer' },
    summary: { type: 'string', description: '3-6 sentences: overall quality, the themes, what gates the merge' },
  },
}

const modeBlock = mode === 'fix-delta'
  ? `MODE: FIX-DELTA. This is a re-review of a fix round.
- Read the prior vetted review doc at ${priorReviewDoc} and, if it exists, your own prior lane file at ${reviewDir}/lane-LANEKEY.md.
- For EVERY finding previously attributed to your lane: verify against the current code whether it is genuinely fixed, partially fixed, or unfixed — cite the fix commit or the still-broken line.
- Hunt for regressions INTRODUCED by the fixes themselves. New findings outside the fix commits' blast radius are out of scope.
- Your lane file for this run: OVERWRITE ${reviewDir}/lane-LANEKEY.md with a "Fix-delta" section on top (per prior finding: FIXED/PARTIAL/UNFIXED + evidence) followed by any new fix-introduced findings.`
  : `MODE: INITIAL. Full review of the diff.`

phase('Review')
const laneResults = (await parallel(LANES.map(l => () => agent(
  `You are the ${l.key} review lane for the demo repo phase review "${phaseId}".

REPO UNDER REVIEW: ${repoDir} (a checkout/worktree of the demo website repo). Diff under review: \`git -C ${repoDir} diff ${baseRef}...${headRef}\` (also use \`git -C ${repoDir} diff --stat ${baseRef}...${headRef}\` and \`git -C ${repoDir} log --oneline ${baseRef}..${headRef}\` to orient). Review the full files behind the hunks, not just the hunks.

YOUR LANE DEFINITION: read ${repoDir}/${l.def} and follow it — it is the authoritative description of your focus, severity taxonomy, and verification duty. If that file does not exist, proceed with this focus instead: ${l.focus}. Either way, also read ${repoDir}/features/demo/CLAUDE.md (binding architecture contract) before judging anything.

${modeBlock.replace(/LANEKEY/g, l.key)}

${extraContext ? `PHASE CONTEXT FROM THE ORCHESTRATOR (deliberate choices — do not re-flag): ${extraContext}` : ''}

DISCIPLINE:
- Verify every finding against the actual code before writing it — try to refute yourself first; drop what you cannot ground in a file:line.
- Severities: BLOCKER (would ship a real defect / violates a binding contract), MAJOR (should fix before merge), MINOR (note, fix opportunistically).
- Findings must be actionable: claim, evidence (file:line), concrete suggested fix.
- READ-ONLY except for your one output file. Do not modify repo code, do not commit, do not touch other lanes' files.

OUTPUT: write your FULL findings to ${reviewDir}/lane-${l.key}.md (create the directory if needed) in this format: a header (lane, mode, refs reviewed), then one section per finding: \`## ${l.key.toUpperCase()}-<n> [SEVERITY] <file>:<line>\` with Claim / Evidence / Suggested fix / Confidence. If you have zero findings, write the file saying so explicitly with what you checked.
Your structured return: lane key, the file path, counts, and one line per BLOCKER/MAJOR.`,
  { label: `review:${l.key}`, phase: 'Review', model: 'opus', schema: LANE_SCHEMA }
)))).filter(Boolean)

if (laneResults.length === 0) throw new Error('all review lanes failed — nothing to aggregate')
log(`${laneResults.length}/${LANES.length} lanes reported: ${laneResults.map(r => `${r.lane} B${r.blockers}/M${r.majors}/m${r.minors}`).join(', ')}`)

phase('Aggregate')
const agg = await agent(
  `You are the review AGGREGATOR (Fable) for demo repo phase review "${phaseId}", mode ${mode}. The lane reviewers have written their full findings to disk; your job is to turn them into ONE vetted review document. The orchestrator will read ONLY your document — nothing you drop or garble can be recovered downstream, so be rigorous.

INPUT FILES (read all): ${laneResults.map(r => r.path).join(', ')}
Lane self-reported counts: ${JSON.stringify(laneResults.map(r => ({ lane: r.lane, blockers: r.blockers, majors: r.majors, minors: r.minors })))}
Repo: ${repoDir}; diff: \`git -C ${repoDir} diff ${baseRef}...${headRef}\`.
${mode === 'fix-delta' ? `Prior vetted review doc: ${priorReviewDoc} — your output must state, per prior finding, its final status (FIXED/PARTIAL/UNFIXED) using the lanes' fix-delta sections.` : ''}

DO:
1. Dedupe: the same underlying defect reported by multiple lanes becomes ONE finding (keep the clearest writeup, note which lenses caught it).
2. Settle conflicts: where lanes disagree (one calls it a defect, another calls it deliberate; contradictory severity), open the code and DECIDE — record the rationale. The binding contracts (features/demo/CLAUDE.md, the parity plan §4) win arguments.
3. Spot-check: independently verify every BLOCKER and a sample of MAJORs against the code; demote or drop anything that doesn't hold, and say so.
4. Verdict: approve (no blockers/majors) / approve-with-fixes (fixable before merge, no re-architecture) / needs-work.
5. Write the final vetted doc to ${reviewDir}/${phaseId}-review${mode === 'fix-delta' ? '-fixdelta' : ''}.md: header (phase, mode, refs, date left as the phase id — no timestamps), verdict + counts, a findings table (stable IDs like R-1..R-n, severity, file:line, one-line claim), then one section per finding with full claim/evidence/suggested fix AND a "suggested owner" line naming which parity work package's authoring agent should fix it (infer from the files touched), then a Dropped/Demoted appendix (what you cut from the lane files and why), then the raw lane-file inventory.

READ-ONLY except your one output document. Do not modify code, do not commit.
Return the structured result only.`,
  { label: 'aggregate', phase: 'Aggregate', model: 'fable', schema: AGG_SCHEMA }
)

if (!agg) throw new Error('aggregator failed')
log(`verdict: ${agg.verdict} — B${agg.blockers}/M${agg.majors}/m${agg.minors} → ${agg.reviewDocPath}`)

return {
  phaseId,
  mode,
  verdict: agg.verdict,
  blockers: agg.blockers,
  majors: agg.majors,
  minors: agg.minors,
  summary: agg.summary,
  reviewDocPath: agg.reviewDocPath,
  laneFiles: laneResults.map(r => ({ lane: r.lane, path: r.path, blockers: r.blockers, majors: r.majors, minors: r.minors })),
}
