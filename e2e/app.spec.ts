import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dropOnCanvas } from "./helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, "fixtures/minimal.schemamorph");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("SchemaMorph")).toBeVisible();
});

test("loads the canvas shell", async ({ page }) => {
  await expect(page.getByTestId("canvas")).toBeVisible();
  await expect(page.getByText("Database")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Minimalist" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("toggles view mode via toolbar", async ({ page }) => {
  await page.getByRole("button", { name: "Real Tools" }).click();
  await expect(
    page.getByRole("button", { name: "Real Tools" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "expand database" }),
  ).toBeVisible();
});

test("toggles view mode with the M hotkey", async ({ page }) => {
  await page.keyboard.press("m");
  await expect(
    page.getByRole("button", { name: "Real Tools" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("m");
  await expect(
    page.getByRole("button", { name: "Minimalist" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("places a node on the canvas via drag-and-drop", async ({ page }) => {
  await dropOnCanvas(page, { archetype: "database", tool: "mysql" });
  await expect(page.locator(".react-flow__node")).toHaveCount(1);
  await expect(page.getByText("Database")).toBeVisible();
});

test("imports a diagram from a .schemamorph file", async ({ page }) => {
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByTestId("settings-popover")).toBeVisible();

  const fileInput = page.getByTestId("file-input");
  await fileInput.setInputFiles(fixturePath);

  await expect(page.getByText("Users DB")).toBeVisible();
});

test("lock mode blocks placing new nodes", async ({ page }) => {
  await page.getByRole("button", { name: "Toggle lock" }).click();

  await dropOnCanvas(page, { archetype: "database", tool: "mysql" });
  await expect(page.locator(".react-flow__node")).toHaveCount(0);
});

test("palette search filters archetypes in minimalist mode", async ({
  page,
}) => {
  await page.getByRole("textbox", { name: "Search tools" }).fill("queue");
  await expect(page.getByText("Queue")).toBeVisible();
  await expect(page.getByText("Database")).toHaveCount(0);
});
