import { install, waitFor } from './helpers.mjs';

export default async function (page, base) {
  await page.goto(base);
  await page.eval(install);
  await page.eval(`__t.clickText('Try the sample tender')`);
  await waitFor(page, `!!document.querySelector('.req')`);
  await page.eval(`__t.clickText('Load sample documents')`);
  await waitFor(page, `document.querySelectorAll('.file').length >= 12 && !document.querySelector('.file__checking')`);
  console.log(
    await page.eval(`JSON.stringify({
      inner: innerHeight,
      doc: document.documentElement.scrollHeight,
      overflowing: [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().bottom > innerHeight + 1 && !el.closest('.col__scroll'))
        .slice(0, 8)
        .map((el) => el.className + ' ' + Math.round(el.getBoundingClientRect().bottom)),
      checklistWidth: document.querySelector('.col--checklist')?.clientWidth,
    })`),
  );
}
