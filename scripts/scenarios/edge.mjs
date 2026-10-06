import { install, waitFor } from './helpers.mjs';

const drop = (name, content, type) => `(() => {
  const dt = new DataTransfer();
  dt.items.add(new File([${content}], ${JSON.stringify(name)}, { type: ${JSON.stringify(type)} }));
  window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  return true;
})()`;

export default async function (page, base) {
  const out = process.env.SHOTS ?? 'screenshots';
  await page.goto(base);
  await page.eval(`localStorage.setItem('tpb.theme', 'light'); true`);
  await page.goto(base);
  await page.eval(install);

  await page.eval(drop('requirements.json', `'{"tender": {"tender_id": "X", "title": "", "submission_deadline": "20/10/2026"}, "requirements": [{"id": 1}]}'`, 'application/json'));
  await page.sleep(400);
  console.log('Missing fields:', JSON.stringify(await page.eval(`document.querySelector('.alert__list')?.innerText`)));
  await page.shot(`${out}/09-invalid-requirements.png`);
  await page.eval(drop('requirements.json', `'{ broken'`, 'application/json'));
  await page.sleep(300);
  console.log('Broken JSON:', JSON.stringify(await page.eval(`document.querySelector('.alert__list')?.innerText`)));

  await page.viewport(900, 1000);
  await page.eval(`__t.clickText('Try the sample tender')`);
  await waitFor(page, `!!document.querySelector('.req')`);
  await page.eval(`__t.clickText('Load sample documents')`);
  await waitFor(page, `document.querySelectorAll('.file').length >= 12 && !document.querySelector('.file__checking')`);
  await page.eval(`document.querySelectorAll('.toast button').forEach(b => b.click()); true`);
  await page.sleep(300);
  console.log('Horizontal overflow at 900px:', await page.eval(`document.documentElement.scrollWidth > window.innerWidth`));
  console.log('genbar height:', await page.eval(`getComputedStyle(document.documentElement).getPropertyValue('--genbar-h')`));
  await page.shot(`${out}/10-narrow-900px.png`);
}
