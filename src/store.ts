import { duplicateConflict, groupDuplicates } from './lib/duplicates';
import type { RequirementsFile, UploadedFile } from './lib/types';

export interface State {
  data?: RequirementsFile;
  files: UploadedFile[];
  /** requirementId -> fileId */
  matches: Record<string, string | undefined>;
  /** requirementId -> YYYY-MM-DD */
  expiries: Record<string, string | undefined>;
}

export type Action =
  | { type: 'loadRequirements'; data: RequirementsFile }
  | { type: 'addFiles'; files: UploadedFile[] }
  | { type: 'updateFile'; id: string; patch: Partial<UploadedFile> }
  | { type: 'removeFile'; id: string }
  | { type: 'match'; reqId: string; fileId: string | undefined }
  | { type: 'setExpiry'; reqId: string; date: string };

export const initialState: State = { files: [], matches: {}, expiries: {} };

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const next = { ...record };
  delete next[key];
  return next;
}

export function canMatch(state: State, reqId: string, fileId: string): boolean {
  const file = state.files.find((f) => f.id === fileId);
  if (!file || file.inspecting || file.problem) return false;
  return !duplicateConflict(fileId, reqId, groupDuplicates(state.files), state.matches);
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loadRequirements':
      return { ...state, data: action.data, matches: {}, expiries: {} };

    case 'addFiles':
      return { ...state, files: [...state.files, ...action.files] };

    case 'updateFile': {
      const files = state.files.map((f) => (f.id === action.id ? { ...f, ...action.patch } : f));
      let { matches, expiries } = state;
      if (action.patch.problem) {
        for (const [reqId, fid] of Object.entries(matches)) {
          if (fid === action.id) {
            matches = without(matches, reqId);
            expiries = without(expiries, reqId);
          }
        }
      }
      return { ...state, files, matches, expiries };
    }

    case 'removeFile': {
      let { matches, expiries } = state;
      for (const [reqId, fid] of Object.entries(matches)) {
        if (fid === action.id) {
          matches = without(matches, reqId);
          expiries = without(expiries, reqId);
        }
      }
      return { ...state, files: state.files.filter((f) => f.id !== action.id), matches, expiries };
    }

    case 'match': {
      const { reqId, fileId } = action;
      if (!fileId) {
        return { ...state, matches: without(state.matches, reqId), expiries: without(state.expiries, reqId) };
      }
      if (state.matches[reqId] === fileId) return state;
      if (!canMatch(state, reqId, fileId)) return state;
      let matches = { ...state.matches };
      let expiries = without(state.expiries, reqId);
      for (const [otherReq, fid] of Object.entries(matches)) {
        if (fid === fileId && otherReq !== reqId) {
          matches = without(matches, otherReq);
          expiries = without(expiries, otherReq);
        }
      }
      matches[reqId] = fileId;
      return { ...state, matches, expiries };
    }

    case 'setExpiry': {
      if (!state.matches[action.reqId]) return state;
      if (!action.date) return { ...state, expiries: without(state.expiries, action.reqId) };
      return { ...state, expiries: { ...state.expiries, [action.reqId]: action.date } };
    }
  }
}
