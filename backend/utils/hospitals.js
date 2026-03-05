const hospitals = [
    {
        name: 'Government General Hospital, Vijayawada',
        address: 'Near Bus Stand, Vijayawada',
        phone: '0866-2570006',
        maps: 'https://maps.app.goo.gl/vijayawada-ggh',
        location: { lat: 16.5062, lng: 80.6480 }
    },
    {
        name: 'Guntur Government Hospital',
        address: 'Opposite Railway Station, Guntur',
        phone: '0863-2226500',
        maps: 'https://maps.app.goo.gl/guntur-ggh',
        location: { lat: 16.2991, lng: 80.4575 }
    },
    {
        name: 'Area Hospital, Mangalagiri',
        address: 'Near Mangalagiri Temple, Mangalagiri',
        phone: '0863-2524100',
        maps: 'https://maps.app.goo.gl/mangalagiri-ah',
        location: { lat: 16.4300, lng: 80.5580 }
    },
    {
        name: 'PHC Tadepalli',
        address: 'Tadepalli, Guntur District',
        phone: '0863-2524100',
        maps: '',
        location: { lat: 16.4820, lng: 80.6100 }
    },
    {
        name: 'PHC Pedakakani',
        address: 'Pedakakani, Guntur District',
        phone: '',
        maps: '',
        location: { lat: 16.3650, lng: 80.4900 }
    }
];

const citiesCache = {
    list: null,
    fetchedAt: 0
};

const CITIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const getAndhraPradeshCities = async () => {
    const now = Date.now();
    if (citiesCache.list && now - citiesCache.fetchedAt < CITIES_CACHE_TTL_MS) {
        return citiesCache.list;
    }

    try {
        const response = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ country: 'India', state: 'Andhra Pradesh' })
        });

        if (!response.ok) {
            throw new Error(`City API failed: ${response.status}`);
        }

        const payload = await response.json();
        const list = Array.isArray(payload?.data)
            ? [...new Set(payload.data.map((city) => String(city).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
            : [];

        if (list.length > 0) {
            citiesCache.list = list;
            citiesCache.fetchedAt = now;
            return list;
        }
    } catch (error) {
        console.error('Failed to fetch Andhra Pradesh cities from API:', error.message);
    }

    if (citiesCache.list) return citiesCache.list;

    const fallback = [
        'Vijayawada',
        'Guntur',
        'Mangalagiri',
        'Tadepalli',
        'Pedakakani',
        'Amaravati',
        'Visakhapatnam',
        'Kurnool',
        'Nellore',
        'Rajahmundry',
        'Tirupati',
        'Anantapur'
    ];

    citiesCache.list = fallback;
    citiesCache.fetchedAt = now;
    return fallback;
};

const getCoordinatesForCity = async (city) => {
    const normalized = String(city || '').trim();
    if (!normalized) return null;

    const searchUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(normalized)}&state=${encodeURIComponent('Andhra Pradesh')}&country=${encodeURIComponent('India')}&format=json&limit=1`;

    try {
        const response = await fetch(searchUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'grameen-swastha-ai/1.0'
            }
        });

        if (!response.ok) {
            return null;
        }

        const result = await response.json();
        const first = Array.isArray(result) ? result[0] : null;
        if (!first?.lat || !first?.lon) {
            return null;
        }

        return { lat: Number(first.lat), lng: Number(first.lon) };
    } catch (error) {
        console.error('Failed to geocode city:', error.message);
        return null;
    }
};

const toRad = (value) => (value * Math.PI) / 180;

const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const formatAddressFromTags = (tags = {}) => {
    const parts = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:suburb'],
        tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
        tags['addr:state']
    ].filter(Boolean);

    return parts.length ? parts.join(', ') : 'Address not available';
};

const fetchHospitalsFromOverpass = async (lat, lng, limit) => {
    const radiusMeters = 30000;
    const overpassQuery = `
[out:json][timeout:25];
(
  node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
  way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
  relation["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
  node["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
  way["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
);
out center tags;
`;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain',
            'User-Agent': 'grameen-swastha-ai/1.0'
        },
        body: overpassQuery
    });

    if (!response.ok) {
        throw new Error(`Overpass API failed: ${response.status}`);
    }

    const payload = await response.json();
    const elements = Array.isArray(payload?.elements) ? payload.elements : [];

    const formatted = elements
        .map((element) => {
            const hospitalLat = element.lat ?? element.center?.lat;
            const hospitalLng = element.lon ?? element.center?.lon;
            if (hospitalLat === undefined || hospitalLng === undefined) return null;

            const tags = element.tags || {};
            const phone = tags['contact:phone'] || tags.phone || '';
            const name = tags.name || 'Hospital';
            const maps = `https://www.google.com/maps/search/?api=1&query=${hospitalLat},${hospitalLng}`;
            const distanceKm = Number(haversineKm(Number(lat), Number(lng), Number(hospitalLat), Number(hospitalLng)).toFixed(2));

            return {
                name,
                address: formatAddressFromTags(tags),
                phone,
                maps,
                location: { lat: Number(hospitalLat), lng: Number(hospitalLng) },
                distanceKm
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.distanceKm - b.distanceKm);

    const uniqueByNameAndDistance = [];
    const seen = new Set();
    for (const item of formatted) {
        const key = `${item.name.toLowerCase()}-${item.distanceKm}`;
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueByNameAndDistance.push(item);
        if (uniqueByNameAndDistance.length >= limit) break;
    }

    return uniqueByNameAndDistance;
};

const getNearbyHospitalsWithMeta = async (lat, lng, limit = 5) => {
    if (lat === undefined || lng === undefined) {
        return { hospitals: hospitals.slice(0, limit), source: 'fallback' };
    }

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
        return { hospitals: hospitals.slice(0, limit), source: 'fallback' };
    }

    try {
        const liveHospitals = await fetchHospitalsFromOverpass(parsedLat, parsedLng, limit);
        if (liveHospitals.length > 0) {
            return { hospitals: liveHospitals, source: 'live' };
        }
    } catch (error) {
        console.error('Failed to fetch live hospitals. Falling back to static list:', error.message);
    }

    const fallback = hospitals
        .map((hospital) => ({
            ...hospital,
            distanceKm: Number(haversineKm(parsedLat, parsedLng, hospital.location.lat, hospital.location.lng).toFixed(2))
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, limit);

    return { hospitals: fallback, source: 'fallback' };
};

module.exports = { hospitals, getNearbyHospitalsWithMeta, getCoordinatesForCity, getAndhraPradeshCities };
