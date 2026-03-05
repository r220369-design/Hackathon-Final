import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Code, Plus, ChevronRight, LogOut, UserPlus, Crown } from 'lucide-react';
import api from '../api';

const FamilyGroup = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [groupCode, setGroupCode] = useState('');
    const [family, setFamily] = useState(null);
    const [memberPhone, setMemberPhone] = useState('');
    const [memberEmail, setMemberEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadFamily = async () => {
        try {
            setLoading(true);
            const response = await api.get('/family/me');
            setFamily(response.data.family);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load family');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        loadFamily();
    }, []);

    const createGroup = async () => {
        try {
            await api.post('/family/create');
            setError('');
            loadFamily();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create group');
        }
    };

    const joinGroup = async () => {
        try {
            await api.post('/family/join', { groupCode });
            setError('');
            setGroupCode('');
            loadFamily();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to join group');
        }
    };

    const addMember = async () => {
        if (!memberPhone.trim() && !memberEmail.trim()) {
            setError('Enter phone or email to add member');
            return;
        }

        try {
            await api.post('/family/members', {
                phone: memberPhone,
                email: memberEmail
            });
            setError('');
            setMemberPhone('');
            setMemberEmail('');
            loadFamily();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add member');
        }
    };

    const leaveGroup = async () => {
        try {
            await api.post('/family/leave');
            setError('');
            setFamily(null);
            loadFamily();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to leave group');
        }
    };

    const openMemberDetailsPage = (member) => {
        const memberId = member?._id;
        if (!memberId) {
            setError('Member details are unavailable right now. Please refresh and try again.');
            return;
        }

        const targetPath = `/family/member/${memberId}`;
        navigate(targetPath, { state: { member } });
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 text-white px-4 pt-4 pb-5 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                        <Users size={18} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold">{t('familyGroup')}</h2>
                        <p className="text-primary-200 text-[11px]">
                            {family ? `Code: ${family.groupCode}` : 'Create or join a group'}
                        </p>
                    </div>
                </div>
                {family && (
                    <div className="mt-3 flex items-center gap-2 relative z-10">
                        <div className="bg-white/15 backdrop-blur-md rounded-lg px-3 py-1.5 flex-1">
                            <p className="text-[10px] text-primary-200">Members</p>
                            <p className="text-lg font-bold">{family.memberCount || family.members?.length || 0}</p>
                        </div>
                        <div className="bg-white/15 backdrop-blur-md rounded-lg px-3 py-1.5 flex-1">
                            <p className="text-[10px] text-primary-200">Group Code</p>
                            <p className="text-lg font-bold tracking-wider">{family.groupCode}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="px-4 -mt-3 space-y-4 max-w-lg mx-auto">
                {/* Error */}
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium border border-red-100 animate-fade-in">
                        {error}
                    </div>
                )}

                {/* Join / Create Card */}
                {!family ? (
                    <div className="bg-white p-5 rounded-2xl shadow-card border border-gray-100 space-y-4 animate-slide-up">
                        <h3 className="font-bold text-gray-900">Join or Create a Group</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter Group Code"
                                value={groupCode}
                                onChange={(e) => setGroupCode(e.target.value)}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                            />
                            <button
                                onClick={joinGroup}
                                className="bg-primary-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 hover:bg-primary-700 active:scale-95 transition-all"
                            >
                                <Code size={16} /> Join
                            </button>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                            <div className="relative flex justify-center"><span className="px-3 bg-white text-xs text-gray-400 font-medium">or</span></div>
                        </div>
                        <button
                            onClick={createGroup}
                            className="w-full bg-primary-50 text-primary-700 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-primary-100 hover:bg-primary-100 active:scale-[0.98] transition-all"
                        >
                            <Crown size={16} /> Create New Family Group
                        </button>
                    </div>
                ) : (
                    <div className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-2xl text-sm font-medium flex items-start gap-2">
                        <Users size={16} className="shrink-0 mt-0.5" />
                        <span>You are in a family group. Leave to join or create another.</span>
                    </div>
                )}

                {/* Add Member Section */}
                {family && (
                    <div className="bg-white p-4 rounded-2xl shadow-card border border-gray-100 space-y-3 animate-slide-up">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <UserPlus size={16} className="text-primary-600" /> Add Member
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                                type="text"
                                value={memberPhone}
                                onChange={(e) => setMemberPhone(e.target.value)}
                                placeholder="Phone number"
                                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                            />
                            <input
                                type="email"
                                value={memberEmail}
                                onChange={(e) => setMemberEmail(e.target.value)}
                                placeholder="Email address"
                                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                            />
                        </div>
                        <button
                            onClick={addMember}
                            className="w-full bg-primary-600 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-primary-700 active:scale-[0.98] transition-all"
                        >
                            <Plus size={16} /> Add to Group
                        </button>
                    </div>
                )}

                {/* Members List */}
                <div className="space-y-2">
                    <h3 className="font-bold text-gray-900 text-sm px-1">Members</h3>
                    {(family?.members || []).length === 0 && (
                        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 text-center">
                            <Users size={32} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-sm text-gray-400">No members yet</p>
                        </div>
                    )}
                    {(family?.members || []).map((m, i) => (
                        <button
                            type="button"
                            key={i}
                            onClick={() => openMemberDetailsPage(m)}
                            className="w-full bg-white p-4 rounded-2xl shadow-card border border-gray-100 flex items-center gap-3 text-left hover:shadow-card-hover active:scale-[0.98] transition-all"
                        >
                            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                                {(m.name || m.email || '?')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm truncate">{m.name || m.email}</p>
                                <p className="text-xs text-gray-400">Age: {m.age || '-'}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {(m.isPregnant || m.age > 60) && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">Priority</span>
                                )}
                                <ChevronRight size={16} className="text-gray-300" />
                            </div>
                        </button>
                    ))}
                </div>

                {/* Leave Group */}
                {family && (
                    <button
                        onClick={leaveGroup}
                        className="flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100 hover:bg-red-100 active:scale-95 transition-all"
                    >
                        <LogOut size={14} /> Leave Family Group
                    </button>
                )}

                {loading && <p className="text-xs text-gray-400 text-center py-2">Loading family details...</p>}
            </div>
        </div>
    );
};

export default FamilyGroup;
