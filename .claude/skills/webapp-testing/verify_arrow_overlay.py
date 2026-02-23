"""
Verify arrow overlay changes in instruction view mode.

This script:
1. Navigates to the dashboard
2. Clicks on the View button for the first instruction
3. Takes screenshots at different viewport sizes
4. Checks for substep cards and arrow elements
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

def verify_arrow_overlay():
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
            ]

            for viewport in viewports:
                print(f"\n[VIEWPORT] Testing: {viewport['name']} ({viewport['width']}x{viewport['height']})")

                page = browser.new_page(viewport={'width': viewport['width'], 'height': viewport['height']})

                # Navigate to frontend
                print(f"[NAVIGATE] Going to {FRONTEND_URL}")
                page.goto(FRONTEND_URL)
                page.wait_for_load_state('networkidle')
                page.wait_for_timeout(1000)

                # Take screenshot of dashboard
                dashboard_path = os.path.join(screenshots_dir, f'arrow-dashboard-{viewport["name"]}.png')
                page.screenshot(path=dashboard_path)
                print(f"[SCREENSHOT] Dashboard saved: {dashboard_path}")

                # Look for the view button (looks like "vi" badge in screenshot)
                # Try multiple selectors
                view_button = None

                # Try finding button with 'vi' text (view in German)
                if page.locator('button:has-text("vi")').count() > 0:
                    view_button = page.locator('button:has-text("vi")').first
                    print("[FOUND] View button with 'vi' text")
                elif page.locator('[aria-label*="view"], [aria-label*="View"]').count() > 0:
                    view_button = page.locator('[aria-label*="view"], [aria-label*="View"]').first
                    print("[FOUND] View button with aria-label")
                elif page.locator('a[href*="/view/"]').count() > 0:
                    view_button = page.locator('a[href*="/view/"]').first
                    print("[FOUND] View link in href")

                if view_button:
                    print("[CLICK] Clicking view button...")
                    view_button.click()
                    page.wait_for_load_state('networkidle')
                    page.wait_for_timeout(1500)  # Extra wait for animations and rendering

                    # Check URL
                    current_url = page.url
                    print(f"[URL] Current: {current_url}")

                    # Take screenshot of view page
                    view_path = os.path.join(screenshots_dir, f'arrow-view-{viewport["name"]}.png')
                    page.screenshot(path=view_path, full_page=True)
                    print(f"[SCREENSHOT] View page saved: {view_path}")

                    # Analyze the page for substep cards and arrows
                    print("[ANALYZE] Looking for substep cards and arrows...")

                    # Try multiple selectors for substep cards
                    substep_selectors = [
                        '[data-testid*="substep"]',
                        '[class*="SubstepCard"]',
                        '[class*="substep-card"]',
                        'article',
                        '.card'
                    ]

                    substep_cards = []
                    for selector in substep_selectors:
                        cards = page.locator(selector).all()
                        if cards:
                            substep_cards = cards
                            print(f"   Found {len(cards)} elements with selector: {selector}")
                            break

                    if substep_cards:
                        # Get bounding boxes for first few cards to check width consistency
                        for i, card in enumerate(substep_cards[:3]):
                            bbox = card.bounding_box()
                            if bbox:
                                print(f"   Card {i+1} width: {bbox['width']:.1f}px, x: {bbox['x']:.1f}px")

                    # Look for arrow elements
                    arrow_selectors = [
                        '[data-testid*="arrow"]',
                        '[class*="Arrow"]',
                        'svg[class*="arrow"]',
                        'circle',  # Small arrow circles
                        'path[d*="M"]'  # SVG paths
                    ]

                    for selector in arrow_selectors:
                        arrows = page.locator(selector).all()
                        if arrows:
                            print(f"   Found {len(arrows)} arrow elements with selector: {selector}")
                            if len(arrows) <= 5:  # Only show details for small counts
                                for j, arrow in enumerate(arrows):
                                    bbox = arrow.bounding_box()
                                    if bbox:
                                        print(f"      Arrow {j+1}: x={bbox['x']:.1f}, y={bbox['y']:.1f}, w={bbox['width']:.1f}, h={bbox['height']:.1f}")
                            break
                else:
                    print("[WARN] Could not find view button")
                    # Try direct navigation to view page
                    print("[ATTEMPT] Trying direct navigation to /view/1")
                    page.goto(f"{FRONTEND_URL}/view/1")
                    page.wait_for_load_state('networkidle')
                    page.wait_for_timeout(1500)

                    view_path = os.path.join(screenshots_dir, f'arrow-view-direct-{viewport["name"]}.png')
                    page.screenshot(path=view_path, full_page=True)
                    print(f"[SCREENSHOT] Direct view page saved: {view_path}")

                page.close()

            print("\n[SUCCESS] Arrow overlay verification complete!")
            print(f"[OUTPUT] Screenshots saved to: {screenshots_dir}")

        except Exception as e:
            print(f"[ERROR] Error during verification: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == '__main__':
    verify_arrow_overlay()
