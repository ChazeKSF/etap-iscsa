'use client';

import React, { useState } from 'react';
import { ShieldCheck, Send, CheckCircle2, AlertCircle, Upload, FileText, X } from 'lucide-react';

interface ControlItem {
  id: string;
  title: string;
  description: string;
  category: string;
}

interface EvidenceFile {
  fileName: string;
  fileType: string;
  base64Data: string;
}

const ISO_CONTROLS: ControlItem[] = [
  {
    id: 'A.5.1',
    title: 'Policies for information security',
    description:
      'Information security policy and topic-specific policies shall be defined, approved by management, published, communicated to and acknowledged by relevant personnel and relevant interested parties.',
    category: 'Organizational Controls',
  },
  {
    id: 'A.5.15',
    title: 'Access control',
    description:
      'Rules to control physical and logical access to information and other associated assets shall be established and implemented based on business and information security requirements.',
    category: 'Organizational Controls',
  },
  {
    id: 'A.5.30',
    title: 'ICT readiness for business continuity',
    description:
      'ICT readiness shall be planned, implemented, maintained and tested based on business continuity objectives and ICT continuity requirements.',
    category: 'Organizational Controls',
  },
  {
    id: 'A.6.3',
    title: 'Information security awareness, education and training',
    description:
      'Personnel of the organization and relevant interested parties shall receive appropriate information security awareness, education and training and regular updates of the organization\'s information security.',
    category: 'People Controls',
  },
  {
    id: 'A.8.12',
    title: 'Data leakage prevention',
    description:
      'Data leakage prevention measures shall be applied to systems, networks and any other devices that process, store or transmit sensitive information.',
    category: 'Technological Controls',
  },
  {
    id: 'A.8.8',
    title: 'Management of technical vulnerabilities',
    description:
      'Information about technical vulnerabilities of information systems in use shall be obtained, the organization\'s exposure to such vulnerabilities evaluated, and appropriate measures taken.',
    category: 'Technological Controls',
  },
];

export function BUSubmissionForm() {
  const [businessUnit, setBusinessUnit] = useState('ENG: Engineering');
  const [submitterName, setSubmitterName] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  
  const [answers, setAnswers] = useState<
    Record<string, { implemented: boolean; notes: string }>
  >(() =>
    ISO_CONTROLS.reduce((acc, ctrl) => {
      acc[ctrl.id] = { implemented: true, notes: '' };
      return acc;
    }, {} as Record<string, { implemented: boolean; notes: string }>)
  );

  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleControlChange = (id: string, implemented: boolean) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: { ...prev[id], implemented },
    }));
  };

  const handleNotesChange = (id: string, notes: string) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: { ...prev[id], notes },
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        setEvidenceFiles((prev) => [
          ...prev,
          {
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            base64Data: base64String,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input value so the same file can be re-uploaded if needed
    e.target.value = '';
  };

  const removeFile = (indexToRemove: number) => {
    setEvidenceFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        businessUnit,
        submitterName,
        submitterEmail,
        answers: ISO_CONTROLS.map((ctrl) => ({
          controlId: ctrl.id,
          controlName: ctrl.title,
          category: ctrl.category,
          implemented: answers[ctrl.id].implemented,
          notes: answers[ctrl.id].notes,
        })),
        evidenceFiles,
      };

      const res = await fetch('/api/public/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setSubmittedSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong submitting your assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedSuccess) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-slate-900 border border-emerald-500/30 rounded-xl text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Assessment Submitted Successfully</h2>
        <p className="text-slate-400 text-sm mb-6">
          Thank you, <span className="text-white font-medium">{submitterName}</span>. Your self-assessment and evidence for{' '}
          <span className="text-white font-medium">{businessUnit}</span> have been logged and assigned to the GRC team.
        </p>
        <button
          onClick={() => {
            setSubmittedSuccess(false);
            setSubmitterName('');
            setSubmitterEmail('');
            setEvidenceFiles([]);
          }}
          className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-4 py-2 rounded-lg border border-slate-700 transition-colors"
        >
          Submit Another Assessment
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
      {/* 1. Business Unit Details */}
      <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
          1. Business Unit & Assessor Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Business Unit</label>
            <select
              value={businessUnit}
              onChange={(e) => setBusinessUnit(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="CSO: Chief Strategic Office">CSO: Chief Strategic Office</option>
              <option value="CSD: Customer Service Desk">CSD: Customer Service Desk</option>
              <option value="ENG: Engineering">ENG: Engineering</option>
              <option value="FAD: Accounting and Finance">FAD: Accounting and Finance</option>
              <option value="GRC: Governance, Risk Management, and Compliance">GRC: Governance, Risk Management, and Compliance</option>
              <option value="HC: Human Capital">HC: Human Capital</option>
              <option value="ADM: Office Admin">ADM: Office Admin</option>
              <option value="LAW: Office of the Legal Counsel">LAW: Office of the Legal Counsel</option>
              <option value="RND: Research and Development">RND: Research and Development</option>
              <option value="SEC: Safety and Security">SEC: Safety and Security</option>
              <option value="SRE: Site Reliability, Cloud Infrastructure, Platform & Network Security">SRE: Site Reliability, Cloud Infrastructure, Platform & Network Security</option>
              <option value="DEV: Software Development and Software QA">DEV: Software Development and Software QA</option>
              <option value="SCM: Supply Chain Management">SCM: Supply Chain Management</option>
              <option value="SSTS: System Security and Technical Support">SSTS: System Security and Technical Support</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Submitter Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Jane Doe"
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Submitter Work Email</label>
            <input
              type="email"
              required
              placeholder="e.g. jane.doe@company.com"
              value={submitterEmail}
              onChange={(e) => setSubmitterEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      {/* 2. ISO 27001 Controls Assessment Table */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">2. Information Security Controls Assessment</h2>
          <p className="text-xs text-slate-400 mt-1">
            Review each ISO 27001 control requirement below and declare your business unit's current implementation status.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="p-4 w-24">Control ID</th>
                <th className="p-4">Title & Description</th>
                <th className="p-4 w-40">Category</th>
                <th className="p-4 w-36">Implementation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {ISO_CONTROLS.map((ctrl) => (
                <tr key={ctrl.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-mono font-bold text-blue-400 align-top">{ctrl.id}</td>
                  <td className="p-4 align-top space-y-2">
                    <div className="font-semibold text-white text-sm">{ctrl.title}</div>
                    <div className="text-slate-400 text-xs leading-relaxed">{ctrl.description}</div>
                    
                    <input
                      type="text"
                      placeholder="Optional notes, exceptions, or tool implementation details..."
                      value={answers[ctrl.id]?.notes || ''}
                      onChange={(e) => handleNotesChange(ctrl.id, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="p-4 align-top">
                    <span className="inline-block px-2 py-1 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                      {ctrl.category}
                    </span>
                  </td>
                  <td className="p-4 align-top">
                    <select
                      value={answers[ctrl.id]?.implemented ? '1' : '0'}
                      onChange={(e) => handleControlChange(ctrl.id, e.target.value === '1')}
                      className={`w-full p-2 rounded text-xs font-medium border focus:outline-none ${
                        answers[ctrl.id]?.implemented
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                          : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
                      }`}
                    >
                      <option value="1">Implemented</option>
                      <option value="0">Not Implemented</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Evidence Upload (Multi-File Support) */}
      <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-400" />
          3. Upload Proof of Implementation / Evidence
        </h2>
        <p className="text-xs text-slate-400">
          Upload supporting documentation (e.g., policies, screenshots, vulnerability scan logs, or training records). You can select and attach multiple files.
        </p>

        <div className="border-2 border-dashed border-slate-800 rounded-lg p-6 text-center hover:border-slate-700 transition-colors">
          <input
            type="file"
            id="evidence-upload"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <label htmlFor="evidence-upload" className="cursor-pointer space-y-2 block">
            <FileText className="w-8 h-8 text-slate-500 mx-auto" />
            <div className="text-xs text-slate-300">
              Click to browse and attach files (Select multiple if needed)
            </div>
            <div className="text-[11px] text-slate-500">PDF, PNG, JPG, or DOCX</div>
          </label>
        </div>

        {/* List of Attached Files */}
        {evidenceFiles.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-xs font-medium text-slate-400">Attached Evidence Files ({evidenceFiles.length}):</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {evidenceFiles.map((f, idx) => (
                <div
                  key={`${f.fileName}_${idx}`}
                  className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-200 truncate">{f.fileName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    title="Remove File"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {errorMsg && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 rounded-lg flex items-center gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium px-6 py-3 rounded-lg text-xs transition-colors"
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? 'Submitting Assessment...' : 'Submit Compliance Assessment'}
        </button>
      </div>
    </form>
  );
}