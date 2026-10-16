import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
const password = "synthetic editor test passphrase";

async function account(page: Page) {
  await page.goto("/auth/signup");
  await page.getByLabel("Name", { exact: true }).fill("Editor Test");
  await page
    .getByLabel("Email", { exact: true })
    .fill("editor-" + randomUUID() + "@example.test");
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

test("Markdown editing, safe preview, Vim, undo, saving, exports and mobile layout", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [],
    externalRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("tracking.example.test"))
      externalRequests.push(request.url());
  });
  await account(page);
  try {
    await page
      .getByRole("button", { name: "Take a note...", exact: true })
      .click();
    const body = page.getByRole("textbox", { name: "Note body", exact: true });
    await page
      .getByLabel("Note title", { exact: true })
      .fill("Markdown laboratory");
    await expect(page.getByLabel("Editor keys")).toHaveValue("standard");
    await body.fill("Core");
    await body.press("ControlOrMeta+a");
    await page.getByRole("button", { name: "Bold", exact: true }).click();
    await expect(body).toHaveText("**Core**");
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(body).toHaveText("Core");
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(body).toHaveText("**Core**");
    await page.getByRole("button", { name: "Split", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Markdown preview" }).locator("strong"),
    ).toHaveText("Core");
    await page.getByRole("button", { name: "Find", exact: true }).click();
    await page.getByPlaceholder("Find").fill("Core");
    await expect(page.locator(".cm-searchMatch").first()).toBeVisible();
    await page.getByRole("button", { name: "close", exact: true }).click();
    await page.getByRole("button", { name: "Write", exact: true }).click();
    await body.fill("one two three");
    await page.getByLabel("Editor keys").selectOption("vim");
    await body.click();
    await page.keyboard.type("gg0iNew ");
    await page.keyboard.press("Escape");
    await expect(body).toHaveText("New one two three");
    await expect(page.locator(".note-editor-footer")).toContainText(
      "VIM · NORMAL",
    );
    await page.keyboard.type("v");
    await expect(page.locator(".note-editor-footer")).toContainText(
      "VIM · VISUAL",
    );
    await page.keyboard.press("Escape");
    await page.keyboard.type("ddu");
    await expect(body).toHaveText("New one two three");
    await page.keyboard.type(":w");
    await page.keyboard.press("Enter");
    await page
      .getByRole("button", {
        name: "Open note Markdown laboratory",
        exact: true,
      })
      .click();
    const dialog = page.getByRole("dialog", { name: "Edit note" });
    await expect(dialog).toBeVisible();
    await page.getByLabel("Editor keys").selectOption("vim");
    await body.focus();
    await body.press("Escape");
    await expect(dialog).toBeVisible();
    await page.getByLabel("Editor keys").selectOption("standard");
    const source =
      '# Focused study\n\n**Strong** and *emphasis*.\n\n| Pattern | Example |\n| --- | --- |\n| modal | können |\n\n- [x] Practise\n\n[Reference](https://example.com/reference)\n\n[Unsafe](javascript:alert(1))\n\n![Private diagram](https://tracking.example.test/pixel.png)\n\n<script>window.compromised=true</script>\n<iframe src="https://tracking.example.test/embed"></iframe>\n\n  Trailing spaces.  ';
    await body.fill(source);
    let expired = true;
    await page.route("**/api/notes/*", async (route) => {
      if (expired && route.request().method() === "PATCH") {
        expired = false;
        await route.fulfill({
          status: 401,
          json: { error: "Sign in to save. Your draft is still here." },
        });
      } else await route.continue();
    });
    await body.press("ControlOrMeta+s");
    await expect(dialog.getByRole("alert")).toContainText(
      "Your draft is still here",
    );
    await expect(
      dialog.getByRole("link", { name: "Sign in in another tab" }),
    ).toBeVisible();
    await expect(body).toContainText("Trailing spaces.");
    await expect(
      page.getByRole("button", { name: "Undo", exact: true }),
    ).toBeEnabled();
    page.once("dialog", (modal) => modal.dismiss());
    await body.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(body).toContainText("Trailing spaces.");
    await page
      .getByLabel("Note title", { exact: true })
      .press("ControlOrMeta+s");
    await expect(dialog).toBeVisible();
    await expect(page.locator(".note-editor-footer")).toContainText(
      "All changes saved",
    );
    await page.unroute("**/api/notes/*");
    const notes = await (await page.request.get("/api/notes")).json();
    const saved = notes.find(
      (note: { title: string }) => note.title === "Markdown laboratory",
    );
    expect(saved.body).toBe(source);
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const preview = page.getByRole("region", { name: "Markdown preview" });
    await expect(
      preview.getByRole("heading", { name: "Focused study" }),
    ).toBeVisible();
    await expect(preview.locator("table")).toBeVisible();
    await expect(preview.locator('input[type="checkbox"]')).toBeChecked();
    await expect(preview.locator('input[type="checkbox"]')).toBeDisabled();
    await expect(preview.locator("script, iframe, img")).toHaveCount(0);
    await expect(
      preview.getByRole("link", { name: "Unsafe", exact: true }),
    ).toHaveCount(0);
    await expect(
      preview.getByRole("link", { name: "Reference", exact: true }),
    ).toHaveAttribute("rel", "noopener noreferrer");
    await expect(
      preview.getByRole("link", { name: "Open image externally" }),
    ).toBeVisible();
    expect(externalRequests).toEqual([]);
    expect(await page.evaluate(() => "compromised" in window)).toBe(false);
    const downloadEvent = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download .md", exact: true })
      .click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe("Markdown laboratory.md");
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream!) chunks.push(chunk);
    expect(Buffer.concat(chunks).toString("utf8")).toBe(source);
    await download.delete();
    await page.getByRole("button", { name: "Write", exact: true }).click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(body).toHaveText("New one two three");
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(preview).toHaveCount(0);
    await page.getByRole("button", { name: "Split", exact: true }).click();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      await expect(preview).toBeVisible();
      const action = dialog.getByRole("button", {
        name: "Save & close",
        exact: true,
      });
      const box = await action.boundingBox();
      expect(box && box.y >= 0 && box.y + box.height <= 900).toBeTruthy();
      if (process.env.NOTEWELD_SCREENSHOTS)
        await page.screenshot({
          path:
            process.env.NOTEWELD_SCREENSHOTS + "/markdown-" + width + ".png",
        });
    }
    await page.getByRole("button", { name: "Write", exact: true }).click();
    await page.getByLabel("Editor keys").selectOption("simple");
    await expect(body).toHaveValue(source);
    await body.fill("Edited through the accessible simple editor.");
    await body.press("ControlOrMeta+s");
    await expect(page.locator(".note-editor-footer")).toContainText(
      "All changes saved",
    );
    await page
      .getByRole("button", { name: "Save & close", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    // Exercise the supported maximum and reject an oversized paste without truncation.
    const longSource = "abcdefgh".repeat(12_500);
    const created = await page.request.post("/api/notes", {
      headers: { Origin: baseURL! },
      data: { title: "Large source", body: longSource },
    });
    expect(created.status()).toBe(201);
    await page.reload();
    await page
      .getByRole("button", { name: "Open note Large source", exact: true })
      .click();
    await body.fill("x".repeat(100_001));
    await expect(page.locator(".note-editor-notice")).toContainText(
      "last edit was not added",
    );
    // CodeMirror virtualizes very long lines; its DOM intentionally contains only a viewport.
    // Export checks the complete controlled source rather than mistaking virtualization for data loss.
    const largeDownloadEvent = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download .md", exact: true })
      .click();
    const largeDownload = await largeDownloadEvent;
    const largeStream = await largeDownload.createReadStream();
    const largeChunks = [];
    for await (const chunk of largeStream!) largeChunks.push(chunk);
    expect(Buffer.concat(largeChunks).toString("utf8") === longSource).toBe(
      true,
    );
    await largeDownload.delete();
    await body.fill("Small draft remains editable after the limit.");
    await page
      .getByRole("button", { name: "Save & close", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    expect(errors).toEqual([]);
  } finally {
    expect(
      (
        await page.request.delete("/api/account", {
          headers: { Origin: baseURL! },
          data: { password, confirmation: "DELETE" },
        })
      ).status(),
    ).toBe(200);
  }
});

test("public editor example needs no account, exports real source and guards discarded work", async ({
  page,
}) => {
  const writes: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") writes.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/example");
  const csp = response!.headers()["content-security-policy"];
  expect(csp).toContain("'nonce-");
  expect(csp).toContain("'strict-dynamic'");
  expect(csp).not.toContain("'unsafe-eval'");
  const body = page.getByRole("textbox", { name: "Note body", exact: true });
  const source = "# A browser-only thought\n\n**Keep this exact text.**  ";
  await body.fill(source);
  await page.getByRole("button", { name: "Split", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Markdown preview" })
      .getByRole("heading", { name: "A browser-only thought" }),
  ).toBeVisible();
  await body.focus();
  await page.keyboard.press("Tab");
  await expect(body).not.toBeFocused();
  const downloadEvent = page.waitForEvent("download");
  await body.press("ControlOrMeta+s");
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("Noteweld scratchpad.md");
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString("utf8")).toBe(source);
  await download.delete();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("link", { name: "Open private workspace" }).click();
  await expect(page).toHaveURL(/\/example$/);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Reset example" }).click();
  await expect(page.locator(".note-editor-footer")).toContainText(
    "Browser-only draft",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset example" }).click();
  await expect(page.locator(".note-editor-footer")).toContainText(
    "Browser-only example",
  );
  await page.getByRole("button", { name: "Split", exact: true }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (process.env.NOTEWELD_SCREENSHOTS)
      await page.screenshot({
        path: process.env.NOTEWELD_SCREENSHOTS + "/example-" + width + ".png",
        fullPage: true,
      });
  }
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test("a failed editor chunk preserves a simple draft and still saves through the real API", async ({
  page,
  baseURL,
}) => {
  await account(page);
  let release!: () => void,
    intercepted = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await page.route("**/_next/static/chunks/*.js", async (route) => {
      const response = await route.fetch();
      const text = await response.text();
      if (text.includes("note-code-editor")) {
        intercepted = true;
        await gate;
        await route.abort("failed");
      } else await route.fulfill({ response });
    });
    await page
      .getByRole("button", { name: "Take a note...", exact: true })
      .click();
    await expect.poll(() => intercepted).toBe(true);
    await page
      .getByLabel("Note title", { exact: true })
      .fill("Recovered draft");
    await page.getByLabel("Editor keys").selectOption("simple");
    await page
      .getByLabel("Note body", { exact: true })
      .fill("Written while the enhanced editor was unavailable.");
    await page.getByLabel("Editor keys").selectOption("standard");
    release();
    await expect(
      page.getByText("Enhanced editing could not load.", { exact: false }),
    ).toBeVisible();
    await expect(page.getByLabel("Note body", { exact: true })).toHaveValue(
      "Written while the enhanced editor was unavailable.",
    );
    await page.getByRole("button", { name: "Save note", exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: "Open note Recovered draft",
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    release();
    await page.unroute("**/_next/static/chunks/*.js");
    expect(
      (
        await page.request.delete("/api/account", {
          headers: { Origin: baseURL! },
          data: { password, confirmation: "DELETE" },
        })
      ).status(),
    ).toBe(200);
  }
});
