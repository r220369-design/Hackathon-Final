import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, FileText, BellRing, AlertTriangle, TrendingUp, TrendingDown, Minus, MapPin } from 'lucide-react';
import api from '../api';

const Dashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const [reminders, setReminders] = React.useState([]);
    const [historyRecords, setHistoryRecords] = React.useState([]);
    const [historyMeta, setHistoryMeta] = React.useState({ averageScore: 0, latestScore: null, scoreTrend: 'stable' });
    const [currentReportRiskScore, setCurrentReportRiskScore] = React.useState(null);
    const [loadingData, setLoadingData] = React.useState(true);
    const [error, setError] = React.useState('');

    const loadDashboardData = React.useCallback(async () => {
        setLoadingData(true);
        setError('');
        const [remindersResult, historyResult, reportsResult] = await Promise.allSettled([
            api.get('/reminders/me'),
            api.get('/triage/history?limit=5'),
            api.get('/reports/me?limit=1'),
        ]);

        if (remindersResult.status === 'fulfilled') {
            setReminders(remindersResult.value.data.reminders || []);
        } else {
            setReminders([]);
        }

        if (historyResult.status === 'fulfilled') {
            setHistoryRecords(historyResult.value.data.records || []);
            setHistoryMeta({
                averageScore: historyResult.value.data.averageScore ?? 0,
                latestScore: historyResult.value.data.latestScore ?? null,
                scoreTrend: historyResult.value.data.scoreTrend || 'stable'
            });
        } else {
            setHistoryRecords([]);
            setHistoryMeta({ averageScore: 0, latestScore: null, scoreTrend: 'stable' });
        }

        if (reportsResult.status === 'fulfilled') {
            const latestReport = (reportsResult.value.data?.reports || [])[0];
            setCurrentReportRiskScore(latestReport?.score ?? null);
        } else {
            setCurrentReportRiskScore(null);
        }

        if (remindersResult.status === 'rejected' && historyResult.status === 'rejected' && reportsResult.status === 'rejected') {
            setError(t('dashboard.errors.loadAll'));
        } else if (remindersResult.status === 'rejected') {
            setError(t('dashboard.errors.loadReminders'));
        } else if (historyResult.status === 'rejected' && reportsResult.status === 'rejected') {
            setError(t('dashboard.errors.loadHistory'));
        }

        setLoadingData(false);
    }, []);

    React.useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    const formatDateTime = (value) => {
        if (!value) return t('dashboard.notAvailable');
        const parsedDate = new Date(value);
        if (Number.isNaN(parsedDate.getTime())) return t('dashboard.notAvailable');
        return parsedDate.toLocaleString();
    };

    const remindersCount = reminders.length;

    const trendConfig = {
        improving: {
            label: t('dashboard.trend.improving'),
            icon: TrendingDown,
            textClass: 'text-green-700',
            bgClass: 'bg-green-100'
        },
        worsening: {
            label: t('dashboard.trend.worsening'),
            icon: TrendingUp,
            textClass: 'text-red-700',
            bgClass: 'bg-red-100'
        },
        stable: {
            label: t('dashboard.trend.stable'),
            icon: Minus,
            textClass: 'text-gray-700',
            bgClass: 'bg-gray-100'
        }
    };

    const activeTrend = trendConfig[historyMeta.scoreTrend] || trendConfig.stable;
    const TrendIcon = activeTrend.icon;

    return (
        <div className="flex flex-col min-h-full animate-fade-in">
            {/* Greeting Header Card */}
            <div className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 text-white px-5 pt-5 pb-8 rounded-b-[2rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary-600/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
                <div className="relative max-w-5xl mx-auto">
                    {/* Desktop: greeting + risk score on same row; Mobile: stacked */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <p className="text-primary-200 text-sm lg:text-base font-medium">{t('dashboard.greeting')}</p>
                            <h2 className="text-2xl lg:text-3xl font-bold mt-0.5 tracking-tight">{user.name || user.phone || t('dashboard.noContact')}</h2>
                        </div>

                        {/* Risk Score Pill */}
                        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur border border-white/15 px-4 py-2.5 rounded-2xl self-start lg:self-center">
                            <div>
                                <span className="text-[10px] text-primary-200 uppercase tracking-wider font-semibold">{t('riskScore')}</span>
                                <p className="text-2xl font-extrabold leading-none mt-0.5">{currentReportRiskScore ?? t('dashboard.notAvailable')}</p>
                            </div>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${activeTrend.bgClass} ${activeTrend.textClass}`}>
                                <TrendIcon size={14} />
                                {activeTrend.label}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 lg:px-6 -mt-3 pb-4">
                <div className="max-w-5xl mx-auto space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm font-medium animate-fade-in">
                            {error}
                        </div>
                    )}


                    <div className="flex flex-col items-center gap-8">
                        {/* Primary CTA - Health Check */}
                        <button
                            onClick={() => navigate('/symptoms')}
                            className="w-full bg-white rounded-2xl p-5 shadow-card border border-gray-100 flex items-center gap-4 hover:shadow-card-hover hover:border-primary-100 active:scale-[0.99] transition-all group"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-primary-200/40 group-hover:scale-105 transition-transform">
                                <Activity size={24} className="text-white" />
                            </div>
                            <div className="text-left min-w-0">
                                <h3 className="text-[15px] font-bold text-gray-900">{t('dashboard.startHealthCheck')}</h3>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t('dashboard.startHealthCheckHint')}</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-300 shrink-0 ml-auto group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>

                        {/* Quick Actions Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 lg:max-w-3xl mx-auto place-items-center">
                            {[
                                { path: '/family', icon: Users, label: t('familyGroup'), color: 'text-blue-600', bg: 'bg-blue-50' },
                                { path: '/reports', icon: FileText, label: t('dashboard.uploadReport'), color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                { path: '/medical-reports', icon: FileText, label: t('dashboard.medicalReports'), color: 'text-violet-600', bg: 'bg-violet-50' },
                                { path: '/nearby-hospitals', icon: MapPin, label: t('dashboard.nearbyHospitals'), color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { path: '/reminders', icon: BellRing, label: t('dashboard.myReminders'), color: 'text-amber-600', bg: 'bg-amber-50' },
                                { path: '/alerts', icon: AlertTriangle, label: t('dashboard.myAlerts'), color: 'text-red-600', bg: 'bg-red-50' },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => navigate(item.path)}
                                        className="w-36 h-36 bg-white rounded-2xl p-7 shadow-card border border-gray-100 flex flex-col items-center justify-center gap-3 hover:shadow-card-hover hover:border-primary-100 active:scale-[0.98] transition-all"
                                    >
                                        <div className={`w-16 h-16 rounded-xl ${item.bg} flex items-center justify-center`}>
                                            <Icon size={28} className={item.color} />
                                        </div>
                                        <span className="text-sm font-semibold text-gray-700 text-center leading-tight">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
};

export default Dashboard;
