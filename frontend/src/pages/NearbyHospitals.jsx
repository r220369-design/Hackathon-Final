import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Navigation } from 'lucide-react';
import api from '../api';
import HospitalList from '../components/HospitalList';

const NearbyHospitals = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isTelugu = String(user.language || '').toLowerCase().startsWith('te');
    const tx = (en, te) => (isTelugu ? te : en);
    const [hospitals, setHospitals] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [locationEnabled, setLocationEnabled] = React.useState(false);
    const [manualCity, setManualCity] = React.useState('');
    const [cityOptions, setCityOptions] = React.useState([]);
    const [source, setSource] = React.useState('');
    const cityDebounceRef = React.useRef(null);

    const fetchHospitals = async (lat, lng) => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get(`/triage/hospitals?lat=${lat}&lng=${lng}&limit=10`);
            setHospitals(response.data?.hospitals || []);
            setSource(response.data?.source || '');
        } catch (err) {
            setError(err.response?.data?.message || tx('Failed to load nearby hospitals', 'సమీప ఆసుపత్రులు లోడ్ చేయడంలో విఫలమైంది'));
            setHospitals([]);
            setSource('');
        } finally {
            setLoading(false);
        }
    };

    const fetchHospitalsByCity = async (city) => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get(`/triage/hospitals?city=${encodeURIComponent(city)}&limit=10`);
            setHospitals(response.data?.hospitals || []);
            setSource(response.data?.source || '');
        } catch (err) {
            setError(err.response?.data?.message || tx('Failed to load nearby hospitals', 'సమీప ఆసుపత్రులు లోడ్ చేయడంలో విఫలమైంది'));
            setHospitals([]);
            setSource('');
        } finally {
            setLoading(false);
        }
    };

    const enableLocationAndLoad = () => {
        if (!navigator.geolocation) {
            setError(tx('Geolocation is not supported in this browser.', 'ఈ బ్రౌజర్‌లో జియోలొకేషన్‌కు మద్దతు లేదు.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setLocationEnabled(true);
                fetchHospitals(lat, lng);
            },
            () => {
                setError(tx('Please allow location permission to fetch nearby hospitals', 'సమీప ఆసుపత్రులు పొందడానికి లొకేషన్ అనుమతి ఇవ్వండి'));
            }
        );
    };

    const applyManualLocation = () => {
        const city = manualCity.trim();
        if (!city) {
            setError(tx('Enter city name', 'నగర పేరు నమోదు చేయండి'));
            return;
        }

        setLocationEnabled(true);
        fetchHospitalsByCity(city);
    };

    const loadCityOptions = (query = '') => {
        if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
        cityDebounceRef.current = setTimeout(async () => {
            try {
                const response = await api.get(`/triage/cities${query ? `?query=${encodeURIComponent(query)}` : ''}`);
                setCityOptions(response.data?.cities || []);
            } catch {
                setCityOptions([]);
            }
        }, query ? 300 : 0);
    };

    React.useEffect(() => {
        enableLocationAndLoad();
        loadCityOptions();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24 animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                        <MapPin size={16} className="text-rose-500" />
                    </div>
                    <h2 className="font-bold text-gray-900">{tx('Hospitals', 'ఆసుపత్రులు')}</h2>
                </div>
                <button
                    onClick={enableLocationAndLoad}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full border border-primary-100 hover:bg-primary-100 active:scale-95 transition-all"
                >
                    <Navigation size={12} /> {tx('Locate me', 'నా లొకేషన్')}
                </button>
            </div>

            <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium border border-red-100">{error}</div>
                )}

                {source && (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${source === 'live' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${source === 'live' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {source === 'live' ? tx('Live data', 'లైవ్ డేటా') : tx('Fallback data', 'ప్రత్యామ్నాయ డేటా')}
                    </div>
                )}

                {/* Search by city */}
                <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                        <Search size={14} className="text-gray-400" />
                        {tx('Search by city', 'నగరం ద్వారా వెతకండి')}
                    </h3>
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                list="ap-cities"
                                value={manualCity}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setManualCity(value);
                                    loadCityOptions(value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        applyManualLocation();
                                    }
                                }}
                                placeholder={tx('Enter city (e.g. Vijayawada)', 'నగరం నమోదు చేయండి')}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                            />
                            <datalist id="ap-cities">
                                {cityOptions.map((city) => (
                                    <option key={city} value={city} />
                                ))}
                            </datalist>
                        </div>
                        <button
                            onClick={applyManualLocation}
                            className="bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all shrink-0"
                        >
                            {tx('Search', 'వెతకండి')}
                        </button>
                    </div>
                </div>

                {!locationEnabled && !error && (
                    <div className="bg-blue-50 border border-blue-100 text-blue-700 p-4 rounded-2xl text-sm font-medium flex items-start gap-2">
                        <MapPin size={16} className="shrink-0 mt-0.5" />
                        {tx('Enable location to get nearest hospitals.', 'సమీప ఆసుపత్రులు పొందడానికి లొకేషన్ ప్రారంభించండి.')}
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center py-12">
                        <div className="w-8 h-8 border-2 border-gray-200 border-t-rose-500 rounded-full animate-spin" />
                        <p className="text-sm text-gray-400 mt-3">{tx('Finding hospitals...', 'ఆసుపత్రులు వెతుకుతున్నాయి...')}</p>
                    </div>
                ) : (
                    <HospitalList hospitals={hospitals} useFallback={false} />
                )}
            </div>
        </div>
    );
};

export default NearbyHospitals;
