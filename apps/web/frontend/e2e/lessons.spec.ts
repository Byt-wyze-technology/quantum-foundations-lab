/**
 * The two end-to-end scenarios named in §15, driven through the real UI.
 *
 * These deliberately assert on what a learner can *see* — the rendered
 * probabilities, the histogram, the accessible descriptions — rather than on
 * store internals. That is the point of an end-to-end test: the unit suites
 * already know the mathematics is right, so what is left to check is that the
 * interface tells the truth about it.
 */

import { expect, test } from "@playwright/test";

const openTwoQubitLab = async (page: import("@playwright/test").Page) => {
  await page.goto("/explore");
  await page.getByLabel("Qubits").selectOption("2");
  await expect(page.getByRole("heading", { name: "Joint state", exact: true })).toBeVisible();
};

test.describe("§15 — the Bell-state scenario", () => {
  test("H then CNOT gives |Φ⁺⟩, and 1,000 shots show only 00 and 11", async ({ page }) => {
    // 1. Load |00⟩.
    await openTwoQubitLab(page);
    await expect(
      page.getByRole("img", { name: /basis state 00:.*probability 100\.0 per cent/ }).first(),
    ).toBeVisible();

    // 2. Apply H to qubit 0.
    const palette = page.getByRole("heading", { name: "Gate palette" }).locator("..");
    await palette.getByRole("button", { name: "H", exact: true }).click();

    // 3. Apply CNOT with qubit 0 as control.
    await palette.getByRole("button", { name: "CNOT 0→1" }).click();

    // 4. The displayed state is |Φ⁺⟩: equal weight on 00 and 11, nothing else.
    for (const label of ["00", "11"]) {
      await expect(
        page
          .getByRole("img", { name: new RegExp(`basis state ${label}:.*probability 50\\.0 per cent`) })
          .first(),
      ).toBeVisible();
    }
    for (const label of ["01", "10"]) {
      await expect(
        page
          .getByRole("img", { name: new RegExp(`basis state ${label}:.*probability 0\\.0 per cent`) })
          .first(),
      ).toBeVisible();
    }

    // The pair is reported as maximally entangled, in words as well as figures.
    await expect(
      page.getByText("Maximally entangled — neither qubit has a state of its own."),
    ).toBeVisible();

    // 5. Measure 1,000 shots.
    await page.getByRole("button", { name: "1,000 shots" }).click();

    // 6 and 7. Only 00 and 11 appear, each within tolerance of 50%.
    const statistics = page.getByRole("heading", { name: "Statistics" }).locator("..");
    const readCount = async (label: string) => {
      const caption = statistics.locator(".histogram-caption", { hasText: new RegExp(`^${label}`) });
      const text = (await caption.innerText()).replace(/\s+/g, " ");
      const match = text.match(/(\d[\d,]*) ·/);
      return match ? Number(match[1]!.replace(/,/g, "")) : 0;
    };

    expect(await readCount("01")).toBe(0);
    expect(await readCount("10")).toBe(0);

    const zeroZero = await readCount("00");
    const oneOne = await readCount("11");
    expect(zeroZero + oneOne).toBe(1000);
    // Five standard deviations on 1,000 fair shots is about 79.
    expect(Math.abs(zeroZero - 500)).toBeLessThan(80);
    expect(Math.abs(oneOne - 500)).toBeLessThan(80);
  });

  test("neither half of the pair is drawn as an independent pure state", async ({ page }) => {
    await openTwoQubitLab(page);
    const palette = page.getByRole("heading", { name: "Gate palette" }).locator("..");
    await palette.getByRole("button", { name: "H", exact: true }).click();
    await palette.getByRole("button", { name: "CNOT 0→1" }).click();

    for (const qubit of [0, 1]) {
      const sphere = page.getByRole("img", { name: new RegExp(`Reduced state of qubit ${qubit}`) });
      await expect(sphere).toBeVisible();
      const description = await sphere.getAttribute("aria-label");
      expect(description).toContain("maximally mixed");
      expect(description).not.toMatch(/theta \d+ degrees/);
    }
  });

  test("step playback shows the pair is still separable before the CNOT", async ({ page }) => {
    await openTwoQubitLab(page);
    const palette = page.getByRole("heading", { name: "Gate palette" }).locator("..");
    await palette.getByRole("button", { name: "H", exact: true }).click();
    await palette.getByRole("button", { name: "CNOT 0→1" }).click();

    await expect(page.getByText(/Maximally entangled/)).toBeVisible();

    await page.getByLabel(/Step playback/).fill("1");
    await expect(page.getByText("Product state — each qubit has a state of its own.")).toBeVisible();
  });
});

test.describe("§15 — the phase scenario", () => {
  test("Z leaves the Z-basis odds alone and flips the X-basis outcome", async ({ page }) => {
    // 1. Load |+⟩.
    await page.goto("/explore");
    await page.getByRole("button", { name: "|+⟩" }).click();

    const measurement = page.getByRole("heading", { name: "Measurement" }).locator("..");
    await expect(measurement.getByText("50.0%").first()).toBeVisible();

    // In the X basis, |+⟩ reads +1 with certainty.
    await page.getByLabel("Measurement basis").selectOption("X");
    await expect(
      measurement.locator(".amplitude-row", { hasText: "+1" }).getByText("100.0%"),
    ).toBeVisible();

    // Back to Z, where the odds are even.
    await page.getByLabel("Measurement basis").selectOption("Z");

    // 2. Apply Z.
    const palette = page.getByRole("heading", { name: "Gate palette" }).locator("..");
    await palette.getByRole("button", { name: "Z", exact: true }).click();

    // 3. The computational probabilities are unchanged.
    await expect(
      page.getByRole("img", { name: /basis state 0:.*probability 50\.0 per cent/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: /basis state 1:.*probability 50\.0 per cent/ }).first(),
    ).toBeVisible();

    // 4 and 5. In the X basis the certain outcome has flipped from +1 to −1.
    await page.getByLabel("Measurement basis").selectOption("X");
    await expect(
      measurement.locator(".amplitude-row", { hasText: "−1" }).getByText("100.0%"),
    ).toBeVisible();
    await expect(
      measurement.locator(".amplitude-row", { hasText: "+1" }).getByText("0.0%"),
    ).toBeVisible();
  });
});

test.describe("the guided lesson", () => {
  test("opens, reveals its mathematics on request, and marks a checkpoint", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /A qubit has infinitely many directions/ }),
    ).toBeVisible();

    const section = page.locator("#classical-bit");
    await section.scrollIntoViewIfNeeded();

    // The mathematics starts hidden, so the picture arrives first.
    const reveal = section.locator("details.maths-reveal");
    await expect(reveal).not.toHaveAttribute("open", "");
    await section.getByText("Show the mathematics").click();
    await expect(reveal).toHaveAttribute("open", "");

    await section.getByRole("button", { name: "0 or 1, with equal probability" }).click();
    await expect(section.getByText(/Right\. The measurement gives one of two allowed answers/))
      .toBeVisible();
  });

  test("carries a state from a lesson section into the laboratory", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#bell");
    await section.scrollIntoViewIfNeeded();
    await section.getByRole("link", { name: /Try this in the laboratory/ }).click();

    await expect(page).toHaveURL(/\/explore$/);
    await expect(page.getByRole("heading", { name: "Two qubits, one joint state." })).toBeVisible();
    await expect(page.getByText(/Maximally entangled/)).toBeVisible();
  });
});

test.describe("accessibility (§16)", () => {
  test("the Bloch sphere is keyboard operable and describes its state", async ({ page }) => {
    await page.goto("/explore");
    await page.getByRole("button", { name: "|0⟩" }).click();

    const sphere = page.getByRole("img", { name: /Qubit state/ }).first();
    await expect(sphere).toHaveAttribute("aria-label", /Equivalent state: \|0⟩/);

    await sphere.focus();
    // Six presses of a 15-degree step take the state to the equator.
    for (let press = 0; press < 6; press += 1) await page.keyboard.press("ArrowDown");
    await expect(sphere).toHaveAttribute("aria-label", /theta 90 degrees/);

    await page.keyboard.press("Home");
    await expect(sphere).toHaveAttribute("aria-label", /Equivalent state: \|0⟩/);
  });

  test("offers a skip link and high-contrast and reduced-motion switches", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();

    await page.getByRole("button", { name: "Contrast" }).click();
    await expect(page.locator("div.app")).toHaveClass(/high-contrast/);

    await page.getByRole("button", { name: "Motion" }).click();
    await expect(page.locator("div.app")).toHaveClass(/reduced-motion/);
  });
});
