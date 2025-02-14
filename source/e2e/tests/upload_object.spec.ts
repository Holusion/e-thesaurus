import path from "node:path";
import { randomUUID } from "node:crypto";

import { test, expect } from '@playwright/test';

const fixtures = path.resolve(import.meta.dirname, "../__test_fixtures");

//Authenticated as admin
test.use({ storageState: 'playwright/.auth/user.json' });

test("uploads and rename a glb", async ({page, request})=>{
  await page.goto("/ui/upload");
  //We are forced to use the rename otherwise we'd have a name collision
  const name = randomUUID();
  const f = page.getByRole("form", {name: "create a new scene"});
  await expect(f).toBeVisible();
  await expect(f.getByRole("combobox", {name: "language"})).toHaveValue("en");
  await f.getByRole("button", {name: "select a file"}).setInputFiles(path.join(fixtures, "cube.glb"));
  await f.getByRole("textbox", {name: "scene title"}).fill(name)
  await f.getByRole("button", {name: "create a scene"}).click();

  const uploads = page.getByRole("region", {name: "uploads"});
  await expect(uploads).toBeVisible();
  //Don't check for actual progress bar visibility because that could be too quick to register
  const link = uploads.getByRole("link", {name: name});
  await link.click();
  await expect(page).toHaveURL(`/ui/scenes/${name}`);
  await expect(page.locator("h1")).toHaveText(name);

  let res = await request.get(`/scenes/${name}/scene.svx.json`);
  await expect(res).toBeOK();
  let doc = JSON.parse((await res.body()).toString());
  expect(doc).toHaveProperty("setups");
  expect(doc.setups).toHaveLength(1);
  expect(doc.setups[0]).toHaveProperty("language", {language: "EN"});


  res = await request.get(`/scenes/${name}/models/${name}.glb`);
  await expect(res).toBeOK();
  expect(res.headers()).toHaveProperty("etag", "W/4diz3Hx67bxWyU9b_iCJD864pVJ6OGYCPh9sU40QyLs");
});

test("uploads and rename a glb (force FR)", async ({page, request})=>{
  await page.goto("/ui/upload");
  //We are forced to use the rename otherwise we'd have a name collision
  const name = randomUUID();
  const uploads = page.getByRole("region", {name: "uploads"});
  const f = page.getByRole("form", {name: "create a new scene"});
  await expect(f).toBeVisible();
  await expect(uploads).not.toBeVisible();
  await f.getByRole("combobox", {name: "language"}).selectOption("fr");
  await f.getByRole("button", {name: "select a file"}).setInputFiles(path.join(fixtures, "cube.glb"));
  await f.getByRole("textbox", {name: "scene title"}).fill(name)
  await f.getByRole("button", {name: "create a scene"}).click();

  await expect(uploads).toBeVisible();
  //Don't check for actual progress bar visibility because that could be too quick to register
  const link = uploads.getByRole("link", {name: name});
  await link.click();
  await expect(page).toHaveURL(`/ui/scenes/${name}`);
  await expect(page.locator("h1")).toHaveText(name);

  let res = await request.get(`/scenes/${name}/scene.svx.json`);
  await expect(res).toBeOK();
  let doc = JSON.parse((await res.body()).toString());
  expect(doc).toHaveProperty("setups");
  expect(doc.setups).toHaveLength(1);
  expect(doc.setups[0]).toHaveProperty("language", {language: "FR"});


  res = await request.get(`/scenes/${name}/models/${name}.glb`);
  await expect(res).toBeOK();
  expect(res.headers()).toHaveProperty("etag", "W/4diz3Hx67bxWyU9b_iCJD864pVJ6OGYCPh9sU40QyLs");
});
