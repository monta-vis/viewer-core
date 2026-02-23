---
name: test
description: Run E2E tests with automatic database and S3 state setup. Use /test publish, /test approve, /test view, or /test all.
---

# E2E Test Runner

Run E2E tests with automatic database state setup.

## Usage

```
/test <test_name>     # Run specific test by name/number
/test all             # Run all tests in sequence
/test list            # Show available tests
```

## Available Tests

| # | Folder | State | Description |
|---|--------|-------|-------------|
| 01 | empty_database | blank | Empty system handling |
| 02 | order_create_upload | clean | Order creation via UI |
| 03 | order_pending_to_assigned | order_pending | Order approval flow |
| 04 | publish_draft | draft | Jonas publishes → Sofia sees pending |
| 05 | approve_instruction | pending_approval | Sofia APPROVES → Toni can view |
| 06 | reject_instruction | pending_approval | Sofia REJECTS → Jonas sees + RESUBMITS |
| 07 | change_instruction_version | dual_version | Sofia APPROVES v2 → Toni sees new version |
| 08 | revision_conflict_block | conflict | Sofia tries APPROVE → BLOCKED |
| 09 | company_isolation | multi_instruction | Delonghi sees only Delonghi, not Siemens |
| 10 | database_cloud_sync | approved | Per-user database sync |
| 11 | offline_media_download | approved | Media download for offline |
| 12 | offline_mode_toggle | approved | Offline mode toggle |

## When Invoked

Parse the argument and execute the appropriate test workflow:

### /test <name>

Run a specific test:
```bash
cd .claude/tests/<test_folder>
python db_init.py
python test.py
```

Example:
```bash
/test 05              # Runs 05_approve_instruction
/test approve         # Runs 05_approve_instruction (matches name)
/test reject          # Runs 06_reject_instruction (matches name)
/test sync            # Runs 10_database_cloud_sync (matches name)
```

### /test all

Run all tests in sequence:
```bash
cd .claude/tests && python run_all.py
```

### /test list

Show available tests:
```bash
cd .claude/tests && python run_all.py --list
```

## Test Workflow

Each test folder contains:
- `db_init.py` - Initialize database to required state
- `test.py` - Run the actual test
- `result.md` - Test spec + results (combined)

## Prerequisites

- Backend running on port 5182 (test server)
- Frontend running on port 5185 (test server)
- Cloud database configured

**Important:** Tests use separate ports (5182/5185) to avoid conflicts with dev servers (5181/5183).

## Starting Test Servers

```bash
# Terminal 1: Backend (port 5182)
cd src/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 5182

# Terminal 2: Frontend (port 5185)
npx cross-env VITE_API_URL=http://localhost:5182 vite --port 5185
```

## Troubleshooting

**Test timeout:**
- Check backend logs: `src/backend/app.log`
- Increase timeout in `.claude/tests/shared/config.py`

**No instructions found:**
- Wrong DB state - verify db_init.py completed
- Check cloud database connection

**Login fails:**
- Verify test users exist in cloud database
- Check `db_init.py` ran successfully
