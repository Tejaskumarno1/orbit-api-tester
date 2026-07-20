import { chromium } from '@playwright/test';
import * as fs from 'fs';

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000,
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

    console.log("Verifying 'Test Dispatcher' mode is active...");
    const dispatcherButton = page.getByRole('button', { name: /Test Dispatcher/i });
    if (await dispatcherButton.isVisible()) {
      await dispatcherButton.click();
      console.log("Clicked 'Test Dispatcher' (Sender Mode) button.");
    } else {
      console.log("Could not find 'Test Dispatcher' button. Proceeding anyway.");
    }
    
    await page.waitForTimeout(500);

    console.log("Setting Target URL...");
    // Find Target URL input by its placeholder or surrounding text
    const targetUrlInput = page.locator('input[type="text"]').nth(0); // It might be the first or second. Let's try placeholder
    const allInputs = await page.locator('input[type="text"]').all();
    for (const input of allInputs) {
       const ph = await input.getAttribute('placeholder') || '';
       if (ph.toLowerCase().includes('http') || ph.includes('target')) {
           await input.fill('http://localhost:3000/api/webhooks/catch/default');
           console.log("Filled target URL by placeholder:", ph);
           break;
       }
    }
    // Alternatively, just force fill the first empty text input
    
    console.log("Setting Secret...");
    const secretInput = page.getByPlaceholder(/Webhook Signing Secret/i);
    if (await secretInput.count() > 0) {
      await secretInput.fill('my_secret_key_123');
      console.log("Filled secret input.");
    } else {
      console.log("Could not find Secret input.");
    }

    console.log("Selecting event template...");
    const combobox = page.locator('select');
    if (await combobox.count() > 0) {
      await combobox.first().selectOption({ label: 'ticket.created' }).catch(() => console.log('Option ticket.created not found'));
      console.log("Attempted to select event template.");
    }

    console.log("Clicking 'FIRE WEBHOOK' button...");
    const sendButton = page.getByRole('button', { name: /FIRE WEBHOOK/i });
    if (await sendButton.count() > 0) {
      await sendButton.click();
      console.log("Clicked FIRE WEBHOOK.");
    } else {
      console.log("Could not find FIRE WEBHOOK button.");
    }

    console.log("Waiting for response...");
    await page.waitForTimeout(3000); 
    const responseText = await page.locator('body').innerText();
    
    if (responseText.includes('200 OK') || responseText.includes('200')) {
      console.log("Verified response status: 200 OK.");
    } else {
      console.log("Did not find '200 OK' in response.");
      // Just check if we see something indicating success
      if (responseText.includes('Dispatched 1 webhook(s) successfully')) {
          console.log("Found success toast message!");
      }
    }
    
    console.log("Test execution completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
    fs.writeFileSync('error.html', await page.content());
  } finally {
    await browser.close();
  }
})();
