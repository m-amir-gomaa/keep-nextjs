import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
// Full journey: real Auth.js cookies and real PostgreSQL, not a mocked login.
test("account, notes, conflicts, labels, mobile navigation, recovery and deletion", async ({
  page,
  browser,
  baseURL,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const email = "browser-" + randomUUID() + "@example.test";
  const password = "synthetic long passphrase";
  await page.goto("/auth/signup");
  await page.getByLabel("Name", { exact: true }).fill("Synthetic Browser");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Account created" }),
  ).toBeVisible();
  const key = await page
    .getByLabel("Private recovery key", { exact: true })
    .inputValue();
  expect(key.length).toBe(43);
  await page
    .getByRole("checkbox", { name: "I saved this key somewhere private." })
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForURL("**/dashboard");
  await expect(page).toHaveTitle(/Noteweld/);
  await expect(
    page.getByRole("button", {
      name: "Open note Example — Sketch a project",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Take a note...", exact: true })
    .click();
  await page
    .getByLabel("Note title", { exact: true })
    .fill("A durable thought");
  await page
    .getByLabel("Note body", { exact: true })
    .fill("  Preserve body whitespace.  ");
  // Network failure keeps the draft; retry uses the same idempotency key.
  const keys: string[] = [];
  let fail = true;
  await page.route("**/api/notes", async (route) => {
    if (route.request().method() === "POST") {
      keys.push(route.request().headers()["idempotency-key"]);
      if (fail) {
        fail = false;
        await route.fulfill({
          status: 503,
          json: { error: "Synthetic connection failure" },
        });
        return;
      }
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(
    page.locator('[role="alert"]:not(#__next-route-announcer__)'),
  ).toContainText("Synthetic connection failure");
  await expect(page.getByLabel("Note body", { exact: true })).toHaveValue(
    "  Preserve body whitespace.  ",
  );
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Open note A durable thought",
      exact: true,
    }),
  ).toBeVisible();
  expect(keys.length).toBe(2);
  expect(keys[0]).toBe(keys[1]);
  await page.unroute("**/api/notes");
  await page.reload();
  await page
    .getByRole("button", { name: "Open note A durable thought", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Edit note" });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel("Note title", { exact: true })).toBeFocused();
  await page
    .getByLabel("Note body", { exact: true })
    .fill("Draft must survive a conflict");
  const all = await (await page.request.get("/api/notes")).json();
  const note = all.find(
    (n: { title: string }) => n.title === "A durable thought",
  );
  expect(note.body).toBe("  Preserve body whitespace.  ");
  expect(
    (
      await page.request.patch("/api/notes/" + note.id, {
        headers: { Origin: baseURL! },
        data: {
          body: "Saved from a second tab",
          expectedRevision: note.revision,
        },
      })
    ).status(),
  ).toBe(200);
  await page.getByRole("button", { name: "Save & close" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    /changed|updated|another/i,
  );
  await expect(page.getByLabel("Note body", { exact: true })).toHaveValue(
    "Draft must survive a conflict",
  );
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reload saved version" }).click();
  await expect(page.getByLabel("Note body", { exact: true })).toHaveValue(
    "Saved from a second tab",
  );
  await page.getByRole("button", { name: "Save & close" }).click();
  await expect(dialog).toBeHidden();
  // Search and actual checklist mutation/trash restoration.
  await page.getByLabel("Search notes", { exact: true }).fill("durable");
  await expect(page.locator("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("button", { name: "New list", exact: true }).click();
  await page.getByLabel("Note title", { exact: true }).fill("Checklist");
  await page.getByLabel("Item 1", { exact: true }).fill("A real task");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  const card = page
    .locator("article")
    .filter({
      has: page.getByRole("button", {
        name: "Open note Checklist",
        exact: true,
      }),
    });
  await card.locator("input[type=checkbox]").click();
  await expect(card.locator("input[type=checkbox]")).toBeChecked();
  await card
    .getByRole("button", { name: "Move to trash", exact: true })
    .click();
  await page.getByRole("link", { name: "Trash", exact: true }).click();
  const trashed = page.locator("article").filter({ hasText: "Checklist" });
  await expect(trashed.locator("input[type=checkbox]")).toBeDisabled();
  await trashed.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(trashed).toHaveCount(0);
  // Label CRUD updates the navigation and retains identity on rename.
  await page.getByRole("link", { name: "Edit labels", exact: true }).click();
  await page.getByLabel("New label", { exact: true }).fill("Research");
  await page.getByRole("button", { name: "Create label", exact: true }).click();
  const link = page.getByRole("link", { name: "Research", exact: true });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  await page
    .getByRole("button", { name: "Edit label Research", exact: true })
    .click();
  const input = page.getByLabel("Rename Research", { exact: true });
  await input.fill("Sources");
  await page
    .getByRole("button", { name: "Save label name", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Sources", exact: true }),
  ).toHaveAttribute("href", href!);
  await page.getByRole("link", { name: "Notes", exact: true }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("button", { name: "Main menu" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (process.env.NOTEWELD_SCREENSHOTS)
      await page.screenshot({
        path: process.env.NOTEWELD_SCREENSHOTS + "/workspace-" + width + ".png",
      });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Main menu" }).click();
  await expect(
    page.getByRole("link", { name: "Account", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Main menu" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Main menu" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.getByRole("button", { name: "Main menu" }).click();
  await page.getByRole("link", { name: "Account", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Account", exact: true }),
  ).toBeVisible();
  const exported = await page.request.get("/api/account");
  expect(exported.status()).toBe(200);
  expect(exported.headers()["cache-control"]).toContain("no-store");
  const data = await exported.json();
  expect(
    data.notes.some((n: { title: string }) => n.title === "A durable thought"),
  ).toBe(true);
  expect(data.account.email).toBe(email);
  expect(JSON.stringify(data)).not.toContain("recoveryHash");
  const other = await browser.newContext();
  const recovery = await other.newPage();
  await recovery.goto(baseURL + "/auth/recover");
  await recovery.getByLabel("Email", { exact: true }).fill(email);
  await recovery.getByLabel("Recovery key", { exact: true }).fill(key);
  await recovery
    .getByLabel("New passphrase", { exact: true })
    .fill("a replacement long passphrase");
  await recovery
    .getByRole("button", { name: "Reset passphrase", exact: true })
    .click();
  await expect(
    recovery.getByRole("heading", { name: "Save your recovery key" }),
  ).toBeVisible();
  expect((await page.request.get("/api/notes")).status()).toBe(401);
  expect(
    (
      await recovery.request.post(baseURL + "/api/auth/recover", {
        headers: { Origin: baseURL! },
        data: { email, password, key, recoveryKey: key },
      })
    ).status(),
  ).toBe(400);
  await recovery
    .getByRole("checkbox", { name: "I saved this key somewhere private." })
    .check();
  await recovery.getByRole("button", { name: "Continue", exact: true }).click();
  await recovery.getByLabel("Email", { exact: true }).fill(email);
  await recovery
    .getByLabel("Password", { exact: true })
    .fill("a replacement long passphrase");
  await recovery.getByRole("button", { name: "Sign In", exact: true }).click();
  await recovery.waitForURL("**/dashboard");
  expect(
    (
      await recovery.request.delete(baseURL + "/api/account", {
        headers: { Origin: baseURL! },
        data: {
          password: "a replacement long passphrase",
          confirmation: "DELETE",
        },
      })
    ).status(),
  ).toBe(200);
  expect((await recovery.request.get(baseURL + "/api/notes")).status()).toBe(
    401,
  );
  await other.close();
  expect(errors).toEqual([]);
});
