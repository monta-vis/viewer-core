# E2E Test Runner Skill

Helps create and run modular E2E tests for the Montavis Creator application.

## When to Use

- User asks to run E2E tests
- User asks to test a specific workflow (publish, approve, view)
- User wants to set up a specific DB state for testing
- User wants to debug test failures
- User wants to create a new test step

## Test Architecture

```
Test Workflow:  cleanup → publish → approve → view_media
DB States:      clean → draft → published → approved
```

## Running Tests

### Full Workflow
```bash
cd .claude/tests
python run_test.py --full
```

### Single Step
```bash
python run_test.py --step publish
```

### From Specific State
```bash
# Set state and run step
python run_test.py --from draft --run publish

# Just set state (for manual testing)
python run_test.py --from approved
```

### Headless (CI)
```bash
python run_test.py --full --headless
```

### List Available
```bash
python run_test.py --list
```

## Setting DB States Directly

```bash
cd src/backend

# Clean (just users)
python -m app.db_init --cloud --state clean

# Draft (ready to publish)
python -m app.db_init --cloud --state draft

# Published (waiting for approval)
python -m app.db_init --cloud --state published

# Approved (ready to view with media)
python -m app.db_init --cloud --state approved
```

## Test Steps

| Step | User | Action | Requires |
|------|------|--------|----------|
| cleanup | - | Reset DBs | - |
| publish | Jonas | Publish draft | draft |
| approve | Sofia | Approve published | published |
| view_media | Toni | View with media | approved |

## Debugging Failures

1. **Check screenshots**: `.claude/tests/screenshots/`
2. **Check backend logs**: `src/backend/app.log`
3. **Check console errors**: Test output shows JS errors

### Common Issues

**No instructions found:**
- Wrong DB state - run with correct `--from` flag
- Sync not complete - increase timeout in config.py

**Video not loading:**
- `is_uploaded=false` in DB - use `published` or `approved` state
- S3 credentials missing
- SyncingIndicator stuck - check backend logs

**FFmpeg timeout:**
- Increase FFMPEG_TIMEOUT in config.py
- Check FFmpeg is installed

## Creating New Test Steps

Template in `.claude/tests/steps/base.py`:

```python
from .base import TestStep

class MyStep(TestStep):
    name = "My Step Name"
    requires_state = "draft"  # or None
    user = "jonas"  # or None

    def execute(self, helper, log_watcher) -> bool:
        # Actions
        helper.navigate_to("/my-edits")
        helper.click('button:has-text("Action")')
        return self.log("Action completed", True)

    def verify(self, helper, log_watcher) -> bool:
        # Assertions
        if helper.has_text("Expected"):
            return self.log("Check text", True)
        return self.log("Check text", False)
```

Register in `steps/__init__.py`:
```python
from .my_step import MyStep
STEPS["my_step"] = MyStep
```

## Creating New DB States

Template in `src/backend/tests/fixtures/states/`:

```python
from .base import create_companies, create_users

async def setup(session) -> None:
    await create_companies(session)
    await create_users(session)
    # Custom setup...
    await session.commit()
```

Register in `tests/fixtures/states/__init__.py`:
```python
STATES["my_state"] = setup_my_state
```

## Files

```
.claude/tests/
├── run_test.py         # Main CLI
├── config.py           # URLs, timeouts
├── log_watcher.py      # Log monitoring
├── browser_helper.py   # Playwright utils
└── steps/              # Test steps

src/backend/tests/fixtures/states/
├── base.py             # Shared utilities
├── state_clean.py
├── state_draft.py
├── state_published.py
└── state_approved.py
```
