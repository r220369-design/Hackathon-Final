import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../api';
import { officerDummyAlerts } from '../data/officerDummyData';

const OfficerStatsDetails = () => {
    const navigate = useNavigate();
    const { statType } = useParams();

    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const response = await api.get('/officer/dashboard');
                setDashboard(response.data || null);
                setError('');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load stat details');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const pageTitle = useMemo(() => {
        if (statType === 'users') return 'Registered Users Details';
        if (statType === 'reports') return 'Reports Details';
        if (statType === 'alerts') return 'Alerts Details';
        if (statType === 'high-risk') return 'High/Critical Cases Details';
        return 'Stat Details';
    }, [statType]);

    const detailItems = useMemo(() => {
        if (!dashboard) return [];

        if (statType === 'users') {
            return (dashboard.users || []).map((item) => ({
                id: item._id,
                title: item.name || item.email || 'Unknown User',
                subtitle: `${item.email || '-'} | Age: ${item.age ?? '-'} | ${item.phone || '-'}`,
                meta: `Village: ${item.villageCode || 'N/A'}`
            }));
        }

        if (statType === 'reports') {
            return (dashboard.reports || []).map((item) => ({
                id: item._id,
                title: item.userId?.name || item.userId?.email || 'Patient',
                subtitle: `Risk: ${item.level || 'Unknown'} (${item.score ?? '-'}/100)`,
                meta: item.symptoms || '-'
            }));
        }

        if (statType === 'alerts') {
            return officerDummyAlerts.map((item) => ({
                id: item.id,
                title: item.type || 'Alert',
                subtitle: `Status: ${item.status || 'pending'}`,
                meta: `${item.message || '-'} (Village: ${item.villageCode || 'N/A'})`
            }));
        }

        if (statType === 'high-risk') {
            return (dashboard.reports || [])
                .filter((item) => ['high', 'critical'].includes(String(item.level || '').toLowerCase()))
                .map((item) => ({
                    id: item._id,
                    title: item.userId?.name || item.userId?.email || 'Patient',
                    subtitle: `Risk: ${item.level || 'Unknown'} (${item.score ?? '-'}/100)`,
                    meta: item.recommendation || item.symptoms || '-'
                }));
        }

        return [];
    }, [dashboard, statType]);

    if (loading) {
        return <div className="p-6 text-sm text-gray-600">Loading details...</div>;
    }

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <button
                type="button"
                onClick={() => navigate('/officer')}
                className="inline-flex items-center gap-2 text-sm text-primary-700 font-semibold mb-4"
            >
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            {error && <div className="bg-red-100 text-red-700 p-3 rounded text-sm mb-4">{error}</div>}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 mb-4">{pageTitle}</h2>

                {detailItems.length === 0 ? (
                    <p className="text-sm text-gray-600">No records found.</p>
                ) : (
                    <div className="space-y-3">
                        {detailItems.map((item) => (
                            <div key={item.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                                <p className="text-xs text-gray-600 mt-1">{item.subtitle}</p>
                                <p className="text-xs text-gray-500 mt-1">{item.meta}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OfficerStatsDetails;
