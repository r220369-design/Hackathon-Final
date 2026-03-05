import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import api from '../api';

const Register = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const isTelugu = String(i18n.language || '').toLowerCase().startsWith('te');
    const tx = (en, te) => (isTelugu ? te : en);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        language: 'te',
        age: '',

        villageCode: '',
        role: 'user',
        officerCode: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const normalizeRole = (value) => (String(value || '').toLowerCase() === 'officer' ? 'officer' : 'user');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const nextValue = name === 'role'
            ? normalizeRole(value)
            : (type === 'checkbox' ? checked : value);

        setFormData(prev => ({
            ...prev,
            [name]: nextValue
        }));

        if (name === 'language') {
            i18n.changeLanguage(value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const safeRole = normalizeRole(formData.role);
            const payload = {
                ...formData,
                role: safeRole,
                villageCode: safeRole === 'officer' ? '' : formData.villageCode,
                officerCode: safeRole === 'officer' ? formData.officerCode : ''
            };

            const response = await api.post('/auth/register', payload);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data));
            navigate(response.data.role === 'officer' ? '/officer' : '/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-primary-50 via-white to-white">
            {/* Hero banner */}
            <div className="relative overflow-hidden px-6 pt-10 pb-6 text-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-100/60 to-transparent" />
                <div className="relative">
                    <div className="w-14 h-14 mx-auto rounded-2xl border border-primary-100 overflow-hidden bg-white shadow-card flex items-center justify-center mb-3">
                        <img src="/ayushseva-icon.svg" alt="Ayushseva AI" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">{t('welcome')}</h1>
                    <p className="text-gray-500 text-xs mt-1">{t('tagline')}</p>
                </div>
            </div>

            {/* Form area */}
            <div className="flex-1 px-5 pb-8 max-w-md mx-auto w-full">
                <h2 className="text-lg font-bold mb-4 text-center text-gray-800">{t('register')}</h2>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl mb-4 text-sm font-medium animate-fade-in">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{tx('Name', 'పేరు')}</label>
                        <input type="text" name="name" required value={formData.name} onChange={handleChange}
                            className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary-400 focus:bg-white transition-all" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('language')}</label>
                            <select name="language" value={formData.language} onChange={handleChange}
                                className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm focus:border-primary-400 focus:bg-white transition-all">
                                <option value="te">తెలుగు</option>
                                <option value="en">English</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{tx('Role', 'పాత్ర')}</label>
                            <select name="role" value={formData.role} onChange={handleChange}
                                className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm focus:border-primary-400 focus:bg-white transition-all">
                                <option value="user">{tx('User', 'వినియోగదారు')}</option>
                                <option value="officer">{tx('Officer', 'అధికారి')}</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('email')}</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange}
                            className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary-400 focus:bg-white transition-all" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('password')}</label>
                        <input type="password" name="password" required value={formData.password} onChange={handleChange}
                            className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary-400 focus:bg-white transition-all" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('phone')}</label>
                        <input type="tel" name="phone" required value={formData.phone} onChange={handleChange}
                            className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary-400 focus:bg-white transition-all" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('age')}</label>
                            <input type="number" name="age" required value={formData.age} onChange={handleChange}
                                className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:border-primary-400 focus:bg-white transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{formData.role === 'officer' ? 'Officer Code' : t('villageCode')}</label>
                            {formData.role === 'officer' ? (
                                <input type="text" name="officerCode" required value={formData.officerCode} onChange={handleChange} placeholder={tx('ASHA-GNT-001', 'ASHA-GNT-001')}
                                    className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary-400 focus:bg-white transition-all" />
                            ) : (
                                <input type="text" name="villageCode" required value={formData.villageCode} onChange={handleChange} placeholder={tx('AP001', 'AP001')}
                                    className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary-400 focus:bg-white transition-all" />
                            )}
                        </div>
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full bg-primary-600 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-primary-200/50 hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-60 mt-2">
                        {loading ? '...' : t('register')}
                    </button>

                    <p className="text-center text-sm text-gray-500 mt-4">
                        {tx('Already have an account?', 'ఇప్పటికే ఖాతా ఉందా?')}{' '}
                        <Link to="/login" className="text-primary-600 font-bold hover:underline">{tx('Login here', 'ఇక్కడ లాగిన్ చేయండి')}</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Register;
