import asyncio
from playwright.sync_api import sync_playwright, Page, expect
import os

def verify_settings_page(page: Page):
    # Disable cache
    page.route('**', lambda route: route.continue_())

    # Navigate to the local index.html file
    page.goto(f"file://{os.getcwd()}/index.html")

    # Click the options button to reveal the toolbar
    options_button = page.locator("#optionsBtn")
    options_button.click()

    # Wait for the toolbar to be visible
    toolbar = page.locator("#bottom-toolbar")
    expect(toolbar).to_be_visible()

    # Click the settings button
    settings_button = page.locator("#goToSettingsBtn")
    settings_button.click()

    # Wait for the settings view to be visible
    settings_view = page.locator("#settingsView")
    expect(settings_view).to_be_visible()

    # Wait for the example clock canvas to be visible
    example_clock = page.locator("#exampleClockCanvas")
    expect(example_clock).to_be_visible()

    # Give the canvas a moment to render
    page.wait_for_timeout(1000)

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/settings_page.png")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    verify_settings_page(page)
    browser.close()
