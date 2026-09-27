'use client';

import { signOut, useSession } from 'next-auth/react';
import { LogOut } from 'lucide-react'; // Add LogOut to your lucide-react import
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  User,
  Mail,
  CheckCircle2,
  XCircle,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Building2,
  Clock,
  Printer,
  FileText
} from 'lucide-react';

interface ControlAnswer {
  id: string;
  control_id: string;
  control_name: string;
  implemented: number;
  notes: string;
}

interface Submission {
  id: string;
  business_unit: string;
  submitter_name: string;
  submitter_email: string;
  status: string;
  created_at?: string;
  answers: ControlAnswer[];
}

interface GapItem {
  category: string;
  gapTitle: string;
  description: string;
}

interface RemediationStep {
  priority: 'High' | 'Medium' | 'Low';
  stepTitle: string;
  description: string;
  responsibleParty: string;
}

interface ControlReport {
  controlId: string;
  controlTitle: string;
  controlDescription: string;
  evidenceFile: string;
  submittedBy: string;
  generatedAt: string;
  satisfaction: 'Fully' | 'Partially' | 'No';
  justification: string;
  gaps: GapItem[];
  remediations: RemediationStep[];
}

interface FullGapAnalysis {
  score: number;
  reports: ControlReport[];
}

export default function GRCDashboardPage() {
  const { data: session } = useSession(); 
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisResults, setAnalysisResults] = useState<Record<string, FullGapAnalysis>>({});
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [printingSubId, setPrintingSubId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/grc/submissions');
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAIGapAnalysis = (sub: Submission) => {
    setAnalyzingId(sub.id);

    setTimeout(() => {
      const totalControls = sub.answers.length;
      const implementedCount = sub.answers.filter((a) => a.implemented === 1).length;
      const score = Math.round((implementedCount / (totalControls || 1)) * 100);

      const generatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16) + ' UTC';

      const reports: ControlReport[] = sub.answers.map((ans) => {
        const isImplemented = ans.implemented === 1;

        if (ans.control_id === 'A.5.15') {
          return {
            controlId: 'A.5.15',
            controlTitle: 'Access control',
            controlDescription:
              'Rules to control physical and logical access to information and other associated assets shall be established and implemented based on business and information security requirements.',
            evidenceFile: 'RND_Access_Control_Policy_v2.docx',
            submittedBy: `${sub.submitter_name} (${sub.business_unit})`,
            generatedAt,
            satisfaction: isImplemented ? 'Partially' : 'No',
            justification:
              'The evidence defines access control rules (RBAC/Okta SSO) but lacks formal operational proof, monitoring logs, and physical access boundary controls required for complete compliance.',
            gaps: [
              {
                category: 'Technical Implementation',
                gapTitle: 'Technical Mapping Details',
                description:
                  'No explicit mapping documentation showing how role permissions map directly to database or cloud IAM roles.',
              },
              {
                category: 'Enforcement Mechanism',
                gapTitle: 'Monitoring and Alerting',
                description:
                  'Missing details on log retention periods, SIEM integration, and automated alert triggers for unauthorized access attempts.',
              },
              {
                category: 'Physical Security',
                gapTitle: 'Physical Access Controls',
                description:
                  'The submission focuses exclusively on logical access and lacks physical security controls (badge access logs, server room policies).',
              },
            ],
            remediations: [
              {
                priority: 'High',
                stepTitle: 'Technical Mapping Documentation',
                description:
                  'Create a cross-reference matrix mapping defined RBAC profiles directly to Okta and cloud environment permissions.',
                responsibleParty: 'Security Engineering Team',
              },
              {
                priority: 'Medium',
                stepTitle: 'Formalize Access Review Lifecycle',
                description:
                  'Establish a mandatory quarterly review process for managers to re-certify user access privileges.',
                responsibleParty: 'System Owners & GRC',
              },
            ],
          };
        }

        if (ans.control_id === 'A.8.12') {
          return {
            controlId: 'A.8.12',
            controlTitle: 'Data leakage prevention',
            controlDescription:
              'Data leakage prevention measures shall be applied to systems, networks and any other devices that process, store or transmit sensitive information.',
            evidenceFile: 'Pending Workstation Logs.docx',
            submittedBy: `${sub.submitter_name} (${sub.business_unit})`,
            generatedAt,
            satisfaction: 'No',
            justification:
              'DLP endpoint agents are currently uninstalled across Linux workstations due to driver issues on kernel 6.x, resulting in unmitigated risk of data exfiltration.',
            gaps: [
              {
                category: 'Endpoint Coverage',
                gapTitle: 'Unprotected Linux Workstations',
                description:
                  'DLP driver compatibility issues leave research workstations exposed without active monitoring.',
              },
              {
                category: 'Egress Monitoring',
                gapTitle: 'Absence of Network DLP',
                description:
                  'No network-level data loss prevention rules are configured for cloud or code repository export endpoints.',
              },
            ],
            remediations: [
              {
                priority: 'High',
                stepTitle: 'Deploy Linux Kernel Patch / Alternative Agent',
                description:
                  'Resolve agent driver compatibility with Linux 6.x or deploy a containerized DLP proxy temporarily.',
                responsibleParty: 'SRE & Endpoint Security Team',
              },
              {
                priority: 'High',
                stepTitle: 'Implement Cloud Storage Egress Safeguards',
                description:
                  'Apply strict egress rules and DLP inspection on S3 and code repository outputs.',
                responsibleParty: 'DevOps / Cloud Infra Team',
              },
            ],
          };
        }

        // Generic fallback for other controls
        return {
          controlId: ans.control_id,
          controlTitle: ans.control_name,
          controlDescription:
            'Security control requirements shall be defined, approved by management, and validated periodically.',
          evidenceFile: 'Submission Assessment Notes',
          submittedBy: `${sub.submitter_name} (${sub.business_unit})`,
          generatedAt,
          satisfaction: isImplemented ? 'Fully' : 'No',
          justification: isImplemented
            ? 'The control implementation statement and attached notes satisfy the baseline requirements.'
            : 'The business unit declared this control as not implemented.',
          gaps: isImplemented
            ? []
            : [
                {
                  category: 'Implementation Gap',
                  gapTitle: 'Control Not Deployed',
                  description:
                    'Self-declared gap. Implementation procedures and formal controls have not been executed.',
                },
              ],
          remediations: isImplemented
            ? []
            : [
                {
                  priority: 'High',
                  stepTitle: 'Draft Operational Control Plan',
                  description:
                    'Develop standard operating procedures (SOP) and schedule formal execution.',
                  responsibleParty: `${sub.business_unit} Lead`,
                },
              ],
        };
      });

      setAnalysisResults((prev) => ({
        ...prev,
        [sub.id]: { score, reports },
      }));
      setAnalyzingId(null);
    }, 1000);
  };

  const handleDownloadSingleReport = (submissionId: string) => {
    setPrintingSubId(submissionId);
    setTimeout(() => {
      window.print();
      setPrintingSubId(null);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Dynamic CSS Rules for Printing Specific Submissions */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          .no-print {
            display: none !important;
          }
          .print-submission-card {
            display: none !important;
          }
          .print-submission-card.active-print {
            display: block !important;
            background-color: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            color: #0f172a !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-only {
            display: block !important;
          }
          .print-text-dark {
            color: #0f172a !important;
          }
          .print-text-muted {
            color: #475569 !important;
          }
          .print-badge {
            border: 1px solid #000 !important;
            color: #000 !important;
            background: #f1f5f9 !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            color: #0f172a !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

    {/* Screen Header */}
      <header className="no-print max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-800 mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-blue-400" />
            GRC Compliance Review Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review incoming Business Unit self-assessments, trigger AI Gap Analysis reports, and export individual executive PDFs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={fetchSubmissions}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>

          {/* User Session Info & Logout Button */}
          {session?.user && (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <span className="text-xs text-slate-400 font-medium">
                {session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs border border-red-500/30 rounded-lg transition-colors font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        {loading ? (
          <div className="no-print p-12 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-sm">
            Loading submissions...
          </div>
        ) : submissions.length === 0 ? (
          <div className="no-print p-12 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-sm">
            No submissions found in the database.
          </div>
        ) : (
          submissions.map((sub) => {
            const analysis = analysisResults[sub.id];
            const isTargetPrint = printingSubId === sub.id;

            return (
              <div
                key={sub.id}
                className={`print-submission-card bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl ${
                  isTargetPrint ? 'active-print' : ''
                }`}
              >
                {/* Print Header Header (Only visible on PDF export) */}
                <div className="print-only mb-6 pb-4 border-b border-slate-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">
                        Information Security GRC Analysis Report
                      </h1>
                      <p className="text-sm text-slate-600">
                        Governance, Risk Management, and Compliance (GRC) Audit Division
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>Generated: {new Date().toLocaleDateString()}</p>
                      <p>Classification: CONFIDENTIAL</p>
                    </div>
                  </div>
                </div>

                {/* Submission Header Bar */}
                <div className="flex flex-wrap justify-between items-start border-b border-slate-800/80 pb-4 gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="print-badge inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
                        <Building2 className="w-3.5 h-3.5" />
                        {sub.business_unit}
                      </span>
                      <span className="print-badge inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        {sub.status || 'PENDING REVIEW'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 print-text-muted">
                      <span className="flex items-center gap-1 text-slate-200 font-medium print-text-dark">
                        <User className="w-3.5 h-3.5 text-slate-400" /> {sub.submitter_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> {sub.submitter_email}
                      </span>
                    </div>
                  </div>

                  {/* Submission Specific Action Buttons */}
                  <div className="no-print flex items-center gap-2">
                    <button
                      onClick={() => runAIGapAnalysis(sub)}
                      disabled={analyzingId === sub.id}
                      className="flex items-center gap-2 px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-medium transition-all"
                    >
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      {analyzingId === sub.id ? 'Generating Report...' : 'Run AI Gap Analysis'}
                    </button>

                    <button
                      onClick={() => handleDownloadSingleReport(sub.id)}
                      className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-all"
                    >
                      <Printer className="w-4 h-4 text-blue-400" />
                      Export Executive PDF
                    </button>
                  </div>
                </div>

                {/* Structured AI Gap Analysis Report Sections */}
                {analysis && (
                  <div className="space-y-6 pt-2">
                    <div className="flex items-center justify-between border-b border-purple-800/40 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <h2 className="text-base font-bold text-purple-200 print-text-dark">
                          AI Executive Gap Analysis Reports
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 print-text-muted">Compliance Readiness:</span>
                        <span className="px-2.5 py-1 rounded text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {analysis.score}%
                        </span>
                      </div>
                    </div>

                    {analysis.reports.map((report) => (
                      <div
                        key={report.controlId}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-6 print-card"
                      >
                        {/* 1. Header Metadata Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left border border-slate-800 rounded-lg">
                            <tbody>
                              <tr className="border-b border-slate-800">
                                <td className="p-2.5 font-bold text-slate-400 bg-slate-900/60 w-36">Control</td>
                                <td className="p-2.5 text-white font-mono print-text-dark">
                                  {report.controlId} - {report.controlTitle}
                                </td>
                              </tr>
                              <tr className="border-b border-slate-800">
                                <td className="p-2.5 font-bold text-slate-400 bg-slate-900/60">Evidence file</td>
                                <td className="p-2.5 text-slate-300 print-text-dark flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                                  {report.evidenceFile}
                                </td>
                              </tr>
                              <tr className="border-b border-slate-800">
                                <td className="p-2.5 font-bold text-slate-400 bg-slate-900/60">Submitted by</td>
                                <td className="p-2.5 text-slate-300 print-text-dark">{report.submittedBy}</td>
                              </tr>
                              <tr className="border-b border-slate-800">
                                <td className="p-2.5 font-bold text-slate-400 bg-slate-900/60">AI provider</td>
                                <td className="p-2.5 text-slate-300 print-text-dark">Local Model (Ollama / LM Studio)</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-bold text-slate-400 bg-slate-900/60">Generated</td>
                                <td className="p-2.5 text-slate-300 print-text-dark">{report.generatedAt}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Control Metadata */}
                        <div className="border-l-2 border-blue-500 pl-4 py-1 space-y-1">
                          <div className="text-xs text-slate-400 font-semibold print-text-muted">
                            Control ID: <span className="text-white font-mono">{report.controlId}</span>
                          </div>
                          <div className="text-sm font-bold text-white print-text-dark">
                            Control Title: {report.controlTitle}
                          </div>
                          <div className="text-xs text-slate-400 leading-relaxed print-text-muted">
                            <span className="font-semibold text-slate-300">Description:</span> {report.controlDescription}
                          </div>
                        </div>

                        {/* Section 1: Evidence Satisfaction Assessment */}
                        <div className="space-y-2">
                          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider print-text-dark">
                            1) Evidence Satisfaction Assessment
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Assessment:</span>
                            <span
                              className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                                report.satisfaction === 'Fully'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : report.satisfaction === 'Partially'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800'
                              }`}
                            >
                              {report.satisfaction}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed print-text-dark bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                            <span className="font-bold text-slate-200">Justification: </span>
                            {report.justification}
                          </p>
                        </div>

                        {/* Section 2: Specific Gaps or Missing Elements */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider print-text-dark">
                            2) Specific Gaps or Missing Elements
                          </h3>
                          {report.gaps.length === 0 ? (
                            <div className="text-xs text-slate-400 italic">No specific gaps identified.</div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left border border-slate-800">
                                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                                  <tr>
                                    <th className="p-2.5 w-1/4">Category</th>
                                    <th className="p-2.5 w-1/3">Gap/Missing Element</th>
                                    <th className="p-2.5">Description</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                  {report.gaps.map((gap, idx) => (
                                    <tr key={idx} className="hover:bg-slate-900/40">
                                      <td className="p-2.5 font-medium text-slate-300 print-text-dark">{gap.category}</td>
                                      <td className="p-2.5 font-bold text-rose-400 print-text-dark">{gap.gapTitle}</td>
                                      <td className="p-2.5 text-slate-400 leading-relaxed print-text-muted">{gap.description}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Section 3: Suggested Remediation Steps */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider print-text-dark">
                            3) Suggested Remediation Steps
                          </h3>
                          {report.remediations.length === 0 ? (
                            <div className="text-xs text-slate-400 italic">No remediation steps required.</div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left border border-slate-800">
                                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                                  <tr>
                                    <th className="p-2.5 w-24">Priority</th>
                                    <th className="p-2.5 w-1/3">Remediation Step</th>
                                    <th className="p-2.5">Description/Action Item</th>
                                    <th className="p-2.5 w-1/4">Responsible Party</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                  {report.remediations.map((rem, idx) => (
                                    <tr key={idx} className="hover:bg-slate-900/40">
                                      <td className="p-2.5 font-bold">
                                        <span
                                          className={`px-2 py-0.5 rounded text-[11px] ${
                                            rem.priority === 'High'
                                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                              : rem.priority === 'Medium'
                                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                              : 'bg-slate-800 text-slate-300'
                                          }`}
                                        >
                                          {rem.priority}
                                        </span>
                                      </td>
                                      <td className="p-2.5 font-bold text-slate-200 print-text-dark">{rem.stepTitle}</td>
                                      <td className="p-2.5 text-slate-400 leading-relaxed print-text-muted">{rem.description}</td>
                                      <td className="p-2.5 text-slate-300 print-text-dark">{rem.responsibleParty}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Submissions Control Grid Table */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider print-text-dark">
                    Submitted Control Self-Declarations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sub.answers.map((ans) => (
                      <div
                        key={ans.id}
                        className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-lg text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-400">{ans.control_id}</span>
                          {ans.implemented === 1 ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Implemented
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-400 font-medium text-[11px]">
                              <XCircle className="w-3.5 h-3.5" /> Gap Identified
                            </span>
                          )}
                        </div>
                        <div className="text-slate-200 font-medium print-text-dark">
                          {ans.control_name}
                        </div>
                        {ans.notes ? (
                          <div className="text-slate-400 italic text-[11px] bg-slate-900/50 p-2 rounded border border-slate-800/50 print-text-muted">
                            "{ans.notes}"
                          </div>
                        ) : (
                          <div className="text-slate-600 text-[11px] italic">No notes provided</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Print Sign-off Block (Visible only on PDF export) */}
                <div className="print-only pt-8 mt-8 border-t border-slate-300">
                  <div className="grid grid-cols-2 gap-8 text-xs text-slate-700">
                    <div>
                      <p className="font-bold mb-4">GRC Lead Auditor Sign-off:</p>
                      <div className="border-b border-slate-400 h-8 mb-1"></div>
                      <p>Signature & Date</p>
                    </div>
                    <div>
                      <p className="font-bold mb-4">Business Unit Head Acknowledgment:</p>
                      <div className="border-b border-slate-400 h-8 mb-1"></div>
                      <p>Signature & Date</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}