import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Bell, RefreshCw, CheckCheck } from 'lucide-react';
import api from '../api';

const Alerts = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isTelugu = String(user.language || '').toLowerCase().startsWith('te');
    const tx = React.useCallback((en, te) => (isTelugu ? te : en), [isTelugu]);
    const [alerts, setAlerts] = React.useState([]);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');

    const normalizeSenderName = React.useCallback((value) => {
        const text = String(value || '').trim();
        if (!text) return '';
        const lowered = text.toLowerCase();
        if (lowered === 'undefined' || lowered === 'null' || lowered === 'not specified') return '';
        return text;
    }, []);

    const formatDateTime = React.useCallback((value) => {
        if (!value) return '';
        const parsedDate = new Date(value);
        if (Number.isNaN(parsedDate.getTime())) return '';
        return parsedDate.toLocaleString();
    }, []);

    const loadAlerts = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/alerts/me');
            setAlerts(response.data.alerts || []);
            setUnreadCount(Number(response.data.unreadCount) || 0);
        } catch (err) {
            setError(err.response?.data?.message || (isTelugu ? 'అలర్ట్‌లు లోడ్ చేయడంలో విఫలమైంది' : 'Failed to load alerts'));
        } finally {
            setLoading(false);
        }
    }, [isTelugu]);

    React.useEffect(() => {
        loadAlerts();
    }, [loadAlerts]);

    const markAlertAsRead = async (alertId) => {
        try {
            await api.patch(`/alerts/${alertId}/read`);
            setAlerts((previousAlerts) =>
                previousAlerts.map((alertItem) =>
                    alertItem._id === alertId ? { ...alertItem, read: true } : alertItem
                )
            );
            setUnreadCount((prevCount) => Math.max(0, prevCount - 1));
        } catch (err) {
            setError(err.response?.data?.message || tx('Failed to mark alert as read', 'అలర్ట్‌ను చదివినట్లు గుర్తించడం విఫలమైంది'));
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await api.patch('/alerts/read-all');
            setAlerts(response.data.alerts || []);
            setUnreadCount(0);
        } catch (err) {
            setError(err.response?.data?.message || tx('Failed to mark all alerts as read', 'అన్ని అలర్ట్‌లను చదివినట్లు గుర్తించడం విఫలమైంది'));
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24 animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                        <Bell size={16} className="text-red-500" />
                    </div>
                    <h2 className="font-bold text-gray-900">{tx('Alerts', 'అలర్ట్‌లు')}</h2>
                    {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                    )}
                </div>
                <button
                    onClick={loadAlerts}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
                >
                    <RefreshCw size={14} className="text-gray-600" />
                </button>
            </div>

            <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium border border-red-100">{error}</div>
                )}

                {/* Mark all read bar */}
                {!loading && unreadCount > 0 && (
                    <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-card p-3.5">
                        <p className="text-sm font-semibold text-gray-700">
                            {tx(`${unreadCount} unread`, `${unreadCount} చదవని`)}
                        </p>
                        <button
                            onClick={markAllAsRead}
                            className="text-xs bg-primary-50 border border-primary-100 text-primary-700 px-3 py-1.5 rounded-full font-semibold flex items-center gap-1 hover:bg-primary-100 active:scale-95 transition-all"
                        >
                            <CheckCheck size={12} /> {tx('Mark all read', 'అన్నీ చదివినట్లు')}
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center py-12">
                        <div className="w-8 h-8 border-2 border-gray-200 border-t-primary-600 rounded-full animate-spin" />
                        <p className="text-sm text-gray-400 mt-3">{tx('Loading alerts...', 'అలర్ట్‌లు లోడ్ అవుతున్నాయి...')}</p>
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-8 text-center">
                        <Bell size={32} className="mx-auto text-gray-200 mb-3" />
                        <p className="text-sm text-gray-400">{tx('No alerts right now.', 'ప్రస్తుతం అలర్ట్‌లు లేవు.')}</p>
                    </div>
                ) : (
                    alerts.map((alertItem) => (
                        <div
                            key={alertItem._id}
                            className={`bg-white rounded-2xl border p-4 shadow-card transition-all ${alertItem.read ? 'border-gray-100' : 'border-red-200 bg-red-50/30'}`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2.5 flex-1">
                                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${alertItem.read ? 'bg-gray-100' : 'bg-red-100'}`}>
                                        <AlertTriangle size={14} className={alertItem.read ? 'text-gray-400' : 'text-red-500'} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-bold text-gray-900">{alertItem.type}</p>
                                            {alertItem.riskLevel && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                                    alertItem.riskLevel === 'critical' ? 'bg-red-100 text-red-700' :
                                                    alertItem.riskLevel === 'high' ? 'bg-orange-100 text-orange-700' :
                                                    alertItem.riskLevel === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                    {alertItem.riskLevel}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${alertItem.channel === 'sms' ? 'bg-blue-50 text-blue-600' : alertItem.channel === 'call' ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-500'}`}>
                                                {alertItem.channel || 'inapp'}
                                            </span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${alertItem.status === 'failed' ? 'bg-red-50 text-red-600' : alertItem.status === 'sent' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {alertItem.status || 'pending'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {alertItem.read ? (
                                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 shrink-0">
                                        <CheckCircle2 size={11} /> {tx('Read', 'చదివింది')}
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => markAlertAsRead(alertItem._id)}
                                        className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full font-semibold shrink-0 hover:bg-gray-50 active:scale-95 transition-all"
                                    >
                                        {tx('Mark Read', 'చదివినట్లు')}
                                    </button>
                                )}
                            </div>
                            <p className="text-sm text-gray-600 mt-3 leading-relaxed whitespace-pre-wrap">{alertItem.message}</p>
                            {alertItem.symptoms && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-600 mb-1">{tx('Symptoms', 'లక్షణాలు')}:</p>
                                    <p className="text-xs text-gray-600">{alertItem.symptoms}</p>
                                </div>
                            )}
                            {alertItem.riskScore !== null && alertItem.riskScore !== undefined && (
                                <div className="mt-2 flex gap-4 text-xs">
                                    <span className="text-gray-600"><strong>{tx('Risk Score', 'ఝాఖ స్కోర్')}:</strong> {alertItem.riskScore}</span>
                                </div>
                            )}
                            <div className="mt-3 text-[11px] text-gray-400 space-y-0.5 border-t border-gray-100 pt-2">
                                <p>
                                    {tx('From', 'నుండి')}: {
                                        normalizeSenderName(alertItem.senderName)
                                        || normalizeSenderName(alertItem.fromUserName)
                                        || normalizeSenderName(alertItem.fromUserId?.name)
                                        || normalizeSenderName(alertItem.fromUserId?.phone)
                                        || normalizeSenderName(alertItem.fromUserId?.email)
                                        || tx('Unknown', 'తెలియదు')
                                    }
                                </p>
                                {alertItem.createdAt && (
                                    <p>{formatDateTime(alertItem.createdAt)}</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Alerts;
