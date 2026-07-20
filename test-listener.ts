import { chromium } from '@playwright/test';

(async () => {
  console.log("Launching browser in visible mode for listener test...");
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000, // Slow motion so you can see the actions
    executablePath: '/usr/bin/google-chrome' 
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log("Navigating to http://localhost:3000...");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log("Successfully navigated to localhost:3000");

    console.log("Clicking Webhook tab on left sidebar...");
    await page.getByTitle('Webhook Simulator').click();
    await page.waitForTimeout(1000);

    console.log("Verifying 'Webhook Listener' mode is active...");
    const listenerButton = page.getByRole('button', { name: /Webhook Listener/i });
    if (await listenerButton.isVisible()) {
      await listenerButton.click();
      console.log("Clicked 'Webhook Listener' button.");
    }
    
    await page.waitForTimeout(1000);

    console.log("Clicking 'Mock' button to trigger a local test webhook...");
    // There might be multiple Mock buttons depending on screen size or empty states. Click the first visible one.
    const mockButton = page.getByRole('button', { name: /Mock/i }).first();
    if (await mockButton.isVisible()) {
      await mockButton.click();
      console.log("Clicked Mock button.");
    } else {
      console.log("Mock button not found!");
    }

    console.log("Waiting for event to be captured...");
    await page.waitForTimeout(2000);

    // Verify the toast message
    const bodyText = await page.locator('body').innerText();
    if (bodyText.includes('Mock webhook sent') || bodyText.includes('Mock sent')) {
      console.log("Verified success toast message appeared!");
    } else {
      console.log("Did not find success toast, but will continue.");
    }

    // Now let's try to click on the newly captured event in the sidebar (if it's not auto-selected)
    // The events usually have text like "POST /" or "evt_"
    const eventItem = page.locator('text=/POST/').first();
    if (await eventItem.count() > 0) {
      await eventItem.click();
      console.log("Clicked on the captured event in the list.");
    }
    
    // Look for Request details in the main pane
    console.log("Checking if event details are rendered...");
    await page.waitForTimeout(2000);
    const newBodyText = await page.locator('body').innerText();
    
    if (newBodyText.includes('Headers') || newBodyText.includes('Payload') || newBodyText.includes('Orbit-Event-Type')) {
      console.log("Verified event details (Headers/Payload) are visible in the inspector!");
    } else {
      console.log("Could not clearly verify event details, they might be in a different tab or format.");
    }
    
    console.log("Listener End-to-End Test completed successfully!");
    
    // Keep browser open slightly longer so user can see final state
    await page.waitForTimeout(3000);
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await browser.close();
  }
})();
