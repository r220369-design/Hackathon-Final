import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import api from '../api';

const Login = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [loginMode, setLoginMode] = useState('password');
    const isTelugu = String(i18n.language || '').toLowerCase().startsWith('te');
    const tx = (en, te) => (isTelugu ? te : en);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const [smsData, setSmsData] = useState({
        phone: '',
        otp: ''
    });
    const [otpSent, setOtpSent] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSmsChange = (e) => {
        setSmsData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', formData);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data));
            navigate(response.data.role === 'officer' ? '/officer' : '/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/auth/login/sms/request', { phone: smsData.phone });
            setOtpSent(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login/sms/verify', {
                phone: smsData.phone,
                otp: smsData.otp
            });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data));
            navigate(response.data.role === 'officer' ? '/officer' : '/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'OTP verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-primary-50 via-white to-white">
            {/* Hero banner */}
            <div className="relative overflow-hidden px-6 pt-12 pb-8 text-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-100/60 to-transparent" />
                <div className="relative">
                    <div className="w-16 h-16 mx-auto rounded-2xl border border-primary-100 overflow-hidden bg-white shadow-card flex items-center justify-center mb-4">
                        <img src="/ayushseva-icon.svg" alt="Ayushseva AI" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{t('welcome')}</h1>
                    <p className="text-gray-500 text-sm mt-1.5">{t('tagline')}</p>
                </div>
            </div>

            {/* Form area */}
            <div className="flex-1 px-5 pb-8 max-w-md mx-auto w-full">
                <h2 className="text-lg font-bold mb-5 text-center text-gray-800">{t('login')}</h2>

                {/* Login mode toggle */}
                <div className="grid grid-cols-2 gap-1.5 mb-5 bg-gray-100 p-1 rounded-xl">
                    <button
                        type="button"
                        onClick={() => { setLoginMode('password'); setError(''); }}
                        className={`py-2.5 rounded-lg text-xs font-bold transition-all ${loginMode === 'password' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tx('Email Login', 'ఇమెయిల్ లాగిన్')}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setLoginMode('sms'); setError(''); }}
                        className={`py-2.5 rounded-lg text-xs font-bold transition-all ${loginMode === 'sms' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tx('SMS Login', 'ఎస్‌ఎంఎస్ లాగిన్')}
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl mb-4 text-sm font-medium animate-fade-in">
                        {error}
                    </div>
                )}

                {loginMode === 'password' ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('email')}</label>
                            <input type="email" name="email" required value={formData.email} onChange={handleChange}
                                className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-primary-400 focus:bg-white transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('password')}</label>
                            <input type="password" name="password" required value={formData.password} onChange={handleChange}
                                className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-primary-400 focus:bg-white transition-all" />
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full bg-primary-600 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-primary-200/50 hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-60 mt-2">
                            {loading ? '...' : t('login')}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={otpSent ? handleVerifyOtp : handleRequestOtp} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('phone')}</label>
                            <input type="tel" name="phone" required value={smsData.phone} onChange={handleSmsChange}
                                className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-primary-400 focus:bg-white transition-all" placeholder="e.g. 9876543210" />
                        </div>
                        {otpSent && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{tx('OTP', 'ఓటీపీ')}</label>
                                <input type="text" name="otp" required value={smsData.otp} onChange={handleSmsChange}
                                    className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-center tracking-[.3em] font-bold placeholder:text-gray-400 placeholder:tracking-normal placeholder:font-normal focus:border-primary-400 focus:bg-white transition-all"
                                    placeholder={tx('Enter 6-digit OTP', '6 అంకెల ఓటీపీ')} maxLength={6} />
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-2 mt-2">
                            <button type="submit" disabled={loading}
                                className="w-full bg-primary-600 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-primary-200/50 hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-60">
                                {loading ? '...' : otpSent ? tx('Verify OTP & Login', 'ఓటీపీ ధృవీకరించి లాగిన్') : tx('Send OTP', 'ఓటీపీ పంపండి')}
                            </button>
                            {otpSent && (
                                <button type="button" onClick={handleRequestOtp} disabled={loading}
                                    className="w-full border border-primary-200 text-primary-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-50 transition-all">
                                    {tx('Resend OTP', 'మళ్లీ ఓటీపీ పంపండి')}
                                </button>
                            )}
                        </div>
                    </form>
                )}

                <p className="text-center text-sm text-gray-500 mt-6">
                    {tx("Don't have an account?", 'ఖాతా లేదా?')}{' '}
                    <Link to="/register" className="text-primary-600 font-bold hover:underline">{tx('Register here', 'ఇక్కడ నమోదు చేయండి')}</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
