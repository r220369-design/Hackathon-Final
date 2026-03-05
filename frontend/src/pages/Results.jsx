import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, ShieldCheck, Shield, ChevronLeft, AlertTriangle, Stethoscope, Volume2 } from 'lucide-react';
import HospitalList from '../components/HospitalList';
import VoiceOutput from '../components/VoiceOutput';

const Results = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const isTelugu = String(user.language || '').toLowerCase().startsWith('te');

    const result = location.state?.result;
    const symptomText = location.state?.symptomText;

    if (!result) return <Navigate to="/dashboard" />;

    const getRiskColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'low': return 'text-green-600 bg-green-100';
            case 'moderate': return 'text-yellow-600 bg-yellow-100';
            case 'high': return 'text-orange-600 bg-orange-100';
            case 'critical': return 'text-red-700 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getRiskProgressColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'low': return 'bg-green-500';
            case 'moderate': return 'bg-yellow-500';
            case 'high': return 'bg-orange-500';
            case 'critical': return 'bg-red-600';
            default: return 'bg-gray-500';
        }
    };

    const getRiskIcon = (level) => {
        switch (level?.toLowerCase()) {
            case 'low': return <ShieldCheck className="w-8 h-8 text-green-600" />;
            case 'moderate': return <Shield className="w-8 h-8 text-yellow-600" />;
            case 'high': return <ShieldAlert className="w-8 h-8 text-orange-600" />;
            case 'critical': return <ShieldAlert className="w-8 h-8 text-red-700 animate-pulse" />;
            default: return <Shield className="w-8 h-8" />;
        }
    };

    // Full text to speak aloud: combine explanation and recommendation
    const combinedSpeakText = `${result.explanation} ${result.recommendation}`;
    const riskBandText = isTelugu
        ? 'రిస్క్ బ్యాండ్లు: తక్కువ < 50, మధ్యస్థ 50-79, తీవ్ర 80+'
        : 'Risk bands: Low < 50, Moderate 50-79, Severe 80+';

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24 animate-fade-in">
            {/* Back header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
                >
                    <ChevronLeft size={18} className="text-gray-700" />
                </button>
                <h2 className="font-bold text-gray-900">{t('riskScore')}</h2>
            </div>

            <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">

                {/* Priority Badge */}
                {user.age > 60 && (
                    <div className="bg-purple-50 border border-purple-200 text-purple-800 p-3 rounded-2xl text-xs font-bold flex justify-center items-center gap-1.5 animate-fade-in">
                        <span className="text-base">🌟</span> Priority Patient (Age &gt; 60)
                    </div>
                )}

                {/* Risk Score Card */}
                <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100 text-center animate-slide-up">
                    <div className="flex justify-center mb-3">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getRiskColor(result.level)}`}>
                            {getRiskIcon(result.level)}
                        </div>
                    </div>
                    <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">{result.score}<span className="text-lg text-gray-400 font-medium">/100</span></h1>

                    <div className={`mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider ${getRiskColor(result.level)}`}>
                        {result.level} Risk
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-100 rounded-full h-2.5 mt-5 overflow-hidden">
                        <div
                            className={`h-2.5 rounded-full ${getRiskProgressColor(result.level)} transition-all duration-1000 ease-out`}
                            style={{ width: `${result.score}%` }}
                        />
                    </div>
                    <p className="mt-2 text-[11px] text-gray-400 font-medium">{riskBandText}</p>
                </div>

                {/* Voice Output */}
                <div className="flex justify-end">
                    <VoiceOutput text={combinedSpeakText} language={user.language} />
                </div>

                {/* Symptoms Summary */}
                <div className="bg-white p-4 rounded-2xl shadow-card border border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Reported Symptoms</h3>
                    <p className="text-gray-700 text-sm italic leading-relaxed">"{symptomText}"</p>
                </div>

                {/* AI Explanation & Recommendation */}
                <div className="bg-white p-5 rounded-2xl shadow-card border border-gray-100 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Stethoscope size={16} className="text-blue-600" />
                        </div>
                        <h3 className="font-bold text-gray-900">{t('recommendation')}</h3>
                    </div>
                    <span className="inline-flex text-[11px] font-bold uppercase text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full tracking-wide">
                        {result.recommendationType || 'self-care'}
                    </span>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        {result.explanation}
                    </p>
                    <div className="bg-blue-50 rounded-xl p-3.5 text-sm text-blue-800 font-medium leading-relaxed border border-blue-100">
                        {result.recommendation}
                    </div>
                </div>

                {/* Possible Diseases */}
                {result.possibleDiseases?.length > 0 && (
                    <div className="bg-white p-4 rounded-2xl shadow-card border border-gray-100">
                        <h3 className="font-bold text-sm text-gray-900 mb-3">{t('diseases')}</h3>
                        <div className="flex flex-wrap gap-2">
                            {result.possibleDiseases.map((disease, idx) => (
                                <span key={idx} className="bg-gray-50 text-gray-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-100">
                                    {disease}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Contagious Alert */}
                {result.isContagious && (
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex gap-3">
                        <div className="shrink-0 w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
                            <AlertTriangle size={16} className="text-orange-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-orange-800 text-sm mb-1">Contagious Disease Warning</h3>
                            <p className="text-xs text-orange-700 leading-relaxed">{result.familyPrecautions || "Please isolate and wear a mask to protect your family members."}</p>
                        </div>
                    </div>
                )}

                {/* Hospital List */}
                <HospitalList hospitals={result.nearbyHospitals} />

            </div>
        </div>
    );
};

export default Results;
