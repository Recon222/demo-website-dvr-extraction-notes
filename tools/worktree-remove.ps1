<#
.SYNOPSIS
  Safely tear down a git worktree in this repo. Use this INSTEAD OF `git worktree remove`.

.DESCRIPTION
  `git worktree remove` does not work here. Measured 2026-08-26 on a freshly installed probe
  worktree: pnpm lays 549 directory JUNCTIONS inside node_modules (its symlink farm; the targets
  live in-tree under node_modules/.pnpm/), and `git worktree remove` exits 255 with
  "Directory not empty" -- AFTER it has already deregistered the worktree. You are left with a
  full tree on disk that git no longer knows about, which is the worst of both outcomes.

  Correct order, which this script implements:
    1. UNLINK every reparse point first. [IO.Directory]::Delete removes the LINK, never the
       target -- this is the whole reason the script exists. Recursive deletes FOLLOW junctions
       and delete what is on the other side.
    2. Remove the now-ordinary directory tree.
    3. `git worktree prune` to clear the administrative entry.

  For pnpm worktrees the junction targets are in-tree (node_modules/.pnpm/), so a wrong order
  costs you only the worktree. The guard below exists anyway: it counts the MAIN checkout's
  node_modules/.pnpm entries before and after and EXITS 1 if the number moved, because the day
  a junction does point outward is the day nobody is watching.

.PARAMETER WorktreePath
  Path of the worktree to remove. Must not be the main checkout.

.EXAMPLE
  pwsh -NoProfile -File tools/worktree-remove.ps1 "D:\...\worktrees\probe-foo"
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string] $WorktreePath
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
# First line of `git worktree list` is always the main working tree.
$mainCheckout = (& git -C $repoRoot worktree list | Select-Object -First 1) -replace '\s+[0-9a-f]{7,}\s+\[.*$', ''
$mainCheckout = $mainCheckout.Trim()
$pnpmDir = Join-Path $mainCheckout 'node_modules\.pnpm'

function Get-PnpmCount {
  if (-not (Test-Path -LiteralPath $pnpmDir)) { return -1 }
  (Get-ChildItem -LiteralPath $pnpmDir -Force -ErrorAction SilentlyContinue | Measure-Object).Count
}

if (-not (Test-Path -LiteralPath $WorktreePath)) {
  Write-Host "Nothing at '$WorktreePath'. Pruning administrative entries and stopping."
  & git -C $repoRoot worktree prune
  exit 0
}
$resolved = (Resolve-Path -LiteralPath $WorktreePath).Path
if ($resolved.TrimEnd('\') -ieq $mainCheckout.TrimEnd('\')) {
  Write-Error "REFUSING: '$resolved' is the main checkout, not a worktree."
  exit 1
}

$before = Get-PnpmCount
Write-Host "main checkout : $mainCheckout"
Write-Host "node_modules/.pnpm entries BEFORE: $before"
Write-Host "removing worktree: $resolved"

# --- 1. Unlink every reparse point, deepest first. -----------------------------------------
# Get-ChildItem does not descend INTO reparse points without -FollowSymlink, so this enumerates
# the links themselves. Loop until a pass finds none: unlinking can expose nested ones.
$totalUnlinked = 0
for ($pass = 1; $pass -le 10; $pass++) {
  $links = @(Get-ChildItem -LiteralPath $resolved -Recurse -Force -Directory `
               -Attributes ReparsePoint -ErrorAction SilentlyContinue)
  if ($links.Count -eq 0) { break }
  # Deepest first, so a parent link is never removed out from under a child.
  foreach ($link in ($links | Sort-Object { $_.FullName.Length } -Descending)) {
    try {
      [System.IO.Directory]::Delete($link.FullName)   # removes the LINK, not the target
      $totalUnlinked++
    } catch {
      Write-Warning "could not unlink $($link.FullName): $($_.Exception.Message)"
    }
  }
}
Write-Host "unlinked $totalUnlinked junction(s) in $pass pass(es)"

# --- 2. Remove the now-ordinary tree. -------------------------------------------------------
Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction Stop

# --- 3. Clear git's administrative entry. ---------------------------------------------------
& git -C $repoRoot worktree prune

# --- Proof. ---------------------------------------------------------------------------------
$after = Get-PnpmCount
Write-Host "node_modules/.pnpm entries AFTER : $after"
if ($before -ne $after) {
  Write-Error "MAIN CHECKOUT DAMAGED: node_modules/.pnpm went $before -> $after. Say so loudly and run 'pnpm install' in $mainCheckout."
  exit 1
}
Write-Host "OK -- worktree removed, main checkout's .pnpm store intact ($after entries)."
exit 0
