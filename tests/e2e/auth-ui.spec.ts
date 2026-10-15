import { test, expect, type Page } from "@playwright/test";
const password = "correct synthetic passphrase";
async function fields(page: Page) {
  await page.getByLabel("Name", { exact: true }).fill("Person");
  await page.getByLabel("Email", { exact: true }).fill("Person@Example.com");
  await page.getByLabel("Password", { exact: true }).fill(password);
}
// These boundary simulations complement the actual cookie/database journey.
test("malformed requests fail before persistence and cross-origin writes fail", async ({
  request,
  baseURL,
}) => {
  for (const data of [
    null,
    [],
    {},
    { email: 7, password },
    { email: "person@example.com", password: "short" },
    { email: "person@example.com", password: "é".repeat(37) },
  ]) {
    expect(
      (
        await request.post("/api/auth/register", {
          data: JSON.stringify(data),
          headers: { "Content-Type": "application/json", Origin: baseURL! },
        })
      ).status(),
    ).toBe(400);
  }
  expect(
    (
      await request.post("/api/auth/register", {
        data: { email: "x@example.test", password },
        headers: { Origin: "https://untrusted.example" },
      })
    ).status(),
  ).toBe(403);
});
test("failed signup preserves input; recovery acknowledgment precedes login", async ({
  page,
  baseURL,
}) => {
  let writes = 0;
  await page.route("**/api/auth/register", (route) => {
    writes++;
    return route.fulfill({
      status: writes === 1 ? 409 : 201,
      json:
        writes === 1
          ? { error: "Email is already registered" }
          : { id: "fixture", recoveryKey: "a".repeat(43) },
    });
  });
  await page.route("**/api/auth/callback/credentials*", (route) =>
    route.fulfill({
      json: {
        url: baseURL + "/auth/signin?error=CredentialsSignin&code=credentials",
      },
    }),
  );
  await page.goto("/auth/signup");
  await fields(page);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.locator('[role="alert"]:not(#__next-route-announcer__)'),
  ).toContainText("already registered");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue(
    password,
  );
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "I saved this key somewhere private." })
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.locator('[role="alert"]:not(#__next-route-announcer__)'),
  ).toContainText("account is created");
  expect(writes).toBe(2);
  await expect(page.locator("form")).toHaveCount(0);
});
test("pending signup suppresses duplicate submissions and failure is announced", async ({
  page,
}) => {
  let writes = 0;
  let finish!: () => void;
  const gate = new Promise<void>((resolve) => (finish = resolve));
  await page.route("**/api/auth/register", async (route) => {
    writes++;
    await gate;
    await route.fulfill({ status: 503, json: { error: "Try again later" } });
  });
  await page.goto("/auth/signup");
  await fields(page);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect.poll(() => writes).toBe(1);
  await expect(
    page.getByRole("button", { name: "Creating account…" }),
  ).toBeDisabled();
  await page
    .locator("form")
    .evaluate((f) =>
      f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
    );
  finish();
  await expect(
    page.locator('[role="alert"]:not(#__next-route-announcer__)'),
  ).toHaveText("Try again later");
  expect(writes).toBe(1);
});
for (const width of [320, 390, 768, 1440])
  test(`forms fit ${width}px with keyboard labels`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/auth/signin", "/auth/signup", "/auth/recover"]) {
      await page.goto(path);
      const email = page.getByLabel("Email", { exact: true });
      await email.focus();
      await expect(email).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.locator("input[type=password]").first()).toBeFocused();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
