import { test, expect, type Page } from '@playwright/test';

/**
 * E2E Test Suite for Progressive Student Profile Completion Feature
 * 
 * Task 19.1: Write Playwright E2E test for profile completion flow
 * 
 * Test scenarios:
 * 1. New user sees profile completion card on dashboard
 * 2. Clicking "Complete Profile" navigates to form
 * 3. Form validation shows errors for invalid inputs
 * 4. Successful submission updates profile and redirects
 * 5. Completed profile hides dashboard card
 * 6. Application guard blocks incomplete profile
 * 7. Application guard allows complete profile
 * 8. Return-to-context flow: blocked application → complete profile → return to application
 */

// Test data
const testUser = {
  name: 'Test Student',
  email: `test-${Date.now()}@example.com`,
  password: 'Password123!',
  first_name: 'Test',
  last_name: 'Student',
  phone: '+1 234 567 8900',
  country: 'United States',
  city: 'New York',
  highest_qualification: "Bachelor's Degree",
  occupation: 'Software Engineer',
  bio: 'Test bio for E2E testing',
  linkedin_profile: 'https://linkedin.com/in/test-student',
  portfolio_website: 'https://test-portfolio.com',
};

const invalidTestData = {
  invalidPhone: 'abc123', // Contains letters
  shortPhone: '123', // Too short
  longPhone: '12345678901234567890123', // Too long
  invalidUrl: 'not-a-valid-url',
  emptyCountry: '',
  emptyCity: '',
};

/**
 * Helper function to register a new user
 */
async function registerUser(page: Page, email: string, password: string, name: string) {
  await page.goto('/register');
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="password_confirmation"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for successful registration and redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

/**
 * Helper function to login an existing user
 */
async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for successful login and redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

/**
 * Helper function to fill profile form with valid data
 */
async function fillProfileForm(page: Page, data: typeof testUser) {
  await page.fill('input[name="first_name"]', data.first_name);
  await page.fill('input[name="last_name"]', data.last_name);
  await page.fill('input[name="phone"]', data.phone);
  await page.fill('input[name="country"]', data.country);
  await page.fill('input[name="city"]', data.city);
  await page.selectOption('select[name="highest_qualification"]', data.highest_qualification);
  
  // Optional fields
  await page.fill('input[name="occupation"]', data.occupation);
  await page.fill('textarea[name="bio"]', data.bio);
  await page.fill('input[name="linkedin_profile"]', data.linkedin_profile);
  await page.fill('input[name="portfolio_website"]', data.portfolio_website);
}

test.describe('Profile Completion Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up the page with necessary state
    await page.goto('/');
  });

  test('1. New user sees profile completion card on dashboard', async ({ page }) => {
    // Register a new user with minimal information
    await registerUser(page, testUser.email, testUser.password, testUser.name);
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Verify profile completion card is visible
    const completionCard = page.locator('text=Complete your profile').first();
    await expect(completionCard).toBeVisible();
    
    // Verify percentage is less than 100%
    const percentageText = page.locator('text=/\\d+%/').first();
    await expect(percentageText).toBeVisible();
    const percentage = await percentageText.textContent();
    const percentValue = parseInt(percentage!.replace('%', ''));
    expect(percentValue).toBeLessThan(100);
    
    // Verify "Complete Profile" button is present
    const completeProfileBtn = page.getByRole('link', { name: /complete profile/i });
    await expect(completeProfileBtn).toBeVisible();
    
    // Verify progress bar is visible
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
    
    // Verify checklist shows missing required fields
    await expect(page.locator('text=/phone|country|city|qualification/i').first()).toBeVisible();
  });

  test('2. Clicking "Complete Profile" navigates to form', async ({ page }) => {
    // Register and navigate to dashboard
    await registerUser(page, testUser.email, testUser.password, testUser.name);
    
    // Click "Complete Profile" button
    await page.getByRole('link', { name: /complete profile/i }).click();
    
    // Verify navigation to profile completion page
    await expect(page).toHaveURL('/profile/complete');
    
    // Verify page title
    await expect(page.locator('h1', { hasText: /complete your profile/i })).toBeVisible();
    
    // Verify all required fields are present
    await expect(page.locator('input[name="first_name"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
    await expect(page.locator('input[name="country"]')).toBeVisible();
    await expect(page.locator('input[name="city"]')).toBeVisible();
    await expect(page.locator('select[name="highest_qualification"]')).toBeVisible();
    
    // Verify optional fields are present
    await expect(page.locator('input[name="occupation"]')).toBeVisible();
    await expect(page.locator('textarea[name="bio"]')).toBeVisible();
    await expect(page.locator('input[name="linkedin_profile"]')).toBeVisible();
    await expect(page.locator('input[name="portfolio_website"]')).toBeVisible();
    
    // Verify progress bar is visible
    await expect(page.locator('text=Profile completion')).toBeVisible();
    
    // Verify required vs optional sections are labeled
    await expect(page.locator('text=/required information/i')).toBeVisible();
    await expect(page.locator('text=/additional information/i')).toBeVisible();
  });

  test('3. Form validation shows errors for invalid inputs', async ({ page }) => {
    // Navigate to profile completion page
    await registerUser(page, testUser.email, testUser.password, testUser.name);
    await page.goto('/profile/complete');
    
    // Test invalid phone number with letters
    await page.fill('input[name="phone"]', invalidTestData.invalidPhone);
    await page.blur('input[name="phone"]');
    await expect(page.locator('text=/phone must contain only digits/i')).toBeVisible();
    
    // Test phone number too short
    await page.fill('input[name="phone"]', invalidTestData.shortPhone);
    await page.blur('input[name="phone"]');
    await expect(page.locator('text=/phone must be at least 8 characters/i')).toBeVisible();
    
    // Test phone number too long
    await page.fill('input[name="phone"]', invalidTestData.longPhone);
    await page.blur('input[name="phone"]');
    await expect(page.locator('text=/phone must not exceed 20 characters/i')).toBeVisible();
    
    // Test empty required field (country)
    await page.fill('input[name="country"]', invalidTestData.emptyCountry);
    await page.blur('input[name="country"]');
    await expect(page.locator('text=/country is required/i')).toBeVisible();
    
    // Test empty required field (city)
    await page.fill('input[name="city"]', invalidTestData.emptyCity);
    await page.blur('input[name="city"]');
    await expect(page.locator('text=/city is required/i')).toBeVisible();
    
    // Test invalid URL for LinkedIn
    await page.fill('input[name="linkedin_profile"]', invalidTestData.invalidUrl);
    await page.blur('input[name="linkedin_profile"]');
    await expect(page.locator('text=/please enter a valid url/i')).toBeVisible();
    
    // Test invalid URL for portfolio
    await page.fill('input[name="portfolio_website"]', invalidTestData.invalidUrl);
    await page.blur('input[name="portfolio_website"]');
    await expect(page.locator('text=/please enter a valid url/i')).toBeVisible();
    
    // Verify submit button is disabled when form is invalid
    const submitBtn = page.getByRole('button', { name: /save profile/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('4. Successful submission updates profile and redirects', async ({ page }) => {
    // Register and navigate to profile completion page
    await registerUser(page, testUser.email, testUser.password, testUser.name);
    await page.goto('/profile/complete');
    
    // Fill out the form with valid data
    await fillProfileForm(page, testUser);
    
    // Verify submit button is enabled
    const submitBtn = page.getByRole('button', { name: /save profile/i });
    await expect(submitBtn).toBeEnabled();
    
    // Submit the form
    await submitBtn.click();
    
    // Verify success message appears
    await expect(page.locator('text=/profile updated successfully/i')).toBeVisible({ timeout: 5000 });
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
  });

  test('5. Completed profile hides dashboard card', async ({ page }) => {
    // Register new user
    await registerUser(page, testUser.email, testUser.password, testUser.name);
    
    // Verify profile completion card is visible initially
    await expect(page.locator('text=Complete your profile').first()).toBeVisible();
    
    // Navigate to profile completion page and fill form
    await page.goto('/profile/complete');
    await fillProfileForm(page, testUser);
    await page.getByRole('button', { name: /save profile/i }).click();
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    
    // Wait a moment for the page to fully load and profile status to be fetched
    await page.waitForTimeout(1000);
    
    // Verify profile completion card is NOT visible (profile is now complete)
    await expect(page.locator('text=Complete your profile').first()).not.toBeVisible();
    
    // Verify we can see the regular dashboard content
    await expect(page.locator('text=My courses')).toBeVisible();
  });

  test('6. Application guard blocks incomplete profile', async ({ page }) => {
    // Register a new user (incomplete profile)
    await registerUser(page, testUser.email, testUser.password, testUser.name);
    
    // Navigate to browse courses
    await page.goto('/');
    
    // Find and click on a course (assuming there's at least one course)
    const courseLink = page.locator('a[href*="/courses/"]').first();
    if (await courseLink.isVisible()) {
      await courseLink.click();
      
      // Look for an "Apply" or "Enrol" button
      const applyBtn = page.getByRole('button', { name: /apply|enrol/i }).first();
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
        
        // Verify error message about incomplete profile
        await expect(
          page.locator('text=/complete your profile before applying/i')
        ).toBeVisible({ timeout: 5000 });
        
        // Verify "Complete Profile" action is available
        await expect(
          page.getByRole('button', { name: /complete profile/i })
        ).toBeVisible();
      }
    }
  });

  test('7. Application guard allows complete profile', async ({ page }) => {
    // Register new user and complete profile
    await registerUser(page, testUser.email, testUser.password, testUser.name);
    await page.goto('/profile/complete');
    await fillProfileForm(page, testUser);
    await page.getByRole('button', { name: /save profile/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    
    // Navigate to browse courses
    await page.goto('/');
    
    // Find and click on a course
    const courseLink = page.locator('a[href*="/courses/"]').first();
    if (await courseLink.isVisible()) {
      await courseLink.click();
      
      // Look for an "Apply" or "Enrol" button
      const applyBtn = page.getByRole('button', { name: /apply|enrol/i }).first();
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
        
        // Verify NO error message about incomplete profile
        await expect(
          page.locator('text=/complete your profile before applying/i')
        ).not.toBeVisible({ timeout: 2000 });
        
        // Verify application flow proceeds (modal or confirmation appears)
        // The exact UI depends on the enrolment policy (direct enrol vs application)
        // We just verify no profile block occurs
      }
    }
  });

  test('8. Return-to-context flow: blocked application → complete profile → return to application', async ({ page }) => {
    // Register a new user (incomplete profile)
    await registerUser(page, testUser.email, testUser.password, testUser.name);
    
    // Navigate to a specific course
    await page.goto('/');
    const courseLink = page.locator('a[href*="/courses/"]').first();
    
    if (await courseLink.isVisible()) {
      // Store the course URL
      const courseHref = await courseLink.getAttribute('href');
      await courseLink.click();
      
      // Attempt to apply with incomplete profile
      const applyBtn = page.getByRole('button', { name: /apply|enrol/i }).first();
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
        
        // Wait for profile incomplete error
        await expect(
          page.locator('text=/complete your profile before applying/i')
        ).toBeVisible({ timeout: 5000 });
        
        // Click "Complete Profile" button from the error modal/message
        const completeProfileBtn = page.getByRole('button', { name: /complete profile/i });
        await completeProfileBtn.click();
        
        // Verify navigation to profile completion page
        await expect(page).toHaveURL('/profile/complete');
        
        // Complete the profile
        await fillProfileForm(page, testUser);
        await page.getByRole('button', { name: /save profile/i }).click();
        
        // Verify redirect back to the original course page (return-to-context)
        await expect(page).toHaveURL(new RegExp(courseHref!), { timeout: 5000 });
        
        // Verify we're back on the course detail page
        await expect(page.locator('h1').first()).toBeVisible();
      }
    }
  });
});

test.describe('Profile Completion Page - Additional Validation', () => {
  test('Real-time URL validation for optional fields', async ({ page }) => {
    await registerUser(page, testUser.email, testUser.password, testUser.name);
    await page.goto('/profile/complete');
    
    // Type invalid URL and verify real-time error
    await page.fill('input[name="linkedin_profile"]', 'invalid-url');
    await expect(page.locator('text=/please enter a valid url/i')).toBeVisible();
    
    // Fix to valid URL and verify error disappears
    await page.fill('input[name="linkedin_profile"]', 'https://linkedin.com/in/test');
    await expect(page.locator('text=/please enter a valid url/i')).not.toBeVisible();
  });

  test('Progress bar updates as fields are completed', async ({ page }) => {
    await registerUser(page, testUser.email, testUser.password, testUser.name);
    await page.goto('/profile/complete');
    
    // Get initial percentage
    const initialPercentage = await page.locator('text=/\\d+%/').first().textContent();
    const initialValue = parseInt(initialPercentage!.replace('%', ''));
    
    // Fill a required field
    await page.fill('input[name="phone"]', testUser.phone);
    await page.blur('input[name="phone"]');
    
    // Wait a moment for state update
    await page.waitForTimeout(500);
    
    // Get updated percentage
    const updatedPercentage = await page.locator('text=/\\d+%/').first().textContent();
    const updatedValue = parseInt(updatedPercentage!.replace('%', ''));
    
    // Verify percentage increased
    expect(updatedValue).toBeGreaterThan(initialValue);
  });

  test('Submit button state changes based on form validity', async ({ page }) => {
    await registerUser(page, testUser.email, testUser.password, testUser.name);
    await page.goto('/profile/complete');
    
    const submitBtn = page.getByRole('button', { name: /save profile/i });
    
    // Initially disabled (incomplete form)
    await expect(submitBtn).toBeDisabled();
    
    // Fill all required fields
    await page.fill('input[name="first_name"]', testUser.first_name);
    await page.fill('input[name="phone"]', testUser.phone);
    await page.fill('input[name="country"]', testUser.country);
    await page.fill('input[name="city"]', testUser.city);
    await page.selectOption('select[name="highest_qualification"]', testUser.highest_qualification);
    
    // Button should now be enabled
    await expect(submitBtn).toBeEnabled();
    
    // Clear a required field
    await page.fill('input[name="phone"]', '');
    
    // Button should be disabled again
    await expect(submitBtn).toBeDisabled();
  });

  test('Form pre-populates with existing user data', async ({ page }) => {
    // Register and complete profile
    await registerUser(page, testUser.email, testUser.password, testUser.name);
    await page.goto('/profile/complete');
    await fillProfileForm(page, testUser);
    await page.getByRole('button', { name: /save profile/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    
    // Navigate back to profile page
    await page.goto('/profile/complete');
    
    // Verify fields are pre-populated
    await expect(page.locator('input[name="first_name"]')).toHaveValue(testUser.first_name);
    await expect(page.locator('input[name="phone"]')).toHaveValue(testUser.phone);
    await expect(page.locator('input[name="country"]')).toHaveValue(testUser.country);
    await expect(page.locator('input[name="city"]')).toHaveValue(testUser.city);
    await expect(page.locator('input[name="occupation"]')).toHaveValue(testUser.occupation);
    await expect(page.locator('textarea[name="bio"]')).toHaveValue(testUser.bio);
  });
});
