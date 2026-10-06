// Renders every page of a PDF served by the dev server into a contact sheet and screenshots it.
export default async function (page, base) {
  const pdfUrl = process.env.PDF ?? 'output/T-2026-0417_Package.pdf';
  const out = process.env.SHEET ?? 'screenshots/08-package-pages.png';
  const pages = process.env.PAGES ?? '';
  const width = Number(process.env.WIDTH ?? 330);
  await page.goto(`${base}?render`);
  const info = await page.eval(`(async () => {
    const lib = await import('/node_modules/pdfjs-dist/build/pdf.mjs');
    lib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';
    const data = new Uint8Array(await (await fetch('/${pdfUrl}')).arrayBuffer());
    const doc = await lib.getDocument({ data }).promise;
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;padding:16px;background:#d9ddd8;display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start';
    const wanted = '${pages}' ? '${pages}'.split(',').map(Number) : [...Array(doc.numPages)].map((_, i) => i + 1);
    const sizes = [];
    for (const n of wanted) {
      const p = await doc.getPage(n);
      const vp1 = p.getViewport({ scale: 1 });
      sizes.push(n + ': ' + Math.round(vp1.width) + 'x' + Math.round(vp1.height));
      const vp = p.getViewport({ scale: ${width} / vp1.width });
      const c = document.createElement('canvas');
      c.width = vp.width; c.height = vp.height;
      c.style.boxShadow = '0 1px 4px rgba(0,0,0,.25)';
      c.style.background = '#fff';
      await p.render({ canvas: c, canvasContext: c.getContext('2d'), viewport: vp }).promise;
      document.body.appendChild(c);
    }
    return { pages: doc.numPages, sizes };
  })()`);
  console.log(JSON.stringify(info));
  await page.sleep(300);
  await page.shot(out, { fullPage: true });
}
