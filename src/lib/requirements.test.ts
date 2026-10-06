import { describe, expect, it } from 'vitest';
import { parseRequirements } from './requirements';
import { suggestMatches } from './automatch';
import { localToday } from './dates';

const tender = {
  tender_id: 'T-1',
  title: 'Supply',
  procuring_entity: 'Dept',
  bidder: 'Co',
  submission_deadline: '2026-10-20',
};

describe('parseRequirements', () => {
  it('sorts by order and handles gaps and unsorted input', () => {
    const r = parseRequirements(
      JSON.stringify({
        tender,
        requirements: [
          { id: 'C', order: 10, title_en: 'C', title_bn: 'গ', mandatory: true, has_expiry: false },
          { id: 'A', order: 1, title_en: 'A', title_bn: 'ক', mandatory: true, has_expiry: true },
          { id: 'B', order: 4, title_en: 'B', title_bn: 'খ', mandatory: false, has_expiry: false },
        ],
      }),
    );
    expect(r.ok && r.data.requirements.map((x) => x.id)).toEqual(['A', 'B', 'C']);
  });

  it('reports malformed JSON', () => {
    const r = parseRequirements('{ not json');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.issues[0].code).toBe('invalid_json');
  });

  it('reports missing fields and a bad deadline', () => {
    const r = parseRequirements(JSON.stringify({ tender: { ...tender, bidder: '', submission_deadline: '20/10/2026' }, requirements: [] }));
    expect(!r.ok && r.issues.map((i) => i.code)).toEqual(['missing_tender_field', 'bad_deadline', 'no_requirements']);
  });

  it('falls back to the English title when the Bangla title is missing', () => {
    const r = parseRequirements(
      JSON.stringify({ tender, requirements: [{ id: 'A', order: 1, title_en: 'Trade License', mandatory: true, has_expiry: true }] }),
    );
    expect(r.ok && r.data.requirements[0].title_bn).toBe('Trade License');
  });
});

describe('suggestMatches', () => {
  it('suggests files by name keywords, one per requirement', () => {
    const reqs = [
      { id: 'R1', order: 1, title_en: 'Trade License', title_bn: '', mandatory: true, has_expiry: true },
      { id: 'R2', order: 2, title_en: 'TIN Certificate', title_bn: '', mandatory: true, has_expiry: false },
      { id: 'R3', order: 3, title_en: 'Bank Solvency Certificate', title_bn: '', mandatory: true, has_expiry: true },
    ];
    const files = [
      { id: 'f1', name: 'trade_licence_2026.pdf' },
      { id: 'f2', name: 'eTIN-cert.pdf' },
      { id: 'f3', name: 'solvency letter.pdf' },
      { id: 'f4', name: 'scan001.pdf' },
    ];
    expect(suggestMatches(files, reqs)).toEqual({ R1: 'f1', R2: 'f2', R3: 'f3' });
  });
});

describe('localToday', () => {
  it('uses the local calendar date', () => {
    expect(localToday(new Date(2026, 9, 6, 1, 30))).toBe('2026-10-06');
  });
});
