"""Test login flow and dashboard loading."""
import sys
sys.path.insert(0, r'C:\Users\Julian\Desktop\Software\monta-vis\montavis-creator\.claude\skills\webapp-testing\scripts')
from env_config import get_urls
from playwright.sync_api import sync_playwright

urls = get_urls()
# Use port 5200 for this container (see CLAUDE.local.md)
FRONTEND_URL = "http://localhost:5200"

print(f"Testing with Frontend URL: {FRONTEND_URL}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Step 1: Go to login page
    print("1. Navigating to login page...")
    page.goto(f"{FRONTEND_URL}/login")
    page.wait_for_load_state('networkidle')
    page.screenshot(path='/tmp/01_login_page.png')
    print("   Login page loaded")

    # Step 2: Click Jonas dev login button
    print("2. Clicking Jonas dev login button...")
    jonas_button = page.locator('button:has-text("Jonas")')
    if jonas_button.count() > 0:
        jonas_button.click()
        page.wait_for_timeout(2000)  # Wait for auth to complete
        print("   Login clicked")
    else:
        print("   ERROR: Jonas button not found!")
        page.screenshot(path='/tmp/error_no_jonas_button.png')
        browser.close()
        sys.exit(1)

    # Step 3: Navigate to dashboard (CRITICAL: use / not /dashboard)
    print("3. Navigating to dashboard (/)...")
    page.goto(f"{FRONTEND_URL}/")
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)  # Wait for data to load
    page.screenshot(path='/tmp/02_dashboard.png', full_page=True)

    current_url = page.url
    print(f"   Current URL: {current_url}")

    if '/login' in current_url:
        print("   ERROR: Still on login page - login failed!")
        browser.close()
        sys.exit(1)

    # Step 4: Verify dashboard content
    print("4. Verifying dashboard content...")
    page_content = page.content()
    elements_found = []

    # Check for user name in header
    if 'Jonas' in page_content:
        elements_found.append('User name (Jonas)')

    # Check for navigation
    nav_items = ['Anleitungen', 'My Edits', 'My Requests']
    for item in nav_items:
        if item in page_content:
            elements_found.append(f'Nav: {item}')

    # Check for instruction cards
    cards = page.locator('[class*="InstructionCard"], [class*="instruction-card"]')
    if cards.count() > 0:
        elements_found.append(f'{cards.count()} instruction cards')

    if elements_found:
        print(f"   Dashboard elements found: {', '.join(elements_found)}")
        print("   Dashboard loaded successfully!")
    else:
        print("   WARNING: Expected dashboard elements not found")

    print("\n5. Test completed!")
    print("   Screenshots saved:")
    print("   - /tmp/01_login_page.png")
    print("   - /tmp/02_dashboard.png")

    browser.close()
