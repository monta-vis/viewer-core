---
description: Merge all worktree commits to main, push, and sync all worktrees
---

# Sync Worktrees

Merges worktree branches into main and syncs everything.

**Run from host** (not container) - SSH keys needed for push.

## Usage

```
/sync              # Sync ALL worktrees
/sync Toni         # Sync only Toni
/sync Toni Lina    # Sync Toni and Lina
```

## Configuration

```bash
# Arguments passed to sync (worktree names)
SYNC_ARGS="$*"

# Auto-detect all worktrees (excludes main repo)
MAIN_REPO=$(git rev-parse --show-toplevel)
ALL_WORKTREES=()
while IFS= read -r line; do
  WT_PATH=$(echo "$line" | awk '{print $1}')
  WT_BRANCH=$(echo "$line" | awk '{print $3}' | tr -d '[]')
  if [[ "$WT_PATH" != "$MAIN_REPO" && -n "$WT_BRANCH" ]]; then
    ALL_WORKTREES+=("$WT_BRANCH")
  fi
done < <(git worktree list)

# Filter worktrees if arguments provided
if [ -n "$SYNC_ARGS" ]; then
  WORKTREES=()
  for arg in $SYNC_ARGS; do
    # Case-insensitive match
    for wt in "${ALL_WORKTREES[@]}"; do
      if [[ "${wt,,}" == "${arg,,}" ]]; then
        WORKTREES+=("$wt")
      fi
    done
  done
  echo "Syncing selected: ${WORKTREES[*]}"
else
  WORKTREES=("${ALL_WORKTREES[@]}")
  echo "Syncing all: ${WORKTREES[*]}"
fi

DOCKER_GIT_PATH="/main-repo-git/worktrees"

# Exit early if no worktrees
if [ ${#WORKTREES[@]} -eq 0 ]; then
  echo "No worktrees found. Nothing to sync."
  exit 0
fi
```

> **Note:** Worktree names are case-insensitive. `/sync toni` = `/sync Toni`

---

## Step 0: Survey - What needs to be synced?

**IMPORTANT:** First show the user what commits exist to merge, THEN check for blockers.

### 0.1 Fix worktree .git paths (if needed)

Worktrees may have Docker paths. Fix them first so git commands work:

```bash
REPO_ROOT="C:/Users/Julian/Desktop/Software/monta-vis/montavis-creator"
for wt in "${WORKTREES[@]}"; do
  WT_PATH="C:/Users/Julian/Desktop/Software/monta-vis/montavis-creator-worktrees/$wt"
  if [ -d "$WT_PATH" ]; then
    echo "gitdir: $REPO_ROOT/.git/worktrees/$wt" > "$WT_PATH/.git"
  fi
done
```

### 0.2 Show commits to merge (THE ACTUAL WORK)

```bash
echo "=== COMMITS TO MERGE ==="
for wt in "${WORKTREES[@]}"; do
  WT_PATH="C:/Users/Julian/Desktop/Software/monta-vis/montavis-creator-worktrees/$wt"
  COUNT=$(git -C "$WT_PATH" rev-list main..$wt --count 2>/dev/null || echo 0)
  echo ""
  echo "=== $wt: $COUNT commit(s) ==="
  if [ "$COUNT" -gt 0 ]; then
    git -C "$WT_PATH" log main..$wt --oneline
  else
    echo "(nothing to merge)"
  fi
done
```

Display as table:
| Worktree | Commits | Description |
|----------|---------|-------------|
| Lina     | 1       | Fix: Offline download status |
| Toni     | 1       | Feature: Add Viewer Mode toggle |

### 0.3 Check for uncommitted changes (SAFETY CHECK)

> **⚠️ WARNING:** `git reset --hard` in Step 3 will **PERMANENTLY DELETE** uncommitted changes.

```bash
echo ""
echo "=== UNCOMMITTED CHANGES (blockers for reset) ==="
HAS_CHANGES=false

# Main repo
echo "Main repo:"
MAIN_STATUS=$(git status --porcelain)
if [ -n "$MAIN_STATUS" ]; then
  echo "$MAIN_STATUS"
  HAS_CHANGES=true
else
  echo "(clean)"
fi

# All worktrees
for wt in "${WORKTREES[@]}"; do
  WT_PATH="C:/Users/Julian/Desktop/Software/monta-vis/montavis-creator-worktrees/$wt"
  echo "=== $wt ==="
  WT_STATUS=$(git -C "$WT_PATH" status --porcelain 2>/dev/null)
  if [ -n "$WT_STATUS" ]; then
    echo "$WT_STATUS"
    HAS_CHANGES=true
  else
    echo "(clean)"
  fi
done
```

### 0.4 Handle uncommitted changes

**If uncommitted changes found, ask user:**

```
Uncommitted changes detected in: [list locations]

1. COMMIT - Commit these changes first (recommended)
2. DISCARD - Discard changes: git checkout -- . && git clean -fd
3. ABORT - Cancel sync

Which option?
```

**If user chooses COMMIT:**
- For each location with changes, help commit them
- Then continue to Step 1

**NEVER proceed to merge until uncommitted changes are handled.**

---

## Step 1: Pre-Commit Quality Check

### Blocked Files (NEVER commit)

```bash
git diff --cached --name-only | grep -E "(\.env$|\.env\.local|settings\.local\.json|\.db$|node_modules|dist/|\.log$)"
```

| Pattern               | Reason            |
| --------------------- | ----------------- |
| `.env*`               | Secrets/API keys  |
| `settings.local.json` | Local permissions |
| `*.db`, `*.sqlite`    | Database files    |
| `node_modules/`       | Dependencies      |
| `dist/`               | Build output      |

**If found:** `git reset HEAD <file>` and add to `.gitignore`

### Code Quality

```bash
npm run typecheck                    # Must pass
git diff --cached | grep -E "(console\.(log|debug)|debugger)"  # Warning only
```

---

## Step 2: Merge Branches into Main

```bash
git checkout main

for wt in "${WORKTREES[@]}"; do
  COUNT=$(git rev-list main..$wt --count 2>/dev/null || echo 0)
  if [ "$COUNT" -gt 0 ]; then
    echo "Merging $wt ($COUNT commits)"
    git merge $wt -m "Merge $wt into main"
  fi
done
```

### Conflict Resolution (CRITICAL)

**NEVER use `--ours` or `--theirs`** - always combine both versions manually.

1. Read both versions: `git show HEAD:<file>` vs `git show MERGE_HEAD:<file>`
2. Combine ALL functionality from both
3. Remove conflict markers, stage, and commit

---

## Step 3: Push and Reset Worktrees

### 3.1 Push main to remote

```bash
git push
```

### 3.2 FINAL SAFETY CHECK before reset (REQUIRED!)

> **⚠️ LAST CHANCE: Verify worktrees are clean before destructive reset!**

```bash
echo "=== FINAL SAFETY CHECK before reset ==="
for wt in "${WORKTREES[@]}"; do
  WT_PATH="C:/Users/Julian/Desktop/Software/monta-vis/montavis-creator-worktrees/$wt"
  WT_STATUS=$(git -C "$WT_PATH" status --porcelain 2>/dev/null)
  if [ -n "$WT_STATUS" ]; then
    echo "🛑 ABORT: $wt has uncommitted changes!"
    echo "$WT_STATUS"
    echo "Cannot proceed with reset. Fix this first."
    exit 1
  fi
  echo "✓ $wt is clean"
done
echo "All worktrees clean. Safe to proceed with reset."
```

**If ANY worktree shows uncommitted changes, STOP and ask user before proceeding.**

### 3.3 Reset worktrees to main

```bash
# Get repo root (Windows-compatible)
if command -v cygpath &>/dev/null; then
  REPO_ROOT=$(cygpath -w "$(git rev-parse --show-toplevel)")
elif [[ "$OSTYPE" == "msys" ]]; then
  REPO_ROOT=$(pwd -W)
else
  REPO_ROOT=$(git rev-parse --show-toplevel)
fi

for wt in "${WORKTREES[@]}"; do
  WT_PATH="C:/Users/Julian/Desktop/Software/monta-vis/montavis-creator-worktrees/$wt"

  # Swap to host path for git reset
  echo "gitdir: $REPO_ROOT/.git/worktrees/$wt" > "$WT_PATH/.git"

  git -C "$WT_PATH" reset --hard main

  # Restore Docker container path
  echo "gitdir: $DOCKER_GIT_PATH/$wt" > "$WT_PATH/.git"

  echo "Reset $wt to main"
done
```

---

## Step 4: Verify

```bash
echo "=== Final Status ==="
git log --oneline -1

for wt in "${WORKTREES[@]}"; do
  echo "$wt: $(git -C "../$wt" log --oneline -1)"
done
```

All branches should show the same commit hash.

---

## Step 5: Code Simplifier (REQUIRED)

**After every successful sync, run the code-simplifier:code-simplifier on the merged changes.**

Ask user before applying any suggestions:

- **Apply all** - Apply all suggested simplifications
- **Review each** - Go through one by one
- **Skip** - Continue without changes
