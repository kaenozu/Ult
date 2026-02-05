import { test, expect } from '@playwright/test';

test.describe('Monkey Test - Random UI Interactions', () => {
  test('should survive random clicks and inputs', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    const iterations = 100; // Number of random actions
    let errors = 0;
    
    for (let i = 0; i < iterations; i++) {
      try {
        // Get all interactive elements
        const interactiveElements = await page.$$('button, input, select, textarea, a, [role="button"], [onclick]');
        
        if (interactiveElements.length === 0) {
          // If no interactive elements, scroll and try again
          await page.mouse.wheel(0, Math.random() * 1000);
          await page.waitForTimeout(100);
          continue;
        }
        
        // Pick a random element
        const randomIndex = Math.floor(Math.random() * interactiveElements.length);
        const element = interactiveElements[randomIndex];
        
        // Scroll element into view
        await element.scrollIntoViewIfNeeded();
        await page.waitForTimeout(50);
        
        // Check if element is visible and enabled
        const isVisible = await element.isVisible();
        const isEnabled = await element.isEnabled();
        
        if (isVisible && isEnabled) {
          // Get element tag name
          const tagName = await page.evaluate(el => el.tagName.toLowerCase(), element);
          
          if (tagName === 'input' || tagName === 'textarea') {
            // Type random text
            const inputType = await element.getAttribute('type');
            if (inputType !== 'password' && inputType !== 'file') {
              await element.fill(`test_${Math.random().toString(36).substring(7)}`);
            }
          } else {
            // Click the element
            await element.click();
            await page.waitForTimeout(Math.random() * 300 + 100);
          }
        }
        
        // Random scroll occasionally
        if (Math.random() > 0.7) {
          await page.mouse.wheel(
            (Math.random() - 0.5) * 500,
            (Math.random() - 0.5) * 500
          );
          await page.waitForTimeout(100);
        }
        
        // Random keyboard input occasionally
        if (Math.random() > 0.8) {
          const keys = ['Enter', 'Tab', 'Escape', 'ArrowDown', 'ArrowUp'];
          const randomKey = keys[Math.floor(Math.random() * keys.length)];
          await page.keyboard.press(randomKey);
          await page.waitForTimeout(50);
        }
        
        // Take screenshot every 20 iterations
        if (i % 20 === 0) {
          await page.screenshot({ 
            path: `monkey-test-screenshot-${i}.png`,
            fullPage: false 
          });
        }
        
      } catch (error) {
        errors++;
        console.log(`Error at iteration ${i}:`, error);
        // Continue on error - monkey test should be resilient
      }
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: 'monkey-test-final.png',
      fullPage: true 
    });
    
    // Report results
    console.log(`Monkey test completed: ${iterations} iterations, ${errors} errors`);
    
    // Assert that we didn't crash the application
    expect(errors).toBeLessThan(iterations * 0.1); // Less than 10% error rate
  });
});
