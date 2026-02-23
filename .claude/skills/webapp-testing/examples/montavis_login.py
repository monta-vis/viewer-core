#!/usr/bin/env python3
"""
Example: Login test for Montavis Creator.

Uses env_config.py for automatic Docker/Host detection.

Usage:
    python3 examples/montavis_login.py
"""

import sys
sys.path.insert(0, '/workspace/.claude/skills/webapp-testing/scripts')
from env_config import get_urls, print_env_info
from test_users import DEFAULT_USER, get_credentials

from playwright.sync_api import sync_playwright


def test_login(email: str = None, password: str = None):
    """Test login flow and take screenshots."""

    # Use default credentials if not provided
    if email is None or password is None:
        email, password = DEFAULT_USER

    # Get correct URLs for current environment
    urls = get_urls()
    print_env_info()
    print()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Collect console logs
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        # Collect API responses
        api_responses = []
        def handle_response(response):
            if "/api/" in response.url:
                api_responses.append(f"{response.status} {response.url}")
        page.on("response", handle_response)

        print(f"1. Navigate to {urls['frontend']}...")
        page.goto(urls['frontend'])
        page.wait_for_load_state('networkidle')

        page.screenshot(path='/tmp/login_01_page.png', full_page=True)
        print("   Screenshot: /tmp/login_01_page.png")

        print(f"2. Fill login form with {email}...")
        page.fill('input[type="email"], input[name="email"]', email)
        page.fill('input[type="password"], input[name="password"]', password)

        page.screenshot(path='/tmp/login_02_filled.png', full_page=True)
        print("   Screenshot: /tmp/login_02_filled.png")

        print("3. Click login button...")
        page.click('button[type="submit"]')

        page.wait_for_timeout(3000)
        page.wait_for_load_state('networkidle')

        page.screenshot(path='/tmp/login_03_result.png', full_page=True)
        print("   Screenshot: /tmp/login_03_result.png")

        print(f"\n4. Results:")
        print(f"   Final URL: {page.url}")

        # Check for success - look for logged-in indicators
        login_success = (
            page.locator('text=Sofia').count() > 0 or  # User name visible
            page.locator('nav').count() > 0 or  # Navigation visible
            page.locator('[data-testid="dashboard"]').count() > 0 or
            any("200" in r and "login" in r for r in api_responses)  # Login API succeeded
        )

        print(f"\n5. API Responses:")
        for resp in api_responses:
            status_icon = "✓" if resp.startswith("2") else "✗"
            print(f"   {status_icon} {resp}")

        if console_logs:
            errors = [l for l in console_logs if 'error' in l.lower()]
            if errors:
                print(f"\n6. Console Errors:")
                for e in errors[:5]:
                    print(f"   {e[:100]}")

        print(f"\n{'✓ Login successful!' if login_success else '✗ Login failed - still on login page'}")

        browser.close()
        return login_success


if __name__ == "__main__":
    test_login()
