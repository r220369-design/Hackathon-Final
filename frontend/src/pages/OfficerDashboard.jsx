import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, FileText, Search, Users, RefreshCcw, ChevronRight, Shield, Activity, Heart, Zap } from 'lucide-react';
import api from '../api';
import { officerDummyAlerts } from '../data/officerDummyData';

const OfficerDashboard = () => {
    useTranslation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const isTelugu = String(user.language || '').toLowerCase().startsWith('te');
    const tx = (en, te) => (isTelugu ? te : en);

    const [patients, setPatients] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');

    const loadOfficerData = React.useCallback(async () => {
        try {
            const [patientsResponse, dashboardResponse] = await Promise.all([
                api.get('/officer/patients'),
                api.get('/officer/dashboard')
            ]);
            setPatients(patientsResponse.data.patients || []);
            setDashboard(dashboardResponse.data || null);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || tx('Failed to load officer data', 'అధికారి డేటా లోడ్ చేయడంలో విఫలమైంది'));
        }
    }, []);

    React.useEffect(() => {
        loadOfficerData();
    }, [loadOfficerData]);

    const riskByUserId = (userId) => {
        const report = (dashboard?.reports || []).find((r) => r.userId?._id === userId);
        return report?.level || 'Low';
    };

    const highRiskCount = (dashboard?.riskBuckets?.High || 0) + (dashboard?.riskBuckets?.Critical || 0);
    const localityLabel = dashboard?.localityName || user.localityName || (dashboard?.villageCode || user.villageCode || tx('N/A', 'లభ్యం కాదు'));
    const localityTypeLabel = dashboard?.localityType || user.localityType || 'coverage';

    const filteredPatients = patients.filter((p) =>
        `${p.name || ''} ${p.email || ''} ${p.phone || ''}`.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50 to-white pb-24">
            {/* Enhanced Hero header */}
            <div className="bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 text-white px-4 pt-8 pb-12 relative overflow-hidden shadow-lg">
                {/* Animated background elements */}
                <div className="absolute -top-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-10 -right-10 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
                
                <div className="relative z-10 max-w-lg mx-auto">
                    <div className="flex justify-between items-start gap-3 mb-6">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield size={24} className="text-cyan-200" />
                                <h2 className="text-2xl font-bold">{tx('PHC Officer Dashboard', 'పిహెచ్‌సి డ్యాష్‌బోర్డ్')}</h2>
                            </div>
                            <p className="text-cyan-100 text-sm mt-1 font-medium">{localityTypeLabel.toUpperCase()}: {localityLabel}</p>
                            <p className="text-cyan-200 text-xs mt-1 truncate">{tx('Coverage', 'కవరేజ్')}: {(dashboard?.coveredVillageCodes || user.coveredVillageCodes || []).join(', ') || 'N/A'}</p>
                        </div>
                        <button
                            type="button"
                            onClick={loadOfficerData}
                            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 active:scale-90 transition-all duration-200 border border-white/20 hover:border-white/40"
                        >
                            <RefreshCcw size={18} className="text-white" />
                        </button>
                    </div>

                    {/* Enhanced Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/officer/stats/users')}
                            className="bg-gradient-to-br from-blue-400/30 to-cyan-400/20 backdrop-blur-md rounded-2xl p-4 text-left hover:from-blue-400/40 hover:to-cyan-400/30 active:scale-[0.98] transition-all duration-200 border border-white/25 hover:border-white/40 shadow-lg group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-cyan-100 font-bold uppercase tracking-wider">{tx('Users', 'వినియోగదారులు')}</p>
                                    <p className="text-3xl font-bold mt-1 text-white">{dashboard?.totals?.users || 0}</p>
                                </div>
                                <Users size={24} className="text-cyan-200 group-hover:scale-110 transition-transform" />
                            </div>
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => navigate('/officer/stats/reports')}
                            className="bg-gradient-to-br from-emerald-400/30 to-green-400/20 backdrop-blur-md rounded-2xl p-4 text-left hover:from-emerald-400/40 hover:to-green-400/30 active:scale-[0.98] transition-all duration-200 border border-white/25 hover:border-white/40 shadow-lg group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-emerald-100 font-bold uppercase tracking-wider">{tx('Reports', 'రిపోర్టులు')}</p>
                                    <p className="text-3xl font-bold mt-1 text-white">{dashboard?.totals?.reports || 0}</p>
                                </div>
                                <FileText size={24} className="text-emerald-200 group-hover:scale-110 transition-transform" />
                            </div>
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => navigate('/officer/stats/alerts')}
                            className="bg-gradient-to-br from-amber-400/30 to-orange-400/20 backdrop-blur-md rounded-2xl p-4 text-left hover:from-amber-400/40 hover:to-orange-400/30 active:scale-[0.98] transition-all duration-200 border border-white/25 hover:border-white/40 shadow-lg group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-amber-100 font-bold uppercase tracking-wider">{tx('Alerts', 'అలర్ట్‌లు')}</p>
                                    <p className="text-3xl font-bold mt-1 text-white">{officerDummyAlerts.length}</p>
                                </div>
                                <Zap size={24} className="text-amber-200 group-hover:scale-110 transition-transform" />
                            </div>
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => navigate('/officer/stats/high-risk')}
                            className="bg-gradient-to-br from-red-500/40 to-rose-500/30 backdrop-blur-md rounded-2xl p-4 text-left hover:from-red-500/50 hover:to-rose-500/40 active:scale-[0.98] transition-all duration-200 border border-red-400/50 hover:border-red-300/70 shadow-lg group animate-pulse"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-red-100 font-bold uppercase tracking-wider">{tx('High Risk', 'హై రిస్క్')}</p>
                                    <p className="text-3xl font-bold mt-1 text-white">{highRiskCount}</p>
                                </div>
                                <AlertCircle size={24} className="text-red-200 group-hover:scale-110 transition-transform" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 -mt-6 space-y-5 max-w-lg mx-auto relative z-10">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium border border-red-200 shadow-md flex items-center gap-2">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {/* Enhanced Quick action */}
                <button
                    onClick={() => navigate('/reports')}
                    className="w-full bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl shadow-card border border-indigo-200 p-4 flex items-center gap-4 text-left hover:shadow-xl hover:from-indigo-100 hover:to-blue-100 active:scale-[0.98] transition-all duration-200 group"
                >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-200 to-blue-200 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <FileText size={22} className="text-indigo-600" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-gray-900 text-base">{tx('Analyze Report', 'రిపోర్ట్ విశ్లేషణ')}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{tx('Upload & summarize for PHC', 'పిహెచ్‌సి కోసం అప్‌లోడ్ & సారాంశం')}</p>
                    </div>
                    <ChevronRight size={20} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Enhanced Search */}
                <div className="bg-white rounded-2xl shadow-card border border-gray-200 p-3.5 flex items-center gap-3 hover:shadow-lg transition-all duration-200">
                    <Search size={18} className="text-blue-500 shrink-0" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={tx('Search patient...', 'రోగిని వెతకండి...')}
                        className="bg-transparent text-sm w-full outline-none placeholder:text-gray-400 font-medium"
                    />
                    <span className="text-xs font-bold bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 px-3 py-1.5 rounded-full shrink-0 min-w-fit">{filteredPatients.length}</span>
                </div>

                {/* Patient List Header */}
                <div className="flex items-center gap-2 px-1 mt-6">
                    <Activity size={18} className="text-blue-600" />
                    <h3 className="font-bold text-gray-900 text-base">{tx('Patients Under Coverage', 'కవరేజీ కింద రోగులు')}</h3>
                    <span className="ml-auto text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-700 rounded-full">{filteredPatients.length} {tx('Total', 'మొత్తం')}</span>
                </div>

                {/* Patient List */}
                <div className="space-y-3 pb-8">
                    {filteredPatients.length === 0 ? (
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 text-center border border-gray-200">
                            <Users size={40} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500 font-medium">{tx('No patients found', 'రోగులు కనుగొనబడలేదు')}</p>
                        </div>
                    ) : (
                        filteredPatients.map((p) => {
                            const risk = riskByUserId(p._id);
                            const alert = risk === 'High' || risk === 'Critical';
                            const riskColors = {
                                'Critical': { bg: 'from-red-50 to-rose-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', icon: 'text-red-500' },
                                'High': { bg: 'from-orange-50 to-red-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', icon: 'text-orange-500' },
                                'Moderate': { bg: 'from-amber-50 to-yellow-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: 'text-amber-500' },
                                'Low': { bg: 'from-emerald-50 to-green-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', icon: 'text-emerald-500' }
                            };
                            const currentRiskColor = riskColors[risk] || riskColors['Low'];
                            
                            return (
                                <button
                                    type="button"
                                    key={p._id}
                                    onClick={() => navigate(`/officer/patient/${p._id}`)}
                                    className={`w-full bg-gradient-to-br ${currentRiskColor.bg} p-4 rounded-2xl shadow-card border ${currentRiskColor.border} flex items-center gap-4 text-left hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group`}
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0 bg-white/60 backdrop-blur-sm ${currentRiskColor.icon}`}>
                                        {(p.name || p.email || '?')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-gray-900 text-base truncate">{p.name || p.email}</h4>
                                            {alert && (
                                                <AlertCircle size={14} className={`${currentRiskColor.icon} animate-pulse shrink-0`} />
                                            )}
                                            {p.age > 60 && (
                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold shrink-0 border border-purple-200">
                                                    60+ {tx('Yrs', 'సంవత్సరాలు')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-600">
                                            <Heart size={12} className="text-blue-500" />
                                            <span>{tx('Age', 'వయస్సు')}: {p.age}</span>
                                            <span className="text-gray-300">•</span>
                                            <span>{p.phone || tx('N/A', 'లభ్యం కాదు')}</span>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full shrink-0 ${currentRiskColor.badge} border ${currentRiskColor.border.split('border-')[1]}/30 backdrop-blur-sm`}>
                                        {risk}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default OfficerDashboard;
