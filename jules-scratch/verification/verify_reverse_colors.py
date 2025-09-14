from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()

    # Navigate to the local file
    import os
    file_path = "file://" + os.path.abspath("index.html")
    page.goto(file_path)

    # Open settings
    page.locator("#goToSettingsBtn").click()

    # Open "Customize Arcs" and enable all arcs
    customize_arcs_button = page.get_by_role("button", name="Customize Arcs")
    customize_arcs_button.click()

    # Wait for the accordion content to be visible
    accordion_content = customize_arcs_button.locator("xpath=./following-sibling::div")
    expect(accordion_content).to_be_visible()

    arc_keys = ['DayOfWeek', 'Month', 'Day', 'Hours', 'Minutes', 'Seconds', 'WeekOfYear']
    for key in arc_keys:
        checkbox = page.locator(f"#toggleArc{key}")
        if not checkbox.is_checked():
            checkbox.check(force=True)

    # Close "Customize Arcs" accordion
    customize_arcs_button.click()
    expect(accordion_content).not_to_be_visible()

    # Open "Visuals & Colors"
    visuals_button = page.get_by_role("button", name="Visuals & Colors")
    visuals_button.click()

    # Wait for the accordion content to be visible
    accordion_content = visuals_button.locator("xpath=./following-sibling::div")
    expect(accordion_content).to_be_visible()


    # Select "Neon" theme
    page.locator("#presetNeon").click()
    page.wait_for_timeout(500) # Wait for color change

    # Take a screenshot of the normal neon theme
    page.screenshot(path="jules-scratch/verification/neon-normal.png")

    # Click the "Reverse" toggle
    page.locator("#reverseToggle").click()
    page.wait_for_timeout(500) # Wait for color change

    # Take a screenshot of the reversed neon theme
    page.screenshot(path="jules-scratch/verification/neon-reversed.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
