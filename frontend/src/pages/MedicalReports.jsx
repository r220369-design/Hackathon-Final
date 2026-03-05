import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, RefreshCw, TrendingUp, Check } from 'lucide-react';
import api from '../api';

const MedicalReports = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isTelugu = String(user.language || '').toLowerCase().startsWith('te');
    const tx = (en, te) => (isTelugu ? te : en);
    const [reports, setReports] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [updatingReportId, setUpdatingReportId] = React.useState(null);
    const [updateError, setUpdateError] = React.useState('');

    const loadReports = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/reports/me?limit=50');
            setReports(response.data?.reports || []);
        } catch (err) {
            setError(err.response?.data?.message || tx('Failed to load medical reports', 'వైద్య రిపోర్ట్‌లు లోడ్ చేయడంలో విఫలమైంది'));
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadReports();
    }, [loadReports]);

    const handleMarkAsCured = async (reportId) => {
        setUpdatingReportId(reportId);
        setUpdateError('');
        try {
            console.log('Marking as cured, reportId:', reportId);
            const response = await api.post('/recovery/mark-recovered', {
                reportId,
                recoveryNotes: ''
            });
            
            console.log('Mark cured response:', response);
            
            // Update the report in the state
            setReports(prevReports => 
                prevReports.map(r => 
                    r._id === reportId 
                        ? { ...r, recoveryStatus: 'cured', recoveredAt: new Date().toISOString() }
                        : r
                )
            );
        } catch (err) {
            console.error('Full error object:', err);
            console.error('Error response:', err.response);
            const errorMsg = err.response?.data?.message || err.message || tx('Failed to mark as cured', 'నయం చేయడంలో విఫలమైంది');
            setUpdateError(errorMsg);
        } finally {
            setUpdatingReportId(null);
        }
    };

    const latestReport = reports[0] || null;

    const formatDateTime = (value) => {
        if (!value) return tx('N/A', 'లభ్యం కాదు');
        const parsedDate = new Date(value);
        if (Number.isNaN(parsedDate.getTime())) return tx('N/A', 'లభ్యం కాదు');
        return parsedDate.toLocaleString();
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24 animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <FileText size={16} className="text-indigo-600" />
                    </div>
                    <h2 className="font-bold text-gray-900">{tx('Reports', 'రిపోర్టులు')}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/reports')}
                        className="flex items-center gap-1 text-xs font-semibold bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full border border-primary-100 hover:bg-primary-100 active:scale-95 transition-all"
                    >
                        <Upload size={12} /> {tx('Upload', 'అప్‌లోడ్')}
                    </button>
                    <button
                        onClick={loadReports}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
                    >
                        <RefreshCw size={14} className="text-gray-600" />
                    </button>
                </div>
            </div>

            <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium border border-red-100">{error}</div>
                )}
                
                {updateError && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium border border-red-100">{updateError}</div>
                )}

                {/* Latest Score Card */}
                {!loading && latestReport && (
                    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 animate-slide-up">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{tx('Latest Risk Score', 'తాజా స్కోర్')}</p>
                                <p className="text-4xl font-extrabold text-gray-900 mt-1">{latestReport.score ?? '--'}<span className="text-sm text-gray-400 font-medium">/100</span></p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                <TrendingUp size={22} className="text-indigo-600" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{tx('Based on latest uploaded report', 'తాజా రిపోర్ట్ ఆధారంగా')}</p>
                    </div>
                )}

                {/* Reports list */}
                {loading ? (
                    <div className="flex flex-col items-center py-12">
                        <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-sm text-gray-400 mt-3">{tx('Loading reports...', 'రిపోర్ట్‌లు లోడ్ అవుతున్నాయి...')}</p>
                    </div>
                ) : reports.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-8 text-center">
                        <FileText size={32} className="mx-auto text-gray-200 mb-3" />
                        <p className="text-sm text-gray-400">{tx('No medical reports found.', 'వైద్య రిపోర్ట్‌లు లభించలేదు.')}</p>
                        <button
                            onClick={() => navigate('/reports')}
                            className="mt-4 text-sm font-semibold text-primary-700 bg-primary-50 px-4 py-2 rounded-xl border border-primary-100 hover:bg-primary-100 transition-all"
                        >
                            {tx('Upload your first report', 'మీ మొదటి రిపోర్ట్ అప్‌లోడ్ చేయండి')}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {reports.map((report) => {
                            const recoveryStatusColor = {
                                cured: 'bg-emerald-50 text-emerald-700',
                                improving: 'bg-blue-50 text-blue-700',
                                worsening: 'bg-orange-50 text-orange-700',
                                active: 'bg-red-50 text-red-700'
                            };
                            const recoveryStatusLabel = {
                                cured: tx('✓ Cured', '✓ నయం'),
                                improving: tx('↗ Improving', '↗ మెరుగు'),
                                worsening: tx('↘ Worsening', '↘ క్షీణత'),
                                active: tx('● Active', '● చేతిలో')
                            };
                            const status = report.recoveryStatus || 'active';
                            return (
                                <div key={report._id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-card hover:shadow-card-hover transition-all">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                                <FileText size={16} className="text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 text-sm">{report.level} {tx('Risk', 'ప్రమాదం')}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-gray-50 text-gray-500">
                                                        {report.sourceType === 'symptom' ? tx('Symptom Check', 'లక్షణ పరీక్ష') : tx('Report Upload', 'రిపోర్ట్')}
                                                    </span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${recoveryStatusColor[status]}`}>
                                                        {recoveryStatusLabel[status]}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                                            {report.score}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-2.5 leading-relaxed">{report.symptoms || tx('Uploaded report analysis', 'అప్‌లోడ్ చేసిన రిపోర్ట్ విశ్లేషణ')}</p>
                                    <p className="text-[11px] text-gray-400 mt-2">{formatDateTime(report.createdAt)}</p>
                                    {report.recoveredAt && (
                                        <p className="text-[10px] text-emerald-600 font-semibold mt-2">
                                            {tx('Marked as cured on', 'ఈ రోజున నయం అని గుర్తించారు')}: {formatDateTime(report.recoveredAt)}
                                        </p>
                                    )}
                                    
                                    {/* Mark as Cured Button */}
                                    {status !== 'cured' && (
                                        <button
                                            onClick={() => handleMarkAsCured(report._id)}
                                            disabled={updatingReportId === report._id}
                                            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {updatingReportId === report._id ? (
                                                <div className="w-4 h-4 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Check size={16} />
                                            )}
                                            {updatingReportId === report._id 
                                                ? tx('Marking...', 'గుర్తించబడుతున్నది...')
                                                : tx('Mark as Cured', 'నయం గా గుర్తించండి')
                                            }
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MedicalReports;
