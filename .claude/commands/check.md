---
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Read, Glob, Grep, Task
description: Review local changes for best practices, security, and CLAUDE.md compliance before committing
---

Review local uncommitted changes for quality, security, and compliance.

## Steps

1. Run `git status` and `git diff --stat` to see what files changed

2. If no changes, inform user and stop.

3. Launch a sonnet agent to get the full diff with `git diff` and return a summary of the changes.

4. Launch 4 agents in parallel to independently review the changes:

   **Agent 1: CLAUDE.md Compliance (Sonnet)**
   - Read relevant CLAUDE.md files for changed directories
   - Check if changes follow project rules
   - Flag violations with specific rule quoted

   **Agent 2: Best Practices (Sonnet)**
   - Clean code principles
   - DRY (Don't Repeat Yourself)
   - Single responsibility
   - Proper error handling
   - TypeScript strict compliance (no `any`)
   - Proper naming conventions

   **Agent 3: Security (Opus)**
   - OWASP Top 10 vulnerabilities
   - SQL/Command injection
   - XSS vulnerabilities
   - Hardcoded secrets/credentials
   - Insecure dependencies
   - Auth/authz issues

   **Agent 4: Efficiency (Sonnet)**
   - Performance anti-patterns
   - Unnecessary re-renders (React)
   - N+1 queries
   - Memory leaks
   - Missing indexes hints
   - Inefficient algorithms

5. Collect results and filter for HIGH SIGNAL issues only:
   - Objective bugs/vulnerabilities
   - Clear CLAUDE.md violations
   - Real security risks
   - Significant performance issues

   Do NOT flag:
   - Subjective style preferences
   - Nitpicks
   - "Might be an issue"
   - Pre-existing problems

6. Present findings in this format:

```
## Check Results

### 🔴 Critical (must fix)
- [file:line] Description of issue
  → Suggested fix

### 🟡 Warning (should fix)
- [file:line] Description of issue
  → Suggested fix

### 🟢 Passed
- CLAUDE.md compliance: ✓
- Security scan: ✓
- Best practices: ✓
- Efficiency: ✓
```

7. If no issues found, output:

```
## Check Results

✅ All checks passed!

- CLAUDE.md compliance: ✓
- Security scan: ✓
- Best practices: ✓
- Efficiency: ✓

Ready to commit.
```

## Notes

- Focus on the diff only, not entire codebase
- Be actionable - every issue should have a fix suggestion
- Prioritize: Security > Bugs > CLAUDE.md > Best Practices > Efficiency
- This is a pre-commit check, not a full audit
