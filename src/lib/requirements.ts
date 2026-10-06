import { isIsoDate } from './dates';
import type { Requirement, RequirementsFile, Tender } from './types';

export type RequirementsIssue =
  | { code: 'invalid_json' }
  | { code: 'not_object' }
  | { code: 'missing_tender' }
  | { code: 'missing_tender_field'; field: keyof Tender }
  | { code: 'bad_deadline'; value: string }
  | { code: 'no_requirements' }
  | { code: 'bad_requirement'; index: number; field: string }
  | { code: 'duplicate_id'; id: string };

export type ParseResult =
  | { ok: true; data: RequirementsFile }
  | { ok: false; issues: RequirementsIssue[] };

const TENDER_FIELDS: (keyof Tender)[] = [
  'tender_id',
  'title',
  'procuring_entity',
  'bidder',
  'submission_deadline',
];

function asText(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
}

function asBool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 1 || v === 'yes') return true;
  if (v === 'false' || v === 0 || v === 'no') return false;
  return undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

export function parseRequirements(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    return { ok: false, issues: [{ code: 'invalid_json' }] };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, issues: [{ code: 'not_object' }] };
  }
  const obj = raw as Record<string, unknown>;
  const issues: RequirementsIssue[] = [];

  const t = obj.tender;
  let tender: Tender | undefined;
  if (!t || typeof t !== 'object' || Array.isArray(t)) {
    issues.push({ code: 'missing_tender' });
  } else {
    const tr = t as Record<string, unknown>;
    const draft: Partial<Tender> = {};
    for (const field of TENDER_FIELDS) {
      const value = asText(tr[field]);
      if (!value) issues.push({ code: 'missing_tender_field', field });
      else draft[field] = value;
    }
    if (draft.submission_deadline && !isIsoDate(draft.submission_deadline)) {
      issues.push({ code: 'bad_deadline', value: draft.submission_deadline });
    }
    if (TENDER_FIELDS.every((f) => draft[f])) tender = draft as Tender;
  }

  const list = obj.requirements;
  const requirements: Requirement[] = [];
  if (!Array.isArray(list) || list.length === 0) {
    issues.push({ code: 'no_requirements' });
  } else {
    const seen = new Set<string>();
    list.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        issues.push({ code: 'bad_requirement', index, field: '(item)' });
        return;
      }
      const r = item as Record<string, unknown>;
      const id = asText(r.id);
      const order = asNumber(r.order);
      const title_en = asText(r.title_en);
      const title_bn = asText(r.title_bn);
      const mandatory = asBool(r.mandatory);
      const has_expiry = asBool(r.has_expiry);
      const bad = (field: string) => issues.push({ code: 'bad_requirement', index, field });
      if (!id) return bad('id');
      if (order === undefined) return bad('order');
      if (!title_en && !title_bn) return bad('title_en');
      if (mandatory === undefined) return bad('mandatory');
      if (has_expiry === undefined) return bad('has_expiry');
      if (seen.has(id)) {
        issues.push({ code: 'duplicate_id', id });
        return;
      }
      seen.add(id);
      requirements.push({
        id,
        order,
        title_en: title_en ?? title_bn!,
        title_bn: title_bn ?? title_en!,
        mandatory,
        has_expiry,
      });
    });
  }

  if (issues.length || !tender) return { ok: false, issues };
  return { ok: true, data: { tender, requirements: sortRequirements(requirements) } };
}

/** Stable sort by `order`, then by original position (ties keep file order). */
export function sortRequirements(reqs: Requirement[]): Requirement[] {
  return reqs
    .map((r, i) => ({ r, i }))
    .sort((a, b) => a.r.order - b.r.order || a.i - b.i)
    .map(({ r }) => r);
}
