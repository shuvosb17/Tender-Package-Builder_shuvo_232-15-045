import type { RequirementsIssue } from './lib/requirements';
import type { FileProblem, StatusCode, Tender } from './lib/types';

export type Lang = 'en' | 'bn';

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export function digits(value: string | number, lang: Lang): string {
  const s = String(value);
  return lang === 'bn' ? s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]) : s;
}

export function formatDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatBytes(bytes: number, lang: Lang): string {
  const mb = bytes / (1024 * 1024);
  const text = mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return digits(text, lang);
}

const tenderFieldEn: Record<keyof Tender, string> = {
  tender_id: 'tender ID',
  title: 'title',
  procuring_entity: 'procuring entity',
  bidder: 'bidder',
  submission_deadline: 'submission deadline',
};
const tenderFieldBn: Record<keyof Tender, string> = {
  tender_id: 'টেন্ডার আইডি',
  title: 'শিরোনাম',
  procuring_entity: 'ক্রয়কারী প্রতিষ্ঠান',
  bidder: 'দরদাতা',
  submission_deadline: 'জমার শেষ তারিখ',
};

const en = {
  appName: 'Tender Package Builder',
  appTagline: 'Check every document and build one submission-ready PDF.',
  privacyNote: 'Everything stays on this computer. Files are never uploaded.',
  langLabel: 'Language',
  // Welcome
  welcomeTitle: 'Prepare your tender package',
  welcomeBody:
    'Start with the requirements.json file you received with the tender. It tells the app which documents are needed and in what order.',
  stepLoad: 'Open the requirements file',
  stepUpload: 'Add your PDF documents',
  stepMatch: 'Match each document and enter expiry dates',
  stepGenerate: 'Download one combined, ordered PDF',
  openRequirements: 'Open requirements.json',
  loadSample: 'Try the sample tender',
  loadSampleFiles: 'Load sample documents',
  dropJsonHint: 'or drop the file anywhere on this page',
  changeRequirements: 'Change tender',
  // Top bar
  tenderId: 'Tender ID',
  procuringEntity: 'Procuring entity',
  bidder: 'Bidder',
  deadline: 'Submission deadline',
  daysLeft: (n: number) => (n === 0 ? 'Due today' : n > 0 ? `${n} day${n === 1 ? '' : 's'} left` : `Passed ${-n} day${n === -1 ? '' : 's'} ago`),
  // Files panel
  yourFiles: 'Your files',
  filesSummary: (count: number, size: string) => `${count} of 30 files · ${size} of 50 MB`,
  dropTitle: 'Drop PDFs here, up to 30 files',
  dropBody: 'Or choose them from your computer. Only PDF files are accepted.',
  chooseFiles: 'Choose PDFs',
  addMore: 'Add more PDFs',
  dropActive: 'Release to add these files',
  pages: (n: number) => `${n} page${n === 1 ? '' : 's'}`,
  checking: 'Checking…',
  removeFile: (name: string) => `Remove ${name}`,
  matchedTo: (n: number, title: string) => `Used for #${n} ${title}`,
  notMatched: 'Not used yet',
  duplicateBadge: 'Duplicate',
  sameContentAs: (names: string) => `Same content as ${names}`,
  problemEncrypted: 'Password-protected. This file cannot be added to the package. Please use an unprotected copy.',
  problemCorrupt: 'This file is damaged and cannot be opened. Please get a new copy.',
  problemShort: { encrypted: 'Password-protected', corrupt: 'Damaged file' } as Record<FileProblem, string>,
  suggestionsAvailable: (n: number) => `${n} suggested match${n === 1 ? '' : 'es'} found from file names`,
  acceptAll: 'Accept all',
  // Checklist
  requiredDocuments: 'Required documents',
  checklistSummary: (ready: number, total: number) => `${ready} of ${total} ready`,
  required: 'Required',
  optional: 'Optional',
  needsExpiry: 'Has expiry date',
  fileLabel: 'Document file',
  chooseFile: 'Choose a file…',
  noFilesYet: 'Add PDFs on the left first',
  removeMatch: 'Remove match',
  expiryLabel: 'Expiry date',
  expiryHint: 'As printed on the document',
  usedElsewhere: (n: number) => `already used for #${n}`,
  duplicateUsed: (name: string, n: number) => `same content as ${name}, used for #${n}`,
  unusable: 'cannot be used',
  stillChecking: 'still checking',
  suggested: 'Suggested',
  useSuggestion: 'Use this file',
  // Statuses
  status: {
    missing: 'Missing',
    expiry_needed: 'Expiry date needed',
    expired: 'Expired',
    not_provided: 'Not provided',
    ok: 'OK',
  } as Record<StatusCode, string>,
  expiredReason: (expiry: string, deadline: string) => `Expired on ${expiry}; deadline is ${deadline}`,
  sameDayOk: 'Expires on the deadline day. This is accepted.',
  // Blockers
  blockerMissing: (n: number, title: string) => `#${n} ${title}: no file chosen`,
  blockerExpiry: (n: number, title: string) => `#${n} ${title}: enter the expiry date`,
  blockerExpired: (n: number, title: string, date: string) => `#${n} ${title}: expired on ${date}`,
  blockersTitle: (n: number) => `${n} thing${n === 1 ? '' : 's'} to fix before you can generate`,
  allSet: 'All set. Your package is ready to generate.',
  // Generate
  generate: 'Generate package',
  generating: (done: number, total: number) => `Building… ${done} of ${total} pages`,
  includeIndex: 'Add index page',
  exportCsv: 'Export checklist (CSV)',
  generatedToast: (name: string, pages: number) => `${name} is ready (${pages} pages). Check your Downloads folder.`,
  downloadAgain: 'Download again',
  generateFailed: (names: string) => `Could not read ${names}. Remove the file or replace it with a working copy.`,
  generateFailedGeneric: 'Something went wrong while building the PDF. Please try again.',
  // Toasts
  rejectedNotPdf: (name: string) => `"${name}" is not a PDF file, so it was not added.`,
  rejectedTooMany: (n: number) => `Only 30 files are allowed. ${n} file${n === 1 ? ' was' : 's were'} not added.`,
  rejectedTooLarge: (name: string) => `"${name}" was not added: all files together must stay under 50 MB.`,
  rejectedEmpty: (name: string) => `"${name}" is empty and was not added.`,
  alreadyAdded: (name: string) => `"${name}" is already in your list.`,
  fileProblemToast: (name: string, problem: FileProblem) =>
    problem === 'encrypted' ? `"${name}" is password-protected and cannot be used.` : `"${name}" is damaged and cannot be opened.`,
  requirementsLoaded: (n: number) => `Tender loaded with ${n} required documents.`,
  matchCleared: (title: string) => `Match removed from ${title}.`,
  dismiss: 'Dismiss',
  // Requirement errors
  reqErrorTitle: 'This requirements file could not be used',
  reqErrorHelp: 'Please check that you picked the right file, or ask the tender office for a new copy.',
  issue: (i: RequirementsIssue): string => {
    switch (i.code) {
      case 'invalid_json':
        return 'The file is not valid JSON. It may be damaged or not a requirements file.';
      case 'not_object':
        return 'The file does not contain tender details.';
      case 'missing_tender':
        return 'The "tender" section is missing.';
      case 'missing_tender_field':
        return `The tender ${tenderFieldEn[i.field]} is missing.`;
      case 'bad_deadline':
        return `The submission deadline "${i.value}" is not a valid date (YYYY-MM-DD).`;
      case 'no_requirements':
        return 'The list of required documents is missing or empty.';
      case 'bad_requirement':
        return `Document #${i.index + 1} in the list has a missing or invalid "${i.field}".`;
      case 'duplicate_id':
        return `The document ID "${i.id}" appears more than once.`;
    }
  },
  csvHeader: ['Order', 'Document', 'Required', 'File name', 'Pages', 'Expiry date', 'Status'],
  yes: 'Yes',
  no: 'No',
  skipToChecklist: 'Skip to required documents',
};

export type Dict = typeof en;

const bn: Dict = {
  appName: 'টেন্ডার প্যাকেজ বিল্ডার',
  appTagline: 'প্রতিটি কাগজ যাচাই করে জমা দেওয়ার উপযোগী একটি PDF তৈরি করুন।',
  privacyNote: 'সবকিছু এই কম্পিউটারেই থাকে। কোনো ফাইল আপলোড হয় না।',
  langLabel: 'ভাষা',
  welcomeTitle: 'আপনার টেন্ডার প্যাকেজ প্রস্তুত করুন',
  welcomeBody:
    'টেন্ডারের সাথে পাওয়া requirements.json ফাইলটি দিয়ে শুরু করুন। এতে কোন কোন কাগজ লাগবে এবং কোন ক্রমে লাগবে তা লেখা থাকে।',
  stepLoad: 'রিকোয়ারমেন্টস ফাইল খুলুন',
  stepUpload: 'আপনার PDF কাগজগুলো যোগ করুন',
  stepMatch: 'প্রতিটি কাগজ মিলিয়ে মেয়াদের তারিখ দিন',
  stepGenerate: 'সাজানো একটি সম্মিলিত PDF ডাউনলোড করুন',
  openRequirements: 'requirements.json খুলুন',
  loadSample: 'নমুনা টেন্ডার দেখুন',
  loadSampleFiles: 'নমুনা কাগজ যোগ করুন',
  dropJsonHint: 'অথবা ফাইলটি এই পাতার যেকোনো জায়গায় ছেড়ে দিন',
  changeRequirements: 'টেন্ডার পরিবর্তন',
  tenderId: 'টেন্ডার আইডি',
  procuringEntity: 'ক্রয়কারী প্রতিষ্ঠান',
  bidder: 'দরদাতা',
  deadline: 'জমার শেষ তারিখ',
  daysLeft: (n) => (n === 0 ? 'আজই শেষ দিন' : n > 0 ? `আর ${digits(n, 'bn')} দিন বাকি` : `${digits(-n, 'bn')} দিন আগে শেষ হয়েছে`),
  yourFiles: 'আপনার ফাইল',
  filesSummary: (count, size) => `৩০টির মধ্যে ${digits(count, 'bn')}টি ফাইল · ৫০ MB-এর মধ্যে ${size}`,
  dropTitle: 'PDF ফাইল এখানে ছেড়ে দিন, সর্বোচ্চ ৩০টি',
  dropBody: 'অথবা কম্পিউটার থেকে বেছে নিন। শুধু PDF ফাইল নেওয়া হয়।',
  chooseFiles: 'PDF বেছে নিন',
  addMore: 'আরও PDF যোগ করুন',
  dropActive: 'ফাইলগুলো যোগ করতে ছেড়ে দিন',
  pages: (n) => `${digits(n, 'bn')} পৃষ্ঠা`,
  checking: 'যাচাই হচ্ছে…',
  removeFile: (name) => `${name} সরান`,
  matchedTo: (n, title) => `#${digits(n, 'bn')} ${title}-এ ব্যবহৃত`,
  notMatched: 'এখনো ব্যবহার হয়নি',
  duplicateBadge: 'একই ফাইল',
  sameContentAs: (names) => `${names}-এর সাথে হুবহু এক`,
  problemEncrypted: 'পাসওয়ার্ড দিয়ে সুরক্ষিত। এই ফাইল প্যাকেজে যোগ করা যাবে না। সুরক্ষাহীন একটি কপি ব্যবহার করুন।',
  problemCorrupt: 'ফাইলটি নষ্ট, খোলা যাচ্ছে না। অনুগ্রহ করে নতুন একটি কপি নিন।',
  problemShort: { encrypted: 'পাসওয়ার্ড-সুরক্ষিত', corrupt: 'নষ্ট ফাইল' },
  suggestionsAvailable: (n) => `ফাইলের নাম দেখে ${digits(n, 'bn')}টি সম্ভাব্য মিল পাওয়া গেছে`,
  acceptAll: 'সবগুলো গ্রহণ করুন',
  requiredDocuments: 'প্রয়োজনীয় কাগজপত্র',
  checklistSummary: (ready, total) => `${digits(total, 'bn')}টির মধ্যে ${digits(ready, 'bn')}টি প্রস্তুত`,
  required: 'বাধ্যতামূলক',
  optional: 'ঐচ্ছিক',
  needsExpiry: 'মেয়াদ আছে',
  fileLabel: 'কাগজের ফাইল',
  chooseFile: 'একটি ফাইল বেছে নিন…',
  noFilesYet: 'আগে বাঁ দিকে PDF যোগ করুন',
  removeMatch: 'মিল সরান',
  expiryLabel: 'মেয়াদ শেষের তারিখ',
  expiryHint: 'কাগজে যেমন লেখা আছে',
  usedElsewhere: (n) => `#${digits(n, 'bn')}-এ ব্যবহৃত`,
  duplicateUsed: (name, n) => `${name}-এর সাথে হুবহু এক, #${digits(n, 'bn')}-এ ব্যবহৃত`,
  unusable: 'ব্যবহার করা যাবে না',
  stillChecking: 'যাচাই চলছে',
  suggested: 'প্রস্তাবিত',
  useSuggestion: 'এই ফাইলটি নিন',
  status: {
    missing: 'অনুপস্থিত',
    expiry_needed: 'মেয়াদের তারিখ দিন',
    expired: 'মেয়াদোত্তীর্ণ',
    not_provided: 'দেওয়া হয়নি',
    ok: 'ঠিক আছে',
  },
  expiredReason: (expiry, deadline) => `মেয়াদ শেষ ${expiry}; জমার শেষ তারিখ ${deadline}`,
  sameDayOk: 'জমার শেষ দিনেই মেয়াদ শেষ। এটি গ্রহণযোগ্য।',
  blockerMissing: (n, title) => `#${digits(n, 'bn')} ${title}: কোনো ফাইল বাছা হয়নি`,
  blockerExpiry: (n, title) => `#${digits(n, 'bn')} ${title}: মেয়াদের তারিখ দিন`,
  blockerExpired: (n, title, date) => `#${digits(n, 'bn')} ${title}: মেয়াদ শেষ ${date}`,
  blockersTitle: (n) => `তৈরি করার আগে ${digits(n, 'bn')}টি বিষয় ঠিক করতে হবে`,
  allSet: 'সব ঠিক আছে। আপনার প্যাকেজ তৈরি করা যাবে।',
  generate: 'প্যাকেজ তৈরি করুন',
  generating: (done, total) => `তৈরি হচ্ছে… ${digits(total, 'bn')} পৃষ্ঠার ${digits(done, 'bn')}টি`,
  includeIndex: 'সূচিপত্র যোগ করুন',
  exportCsv: 'চেকলিস্ট রপ্তানি (CSV)',
  generatedToast: (name, pages) => `${name} তৈরি হয়েছে (${digits(pages, 'bn')} পৃষ্ঠা)। ডাউনলোড ফোল্ডার দেখুন।`,
  downloadAgain: 'আবার ডাউনলোড',
  generateFailed: (names) => `${names} পড়া যাচ্ছে না। ফাইলটি সরিয়ে দিন বা ভালো একটি কপি দিন।`,
  generateFailedGeneric: 'PDF তৈরির সময় সমস্যা হয়েছে। আবার চেষ্টা করুন।',
  rejectedNotPdf: (name) => `"${name}" PDF ফাইল নয়, তাই যোগ করা হয়নি।`,
  rejectedTooMany: (n) => `সর্বোচ্চ ৩০টি ফাইল দেওয়া যায়। ${digits(n, 'bn')}টি ফাইল যোগ করা হয়নি।`,
  rejectedTooLarge: (name) => `"${name}" যোগ করা হয়নি: সব ফাইল মিলিয়ে ৫০ MB-এর কম হতে হবে।`,
  rejectedEmpty: (name) => `"${name}" ফাঁকা ফাইল, তাই যোগ করা হয়নি।`,
  alreadyAdded: (name) => `"${name}" আগেই তালিকায় আছে।`,
  fileProblemToast: (name, problem) =>
    problem === 'encrypted' ? `"${name}" পাসওয়ার্ড-সুরক্ষিত, ব্যবহার করা যাবে না।` : `"${name}" নষ্ট, খোলা যাচ্ছে না।`,
  requirementsLoaded: (n) => `টেন্ডার লোড হয়েছে, ${digits(n, 'bn')}টি কাগজ প্রয়োজন।`,
  matchCleared: (title) => `${title} থেকে মিল সরানো হয়েছে।`,
  dismiss: 'বন্ধ করুন',
  reqErrorTitle: 'এই রিকোয়ারমেন্টস ফাইলটি ব্যবহার করা যাচ্ছে না',
  reqErrorHelp: 'সঠিক ফাইল বেছেছেন কিনা দেখুন, অথবা টেন্ডার অফিস থেকে নতুন কপি নিন।',
  issue: (i) => {
    switch (i.code) {
      case 'invalid_json':
        return 'ফাইলটি সঠিক JSON নয়। এটি নষ্ট বা ভুল ফাইল হতে পারে।';
      case 'not_object':
        return 'ফাইলে টেন্ডারের তথ্য নেই।';
      case 'missing_tender':
        return '"tender" অংশটি নেই।';
      case 'missing_tender_field':
        return `টেন্ডারের ${tenderFieldBn[i.field]} নেই।`;
      case 'bad_deadline':
        return `জমার শেষ তারিখ "${i.value}" সঠিক নয় (YYYY-MM-DD)।`;
      case 'no_requirements':
        return 'প্রয়োজনীয় কাগজের তালিকা নেই বা ফাঁকা।';
      case 'bad_requirement':
        return `তালিকার ${digits(i.index + 1, 'bn')} নম্বর কাগজে "${i.field}" নেই বা ভুল।`;
      case 'duplicate_id':
        return `কাগজের আইডি "${i.id}" একাধিকবার আছে।`;
    }
  },
  csvHeader: ['ক্রম', 'কাগজ', 'বাধ্যতামূলক', 'ফাইলের নাম', 'পৃষ্ঠা', 'মেয়াদ শেষের তারিখ', 'অবস্থা'],
  yes: 'হ্যাঁ',
  no: 'না',
  skipToChecklist: 'প্রয়োজনীয় কাগজপত্রে যান',
};

export const dictionaries: Record<Lang, Dict> = { en, bn };

export function storedLang(): Lang {
  try {
    const v = localStorage.getItem('tpb.lang');
    if (v === 'en' || v === 'bn') return v;
  } catch {
    /* storage unavailable */
  }
  return 'en';
}
