"""Test sync/publish flow to capture console errors."""
import sys
sys.path.insert(0, 'C:/Users/Julian/Desktop/Software/monta-vis/montavis-creator/.claude/skills/webapp-testing/scripts')

from playwright.sync_api import sync_playwright

FRONTEND_URL = "http://localhost:5200"

console_errors = []

def capture_console(msg):
    if msg.type == "error":
        console_errors.append(f"[ERROR] {msg.text}")
    elif "Cannot read properties" in msg.text:
        console_errors.append(f"[{msg.type}] {msg.text}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Capture console messages
    page.on("console", capture_console)
    page.on("pageerror", lambda err: console_errors.append(f"[PAGE ERROR] {err}"))

    print("1. Navigating to login page...")
    page.goto(f"{FRONTEND_URL}/login")
    page.wait_for_load_state('networkidle')
    page.screenshot(path='/tmp/01_login.png')

    print("2. Clicking Julian dev login button (admin)...")
    julian_button = page.locator('button:has-text("Julian")')
    if julian_button.count() > 0:
        julian_button.click()
        page.wait_for_timeout(2000)
        page.wait_for_load_state('networkidle')
    else:
        print("   ERROR: Jonas button not found!")
        page.screenshot(path='/tmp/01b_no_jonas.png')

    print("3. Navigating to dashboard...")
    page.goto(f"{FRONTEND_URL}/")
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    page.screenshot(path='/tmp/02_dashboard.png')

    print("4. Looking for Kaffeemaschine card...")
    kaffeemaschine = page.locator('text=Kaffeemaschine').first
    if kaffeemaschine.count() > 0:
        print("   Found Kaffeemaschine!")
        kaffeemaschine.scroll_into_view_if_needed()
        page.screenshot(path='/tmp/03_kaffeemaschine.png')

        # Look for sync/publish button near the card
        print("5. Looking for sync/publish button...")

        # Try different selectors for sync button
        sync_selectors = [
            'button:has-text("Veröffentlichen")',
            'button:has-text("Publish")',
            'button:has-text("Sync")',
            '[aria-label*="sync"]',
            '[aria-label*="publish"]',
            'button:has(svg[class*="cloud"])',
        ]

        sync_button = None
        for selector in sync_selectors:
            btn = page.locator(selector).first
            if btn.count() > 0:
                print(f"   Found button with selector: {selector}")
                sync_button = btn
                break

        if sync_button:
            page.screenshot(path='/tmp/04_before_click.png')
            print("6. Clicking sync button...")
            sync_button.click()
            page.wait_for_timeout(3000)
            page.screenshot(path='/tmp/05_after_click.png')
        else:
            print("   No sync button found. Let me list all buttons...")
            all_buttons = page.locator('button').all()
            for i, btn in enumerate(all_buttons[:20]):
                try:
                    text = btn.inner_text()[:50] if btn.inner_text() else "no text"
                    print(f"   Button {i}: {text}")
                except:
                    pass
    else:
        print("   Kaffeemaschine not found on page")
        # Print page content for debugging
        print("   Page text preview:")
        print(page.inner_text('body')[:500])

    page.wait_for_timeout(1000)
    page.screenshot(path='/tmp/06_final.png')

    browser.close()

print("\n=== CONSOLE ERRORS CAPTURED ===")
if console_errors:
    for err in console_errors:
        print(err)
else:
    print("No console errors captured")
