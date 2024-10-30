# agent1.py

import os
import json
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Directory to save screenshots
screenshot_dir = "./screenshots"
os.makedirs(screenshot_dir, exist_ok=True)

# Credentials (use environment variables or secure storage)
USERNAME = os.environ.get('USPS_USERNAME')
PASSWORD = os.environ.get('USPS_PASSWORD')

def login_and_capture():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # headless=False to see the browser window
        context = browser.new_context()
        page = context.new_page()

        try:
            # Confirm environment variables are loaded
            if not USERNAME or not PASSWORD:
                print(json.dumps({"error": "USPS_USERNAME and USPS_PASSWORD environment variables not set."}))
                return

            # Go to the USPS login page
            page.goto("https://reg.usps.com/informeddelivery/login")

            # Fill in the username and password
            page.fill('input[name="username"]', USERNAME)
            page.fill('input[name="password"]', PASSWORD)

            # Click the login button
            page.click('button[type="submit"]')

            # Wait for navigation after login
            page.wait_for_load_state('networkidle')

            # Take a screenshot
            screenshot_path = os.path.join(screenshot_dir, "usps_dashboard.png")
            page.screenshot(path=screenshot_path)

            # Keep the browser open
            print(json.dumps({
                "screenshot_path": screenshot_path,
                "message": "Screenshot taken successfully. Browser will remain open."
            }))
            input("Press Enter to close the browser...")  # Keeps browser open until Enter is pressed

        except Exception as e:
            print(json.dumps({"error": f"An error occurred: {str(e)}"}))

if __name__ == '__main__':
    login_and_capture()
