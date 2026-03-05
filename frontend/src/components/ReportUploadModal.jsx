import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, File, FileText, Loader2 } from 'lucide-react';
import VoiceOutput from './VoiceOutput';
import api from '../api';

const ReportUploadModal = ({ onClose }) => {
    const { t } = useTranslation();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState('');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

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

            setSummary({
                text: response.data.explanation,
                findings: response.data.possibleDiseases || [],
                action: response.data.recommendation,
                level: response.data.level,
                score: response.data.score,
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to summarize report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-primary-800 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold">Upload Medical Report</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>

                <div className="p-5 overflow-y-auto w-full">
                    {error && <div className="bg-red-100 text-red-700 p-2 rounded text-xs mb-3">{error}</div>}
                    {!summary ? (
                        <div className="flex flex-col items-center gap-4">
                            <p className="text-gray-600 text-sm text-center">Upload patient lab reports (PDF/Image) for an automatic AI summary.</p>

                            <label className="border-2 border-dashed border-primary-300 bg-primary-50 w-full h-32 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-primary-100 transition">
                                <Upload className="text-primary-500 mb-2" size={32} />
                                <span className="text-primary-700 font-bold text-sm">Choose File</span>
                                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                            </label>

                            {file && (
                                <div className="bg-gray-100 w-full p-3 rounded-lg flex items-center gap-2 text-sm text-gray-700 font-semibold border border-gray-200">
                                    <File size={16} className="text-gray-500" />
                                    <span className="truncate">{file.name}</span>
                                </div>
                            )}

                            <button
                                disabled={!file || loading}
                                onClick={handleUpload}
                                className={`w-full py-3 rounded-lg font-bold text-white shadow-sm flex items-center justify-center gap-2 ${!file || loading ? 'bg-gray-400' : 'bg-primary-600 hover:bg-primary-700'
                                    }`}
                            >
                                {loading ? <><Loader2 className="animate-spin" size={18} /> Summarizing...</> : 'Summarize Report'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-200">
                                <h4 className="font-bold flex items-center gap-2 mb-2"><FileText size={18} /> AI Summary</h4>
                                <p className="text-xs font-bold mb-1">Risk: {summary.level || 'Unknown'} ({summary.score ?? 'N/A'}{summary.score === null || summary.score === undefined ? '' : '/100'})</p>
                                <p className="text-sm leading-relaxed text-gray-700">{summary.text}</p>

                                <h5 className="font-bold text-xs mt-3 text-green-900 border-b border-green-200 pb-1 mb-2">Key Findings</h5>
                                <ul className="list-disc pl-4 text-sm text-gray-700 space-y-1">
                                    {summary.findings.map((f, i) => <li key={i}>{f}</li>)}
                                </ul>

                                <h5 className="font-bold text-xs mt-3 text-green-900 border-b border-green-200 pb-1 mb-2">Suggested Action</h5>
                                <p className="text-sm text-gray-700">{summary.action}</p>
                            </div>

                            <div className="flex justify-end">
                                <VoiceOutput text={`${summary.text} ${summary.action}`} language={user.language || 'en'} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportUploadModal;
