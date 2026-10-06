import type { Requirement } from './types';

/** Extra words that commonly appear in file names for a given title keyword. */
const SYNONYMS: Record<string, string[]> = {
  trade: ['trade', 'tradelicense', 'tl'],
  license: ['license', 'licence', 'lic'],
  tin: ['tin', 'etin', 'tax', 'taxpayer'],
  vat: ['vat', 'bin', 'mushak'],
  solvency: ['solvency', 'solvent', 'bank'],
  experience: ['experience', 'exp', 'completion', 'workorder'],
  technical: ['technical', 'tech', 'specification', 'spec', 'specs'],
  financial: ['financial', 'finance', 'price', 'boq', 'fin', 'priceschedule'],
  audit: ['audit', 'audited', 'balance', 'balancesheet'],
  incorporation: ['incorporation', 'rjsc', 'registration'],
  registration: ['registration', 'reg', 'rjsc'],
  attorney: ['attorney', 'poa', 'authorization', 'authorisation'],
  authorization: ['authorization', 'authorisation', 'poa', 'auth'],
  security: ['security', 'guarantee', 'bg', 'payorder', 'po'],
  guarantee: ['guarantee', 'bg', 'security'],
  tax: ['tax', 'tin', 'itr', 'return'],
  return: ['return', 'itr'],
  memorandum: ['memorandum', 'moa', 'aoa'],
  declaration: ['declaration', 'affidavit', 'undertaking'],
  manufacturer: ['manufacturer', 'maf', 'oem'],
  form: ['form', 'bidform', 'tenderform'],
};

const STOPWORDS = new Set([
  'of', 'the', 'and', 'or', 'a', 'an', 'for', 'to', 'in', 'on', 'with', 'by',
  'certificate', 'cert', 'document', 'documents', 'copy', 'letter', 'scan', 'scanned',
  'pdf', 'final', 'signed', 'latest', 'new', 'updated', 'company', 'ltd', 'limited',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/([a-z])([0-9])|([0-9])([a-z])/g, '$1$3 $2$4')
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

function requirementKeywords(req: Requirement): Set<string> {
  const words = new Set<string>();
  for (const t of tokenize(`${req.title_en} ${req.id}`)) {
    words.add(t);
    for (const s of SYNONYMS[t] ?? []) words.add(s);
  }
  return words;
}

export function scoreMatch(fileName: string, req: Requirement): number {
  const fileTokens = tokenize(fileName);
  if (!fileTokens.length) return 0;
  const joined = fileTokens.join('');
  const keywords = requirementKeywords(req);
  let score = 0;
  for (const t of new Set(fileTokens)) if (keywords.has(t)) score += t.length >= 3 ? 2 : 1;
  for (const k of keywords) if (k.length >= 5 && !fileTokens.includes(k) && joined.includes(k)) score += 1;
  return score;
}

/**
 * One suggestion per open requirement and per available file, picked greedily by score.
 * Returns requirementId -> fileId. Never applied without the user confirming.
 */
export function suggestMatches(
  files: { id: string; name: string }[],
  requirements: Requirement[],
): Record<string, string> {
  const candidates: { reqId: string; fileId: string; score: number }[] = [];
  for (const req of requirements) {
    for (const file of files) {
      const score = scoreMatch(file.name, req);
      if (score >= 2) candidates.push({ reqId: req.id, fileId: file.id, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const usedReq = new Set<string>();
  const usedFile = new Set<string>();
  const out: Record<string, string> = {};
  for (const c of candidates) {
    if (usedReq.has(c.reqId) || usedFile.has(c.fileId)) continue;
    usedReq.add(c.reqId);
    usedFile.add(c.fileId);
    out[c.reqId] = c.fileId;
  }
  return out;
}
