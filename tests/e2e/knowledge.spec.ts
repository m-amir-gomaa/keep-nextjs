import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
const password = "synthetic connected notes passphrase";
async function register(page: Page) {
  await page.goto("/auth/signup");
  await page.getByLabel("Name", { exact: true }).fill("Connections test");
  await page
    .getByLabel("Email", { exact: true })
    .fill("connections-" + randomUUID() + "@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Account created" }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "I saved this key somewhere private." })
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForURL("**/dashboard");
}

test("knowledge metadata rejects unauthenticated access", async ({
  request,
}) => {
  const response = await request.get("/api/knowledge");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("owned wiki links, picker, backlinks, renames, archive/trash, graph and failure recovery", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await register(page);
  const other = await browser.newContext({ baseURL });
  const foreignPage = await other.newPage();
  let otherCreated = false;
  const headers = { Origin: baseURL! };
  const create = async (data: object) => {
    const response = await page.request.post("/api/notes", { headers, data });
    expect(response.status()).toBe(201);
    return response.json();
  };
  const patch = async (id: string, fields: object) => {
    const current = await (await page.request.get("/api/notes/" + id)).json();
    const response = await page.request.patch("/api/notes/" + id, {
      headers,
      data: { ...fields, expectedRevision: current.revision },
    });
    expect(response.status()).toBe(200);
    return response.json();
  };
  try {
    await register(foreignPage);
    otherCreated = true;
    const foreignResponse = await foreignPage.request.post("/api/notes", {
      headers,
      data: { title: "Foreign private title", body: "Foreign private content" },
    });
    expect(foreignResponse.status()).toBe(201);
    const foreign = await foreignResponse.json();
    const labelResponse = await page.request.post("/api/labels", {
      headers,
      data: { name: "Phonetics" },
    });
    expect(labelResponse.status()).toBe(201);
    const label = await labelResponse.json();
    const target = await create({
      title: "Pronunciation",
      body: "# Sounds before words",
      labelIds: [label.id],
    });
    await patch(target.id, { archived: true });
    const source = await create({
      title: "Source note",
      body: `[[Pronunciation]] [[note:${target.id}|Stable target]] [[Missing]] [[note:${foreign.id}|Unavailable external id]]\n\n\`[[Not a link]]\``,
    });
    const metadata = await page.request.get(
      "/api/knowledge?userId=ignored-foreign-user",
    );
    expect(metadata.status()).toBe(200);
    expect(metadata.headers()["cache-control"]).toContain("no-store");
    let index = await metadata.json();
    expect(
      index.notes.some(
        (note: { id: string; archived: boolean }) =>
          note.id === target.id && note.archived,
      ),
    ).toBe(true);
    expect(JSON.stringify(index)).not.toContain("Foreign private title");
    expect(
      index.notes.some((note: { id: string }) => note.id === foreign.id),
    ).toBe(false);
    await page.goto("/dashboard/note/" + source.id);
    await expect(
      page.getByRole("heading", { name: "Source note", exact: true }),
    ).toBeVisible();
    let preview = page.getByRole("region", { name: "Markdown preview" });
    await expect(
      preview.getByRole("link", { name: "Stable target", exact: true }),
    ).toHaveAttribute("href", "/dashboard/note/" + target.id);
    await expect(
      preview
        .locator(".wiki-unavailable")
        .filter({ hasText: "Unavailable external id" }),
    ).toContainText("unavailable");
    await expect(
      preview.getByRole("link", { name: "Not a link", exact: true }),
    ).toHaveCount(0);
    await preview
      .getByRole("link", { name: "Stable target", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(target.id + "$"));
    await expect(
      page.getByRole("heading", { name: "Pronunciation", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Note connections" })
        .getByRole("link", { name: "Source note", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Edit note", exact: true }).click();
    await page
      .getByLabel("Note title", { exact: true })
      .fill("Renamed pronunciation");
    await page
      .getByRole("button", { name: "Save & close", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Renamed pronunciation", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("region", { name: "Note connections" })
      .getByRole("link", { name: "Source note", exact: true })
      .click();
    preview = page.getByRole("region", { name: "Markdown preview" });
    await expect(
      preview.getByRole("link", { name: "Stable target", exact: true }),
    ).toHaveAttribute("title", "Open note: Renamed pronunciation");
    await expect(
      preview.locator(".wiki-unavailable").filter({ hasText: "Pronunciation" }),
    ).toBeVisible();
    await create({ title: "Shared title", body: "First" });
    await create({ title: "Shared title", body: "Second" });
    const before = await (
      await page.request.get("/api/notes/" + source.id)
    ).json();
    await patch(source.id, { body: before.body + "\n\n[[Shared title]]" });
    await page.reload();
    await expect(
      preview.locator(".wiki-unavailable").filter({ hasText: "Shared title" }),
    ).toContainText("ambiguous title");
    await page.getByRole("button", { name: "Edit note", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Edit note" });
    const body = dialog.getByRole("textbox", {
      name: "Note body",
      exact: true,
    });
    await body.press("ControlOrMeta+End");
    await page.getByRole("button", { name: "Link note", exact: true }).click();
    await page.getByLabel("Find a note to link").fill("Renamed pronunciation");
    await page.getByLabel("Find a note to link").press("Escape");
    await expect(dialog).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Link note", exact: true }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Link note", exact: true }).click();
    await page.getByLabel("Find a note to link").fill("Renamed pronunciation");
    await page
      .getByLabel("Note to link", { exact: true })
      .selectOption(target.id);
    await page
      .getByRole("button", { name: "Insert note link", exact: true })
      .click();
    await expect(body).toContainText(
      `[[note:${target.id}|Renamed pronunciation]]`,
    );
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    page.once("dialog", (modal) => modal.dismiss());
    await dialog
      .getByRole("region", { name: "Markdown preview" })
      .getByRole("link", { name: "Stable target", exact: true })
      .click();
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(new RegExp(source.id + "$"));
    await page
      .getByRole("button", { name: "Save & close", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await patch(target.id, { deleted: true });
    await page.reload();
    await expect(
      preview.locator(".wiki-unavailable").filter({ hasText: "Stable target" }),
    ).toContainText("unavailable");
    index = await (await page.request.get("/api/knowledge")).json();
    expect(
      index.notes.some((note: { id: string }) => note.id === target.id),
    ).toBe(false);
    await patch(target.id, { deleted: false });
    await page.reload();
    await expect(
      preview.getByRole("link", { name: "Stable target", exact: true }),
    ).toBeVisible();
    await page.goto("/dashboard/graph");
    await expect(
      page.getByRole("heading", { name: "Your connections" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Filter graph", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Graph label", { exact: true })
      .selectOption(label.id);
    await expect(page.locator(".graph-caption")).toContainText(
      "1 of 1 matching notes",
    );
    await page
      .getByRole("button", { name: "Reset filters", exact: true })
      .click();
    await page
      .getByLabel("Focus note", { exact: true })
      .selectOption(source.id);
    await expect(page.locator(".graph-caption")).toContainText(
      "2 of 2 matching notes",
    );
    const canvas = page.getByRole("img", { name: /Connections between notes/ });
    const initialCamera = await canvas.getAttribute("viewBox");
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    expect(await canvas.getAttribute("viewBox")).not.toBe(initialCamera);
    await page.getByRole("button", { name: "Pan right", exact: true }).click();
    await page.getByRole("button", { name: "Fit graph", exact: true }).click();
    expect(await canvas.getAttribute("viewBox")).toBe(initialCamera);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (process.env.NOTEWELD_SCREENSHOTS)
        await page.screenshot({
          path: process.env.NOTEWELD_SCREENSHOTS + "/graph-" + width + ".png",
          fullPage: true,
        });
    }
    await page.route("**/api/knowledge", (route) =>
      route.fulfill({
        status: 503,
        json: { error: "Synthetic index failure" },
      }),
    );
    await page
      .getByRole("button", { name: "Refresh graph", exact: true })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Synthetic index failure" }),
    ).toBeVisible();
    await page.unroute("**/api/knowledge");
    await page
      .getByRole("button", { name: "Retry graph", exact: true })
      .click();
    await expect(
      page.getByLabel("Filter graph", { exact: true }),
    ).toBeVisible();
    await page.goto("/dashboard/note/" + foreign.id);
    await expect(
      page.getByRole("alert").filter({ hasText: "Note not found" }),
    ).toBeVisible();
    expect(await page.locator("body").textContent()).not.toContain(
      "Foreign private title",
    );
    expect((await page.request.get("/api/notes/" + foreign.id)).status()).toBe(
      404,
    );
    const removed = await patch(target.id, { deleted: true });
    expect(
      (
        await page.request.delete("/api/notes/" + target.id, {
          headers: { ...headers, "If-Match": String(removed.revision) },
        })
      ).status(),
    ).toBe(200);
    await create({
      title: "Renamed pronunciation",
      body: "A different identity",
    });
    await page.goto("/dashboard/note/" + source.id);
    await expect(
      page
        .getByRole("region", { name: "Markdown preview" })
        .locator(".wiki-unavailable")
        .filter({ hasText: "Stable target" }),
    ).toContainText("unavailable");
    expect((await page.request.get("/api/notes/" + target.id)).status()).toBe(
      404,
    );
    expect(errors).toEqual([]);
  } finally {
    expect(
      (
        await page.request.delete("/api/account", {
          headers,
          data: { password, confirmation: "DELETE" },
        })
      ).status(),
    ).toBe(200);
    if (otherCreated)
      expect(
        (
          await foreignPage.request.delete("/api/account", {
            headers,
            data: { password, confirmation: "DELETE" },
          })
        ).status(),
      ).toBe(200);
    await other.close();
  }
});

test("account-free graph uses original notes, keyboard controls, filters and local links", async ({
  page,
}) => {
  const apiRequests: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      apiRequests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/example/graph");
  await expect(
    page.getByRole("heading", { name: "Notes are better connected." }),
  ).toBeVisible();
  await expect(page.locator(".graph-caption")).toContainText(
    "6 of 6 matching notes",
  );
  await page
    .getByLabel("Graph label", { exact: true })
    .selectOption("Learning");
  await expect(page.locator(".graph-caption")).toContainText(
    "2 of 2 matching notes",
  );
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Focus Research", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".graph-caption")).toContainText(
    "3 of 3 matching notes",
  );
  await page.getByRole("link", { name: "Open Research", exact: false }).click();
  await expect(page).toHaveURL(/#example-research$/);
  await expect(
    page
      .locator("#example-research")
      .getByRole("heading", { name: "Find the useful question" }),
  ).toBeVisible();
  await expect(page.locator("#example-review .wiki-unavailable")).toContainText(
    "Unwritten idea",
  );
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator(".knowledge-graph").scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (process.env.NOTEWELD_SCREENSHOTS)
      await page.locator(".knowledge-graph").screenshot({
        path:
          process.env.NOTEWELD_SCREENSHOTS + "/graph-example-" + width + ".png",
      });
  }
  expect(apiRequests).toEqual([]);
  expect(errors).toEqual([]);
});
