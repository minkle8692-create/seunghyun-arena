import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
test("live controls show named teams and visible multi-target kick with knockback", async ({
  page,
}) => {
  await page.goto("/?diagnostics=1");
  await expect(page.locator(".score.A b")).toHaveText("14세 승현");
  await expect(page.locator(".score.B b")).toHaveText("35세 승현");
  await expect(page.getByTestId("kick-rules")).toContainText("최대 6명");
  await expect(page.getByTestId("kick-rules")).toContainText("360°");
  await page.waitForFunction(() => !!(window as any).arenaDiagnostics);
  await page.getByRole("button", { name: "▶ 전투 시작 / 재개" }).click();
  await page.waitForFunction(
    () =>
      !!(window as any).arenaDiagnostics
        .snapshot()
        .units.find((u: any) => u.kick),
    {},
    { polling: 16 },
  );
  await page.getByRole("button", { name: "Ⅱ 일시정지", exact: true }).click();
  await page.screenshot({ path: "evidence/kick-windup.png", fullPage: true });
  await page.getByRole("button", { name: "▶ 전투 시작 / 재개" }).click();
  await page.waitForFunction(
    () => {
      const s = (window as any).arenaDiagnostics.snapshot();
      return s.events.filter((e: any) => e.kind === "kick_hit").length >= 2;
    },
    {},
    { polling: 16 },
  );
  const hit = await page.evaluate(() => {
    const s = (window as any).arenaDiagnostics.snapshot();
    return {
      tick: s.tick,
      events: s.events,
      targets: s.units
        .filter((u: any) => u.kx || u.ky)
        .map((u: any) => ({ id: u.id, x: u.x, y: u.y, kx: u.kx, ky: u.ky })),
    };
  });
  expect(
    hit.events.filter((e: any) => e.kind === "kick_hit").length,
  ).toBeGreaterThanOrEqual(2);
  expect(hit.targets.some((u: any) => Math.hypot(u.kx, u.ky) > 17 * 256)).toBe(
    true,
  );
  await page.waitForFunction(
    (tick) => (window as any).arenaDiagnostics.snapshot().tick >= tick + 2,
    hit.tick,
  );
  const pushed = await page.evaluate(() =>
    (window as any).arenaDiagnostics.snapshot(),
  );
  const displacement = hit.targets.map((u: any) => {
    const v = pushed.units.find((v: any) => v.id === u.id);
    return { id: u.id, pixels: Math.hypot(v.x - u.x, v.y - u.y) / 256 };
  });
  expect(displacement.some((u: any) => u.pixels > 8)).toBe(true);
  Object.assign(hit, { displacement, afterTick: pushed.tick });
  await page.getByRole("button", { name: "Ⅱ 일시정지", exact: true }).click();
  await page.screenshot({ path: "evidence/kick-impact.png", fullPage: true });
  await page.locator(".logs summary").click();
  await expect(page.locator(".logs")).toContainText("돌려차기");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "evidence/kick-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  writeFileSync("evidence/kick-browser.json", JSON.stringify(hit, null, 2));
});
