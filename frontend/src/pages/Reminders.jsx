import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, RefreshCw, Clock } from 'lucide-react';
import api from '../api';

const Reminders = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isTelugu = String(user.language || '').toLowerCase().startsWith('te');
    const tx = (en, te) => (isTelugu ? te : en);
    const [reminders, setReminders] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');

    const loadReminders = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/reminders/me');
            setReminders(response.data.reminders || []);
        } catch (err) {
            setError(err.response?.data?.message || tx('Failed to load reminders', 'రిమైండర్లు లోడ్ చేయడంలో విఫలమైంది'));
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadReminders();
    }, [loadReminders]);

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
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                        <BellRing size={16} className="text-amber-500" />
                    </div>
                    <h2 className="font-bold text-gray-900">{tx('Reminders', 'రిమైండర్లు')}</h2>
                </div>
                <button
                    onClick={loadReminders}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
                >
                    <RefreshCw size={14} className="text-gray-600" />
                </button>
            </div>

            <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium border border-red-100">{error}</div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center py-12">
                        <div className="w-8 h-8 border-2 border-gray-200 border-t-amber-500 rounded-full animate-spin" />
                        <p className="text-sm text-gray-400 mt-3">{tx('Loading reminders...', 'రిమైండర్లు లోడ్ అవుతున్నాయి...')}</p>
                    </div>
                ) : reminders.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-8 text-center">
                        <BellRing size={32} className="mx-auto text-gray-200 mb-3" />
                        <p className="text-sm text-gray-400">{tx('No reminders yet.', 'ఇంకా రిమైండర్లు లేవు.')}</p>
                    </div>
                ) : (
                    reminders.map((reminder) => (
                        <div key={reminder._id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-card hover:shadow-card-hover transition-all">
                            <div className="flex items-start gap-3">
                                <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                                    <BellRing size={18} className="text-amber-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-bold text-gray-900 truncate">{reminder.title}</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                                            reminder.severity === 'high' || reminder.severity === 'critical'
                                                ? 'bg-red-50 text-red-600'
                                                : reminder.severity === 'moderate'
                                                    ? 'bg-amber-50 text-amber-600'
                                                    : 'bg-emerald-50 text-emerald-600'
                                        }`}>
                                            {reminder.severity}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{reminder.message}</p>
                                    <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-400">
                                        <Clock size={11} />
                                        {tx('Due', 'గడువు')}: {formatDateTime(reminder.dueAt)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Reminders;
