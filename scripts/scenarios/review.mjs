import { install, waitFor } from './helpers.mjs';

export default async function (page, base) {
  const out = process.env.SHOTS ?? '../.review';
  await page.goto(base);
  await page.shot(`${out}/01-welcome.png`);
  await page.eval(install);
  await page.eval(`__t.clickText('Try the sample tender')`);
  await waitFor(page, `!!document.querySelector('.req')`);
  await page.eval(`__t.clickText('Load sample documents')`);
  await waitFor(page, `document.querySelectorAll('.file').length > 5 && !document.querySelector('.file__checking')`);
  await page.sleep(400);
  console.log(JSON.stringify(await page.eval(`__t.toasts()`), null, 1));
  console.log(JSON.stringify(await page.eval(`__t.files()`), null, 1));
  await page.shot(`${out}/02-loaded.png`);
  await page.shot(`${out}/02-loaded-full.png`, { fullPage: true });
}
