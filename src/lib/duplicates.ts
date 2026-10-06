export interface DuplicateGroup {
  /** 0-based index used to pick a shared colour tag. */
  index: number;
  hash: string;
  fileIds: string[];
}

/** Groups files with identical content hashes. Only groups of 2+ files are returned, in upload order. */
export function groupDuplicates(files: { id: string; hash?: string }[]): Map<string, DuplicateGroup> {
  const byHash = new Map<string, string[]>();
  for (const f of files) {
    if (!f.hash) continue;
    const list = byHash.get(f.hash);
    if (list) list.push(f.id);
    else byHash.set(f.hash, [f.id]);
  }
  const byFile = new Map<string, DuplicateGroup>();
  let index = 0;
  for (const [hash, fileIds] of byHash) {
    if (fileIds.length < 2) continue;
    const group = { index: index++, hash, fileIds };
    for (const id of fileIds) byFile.set(id, group);
  }
  return byFile;
}

/**
 * If another file with the same content is already matched to a different requirement,
 * returns that requirement's id; otherwise undefined.
 */
export function duplicateConflict(
  fileId: string,
  targetReqId: string,
  groups: Map<string, DuplicateGroup>,
  matches: Record<string, string | undefined>,
): { reqId: string; fileId: string } | undefined {
  const group = groups.get(fileId);
  if (!group) return undefined;
  for (const [reqId, matchedId] of Object.entries(matches)) {
    if (!matchedId || reqId === targetReqId || matchedId === fileId) continue;
    if (group.fileIds.includes(matchedId)) return { reqId, fileId: matchedId };
  }
  return undefined;
}
