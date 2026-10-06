import type { Requirement, RequirementStatus } from './types';

/**
 * One status per requirement. `expiry` is only considered when a file is matched
 * and the requirement has an expiry date.
 */
export function computeStatus(
  req: Pick<Requirement, 'mandatory' | 'has_expiry'>,
  matchedFileId: string | undefined,
  expiry: string | undefined,
  deadline: string,
): RequirementStatus {
  if (!matchedFileId) {
    return req.mandatory
      ? { code: 'missing', blocking: true }
      : { code: 'not_provided', blocking: false };
  }
  if (req.has_expiry) {
    if (!expiry) return { code: 'expiry_needed', blocking: true };
    if (expiry < deadline) return { code: 'expired', blocking: true, expiry };
  }
  return { code: 'ok', blocking: false };
}

export function computeAllStatuses(
  requirements: Requirement[],
  matches: Record<string, string | undefined>,
  expiries: Record<string, string | undefined>,
  deadline: string,
): Record<string, RequirementStatus> {
  const out: Record<string, RequirementStatus> = {};
  for (const req of requirements) {
    out[req.id] = computeStatus(req, matches[req.id], expiries[req.id], deadline);
  }
  return out;
}
