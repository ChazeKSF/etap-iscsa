'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { signOut, useSession } from 'next-auth/react';
import {
  ShieldCheck,
  User,
  Mail,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  Building2,
  Clock,
  Printer,
  FileText,
  LogOut,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Search,
  Filter,
  Calendar,
} from 'lucide-react';

// --- Interfaces ---
interface ControlAnswer {
  id: string;
  control_id: string;
  control_name: string;
  implemented: number;
  notes: string;
}

interface EvidenceFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface Submission {
  id: string;
  business_unit: string;
  submitter_name: string;
  submitter_email: string;
  status: string;
  created_at?: string;
  answers: ControlAnswer[];
  evidence_files?: EvidenceFile[];
  ai_analysis?: string | null;
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
  controlDescription?: string;
  evidenceFile?: string;
  submittedBy?: string;
  generatedAt?: string;
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
  const [analyzingIds, setAnalyzingIds] = useState<Record<string, boolean>>({});
  const [analysisErrors, setAnalysisErrors] = useState<Record<string, string>>({});
  const [printingSubId, setPrintingSubId] = useState<string | null>(null);

  // Tabs & Filters State
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBU, setSelectedBU] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // Track collapsed submissions by ID
  const [collapsedSubmissions, setCollapsedSubmissions] = useState<Set<string>>(new Set());

  // Fetch Submissions (Sorted newest first)
  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/grc/submissions', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        let loadedSubmissions: Submission[] = data.submissions || [];

        // Ensure array is strictly sorted newest first
        loadedSubmissions.sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeB - timeA;
        });

        setSubmissions(loadedSubmissions);

        // Preload existing AI analysis JSON
        const preloadedAnalysis: Record<string, FullGapAnalysis> = {};
        loadedSubmissions.forEach((sub) => {
          if (sub.ai_analysis) {
            try {
              preloadedAnalysis[sub.id] =
                typeof sub.ai_analysis === 'string'
                  ? JSON.parse(sub.ai_analysis)
                  : sub.ai_analysis;
            } catch (err) {
              console.error(`Failed to parse cached analysis for ${sub.id}:`, err);
            }
          }
        });
        setAnalysisResults(preloadedAnalysis);
      }
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Handle Archive / Unarchive Action
  const handleToggleArchive = async (submissionId: string, isCurrentlyArchived: boolean) => {
    try {
      const res = await fetch('/api/grc/submissions/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          archive: !isCurrentlyArchived,
        }),
      });

      if (res.ok) {
        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.id === submissionId
              ? { ...sub, status: !isCurrentlyArchived ? 'ARCHIVED' : 'PENDING REVIEW' }
              : sub
          )
        );
      }
    } catch (err) {
      console.error('Error updating archive status:', err);
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsedSubmissions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Trigger Live AI Analysis
  const runAIGapAnalysis = async (sub: Submission) => {
    setAnalyzingIds((prev) => ({ ...prev, [sub.id]: true }));
    setAnalysisErrors((prev) => ({ ...prev, [sub.id]: '' }));

    setCollapsedSubmissions((prev) => {
      const next = new Set(prev);
      next.delete(sub.id);
      return next;
    });

    try {
      const res = await fetch('/api/grc/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: sub.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate AI Audit analysis.');

      setAnalysisResults((prev) => ({ ...prev, [sub.id]: data.analysis }));
    } catch (error: any) {
      setAnalysisErrors((prev) => ({
        ...prev,
        [sub.id]: error.message || 'An error occurred during AI analysis.',
      }));
    } finally {
      setAnalyzingIds((prev) => ({ ...prev, [sub.id]: false }));
    }
  };

  const handleDownloadSingleReport = (submissionId: string) => {
    setPrintingSubId(submissionId);
    setTimeout(() => {
      window.print();
      setPrintingSubId(null);
    }, 100);
  };

  // Derive unique Business Units and Available Years for Filters
  const uniqueBUs = useMemo(() => {
    const bus = new Set<string>();
    submissions.forEach((s) => s.business_unit && bus.add(s.business_unit));
    return Array.from(bus);
  }, [submissions]);

  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    submissions.forEach((s) => {
      if (s.created_at) {
        years.add(new Date(s.created_at).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [submissions]);

  // Multi-Variable Filtering Logic
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const isArchived = sub.status === 'ARCHIVED';

      // 1. Filter by Tab (Active vs Archived)
      if (activeTab === 'active' && isArchived) return false;
      if (activeTab === 'archived' && !isArchived) return false;

      // 2. Filter by Business Unit
      if (selectedBU !== 'ALL' && sub.business_unit !== selectedBU) return false;

      // 3. Filter by Year
      if (selectedYear !== 'ALL') {
        const subYear = sub.created_at
          ? new Date(sub.created_at).getFullYear().toString()
          : '';
        if (subYear !== selectedYear) return false;
      }

      // 4. Filter by Search Keyword (Submitter, Email, BU, ID)
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesBU = sub.business_unit.toLowerCase().includes(query);
        const matchesSubmitter = sub.submitter_name.toLowerCase().includes(query);
        const matchesEmail = sub.submitter_email.toLowerCase().includes(query);
        const matchesId = sub.id.toLowerCase().includes(query);
        if (!matchesBU && !matchesSubmitter && !matchesEmail && !matchesId) return false;
      }

      return true;
    });
  }, [submissions, activeTab, selectedBU, selectedYear, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
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
          .print-text-dark {
            color: #0f172a !important;
          }
          .print-text-muted {
            color: #475569 !important;
          }
        }
      `}</style>

      {/* Screen Header */}
      <header className="no-print max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-800 mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-blue-400" />
            GRC Compliance Review Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time ISO 27001 assessment reviews, multi-year filtering, and archived report management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSubmissions}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {session?.user && (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <span className="text-xs text-slate-400 font-medium">
                {session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs border border-red-500/30 rounded-lg transition-colors font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Tabs & Controls Section */}
      <section className="no-print max-w-6xl mx-auto space-y-4 mb-6">
        {/* Navigation Tabs (Active Dashboard vs Archived Vault) */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-5 py-2.5 font-medium text-xs border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Active Assessments
          </button>

          <button
            onClick={() => setActiveTab('archived')}
            className={`px-5 py-2.5 font-medium text-xs border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'archived'
                ? 'border-amber-500 text-amber-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Archive className="w-4 h-4" />
            Archived Vault
          </button>
        </div>

        {/* Multi-Variable Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          {/* Text Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search submitter, BU, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 placeholder-slate-500"
            />
          </div>

          {/* Business Unit Filter */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <select
              value={selectedBU}
              onChange={(e) => setSelectedBU(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 appearance-none"
            >
              <option value="ALL">All Business Units</option>
              {uniqueBUs.map((bu) => (
                <option key={bu} value={bu}>
                  {bu}
                </option>
              ))}
            </select>
          </div>

          {/* Specific / Multi-Year Filter */}
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 appearance-none"
            >
              <option value="ALL">All Assessment Years</option>
              {uniqueYears.map((year) => (
                <option key={year} value={year}>
                  Year {year}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedBU('ALL');
              setSelectedYear('ALL');
            }}
            className="text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium py-2 px-3 rounded-lg border border-slate-700 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </section>

      {/* Main Submissions Output */}
      <main className="max-w-6xl mx-auto space-y-4">
        {loading ? (
          <div className="no-print p-12 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-sm">
            Loading database records...
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="no-print p-12 text-center bg-slate-900/60 border border-dashed border-slate-800 rounded-xl text-slate-400 text-sm">
            {activeTab === 'archived'
              ? 'No archived reports match your current filter criteria.'
              : 'No active submissions found.'}
          </div>
        ) : (
          filteredSubmissions.map((sub) => {
            const analysis = analysisResults[sub.id];
            const isTargetPrint = printingSubId === sub.id;
            const isCollapsed = collapsedSubmissions.has(sub.id);
            const isAnalyzing = !!analyzingIds[sub.id];
            const auditError = analysisErrors[sub.id];
            const isArchived = sub.status === 'ARCHIVED';

            return (
              <div
                key={sub.id}
                className={`print-submission-card bg-slate-900 border border-slate-800 rounded-xl p-6 transition-all shadow-xl ${
                  isTargetPrint ? 'active-print' : ''
                }`}
              >
                {/* Print Header */}
                <div className="hidden print:block mb-6 pb-4 border-b border-slate-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">
                        ISO/IEC 27001 AI Auditor Compliance Report
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
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div
                    onClick={() => toggleCollapse(sub.id)}
                    className="cursor-pointer group flex-1 min-w-[280px]"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="print-badge inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
                        <Building2 className="w-3.5 h-3.5" />
                        {sub.business_unit}
                      </span>

                      <span
                        className={`print-badge inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${
                          isArchived
                            ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                            : 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {sub.status || 'PENDING REVIEW'}
                      </span>

                      {analysis && (
                        <span className="no-print px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          AI Score: {analysis.score}%
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 print-text-muted">
                      <span className="flex items-center gap-1 text-slate-200 font-medium print-text-dark">
                        <User className="w-3.5 h-3.5 text-slate-400" /> {sub.submitter_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> {sub.submitter_email}
                      </span>
                      {sub.created_at && (
                        <span className="text-slate-500">
                          • {new Date(sub.created_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Bar */}
                  <div className="no-print flex items-center gap-2">
                    {/* Archive / Restore Button */}
                    <button
                      onClick={() => handleToggleArchive(sub.id, isArchived)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isArchived
                          ? 'bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border-amber-800'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                      title={isArchived ? 'Restore report to active dashboard' : 'Archive report'}
                    >
                      {isArchived ? (
                        <>
                          <ArchiveRestore className="w-3.5 h-3.5 text-amber-400" />
                          Unarchive
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5 text-slate-400" />
                          Archive
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => runAIGapAnalysis(sub)}
                      disabled={isAnalyzing}
                      className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                    >
                      <Sparkles
                        className={`w-3.5 h-3.5 text-purple-400 ${isAnalyzing ? 'animate-spin' : ''}`}
                      />
                      {isAnalyzing ? 'Auditing...' : analysis ? 'Re-Run AI' : 'Run AI Audit'}
                    </button>

                    <button
                      onClick={() => handleDownloadSingleReport(sub.id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-all"
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-400" />
                      PDF
                    </button>

                    <button
                      onClick={() => toggleCollapse(sub.id)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 rounded-lg transition-colors"
                    >
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div
                  className={`${
                    isCollapsed ? 'hidden print:block' : 'block'
                  } space-y-6 pt-6 border-t border-slate-800/80 mt-4`}
                >
                  {auditError && (
                    <div className="bg-red-950/80 border border-red-800 text-red-200 p-3 rounded-lg text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{auditError}</span>
                    </div>
                  )}

                  {/* Structured AI Analysis Output */}
                  {analysis && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-purple-800/40 pb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-purple-400" />
                          <h2 className="text-base font-bold text-purple-200 print-text-dark">
                            ISO Lead Auditor AI Analysis
                          </h2>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 print-text-muted">
                            Audited Readiness Score:
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-bold border ${
                              analysis.score >= 80
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                : analysis.score >= 50
                                ? 'bg-amber-950 text-amber-400 border-amber-800'
                                : 'bg-rose-950 text-rose-400 border-rose-800'
                            }`}
                          >
                            {analysis.score}%
                          </span>
                        </div>
                      </div>

                      {analysis.reports?.map((report) => (
                        <div
                          key={report.controlId}
                          className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-sm font-bold text-blue-400">
                              {report.controlId} - {report.controlTitle}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                report.satisfaction === 'Fully'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : report.satisfaction === 'Partially'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800'
                              }`}
                            >
                              {report.satisfaction} Compliant
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                            <strong>Auditor Evaluation: </strong>
                            {report.justification}
                          </p>

                          {report.gaps && report.gaps.length > 0 && (
                            <div className="space-y-1">
                              <h4 className="text-[10px] font-bold text-amber-400 uppercase">
                                Findings & OFIs
                              </h4>
                              {report.gaps.map((gap, i) => (
                                <div key={i} className="text-xs text-slate-300">
                                  • <strong className="text-slate-200">[{gap.category}] {gap.gapTitle}:</strong> {gap.description}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submissions Control Grid */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider print-text-dark">
                      Submitted Control Self-Declarations
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(sub.answers || []).map((ans) => (
                        <div
                          key={ans.id || ans.control_id}
                          className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-blue-400">
                              {ans.control_id}
                            </span>
                            {Number(ans.implemented) === 1 ? (
                              <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Implemented
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-rose-400 text-[11px]">
                                <XCircle className="w-3.5 h-3.5" /> Gap
                              </span>
                            )}
                          </div>
                          <div className="text-slate-200 font-medium">{ans.control_name}</div>
                          {ans.notes && (
                            <p className="text-slate-400 text-[11px] italic">"{ans.notes}"</p>
                          )}
                        </div>
                      ))}
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