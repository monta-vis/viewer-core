---
allowed-tools: Bash(git status:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git diff:*), Bash(git log:*), Bash(pwd:*)
description: Stage, commit and push changes to GitHub
---

Commit and push all changes to GitHub.

## Steps

1. **FIRST: Check if in worktree** - run `pwd` and check if path contains `/worktrees/` or `\worktrees\`
2. Run `git status` and `git diff --stat` to see what changed
3. Run `git log -3 --oneline` to see recent commit style
4. Stage relevant files with `git add`
5. Create commit with descriptive message following repo style
6. **Push decision (based on step 1):**
   - **NOT in worktree:** Push to remote with `git push`
   - **IN worktree:** Do NOT push (use `/sync` to merge worktree commits to main)

## Commit Message Format

```
<type>: <short description>

<optional body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types: `Add`, `Fix`, `Update`, `Remove`, `Refactor`, `Docs`

## Rules

- Never commit secrets (.env, credentials, API keys)
- Never force push to main
- Never use `--no-verify`
- Use HEREDOC for multi-line commit messages
- If no changes, inform user and stop
