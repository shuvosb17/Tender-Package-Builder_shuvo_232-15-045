import { describe, expect, it } from 'vitest';
import { duplicateConflict, groupDuplicates } from './duplicates';

const files = [
  { id: 'a', hash: 'h1' },
  { id: 'b', hash: 'h2' },
  { id: 'c', hash: 'h1' },
  { id: 'd', hash: 'h3' },
  { id: 'e', hash: 'h3' },
  { id: 'f', hash: 'h1' },
  { id: 'g' },
];

describe('groupDuplicates', () => {
  it('groups files with identical hashes and skips unique or unhashed files', () => {
    const groups = groupDuplicates(files);
    expect(groups.get('a')?.fileIds).toEqual(['a', 'c', 'f']);
    expect(groups.get('c')).toBe(groups.get('a'));
    expect(groups.get('d')?.fileIds).toEqual(['d', 'e']);
    expect(groups.has('b')).toBe(false);
    expect(groups.has('g')).toBe(false);
  });

  it('assigns a stable index per group for colour tags', () => {
    const groups = groupDuplicates(files);
    expect(groups.get('a')?.index).toBe(0);
    expect(groups.get('e')?.index).toBe(1);
  });
});

describe('duplicateConflict', () => {
  const groups = groupDuplicates(files);

  it('blocks matching a duplicate to a different requirement', () => {
    expect(duplicateConflict('c', 'R2', groups, { R1: 'a' })).toEqual({ reqId: 'R1', fileId: 'a' });
  });

  it('allows replacing a file with its duplicate in the same requirement', () => {
    expect(duplicateConflict('c', 'R1', groups, { R1: 'a' })).toBeUndefined();
  });

  it('allows unrelated files', () => {
    expect(duplicateConflict('b', 'R2', groups, { R1: 'a' })).toBeUndefined();
  });
});
