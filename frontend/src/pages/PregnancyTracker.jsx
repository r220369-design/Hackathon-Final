import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Baby, Calendar, Info, Heart, Syringe, Plus, CheckCircle } from 'lucide-react';
import api from '../api';

const vaccinationSchedule = [
    { vaccine: "BCG + OPV 0 + Hep B1", dueWeeks: 0, label: "At Birth" },
    { vaccine: "OPV 1 + Penta 1 + RVV 1 + PCV 1", dueWeeks: 6, label: "6 Weeks" },
    { vaccine: "OPV 2 + Penta 2 + RVV 2 + PCV 2", dueWeeks: 10, label: "10 Weeks" },
    { vaccine: "OPV 3 + Penta 3 + RVV 3 + PCV 3 + IPV 1", dueWeeks: 14, label: "14 Weeks" },
    { vaccine: "Measles-Rubella 1 + Vitamin A", dueWeeks: 36, label: "9 Months" },
    { vaccine: "MR 2 + OPV Booster + DPT Booster 1", dueWeeks: 72, label: "18 Months" },
];

const PregnancyTracker = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [babyName, setBabyName] = useState('');
    const [babyDob, setBabyDob] = useState('');
    const [pregnancy, setPregnancy] = useState(null);
    const [error, setError] = useState('');

    React.useEffect(() => {
        const load = async () => {
            try {
                const response = await api.get('/pregnancy/me');
                const current = response.data.pregnancy;
                setPregnancy(current);
                if (current?.dueDate) setDueDate(current.dueDate);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load pregnancy data');
            }
        };
        load();
    }, []);

    const savePregnancy = async () => {
        try {
            await api.post('/pregnancy/upsert', { dueDate, notes: notes ? [{ week: 0, text: notes }] : [] });
            const refreshed = await api.get('/pregnancy/me');
            setPregnancy(refreshed.data.pregnancy);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save pregnancy data');
        }
    };

    const addBaby = async () => {
        try {
            await api.post('/pregnancy/baby', { name: babyName, dob: babyDob });
            const refreshed = await api.get('/pregnancy/me');
            setPregnancy(refreshed.data.pregnancy);
            setBabyName('');
            setBabyDob('');
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add baby');
        }
    };

    const markDone = async (babyIndex, vaccinationIndex) => {
        try {
            await api.patch(`/pregnancy/baby/${babyIndex}/vaccination/${vaccinationIndex}`);
            const refreshed = await api.get('/pregnancy/me');
            setPregnancy(refreshed.data.pregnancy);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update vaccination');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-pink-50/50 to-white pb-24 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 text-white px-4 pt-6 pb-8 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                        <Baby size={22} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">{t('pregnancyTracker')}</h2>
                        <p className="text-pink-100 text-xs">Track your pregnancy & baby vaccinations</p>
                    </div>
                </div>
            </div>

            <div className="px-4 -mt-3 space-y-4 max-w-lg mx-auto">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium border border-red-100">{error}</div>
                )}

                {/* Due Date Card */}
                <div className="bg-white p-5 rounded-2xl shadow-card border border-pink-100 space-y-4 animate-slide-up">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
                            <Calendar size={18} className="text-pink-500" />
                        </div>
                        <h3 className="font-bold text-gray-900">Expected Due Date</h3>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                        />
                        <button
                            onClick={savePregnancy}
                            className="bg-pink-500 text-white px-5 rounded-xl text-sm font-bold hover:bg-pink-600 active:scale-95 transition-all"
                        >
                            Save
                        </button>
                    </div>
                    {dueDate && (
                        <div className="bg-pink-50 p-3.5 rounded-xl flex items-start gap-2.5 text-sm text-pink-800 border border-pink-100">
                            <Info size={16} className="mt-0.5 shrink-0 text-pink-500" />
                            <span className="leading-relaxed">You are roughly in your 2nd Trimester. Eat iron-rich foods like Jaggery and Spinach.</span>
                        </div>
                    )}
                </div>

                {/* Journal */}
                <div className="bg-white p-5 rounded-2xl shadow-card border border-gray-100 space-y-3">
                    <div className="flex items-center gap-2">
                        <Heart size={18} className="text-red-400" />
                        <h3 className="font-bold text-gray-900">Mom's Journal</h3>
                    </div>
                    <textarea
                        className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 resize-none"
                        placeholder="How are you feeling today?"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                    <button
                        onClick={savePregnancy}
                        className="w-full bg-primary-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-700 active:scale-[0.98] transition-all"
                    >
                        Save Note
                    </button>
                </div>

                {/* Add Baby */}
                <div className="bg-white p-5 rounded-2xl shadow-card border border-gray-100 space-y-3">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Baby size={18} className="text-blue-500" /> Newborn Tracking
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            value={babyName}
                            onChange={(e) => setBabyName(e.target.value)}
                            placeholder="Baby name"
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        <input
                            type="date"
                            value={babyDob}
                            onChange={(e) => setBabyDob(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </div>
                    <button
                        onClick={addBaby}
                        className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-blue-700 active:scale-[0.98] transition-all"
                    >
                        <Plus size={16} /> Add Baby
                    </button>
                </div>

                {/* Vaccination Schedule */}
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 px-1">
                        <Syringe size={18} className="text-primary-600" />
                        {t('babyVaccination')}
                    </h3>
                    {(pregnancy?.babies?.[0]?.vaccinations?.length ? pregnancy.babies[0].vaccinations : vaccinationSchedule).map((v, i) => (
                        <div
                            key={i}
                            className={`bg-white p-4 rounded-2xl shadow-card border transition-all ${
                                i === 0 ? 'border-primary-200 bg-primary-50/50' : 'border-gray-100'
                            }`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                    i === 0 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {v.label || `Dose ${i + 1}`}
                                </span>
                                {i === 0 && (
                                    <span className="text-[10px] text-primary-700 font-bold bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">Due Now</span>
                                )}
                                {v.completed && (
                                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                                        <CheckCircle size={11} /> Done
                                    </span>
                                )}
                            </div>
                            <p className="font-semibold text-gray-900 text-sm">{v.vaccine}</p>
                            {v.dueDate && <p className="text-xs text-gray-400 mt-1">Due: {v.dueDate}</p>}
                            {pregnancy?.babies?.[0]?.vaccinations?.length > 0 && !v.completed && (
                                <button
                                    onClick={() => markDone(0, i)}
                                    className="mt-2.5 text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-semibold border border-emerald-100 hover:bg-emerald-100 active:scale-95 transition-all flex items-center gap-1"
                                >
                                    <CheckCircle size={12} /> Mark Completed
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PregnancyTracker;
