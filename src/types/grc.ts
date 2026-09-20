export type BusinessUnit =
  | 'Chief Strategic Office (CSO)'
  | 'Customer Service Desk (CSD)'
  | 'Engineering (ENG)'
  | 'Accounting and Finance (FAD)'
  | 'Governance, Risk Management, and Compliance (GRC)'
  | 'Human Capital (HC)'
  | 'Office Admin (ADM)'
  | 'Office of the Legal Counsel (LAW)'
  | 'Research and Development (RND)'
  | 'Safety and Security (SEC)'
  | 'Site Reliability, Cloud Infrastructure, Platform & Network Security (SRE)'
  | 'Software Development and Software QA (DEV)'
  | 'Supply Chain Management (SCM)'
  | 'System Security and Technical Support (SSTS)';

export interface ControlAnswer {
  controlId: string;       // e.g., "A.5.1"
  controlName: string;     // e.g., "Policies for Information Security"
  implemented: boolean;
  notes: string;
}

export interface AttachedFile {
  fileName: string;
  fileType: string;
  fileSize: number;
  base64Data: string;      // Base64 encoded file payload
}

export interface CSASubmission {
  id?: string;
  businessUnit: BusinessUnit;
  submitterEmail: string;
  submitterName: string;
  controls: ControlAnswer[];
  evidenceFiles: AttachedFile[];
  status: 'PENDING' | 'IN_REVIEW' | 'COMPLETED';
  tags: string[];
  aiAnalysis?: string;
  createdAt?: string;
}

export interface Tag {
  id: string;
  submissionId: string;
  label: string;
  color?: string;
}