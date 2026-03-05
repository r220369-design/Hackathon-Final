import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, File, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import VoiceOutput from '../components/VoiceOutput';
import api from '../api';

const ReportUploadPage = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState('');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isTelugu = String(user.language || '').toLowerCase().startsWith('te');
    const tx = (en, te) => (isTelugu ? te : en);
    const homePath = user.role === 'officer' ? '/officer' : '/dashboard';

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('report', file);
            const response = await api.post('/reports/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const summaryText = response.data.explanation || response.data.recommendation || (isTelugu ? 'రిపోర్ట్ విశ్లేషణ పూర్తయింది.' : 'Report analysis completed.');
            const findings = (response.data.possibleDiseases || []).length
                ? response.data.possibleDiseases
                : [isTelugu ? 'ప్రత్యేక పరిస్థితులు స్పష్టంగా గుర్తించలేదు. వైద్యుడిని సంప్రదించండి.' : 'No specific conditions were confidently identified. Please consult a doctor.'];

            setSummary({
                text: summaryText,
                findings,
                action: response.data.recommendation || (isTelugu ? 'వైద్యుడి సలహా తీసుకోండి.' : 'Please seek medical advice.'),
                level: response.data.level || (isTelugu ? 'అజ్ఞాతం' : 'Unknown'),
                score: response.data.score ?? null,
            });
        } catch (err) {
            const backendError = err.response?.data?.error;
            setError(backendError || err.response?.data?.message || tx('Failed to summarize report', 'రిపోర్ట్ సారాంశం చేయడంలో విఫలమైంది'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24 animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                    <Upload size={16} className="text-primary-600" />
                </div>
                <h2 className="font-bold text-gray-900">{tx('Upload Report', 'రిపోర్ట్ అప్‌లోడ్')}</h2>
            </div>

            <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium border border-red-100 flex items-start gap-2">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {!summary ? (
                    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-5 animate-slide-up">
                        <p className="text-sm text-gray-500 text-center leading-relaxed">
                            {tx(
                                'Upload patient reports (PDF, Image, CSV, XLSX, DOCX) for an automatic AI summary.',
                                'ఆటోమేటిక్ AI సారాంశం కోసం రోగి రిపోర్ట్‌లు అప్‌లోడ్ చేయండి.'
                            )}
                        </p>

                        <label className="border-2 border-dashed border-gray-200 bg-gray-50/50 w-full h-44 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-all group">
                            <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                                <Upload size={24} className="text-primary-500" />
                            </div>
                            <span className="text-sm font-semibold text-gray-600 group-hover:text-primary-700">{tx('Tap to choose file', 'ఫైల్ ఎంచుకోండి')}</span>
                            <span className="text-xs text-gray-400 mt-1">PDF, Image, CSV, XLSX, DOCX</span>
                            <input type="file" className="hidden" onChange={(event) => setFile(event.target.files[0])} />
                        </label>

                        {file && (
                            <div className="bg-primary-50 w-full p-3.5 rounded-xl flex items-center gap-3 text-sm text-primary-800 font-medium border border-primary-100">
                                <File size={18} className="text-primary-500 shrink-0" />
                                <span className="truncate">{file.name}</span>
                                <CheckCircle size={16} className="text-emerald-500 shrink-0 ml-auto" />
                            </div>
                        )}

                        <button
                            disabled={!file || loading}
                            onClick={handleUpload}
                            className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                                !file || loading
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-200/50'
                            }`}
                        >
                            {loading ? (
                                <><Loader2 className="animate-spin" size={18} /> {tx('Summarizing...', 'సారాంశం చేస్తున్నాం...')}</>
                            ) : (
                                tx('Summarize Report', 'రిపోర్ట్ సారాంశం')
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 animate-slide-up">
                        {/* Summary Card */}
                        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 border-b border-emerald-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <FileText size={16} className="text-emerald-600" />
                                    </div>
                                    <h4 className="font-bold text-emerald-900">{tx('AI Summary', 'AI సారాంశం')}</h4>
                                </div>
                                <div className="flex items-center gap-3 mt-3">
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/80 text-emerald-700">
                                        {tx('Risk', 'ప్రమాదం')}: {summary.level}
                                    </span>
                                    {summary.score !== null && summary.score !== undefined && (
                                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/80 text-emerald-700">
                                            Score: {summary.score}/100
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 space-y-4">
                                <p className="text-sm text-gray-700 leading-relaxed">{summary.text}</p>

                                <div>
                                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{tx('Key Findings', 'ప్రధాన గుర్తింపులు')}</h5>
                                    <ul className="space-y-1.5">
                                        {summary.findings.map((finding, index) => (
                                            <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                                                {finding}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-100">
                                    <h5 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">{tx('Suggested Action', 'సూచించిన చర్య')}</h5>
                                    <p className="text-sm text-blue-800 leading-relaxed">{summary.action}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <VoiceOutput text={`${summary.text} ${summary.action}`} language={user.language || 'en'} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportUploadPage;
