import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle, Mail, Phone, MapPin, Globe } from 'lucide-react';
import api from '../api';

const OfficerPatientDetails = () => {
    const navigate = useNavigate();
    const { patientId } = useParams();

    const [patient, setPatient] = useState(null);
    const [latestReport, setLatestReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionStatus, setActionStatus] = useState('');
    const [markingDone, setMarkingDone] = useState(false);

    useEffect(() => {
        const loadPatientDetails = async () => {
            try {
                const response = await api.get(`/officer/patients/${patientId}`);
                setPatient(response.data?.patient || null);
                setLatestReport(response.data?.latestReport || null);
                setError('');
            } catch (err) {
                if (err.response?.status === 404) {
                    try {
                        const [patientsResponse, dashboardResponse] = await Promise.all([
                            api.get('/officer/patients'),
                            api.get('/officer/dashboard')
                        ]);

                        const fallbackPatient = (patientsResponse.data?.patients || [])
                            .find((item) => item._id === patientId);

                        if (!fallbackPatient) {
                            setError('Patient not found in your coverage area');
                            return;
                        }

                        const fallbackLatestReport = (dashboardResponse.data?.reports || [])
                            .find((report) => report.userId?._id === patientId) || null;

                        setPatient(fallbackPatient);
                        setLatestReport(fallbackLatestReport);
                        setError('');
                        return;
                    } catch (fallbackErr) {
                        setError(fallbackErr.response?.data?.message || 'Failed to fetch patient details');
                        return;
                    }
                }

                setError(err.response?.data?.message || 'Failed to fetch patient details');
            } finally {
                setLoading(false);
            }
        };

        loadPatientDetails();
    }, [patientId]);

    const handleMarkAsDone = async () => {
        try {
            setMarkingDone(true);
            setActionStatus('');
            await api.patch(`/officer/patients/${patientId}/complete-case`);
            setActionStatus('Case marked as done. Redirecting to dashboard...');
            setTimeout(() => navigate('/officer'), 800);
        } catch (err) {
            setActionStatus(err.response?.data?.message || 'Failed to mark case as done');
        } finally {
            setMarkingDone(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-sm text-gray-400 animate-pulse">Loading patient details...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 animate-fade-in">
                <button
                    type="button"
                    onClick={() => navigate('/officer')}
                    className="inline-flex items-center gap-2 text-sm text-primary-700 font-semibold mb-4"
                >
                    <ChevronLeft size={16} /> Back to Dashboard
                </button>
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium border border-red-100">{error}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24 animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => navigate('/officer')}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
                >
                    <ChevronLeft size={18} className="text-gray-700" />
                </button>
                <h2 className="font-bold text-gray-900">Patient Details</h2>
            </div>

            <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
                {/* Patient Profile Card */}
                <div className="bg-white p-5 rounded-2xl shadow-card border border-gray-100 text-center animate-slide-up">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl font-bold text-slate-600">
                            {(patient?.name || patient?.email || '?')[0].toUpperCase()}
                        </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">{patient?.name || '-'}</h3>
                    <p className="text-sm text-gray-400">Age {patient?.age ?? '-'}</p>
                </div>

                {/* Info Grid */}
                <div className="bg-white rounded-2xl shadow-card border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                    {[
                        { icon: Mail, label: 'Email', value: patient?.email },
                        { icon: Phone, label: 'Phone', value: patient?.phone },
                        { icon: MapPin, label: 'Village Code', value: patient?.villageCode },
                        { icon: Globe, label: 'Language', value: patient?.language },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                <item.icon size={15} className="text-gray-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{item.label}</p>
                                <p className="text-sm text-gray-800 truncate">{item.value || '-'}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Health Report */}
                <div className="bg-white p-4 rounded-2xl shadow-card border border-gray-100 space-y-3">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        <Activity size={15} className="text-primary-600" /> Health Condition
                    </h3>
                    {latestReport ? (
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Level</p>
                                    <p className="font-bold text-gray-900">{latestReport.level || 'Unknown'}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Score</p>
                                    <p className="font-bold text-gray-900">{latestReport.score ?? '-'}/100</p>
                                </div>
                            </div>
                            {(latestReport.possibleDiseases || []).length > 0 && (
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Possible Diseases</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {latestReport.possibleDiseases.map((d, i) => (
                                            <span key={i} className="text-xs bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full border border-gray-100">{d}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {latestReport.recommendation && (
                                <div className="bg-blue-50 rounded-xl p-3.5 text-xs text-blue-800 leading-relaxed border border-blue-100">
                                    <p className="font-bold text-[10px] text-blue-600 uppercase tracking-wider mb-1">Recommendation ({latestReport.recommendationType || '-'})</p>
                                    {latestReport.recommendation}
                                </div>
                            )}
                            {latestReport.explanation && (
                                <p className="text-xs text-gray-500 leading-relaxed">{latestReport.explanation}</p>
                            )}
                            {latestReport.symptoms && (
                                <p className="text-xs text-gray-400 italic">Symptoms: {latestReport.symptoms}</p>
                            )}
                            {latestReport.createdAt && (
                                <p className="text-[11px] text-gray-400">Last report: {new Date(latestReport.createdAt).toLocaleString()}</p>
                            )}

                            {/* Mark as done */}
                            {latestReport.caseStatus !== 'done' && (
                                <button
                                    type="button"
                                    onClick={handleMarkAsDone}
                                    disabled={markingDone}
                                    className="w-full bg-primary-600 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-60"
                                >
                                    <CheckCircle size={16} />
                                    {markingDone ? 'Marking...' : 'Mark as Done'}
                                </button>
                            )}

                            {latestReport.caseStatus === 'done' && (
                                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
                                    <CheckCircle size={14} /> Case is marked as done.
                                </div>
                            )}

                            {actionStatus && (
                                <div className="bg-primary-50 border border-primary-100 text-primary-700 px-4 py-2.5 rounded-xl text-sm font-medium">{actionStatus}</div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-400">No health report available yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OfficerPatientDetails;
