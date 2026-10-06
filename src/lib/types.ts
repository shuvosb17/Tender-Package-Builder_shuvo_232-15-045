export interface Tender {
  tender_id: string;
  title: string;
  procuring_entity: string;
  bidder: string;
  submission_deadline: string;
}

export interface Requirement {
  id: string;
  order: number;
  title_en: string;
  title_bn: string;
  mandatory: boolean;
  has_expiry: boolean;
}

export interface RequirementsFile {
  tender: Tender;
  requirements: Requirement[];
}

export type FileProblem = 'encrypted' | 'corrupt';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  bytes: ArrayBuffer;
  /** Undefined while the file is still being inspected. */
  hash?: string;
  pageCount?: number;
  thumbnail?: string;
  problem?: FileProblem;
  inspecting: boolean;
}

export type StatusCode = 'missing' | 'expiry_needed' | 'expired' | 'not_provided' | 'ok';

export interface RequirementStatus {
  code: StatusCode;
  blocking: boolean;
  /** Expiry date that caused an "expired" status. */
  expiry?: string;
}
