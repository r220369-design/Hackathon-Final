import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Users, BellRing, ShieldAlert, FileText, ChevronRight, Heart, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Landing = () => {
    const { t, i18n } = useTranslation();

    const features = [
        {
            title: t('landing.features.triage.title'),
            description: t('landing.features.triage.description'),
            icon: Activity,
            color: 'bg-emerald-100 text-emerald-600',
        },
        {
            title: t('landing.features.family.title'),
            description: t('landing.features.family.description'),
            icon: Users,
            color: 'bg-blue-100 text-blue-600',
        },
        {
            title: t('landing.features.reminders.title'),
            description: t('landing.features.reminders.description'),
            icon: BellRing,
            color: 'bg-amber-100 text-amber-600',
        },
        {
            title: t('landing.features.officer.title'),
            description: t('landing.features.officer.description'),
            icon: ShieldAlert,
            color: 'bg-purple-100 text-purple-600',
        },
        {
            title: t('landing.features.reports.title'),
            description: t('landing.features.reports.description'),
            icon: FileText,
            color: 'bg-indigo-100 text-indigo-600',
        },
    ];

    const handleLanguageChange = (event) => {
        i18n.changeLanguage(event.target.value);
    };

    return (
        <div className="min-h-[100dvh] bg-white text-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl border border-gray-100 overflow-hidden bg-white flex items-center justify-center shadow-sm">
                            <img src="/ayushseva-icon.svg" alt="Ayushseva AI" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-base font-bold text-primary-800 tracking-tight">Ayushseva AI</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={i18n.language}
                            onChange={handleLanguageChange}
                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 bg-gray-50 focus:ring-2 focus:ring-primary-200"
                            aria-label={t('language')}
                        >
                            <option value="te">తెలుగు</option>
                            <option value="en">English</option>
                        </select>
                        <Link to="/login" className="hidden sm:inline-flex px-4 py-2 rounded-xl border border-primary-200 text-primary-700 text-sm font-semibold hover:bg-primary-50 transition-all">
                            {t('login')}
                        </Link>
                        <Link to="/register" className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-all shadow-sm">
                            {t('register')}
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-emerald-50/50" />
                <div className="absolute top-20 -right-20 w-72 h-72 bg-primary-100/40 rounded-full blur-3xl" />
                <div className="absolute bottom-10 -left-20 w-64 h-64 bg-emerald-100/30 rounded-full blur-3xl" />

                <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-12 sm:pt-16 sm:pb-16 text-center">
                    <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 text-primary-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-5 animate-fade-in">
                        <Sparkles size={12} />
                        {t('landing.badge')}
                    </div>

                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.15] text-gray-900 animate-slide-up">
                        {t('landing.heroLine1')}
                        <br />
                        <span className="bg-gradient-to-r from-primary-700 to-emerald-600 bg-clip-text text-transparent">
                            {t('landing.heroLine2')}
                        </span>
                    </h2>

                    <p className="mt-5 text-base sm:text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
                        {t('landing.heroDescription')}
                    </p>

                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link to="/register" className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-all shadow-lg shadow-primary-200/50 flex items-center justify-center gap-2">
                            {t('landing.registerNow')} <ChevronRight size={16} />
                        </Link>
                        <Link to="/login" className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:border-primary-200 hover:bg-primary-50 transition-all flex items-center justify-center gap-2">
                            {t('login')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
                <div className="text-center mb-8">
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('landing.featuresTitle')}</h3>
                    <div className="mt-2 w-12 h-1 bg-primary-500 rounded-full mx-auto" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {features.map((feature, idx) => {
                        const Icon = feature.icon;
                        return (
                            <article
                                key={feature.title}
                                className="group bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-card-hover hover:border-primary-100 transition-all duration-300 animate-slide-up"
                                style={{ animationDelay: `${idx * 80}ms` }}
                            >
                                <div className={`w-11 h-11 rounded-xl ${feature.color} flex items-center justify-center mb-3.5`}>
                                    <Icon size={20} />
                                </div>
                                <h4 className="text-[15px] font-bold text-gray-900 mb-1.5">{feature.title}</h4>
                                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                            </article>
                        );
                    })}
                </div>
            </section>

            {/* How it works */}
            <section className="bg-gray-50/80 border-y border-gray-100">
                <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
                    <div className="text-center mb-8">
                        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('landing.howItWorksTitle')}</h3>
                        <div className="mt-2 w-12 h-1 bg-primary-500 rounded-full mx-auto" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="relative bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-card-hover transition-all">
                                <div className="w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center mb-3">
                                    {step}
                                </div>
                                <p className="text-primary-700 font-bold text-sm mb-1.5">{t(`landing.steps.step${step}.title`)}</p>
                                <p className="text-sm text-gray-500 leading-relaxed">{t(`landing.steps.step${step}.description`)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
                <div className="relative overflow-hidden bg-gradient-to-br from-primary-800 to-primary-900 text-white rounded-3xl p-8 sm:p-12 text-center">
                    <div className="absolute top-0 right-0 w-60 h-60 bg-primary-700/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <Heart className="mx-auto mb-4 text-primary-200" size={32} />
                        <h3 className="text-2xl sm:text-3xl font-bold">{t('landing.ctaTitle')}</h3>
                        <p className="mt-3 text-primary-100/90 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
                            {t('landing.ctaDescription')}
                        </p>
                        <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
                            <Link to="/register" className="px-6 py-3 rounded-2xl bg-white text-primary-800 font-bold text-sm hover:bg-gray-100 transition-all shadow-lg">
                                {t('landing.registerNow')}
                            </Link>
                            <Link to="/login" className="px-6 py-3 rounded-2xl border border-white/30 text-white font-semibold text-sm hover:bg-white/10 transition-all">
                                {t('login')}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-100 py-6 text-center">
                <p className="text-xs text-gray-400">Ayushseva AI &copy; {new Date().getFullYear()} &mdash; Rural Health, Reimagined</p>
            </footer>
        </div>
    );
};

export default Landing;