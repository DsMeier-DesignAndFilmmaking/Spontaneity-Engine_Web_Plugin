import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const shouldRun = Boolean(process.env.E2E_BASE_URL);

test.describe(shouldRun ? "Settings page" : "Settings page (skipped)", () => {
  test.skip(!shouldRun, "E2E_BASE_URL not configured");

  test("optimistic slider updates and rollback on failure", async ({ page }) => {
    const settingsPath = "/settings";
    let storedPrefs: any = {
      userId: "e2e-user",
      spontaneity: "medium",
      matchStrictness: "flexible",
      autoJoin: false,
      locationSharing: "nearby",
      radiusKm: 5,
      transportPreference: "walking",
      defaultNavProvider: "mapbox",
      offlineMaps: false,
      whoCanInvite: "contacts",
      profileVisibility: "pseudonym",
      safetyMode: "standard",
      accessibilityNeeds: [],
      budget: "$",
      timeAvailability: "now",
      aiPersona: "friendly",
      showReasoning: false,
      analyticsOptIn: false,
      dndSchedule: [],
      updatedAt: new Date().toISOString(),
    };

    let patchCount = 0;
    await page.route("**/api/v1/settings", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: storedPrefs }),
        });
        return;
      }

      if (request.method() === "PATCH") {
        patchCount += 1;
        const body = request.postDataJSON();
        if (patchCount === 2) {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Simulated failure" }),
          });
          return;
        }

        storedPrefs = {
          ...storedPrefs,
          ...body,
          updatedAt: new Date().toISOString(),
        };

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: storedPrefs }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto(settingsPath);

    await new AxeBuilder({ page }).analyze();

    const slider = page.locator("#spontaneity-range");
    await slider.fill("2");
    await expect(slider).toHaveValue("2");
    await expect(page.locator("text=Settings saved")).toBeVisible();

    await slider.fill("1");
    await expect(page.locator("text=Could not save")).toBeVisible();
    await expect(slider).toHaveValue("2");
  });
});
