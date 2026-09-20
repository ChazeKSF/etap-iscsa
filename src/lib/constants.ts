import { BusinessUnit } from '@/types/grc';

export const BUSINESS_UNITS: BusinessUnit[] = [
  'Chief Strategic Office (CSO)',
  'Customer Service Desk (CSD)',
  'Engineering (ENG)',
  'Accounting and Finance (FAD)',
  'Governance, Risk Management, and Compliance (GRC)',
  'Human Capital (HC)',
  'Office Admin (ADM)',
  'Office of the Legal Counsel (LAW)',
  'Research and Development (RND)',
  'Safety and Security (SEC)',
  'Site Reliability, Cloud Infrastructure, Platform & Network Security (SRE)',
  'Software Development and Software QA (DEV)',
  'Supply Chain Management (SCM)',
  'System Security and Technical Support (SSTS)',
];

export interface ISOControl {
  id: string;
  domain: string;
  title: string;
  description: string;
}

export const ISO_27001_CONTROLS: ISOControl[] = [
  { id: 'A.5.1', domain: 'Organizational', title: 'Policies for Information Security', description: 'Information security policy and topic-specific policies are defined and reviewed.' },
  { id: 'A.5.7', domain: 'Organizational', title: 'Threat Intelligence', description: 'Information relating to information security threats is collected and analyzed.' },
  { id: 'A.6.8', domain: 'People', title: 'Information Security Event Reporting', description: 'Mechanism for personnel to report observed security events.' },
  { id: 'A.7.1', domain: 'Physical', title: 'Physical Security Perimeters', description: 'Security perimeters are defined and protected.' },
  { id: 'A.8.1', domain: 'Technological', title: 'User Endpoint Devices', description: 'Information stored on or processed by endpoint devices is protected.' },
  { id: 'A.8.9', domain: 'Technological', title: 'Configuration Management', description: 'Configurations including security configurations of hardware/software are established.' },
  { id: 'A.8.12', domain: 'Technological', title: 'Data Leakage Prevention', description: 'DLP measures are applied to systems, networks, and other devices.' },
  { id: 'A.8.24', domain: 'Technological', title: 'Use of Cryptography', description: 'Rules for effective use of cryptography including key management are defined.' }
];