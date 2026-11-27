import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.DUBLAB_URL || 'http://127.0.0.1:4173';
const MEDIA_DIR = '/cursor/stores/bc-4e225645-3df4-408d-91ce-8acadc33f78e/media';
const TMP_VIDEO_DIR = '/tmp/dublab-v7-video';

fs.mkdirSync(MEDIA_DIR, { recursive: true });
fs.rmSync(TMP_VIDEO_DIR, { recursive: true, force: true });
fs.mkdirSync(TMP_VIDEO_DIR, { recursive: true });

function assert(cond, msg) {
  if (!cond) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
}

async function saveShot(page, name) {
  const pngPath = path.join(TMP_VIDEO_DIR, `${name}.png`);
  const webpPath = path.join(MEDIA_DIR, `${name}.webp`);
  await page.screenshot({ path: pngPath, fullPage: false });
  execFileSync('ffmpeg', ['-y', '-i', pngPath, '-quality', '85', webpPath], { stdio: 'ignore' });
  console.log(`Saved ${webpPath}`);
}

async function run() {
  const browser = await chromium.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });

  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    recordVideo: { dir: TMP_VIDEO_DIR, size: { width: 412, height: 915 } },
  });

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  // 1. Check sticky 72px TopVisualizer and initial Level 0 Play view
  const vizBox = await page.getByTestId('top-visualizer').boundingBox();
  assert(vizBox && Math.round(vizBox.height) === 72, `Visualizer height expected 72, got ${vizBox?.height}`);
  const vizPos = await page.getByTestId('top-visualizer').evaluate((el) => getComputedStyle(el).position);
  assert(vizPos === 'sticky', `Visualizer position expected sticky, got ${vizPos}`);

  // Check canvas DPR sizing
  const canvasDims = await page.getByTestId('viz-canvas').evaluate((c) => ({
    w: c.width,
    cw: c.clientWidth,
  }));
  assert(canvasDims.w > canvasDims.cw, `Canvas should be DPR scaled: ${JSON.stringify(canvasDims)}`);

  await saveShot(page, 'dublab-v7-play-idle');

  // 2. Unlock audio + play
  await page.getByTestId('play-banner').click();
  await page.waitForTimeout(350);

  const ctxState = await page.getByTestId('ctx-state').textContent();
  assert(ctxState?.trim() === 'running', `Expected running AudioContext, got ${ctxState}`);
  const meterText = await page.locator('.meter-row span').last().textContent();
  assert(parseInt(meterText || '0', 10) > 10, `Expected active audio meter > 10%, got ${meterText}`);

  await saveShot(page, 'dublab-v7-viz-wave-steady');

  // 3. Cycle visualizer WAVE -> BARS -> SPEC without stopping audio
  await page.getByTestId('top-visualizer').click();
  await page.waitForTimeout(250);
  assert((await page.getByTestId('viz-mode-chip').textContent())?.trim() === 'BARS', 'Expected BARS mode');
  await saveShot(page, 'dublab-v7-viz-bars');

  await page.getByTestId('top-visualizer').click();
  await page.waitForTimeout(450);
  assert((await page.getByTestId('viz-mode-chip').textContent())?.trim() === 'SPEC', 'Expected SPEC mode');
  await saveShot(page, 'dublab-v7-viz-spec');

  const playLabel = await page.getByTestId('play-banner').textContent();
  assert(playLabel?.includes('STOP SIREN'), 'Tapping visualizer must NOT stop audio');

  // Persist viz mode across reload
  await page.reload({ waitUntil: 'networkidle' });
  assert((await page.getByTestId('viz-mode-chip').textContent())?.trim() === 'SPEC', 'Viz mode must persist');
  await page.getByTestId('top-visualizer').click(); // back to WAVE

  // 4. 100 play/stop cycles sanity check (no errors / stuck state)
  for (let i = 0; i < 100; i++) {
    await page.getByTestId('play-banner').click();
  }
  const afterCycles = await page.getByTestId('ctx-state').textContent();
  assert(afterCycles?.trim() === 'running', 'AudioContext still running after 100 toggles');

  // 5. Build tab: Level 0, LED + 470 ohm (6.4 mA), burnt LED without R
  await page.getByTestId('tab-build').click();
  await page.waitForTimeout(150);
  await saveShot(page, 'dublab-v7-build-level0');

  // Add LED alone -> burnt warning
  await page.getByTestId('board-part-led').click();
  await page.waitForTimeout(150);
  const burntWarn = await page.getByTestId('led-burnt-warning').textContent();
  assert(burntWarn?.includes('5 V'), `Expected 5 V burnt warning, got ${burntWarn}`);
  await saveShot(page, 'dublab-v7-build-led-burnt');

  // Add LED resistor -> default 470 ohm (6.4 mA)
  await page.getByTestId('board-part-led-resistor').click();
  await page.waitForTimeout(150);
  const ledCfgText = await page.getByTestId('led-config').textContent();
  assert(ledCfgText?.includes('470Ω · 6.4 mA'), `Expected 470Ω · 6.4 mA, got ${ledCfgText}`);
  await saveShot(page, 'dublab-v7-build-led');

  // 6. Unlock Level 1 via Quiz
  await page.getByTestId('open-quiz-quiz-l1').click();
  await page.waitForTimeout(150);
  await page.getByTestId('quiz-opt-q1-pin5-1').click();
  await page.getByTestId('quiz-opt-q1-cap-0').click();
  await page.getByTestId('quiz-submit').click();
  await page.waitForTimeout(200);
  const banner1 = await page.getByTestId('unlock-banner').textContent();
  assert(banner1?.includes('Level 1 unlocked'), `Expected Level 1 unlock banner, got ${banner1}`);
  await saveShot(page, 'dublab-v7-quiz-unlocked');

  // Place LFO parts, check build -> unlocks Level 2
  await page.getByTestId('board-part-lfo-555').click();
  await page.getByTestId('board-part-rate-pot').click();
  await page.getByTestId('board-part-depth-pot').click();
  await page.getByTestId('check-build-btn').click();
  await page.waitForTimeout(150);
  assert((await page.getByTestId('unlock-banner').textContent())?.includes('Level 2'), 'Expected L2 unlock');

  // Place op-amp, check build -> unlocks Level 3
  await page.getByTestId('board-part-opamp-shaper').click();
  await page.getByTestId('check-build-btn').click();
  await page.waitForTimeout(150);
  assert((await page.getByTestId('unlock-banner').textContent())?.includes('Level 3'), 'Expected L3 unlock');

  // Place HPF & LPF, verify PT2399 stays locked stub
  await page.getByTestId('board-part-hpf-rc').click();
  await page.getByTestId('board-part-lpf-rc').click();
  await page.waitForTimeout(150);
  const buildText = await page.getByTestId('build-mode').textContent();
  assert(buildText?.includes('LOCKED STUB'), 'Expected PT2399 locked stub');
  await saveShot(page, 'dublab-v7-build-all-parts');

  // 7. Play views: Both -> Schematic -> Circuit -> Knobs -> Both
  await page.getByTestId('go-play-btn').click();
  await page.waitForTimeout(150);
  await page.getByTestId('play-banner').click(); // start playing
  await page.waitForTimeout(350);

  // Set Op-Amp SAW wave
  await page.getByTestId('wave-sawtooth').click();
  await page.waitForTimeout(250);
  await saveShot(page, 'dublab-v7-play-both-saw-led');

  // Cycle views: default is 'both' -> click once => 'schematic'
  await page.getByTestId('view-toggle').click();
  await page.waitForTimeout(250);
  assert((await page.getByTestId('view-toggle').textContent())?.includes('Schematic'), 'Expected Schematic view');

  // Check Schematic +5V assertions
  const schSvgText = await page.getByTestId('schematic-svg').textContent();
  assert(schSvgText?.includes('+5V'), 'Schematic must contain +5V flags');
  assert(schSvgText?.includes('5 V supply'), 'Schematic must label BT1 5 V supply');
  assert(schSvgText?.includes('3.33V'), 'Schematic must show pin 5 = 3.33V');
  assert(schSvgText?.includes('MCP6002'), 'Schematic must label op-amp MCP6002');
  assert(schSvgText?.includes('2.5V'), 'Schematic must show 2.5V op-amp bias');
  assert(schSvgText?.includes('LM358'), 'Schematic must show LM358 headroom note');
  assert(!schSvgText?.includes('+9V') && !schSvgText?.includes('78L05'), 'Schematic must not contain +9V or 78L05');

  // Verify 8 numbered U1 pins
  for (let pin = 1; pin <= 8; pin++) {
    const count = await page.locator(`[data-pin="U1-${pin}"]`).count();
    assert(count === 1, `Missing schematic pin U1-${pin}`);
  }

  // Verify touch-action & zoom Fit (Chromium normalizes pan-x pan-y pinch-zoom to 'manipulation')
  const touchAction = await page.getByTestId('schematic-scroll').evaluate((el) => getComputedStyle(el).touchAction);
  assert(
    touchAction === 'manipulation' || touchAction.includes('pinch-zoom'),
    `Expected manipulation/pinch-zoom touchAction, got ${touchAction}`,
  );
  await saveShot(page, 'dublab-v7-schematic-live');

  await page.getByTestId('schem-fit').click();
  await page.waitForTimeout(200);
  await saveShot(page, 'dublab-v7-schematic-l3-fit');

  // Persist schematic view + Fit zoom across reload
  await page.reload({ waitUntil: 'networkidle' });
  assert((await page.getByTestId('view-toggle').textContent())?.includes('Schematic'), 'View mode must persist');
  await page.getByTestId('schem-zoom-1.25').click();

  // Cycle Schematic -> Circuit -> Knobs -> Both
  await page.getByTestId('view-toggle').click();
  await page.waitForTimeout(150);
  assert((await page.getByTestId('view-toggle').textContent())?.includes('Circuit'), 'Expected Circuit view');
  await saveShot(page, 'dublab-v7-play-circuit');

  await page.getByTestId('view-toggle').click();
  await page.waitForTimeout(150);
  assert((await page.getByTestId('view-toggle').textContent())?.includes('Knobs'), 'Expected Knobs view');
  await saveShot(page, 'dublab-v7-play-knobs');

  await page.getByTestId('view-toggle').click();
  await page.waitForTimeout(150);
  assert((await page.getByTestId('view-toggle').textContent())?.includes('Both'), 'Expected Both view');

  // Verify curriculum markdown endpoint has +5V
  const docResp = await page.request.get(`${BASE_URL}/docs/breadboard-curriculum.md`);
  assert(docResp.ok(), 'breadboard-curriculum.md must be served');
  const docBody = await docResp.text();
  assert(docBody.includes('+5 V rail'), 'Served curriculum must reflect +5 V rail');

  // Burnt LED screenshot in Schematic view
  await page.getByTestId('tab-build').click();
  await page.getByTestId('board-part-led-resistor').click(); // remove R -> burnt
  await page.getByTestId('go-play-btn').click();
  await page.getByTestId('view-toggle').click(); // Both -> Schematic
  await page.waitForTimeout(200);
  const ledStatusAttr = await page.locator('[data-sch="led"]').getAttribute('data-led-status');
  assert(ledStatusAttr === 'burnt', `Expected data-led-status=burnt, got ${ledStatusAttr}`);
  await saveShot(page, 'dublab-v7-schematic-led-burnt');

  assert(errors.length === 0, `Runtime errors detected:\n${errors.join('\n')}`);

  const videoPath = await page.video()?.path();
  await context.close();
  await browser.close();

  if (videoPath && fs.existsSync(videoPath)) {
    const outMp4 = path.join(MEDIA_DIR, 'dublab-v7-demo.mp4');
    execFileSync(
      'ffmpeg',
      ['-y', '-i', videoPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outMp4],
      { stdio: 'ignore' },
    );
    console.log(`Saved ${outMp4}`);
  }

  console.log('V7_VERIFY_PASS');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
