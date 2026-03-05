import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, User, Heart, MapPin, Globe, Phone, Mail } from 'lucide-react';
import api from '../api';

const FamilyMemberDetails = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { memberId } = useParams();
    const fallbackMemberFromNav = location.state?.member || null;

    const [member, setMember] = useState(fallbackMemberFromNav);
    const [latestReport, setLatestReport] = useState(null);
    const [loading, setLoading] = useState(!fallbackMemberFromNav);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadDetails = async () => {
            try {
                const response = await api.get('/family/me');
                const familyMembers = response.data?.family?.members || [];
                const matchedMember = familyMembers.find((item) => String(item._id) === String(memberId));

                if (!matchedMember) {
                    setError('Family member not found in your group');
                    return;
                }

                setMember(matchedMember);
                setLatestReport(null);
                setError('');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load member details');
            } finally {
                setLoading(false);
            }
        };

        if (fallbackMemberFromNav) {
            return;
        }

        loadDetails();
    }, [memberId, fallbackMemberFromNav]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-sm text-gray-400 animate-pulse">Loading member details...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24 animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => navigate('/family')}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
                >
                    <ChevronLeft size={18} className="text-gray-700" />
                </button>
                <h2 className="font-bold text-gray-900">Member Details</h2>
            </div>

            <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium border border-red-100">{error}</div>
                )}

                {!error && member && (
                    <>
                        {/* Profile Card */}
                        <div className="bg-white p-5 rounded-2xl shadow-card border border-gray-100 text-center animate-slide-up">
                            <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl font-bold text-primary-700">
                                    {(member.name || member.email || '?')[0].toUpperCase()}
                                </span>
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg">{member.name || '-'}</h3>
                            <p className="text-sm text-gray-400">Age {member.age ?? '-'}</p>
                        </div>

                        {/* Info Grid */}
                        <div className="bg-white rounded-2xl shadow-card border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                            {[
                                { icon: Mail, label: 'Email', value: member.email },
                                { icon: Phone, label: 'Phone', value: member.phone },
                                { icon: MapPin, label: 'Village', value: member.villageCode },
                                { icon: Globe, label: 'Language', value: member.language },
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

                        {/* Health Details */}
                        <div className="bg-white p-4 rounded-2xl shadow-card border border-gray-100">
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-3">
                                <Heart size={15} className="text-red-400" /> Recent Health Details
                            </h3>
                            {latestReport ? (
                                <div className="space-y-2.5 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Risk Level</span>
                                        <span className="font-semibold text-gray-900">{latestReport.level || '-'} ({latestReport.score ?? '-'}/100)</span>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-gray-500 shrink-0">Diseases</span>
                                        <span className="text-gray-700 text-right">{(latestReport.possibleDiseases || []).join(', ') || '-'}</span>
                                    </div>
                                    <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-800 leading-relaxed border border-blue-100">
                                        {latestReport.recommendation || '-'}
                                    </div>
                                    {latestReport.createdAt && (
                                        <p className="text-[11px] text-gray-400">Updated: {new Date(latestReport.createdAt).toLocaleString()}</p>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-xs text-gray-400">No recent health data available</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default FamilyMemberDetails;
