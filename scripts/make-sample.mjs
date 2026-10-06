// Generates a realistic test pack in public/sample/ with the same kinds of problems
// as the competition pack: expired / same-day expiry, renamed duplicate, non-PDF,
// damaged PDF, password-protected PDF, mixed page sizes and a rotated page.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { PDFDocument, PDFHexString, StandardFonts, degrees, rgb } from 'pdf-lib';

const OUT = new URL('../public/sample/', import.meta.url);
const DOCS = new URL('documents/', OUT);

const tender = {
  tender_id: 'T-2026-0417',
  title: 'Supply of IT Equipment',
  procuring_entity: 'Directorate of Secondary and Higher Education',
  bidder: 'Meghna Tech Solutions Ltd.',
  submission_deadline: '2026-10-20',
};

// Deliberately unsorted with gaps in `order`.
const requirements = [
  { id: 'R05', order: 6, title_en: 'Experience Certificate', title_bn: 'অভিজ্ঞতার সনদ', mandatory: true, has_expiry: false },
  { id: 'R01', order: 1, title_en: 'Trade License', title_bn: 'ট্রেড লাইসেন্স', mandatory: true, has_expiry: true },
  { id: 'R02', order: 2, title_en: 'TIN Certificate', title_bn: 'টিআইএন সনদ', mandatory: true, has_expiry: false },
  { id: 'R03', order: 3, title_en: 'VAT Registration Certificate', title_bn: 'ভ্যাট নিবন্ধন সনদ', mandatory: true, has_expiry: true },
  { id: 'R04', order: 5, title_en: 'Bank Solvency Certificate', title_bn: 'ব্যাংক সচ্ছলতা সনদ', mandatory: true, has_expiry: true },
  { id: 'R07', order: 4, title_en: 'Power of Attorney', title_bn: 'আমমোক্তারনামা', mandatory: false, has_expiry: true },
  { id: 'R06', order: 8, title_en: 'Audited Financial Statement', title_bn: 'নিরীক্ষিত আর্থিক বিবরণী', mandatory: false, has_expiry: false },
  { id: 'R08', order: 10, title_en: 'Technical Proposal', title_bn: 'কারিগরি প্রস্তাব', mandatory: true, has_expiry: false },
  { id: 'R09', order: 12, title_en: 'Financial Proposal', title_bn: 'আর্থিক প্রস্তাব', mandatory: true, has_expiry: false },
  { id: 'R10', order: 9, title_en: 'Manufacturer Authorization Letter', title_bn: 'প্রস্তুতকারকের অনুমোদনপত্র', mandatory: false, has_expiry: true },
];

const A4 = [595.28, 841.89];

async function certificate({ issuer, title, lines, validity, pages = 1, size = A4, extra }) {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  for (let p = 0; p < pages; p++) {
    const page = doc.addPage(size);
    const { width: W, height: H } = page.getSize();
    page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: rgb(0.2, 0.3, 0.3), borderWidth: 1.2 });
    page.drawText(issuer, { x: 56, y: H - 80, size: 11, font: bold, color: rgb(0.1, 0.3, 0.3) });
    page.drawText(p === 0 ? title : `${title} (continued)`, { x: 56, y: H - 120, size: 20, font: bold });
    let y = H - 160;
    for (const line of p === 0 ? lines : [`Page ${p + 1} of the original document.`, ...lines.slice(0, 3)]) {
      page.drawText(line, { x: 56, y, size: 11.5, font: regular, color: rgb(0.15, 0.15, 0.15) });
      y -= 20;
    }
    if (validity && p === 0) {
      page.drawText(validity, { x: 56, y: y - 14, size: 12.5, font: bold, color: rgb(0.45, 0.1, 0.1) });
    }
    // Content near the very bottom edge proves the footer does not cover anything.
    page.drawText('Authorised signature and seal', { x: 56, y: 40, size: 9.5, font: regular, color: rgb(0.3, 0.3, 0.3) });
    page.drawLine({ start: { x: 56, y: 54 }, end: { x: 236, y: 54 }, thickness: 0.8, color: rgb(0.3, 0.3, 0.3) });
  }
  extra?.(doc);
  doc.setTitle(title);
  return doc.save();
}

const files = {};

files['trade_license_2026-27.pdf'] = await certificate({
  issuer: 'DHAKA NORTH CITY CORPORATION',
  title: 'Trade License',
  lines: ['License No: TRAD/DNCC/045219/2026', 'Business name: Meghna Tech Solutions Ltd.', 'Nature of business: IT equipment supply and services', 'Issue date: 01 July 2026'],
  validity: 'Valid until: 30 June 2027',
});

files['eTIN_Certificate.pdf'] = await certificate({
  issuer: 'NATIONAL BOARD OF REVENUE',
  title: 'e-TIN Certificate',
  lines: ['TIN: 1234 5678 9012', 'Taxpayer: Meghna Tech Solutions Ltd.', 'Status: Company', 'This certificate has no expiry date.'],
});

files['VAT_BIN_registration.pdf'] = await certificate({
  issuer: 'NATIONAL BOARD OF REVENUE - VAT',
  title: 'VAT Registration Certificate (BIN)',
  lines: ['BIN: 000123456-0101', 'Registered person: Meghna Tech Solutions Ltd.', 'Form Mushak-2.3'],
  validity: 'Valid until: 20 October 2026',
});

files['bank_solvency_certificate.pdf'] = await certificate({
  issuer: 'SONALI BANK PLC, MOTIJHEEL BRANCH',
  title: 'Bank Solvency Certificate',
  lines: ['This is to certify that Meghna Tech Solutions Ltd. maintains', 'current account no. 0100-2345-6789 with satisfactory transactions.', 'Issue date: 01 April 2026'],
  validity: 'This certificate is valid until 30 September 2026',
});

files['bank_solvency_certificate_renewed.pdf'] = await certificate({
  issuer: 'SONALI BANK PLC, MOTIJHEEL BRANCH',
  title: 'Bank Solvency Certificate',
  lines: ['This is to certify that Meghna Tech Solutions Ltd. maintains', 'current account no. 0100-2345-6789 with satisfactory transactions.', 'Issue date: 01 October 2026'],
  validity: 'This certificate is valid until 31 December 2026',
});

const experience = await certificate({
  issuer: 'BANGLADESH COMPUTER COUNCIL',
  title: 'Experience Certificate',
  lines: ['Meghna Tech Solutions Ltd. successfully supplied and installed', '250 desktop computers under contract BCC/PROC/2025/118.', 'Contract value: BDT 2,15,00,000', 'Completion date: 15 March 2026'],
  pages: 2,
});
files['experience_certificate_BCC.pdf'] = experience;
files['scan_0042.pdf'] = experience; // identical bytes, different name

files['Technical_Proposal.pdf'] = await (async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = (size, title, rotate) => {
    const p = doc.addPage(size);
    const { width, height } = p.getSize();
    p.drawText(title, { x: 50, y: height - 70, size: 18, font: bold });
    p.drawText('Meghna Tech Solutions Ltd. - Technical proposal for Tender T-2026-0417', { x: 50, y: height - 96, size: 10.5, font });
    p.drawText('Bottom-edge content: specification reference TP-2026', { x: 50, y: 30, size: 9, font });
    p.drawRectangle({ x: 50, y: 60, width: width - 100, height: height - 190, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.8 });
    if (rotate) p.setRotation(degrees(rotate));
  };
  page(A4, 'Technical Proposal - Cover Letter');
  page(A4, 'Section 1: Compliance Statement');
  page([841.89, 595.28], 'Section 2: Specification Comparison Table (landscape)');
  page(A4, 'Section 3: Delivery Schedule (scanned sideways)', 90);
  page(A4, 'Section 4: After-sales Service Plan');
  return doc.save();
})();

files['Financial_Proposal_BOQ.pdf'] = await certificate({
  issuer: 'MEGHNA TECH SOLUTIONS LTD.',
  title: 'Financial Proposal and Price Schedule',
  lines: ['Bill of quantities for Tender T-2026-0417', 'Total quoted price: BDT 3,48,75,000 (VAT inclusive)'],
  pages: 3,
});

files['manufacturer_authorization_letter.pdf'] = await certificate({
  issuer: 'DELL TECHNOLOGIES - SOUTH ASIA',
  title: 'Manufacturer Authorization Letter',
  lines: ['We authorise Meghna Tech Solutions Ltd. to bid for and supply', 'our products under Tender T-2026-0417.', 'Date: 12 September 2026'],
  validity: 'This authorization is valid until 31 March 2027',
});

// Damaged: valid header, then truncated garbage.
const good = await certificate({ issuer: 'ACNABIN CHARTERED ACCOUNTANTS', title: 'Audited Financial Statement 2025', lines: ['Balance sheet as at 30 June 2025'] });
files['audited_financial_statement_2025.pdf'] = Buffer.concat([Buffer.from(good.slice(0, 600)), Buffer.from('\n%%garbled transfer%%\n'.repeat(20))]);

// Password-protected: the trailer references a standard-security /Encrypt dictionary.
files['power_of_attorney_protected.pdf'] = await certificate({
  issuer: 'NOTARY PUBLIC, DHAKA',
  title: 'Power of Attorney',
  lines: ['Authorising Mr. Rafiq Ahmed to sign tender documents.'],
  validity: 'Valid until: 31 December 2026',
  extra: (doc) => {
    const enc = doc.context.obj({
      Filter: 'Standard',
      V: 2,
      R: 3,
      Length: 128,
      P: -1340,
      O: PDFHexString.of('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
      U: PDFHexString.of('fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210'),
    });
    doc.context.trailerInfo.Encrypt = doc.context.register(enc);
  },
});

// Not PDFs.
files['company_profile.docx'] = Buffer.from('PK\x03\x04 fake word document', 'latin1');
files['office_photo.pdf'] = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, ...Array(200).fill(0)]);

await rm(OUT, { recursive: true, force: true });
await mkdir(DOCS, { recursive: true });
for (const [name, bytes] of Object.entries(files)) await writeFile(new URL(name, DOCS), bytes);
await writeFile(new URL('requirements.json', OUT), JSON.stringify({ tender, requirements }, null, 2));
await writeFile(new URL('manifest.json', OUT), JSON.stringify(Object.keys(files), null, 2));
console.log(`Wrote ${Object.keys(files).length} sample files to public/sample/documents`);
