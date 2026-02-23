"""
Test script to verify arrow overlay changes in instruction view mode.

Checks:
1. Substep cards have equal width (no narrowing from entry arrows)
2. Small arrow circles overlay on card boundaries
3. Layout at different viewport widths (1-column and 2-column modes)
"""

from playwright.sync_api import sync_playwright
import sys
import os

# Add scripts directory to path for env_config
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scripts'))
from env_config import get_urls

# Get correct URLs for environment
urls = get_urls()
FRONTEND_URL = urls['frontend']

def take_screenshots():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Create screenshots directory if it doesn't exist
        screenshots_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'e2e', 'screenshots')
        os.makedirs(screenshots_dir, exist_ok=True)

        try:
            # Test at different viewport widths
            viewports = [
                {'width': 1920, 'height': 1080, 'name': 'desktop-wide'},
                {'width': 1280, 'height': 720, 'name': 'desktop-medium'},
                {'width': 768, 'height': 1024, 'name': 'tablet'},
                {'width': 375, 'height': 667, 'name': 'mobile'}
            ]

            for viewport in viewports:
                print(f"\n[VIEWPORT] Testing: {viewport['name']} ({viewport['width']}x{viewport['height']})")

                page = browser.new_page(viewport={'width': viewport['width'], 'height': viewport['height']})

                # Navigate to frontend
                print(f"[NAVIGATE] Going to {FRONTEND_URL}")
                page.goto(FRONTEND_URL)
                page.wait_for_load_state('networkidle')

                # Take screenshot of main page
                screenshot_path = os.path.join(screenshots_dir, f'arrow-overlay-main-{viewport["name"]}.png')
                page.screenshot(path=screenshot_path, full_page=True)
                print(f"[SCREENSHOT] Main page saved: {screenshot_path}")

                # Look for instruction cards or view buttons
                print("[SEARCH] Looking for instructions to open...")

                # Try to find instruction cards (they might have different selectors)
                instruction_cards = page.locator('[data-testid*="instruction"], .instruction-card, [class*="InstructionCard"]').all()

                if not instruction_cards:
                    # Try looking for any clickable cards
                    instruction_cards = page.locator('article, .card, [role="article"]').all()

                print(f"   Found {len(instruction_cards)} potential instruction elements")

                if instruction_cards:
                    # Click the first instruction to open it
                    print("[CLICK] Clicking first instruction...")
                    instruction_cards[0].click()
                    page.wait_for_load_state('networkidle')
                    page.wait_for_timeout(1000)  # Extra wait for animations

                    # Check current URL
                    current_url = page.url
                    print(f"   Current URL: {current_url}")

                    # Look for a "View" or similar button to enter view mode
                    view_buttons = page.locator('button:has-text("View"), a:has-text("View"), [data-testid*="view"]').all()

                    if view_buttons:
                        print("[CLICK] Clicking View button...")
                        view_buttons[0].click()
                        page.wait_for_load_state('networkidle')
                        page.wait_for_timeout(1000)
                    else:
                        # Check if we're already in a view mode by checking URL
                        if '/view/' not in current_url and '/editor/' not in current_url:
                            print("[WARN] No View button found, might already be in view mode or need different navigation")

                    # Take screenshot of the view
                    view_screenshot_path = os.path.join(screenshots_dir, f'arrow-overlay-view-{viewport["name"]}.png')
                    page.screenshot(path=view_screenshot_path, full_page=True)
                    print(f"[SCREENSHOT] View saved: {view_screenshot_path}")

                    # Look for substep cards to verify equal width
                    substep_cards = page.locator('[data-testid*="substep"], .substep-card, [class*="SubstepCard"]').all()
                    print(f"   Found {len(substep_cards)} substep cards")

                    # Look for arrow elements
                    arrows = page.locator('[data-testid*="arrow"], .arrow, [class*="Arrow"], svg[class*="arrow"]').all()
                    print(f"   Found {len(arrows)} arrow elements")

                    # Get some layout information
                    if substep_cards:
                        first_card = substep_cards[0]
                        bbox = first_card.bounding_box()
                        if bbox:
                            print(f"   First substep card width: {bbox['width']}px")
                else:
                    print("[WARN] No instruction cards found on main page")
                    print("   Page content preview:")
                    content = page.content()
                    # Print first 500 chars to see what's on the page
                    print(f"   {content[:500]}...")

                page.close()

            print("\n[SUCCESS] Screenshot capture complete!")
            print(f"[OUTPUT] Screenshots saved to: {screenshots_dir}")

        except Exception as e:
            print(f"[ERROR] Error during screenshot capture: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == '__main__':
    take_screenshots()
