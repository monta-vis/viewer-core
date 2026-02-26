# Testing (TDD)

## Workflow

1. **Write test first** — define expected behavior before implementation
2. **Run test (RED)** — verify test fails (confirms test is valid)
3. **Implement minimal code (GREEN)** — make test pass with simplest solution
4. **Refactor** — clean up while keeping tests green
5. **Repeat** — next test case

## Test Types

| Type      | Tool         | When                        |
| --------- | ------------ | --------------------------- |
| Unit      | Vitest       | Functions, hooks, utilities |
| Component | Vitest + RTL | React components            |

## Rules

- Every new feature requires tests in the plan
- Test edge cases and error states
- Mock external dependencies (IPC, fetch, stores)
- Keep tests focused and fast
- One assertion concept per test
- Descriptive test names that read like specifications

## Commands

```bash
npm run test         # Run all tests (viewer-core)
npm run typecheck    # Typecheck all packages
```
