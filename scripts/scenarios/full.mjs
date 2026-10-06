import { existsSync } from 'node:fs';
import { install, waitFor } from './helpers.mjs';

const log = (label, value) => console.log(`\n## ${label}\n${typeof value === 'string' ? value : JSON.stringify(value, null, 1)}`);

export default async function (page, base) {
  const shots = process.env.SHOTS ?? 'screenshots';
  const output = process.env.OUTPUT ?? 'output';
  await page.downloadsTo(output);
  await page.goto(base);
  await page.eval(`localStorage.clear(); localStorage.setItem('tpb.theme', 'light'); true`);
  await page.goto(base);
  await page.eval(install);
  await page.shot(`${shots}/01-welcome.png`);

  await page.eval(`__t.clickText('Try the sample tender')`);
  await waitFor(page, `!!document.querySelector('.req')`);
  await page.eval(`__t.clickText('Load sample documents')`);
  await waitFor(page, `document.querySelectorAll('.file').length >= 12 && !document.querySelector('.file__checking')`);
  await page.sleep(300);
  log('Toasts after upload', await page.eval(`__t.toasts()`));
  log('Files', await page.eval(`__t.files()`));
  log('Suggestions', await page.eval(`[...document.querySelectorAll('.req')].map(r => r.querySelector('.req__num').textContent + ' ' + (r.querySelector('.suggestion__name')?.textContent ?? '-'))`));
  await page.shot(`${shots}/02-files-loaded.png`);
  await page.eval(`document.querySelectorAll('.toast button').forEach((b) => b.click()); true`);

  // Match everything the way an office worker would.
  const pick = async (order, name) => log(`pick #${order} ${name}`, await page.eval(`__t.pick(${order}, ${JSON.stringify(name)})`));
  const date = async (order, value) => page.eval(`__t.date(${order}, ${JSON.stringify(value)})`);
  await pick(1, 'trade_license_2026-27.pdf');
  await pick(2, 'eTIN_Certificate.pdf');
  await pick(3, 'VAT_BIN_registration.pdf');
  await pick(5, 'bank_solvency_certificate.pdf');
  await pick(6, 'scan_0042.pdf');
  await pick(8, 'experience_certificate_BCC.pdf'); // duplicate of #6 -> must be disabled
  await pick(4, 'power_of_attorney_protected.pdf'); // protected -> must be disabled
  await pick(8, 'audited_financial_statement_2025.pdf'); // damaged -> must be disabled
  await pick(10, 'Technical_Proposal.pdf');
  await pick(12, 'Financial_Proposal_BOQ.pdf');
  await date(1, '2027-06-30');
  await date(3, '2026-10-20'); // same day as deadline -> OK
  await date(5, '2026-09-30'); // before deadline -> Expired
  await page.sleep(200);
  log('Statuses (mixed)', await page.eval(`__t.statuses()`));
  log('Blockers', await page.eval(`[...document.querySelectorAll('.issues-box__link')].map(b => b.textContent)`));
  log('Generate disabled?', await page.eval(`document.querySelector('.genbar__go').disabled`));
  await page.eval(`window.scrollTo(0, 0); true`);
  await page.shot(`${shots}/03-statuses.png`);
  await page.eval(`__t.row(5).scrollIntoView({block: 'center'}); true`);
  await page.sleep(300);
  await page.shot(`${shots}/04-expired-and-same-day.png`);

  // Language toggle mid-flow keeps all state.
  const before = await page.eval(`JSON.stringify([...document.querySelectorAll('.req select')].map(s => s.value)) + JSON.stringify([...document.querySelectorAll('.req input[type=date]')].map(i => i.value))`);
  await page.eval(`document.querySelector('.lang-toggle button[lang=bn]').click(); true`);
  await page.sleep(400);
  const afterBn = await page.eval(`JSON.stringify([...document.querySelectorAll('.req select')].map(s => s.value)) + JSON.stringify([...document.querySelectorAll('.req input[type=date]')].map(i => i.value))`);
  log('State kept after switching to Bangla', before === afterBn);
  log('Bangla statuses', await page.eval(`__t.statuses()`));
  await page.eval(`window.scrollTo(0, 0); true`);
  await page.shot(`${shots}/05-bangla.png`);
  await page.eval(`document.querySelector('.lang-toggle button[lang=en]').click(); true`);
  await page.sleep(300);
  log('Language persisted', await page.eval(`localStorage.getItem('tpb.lang')`));

  // Blocker click scrolls to and highlights the row.
  await page.eval(`document.querySelector('.issues-box__link').click(); true`);
  await page.sleep(500);
  log('Flash row after blocker click', await page.eval(`document.querySelector('.req--flash')?.id`));

  // Resolve problems: renewed solvency certificate, remove duplicate, add expiry dates.
  await pick(5, 'bank_solvency_certificate_renewed.pdf');
  log('#5 after changing file (date must be cleared)', await page.eval(`__t.row(5).querySelector('input[type=date]').value + ' / ' + __t.row(5).querySelector('.chip').textContent`));
  await date(5, '2026-12-31');

  // Removing a matched file reverts the row.
  await page.eval(`[...document.querySelectorAll('.file')].find(f => f.querySelector('.file__name').textContent === 'scan_0042.pdf').querySelector('.file__remove').click(); true`);
  await page.sleep(200);
  log('#6 after removing its matched file', await page.eval(`__t.row(6).querySelector('.chip').textContent + ' / select=' + __t.row(6).querySelector('select').value`));
  log('Duplicate badge gone', await page.eval(`!document.querySelector('.dup-tag')`));
  await pick(6, 'experience_certificate_BCC.pdf');
  await pick(9, 'manufacturer_authorization_letter.pdf');
  await date(9, '2027-03-31');
  await page.sleep(200);
  log('Final statuses', await page.eval(`__t.statuses()`));
  log('Bar', await page.eval(`document.querySelector('.issues-box__title').textContent + ' | disabled=' + document.querySelector('.genbar__go').disabled`));
  await page.eval(`window.scrollTo(0, 0); true`);
  await page.shot(`${shots}/06-all-set.png`);

  await page.eval(`document.querySelector('.genbar__go').click(); true`);
  const file = `${output}/T-2026-0417_Package.pdf`;
  for (let i = 0; i < 60 && !existsSync(file); i++) await page.sleep(250);
  await page.sleep(500);
  log('Package downloaded', existsSync(file));
  log('Toasts after generate', await page.eval(`__t.toasts()`));
  await page.shot(`${shots}/07-generated.png`);
  await page.eval(`__t.clickText('Export checklist'); true`);
  await page.sleep(800);
}
