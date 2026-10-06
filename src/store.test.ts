import { describe, expect, it } from 'vitest';
import { initialState, reducer, type State } from './store';
import type { UploadedFile } from './lib/types';

const file = (id: string, hash: string, extra: Partial<UploadedFile> = {}): UploadedFile => ({
  id,
  name: `${id}.pdf`,
  size: 10,
  bytes: new ArrayBuffer(0),
  hash,
  pageCount: 1,
  inspecting: false,
  ...extra,
});

function setup(): State {
  return reducer(initialState, {
    type: 'addFiles',
    files: [file('a', 'h1'), file('b', 'h2'), file('a-copy', 'h1'), file('bad', 'h9', { problem: 'encrypted' })],
  });
}

describe('reducer', () => {
  it('unmatching clears the expiry date', () => {
    let s = reducer(setup(), { type: 'match', reqId: 'R1', fileId: 'a' });
    s = reducer(s, { type: 'setExpiry', reqId: 'R1', date: '2026-12-31' });
    expect(s.expiries.R1).toBe('2026-12-31');
    s = reducer(s, { type: 'match', reqId: 'R1', fileId: undefined });
    expect(s.matches.R1).toBeUndefined();
    expect(s.expiries.R1).toBeUndefined();
  });

  it('removing a matched file reverts the row and clears its date', () => {
    let s = reducer(setup(), { type: 'match', reqId: 'R1', fileId: 'a' });
    s = reducer(s, { type: 'setExpiry', reqId: 'R1', date: '2026-12-31' });
    s = reducer(s, { type: 'removeFile', id: 'a' });
    expect(s.matches.R1).toBeUndefined();
    expect(s.expiries.R1).toBeUndefined();
    expect(s.files.map((f) => f.id)).not.toContain('a');
  });

  it('a file moves instead of being matched twice', () => {
    let s = reducer(setup(), { type: 'match', reqId: 'R1', fileId: 'b' });
    s = reducer(s, { type: 'setExpiry', reqId: 'R1', date: '2026-12-31' });
    s = reducer(s, { type: 'match', reqId: 'R2', fileId: 'b' });
    expect(s.matches).toEqual({ R2: 'b' });
    expect(s.expiries.R1).toBeUndefined();
  });

  it('changing the file of a requirement clears its date', () => {
    let s = reducer(setup(), { type: 'match', reqId: 'R1', fileId: 'a' });
    s = reducer(s, { type: 'setExpiry', reqId: 'R1', date: '2026-12-31' });
    s = reducer(s, { type: 'match', reqId: 'R1', fileId: 'b' });
    expect(s.matches.R1).toBe('b');
    expect(s.expiries.R1).toBeUndefined();
  });

  it('blocks matching a duplicate to a different requirement', () => {
    let s = reducer(setup(), { type: 'match', reqId: 'R1', fileId: 'a' });
    s = reducer(s, { type: 'match', reqId: 'R2', fileId: 'a-copy' });
    expect(s.matches).toEqual({ R1: 'a' });
  });

  it('rejects matching a damaged or protected file', () => {
    const s = reducer(setup(), { type: 'match', reqId: 'R1', fileId: 'bad' });
    expect(s.matches.R1).toBeUndefined();
  });

  it('ignores an expiry date for a row without a file', () => {
    const s = reducer(setup(), { type: 'setExpiry', reqId: 'R1', date: '2026-12-31' });
    expect(s.expiries.R1).toBeUndefined();
  });
});
