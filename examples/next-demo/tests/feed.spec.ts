import { test, expect, type Page } from '@playwright/test'

async function swipeUp(page: Page) {
  const box = await page.locator('[role="group"]').boundingBox()
  if (!box) throw new Error('container not found')
  const cx = box.x + box.width / 2
  const startY = box.y + box.height * 0.8
  const endY = box.y + box.height * 0.2
  await page.mouse.move(cx, startY)
  await page.mouse.down()
  await page.mouse.move(cx, endY, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(400)
}

test('loads the first slide and HUD', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('hud')).toContainText('index:0')
  await expect(page.getByTestId('video').first()).toBeVisible()
})

test('swiping up advances the index', async ({ page }) => {
  await page.goto('/')
  await swipeUp(page)
  await expect(page.getByTestId('hud')).toContainText('index:1')
})

test('keyboard ArrowDown advances the index', async ({ page }) => {
  await page.goto('/')
  await page.locator('[role="group"]').focus()
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(400)
  await expect(page.getByTestId('hud')).toContainText('index:1')
})

test('renders the 2x2 ad grid at slot 3', async ({ page }) => {
  await page.goto('/')
  for (let i = 0; i < 3; i++) await swipeUp(page)
  await expect(page.getByTestId('ad-grid')).toBeVisible()
})

test('infinite append grows the feed near the end', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('hud')).toContainText('count:8')
  for (let i = 0; i < 6; i++) await swipeUp(page)
  await expect(page.getByTestId('hud')).toContainText('count:16')
})

test('visual screenshots at key viewports', async ({ page }) => {
  for (const [w, h] of [[320, 640], [768, 1024], [1024, 768], [1440, 900]] as const) {
    await page.setViewportSize({ width: w, height: h })
    await page.goto('/')
    await page.waitForTimeout(400)
    // Mask live media (video frames, remote avatars/images) so the chrome layout
    // is what is compared deterministically.
    await expect(page).toHaveScreenshot(`feed-${w}x${h}.png`, {
      maxDiffPixelRatio: 0.02,
      mask: [page.locator('video'), page.locator('img')],
    })
  }
})
