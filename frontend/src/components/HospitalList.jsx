import React from 'react';
import { MapPin, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const fallbackHospitals = [
    {
        name: "Government General Hospital, Vijayawada",
        address: "Near Bus Stand, Vijayawada",
        phone: "0866-2570006",
        maps: "https://maps.app.goo.gl/vijayawada-ggh"
    },
    {
        name: "Guntur Government Hospital",
        address: "Opposite Railway Station, Guntur",
        phone: "0863-2226500",
        maps: "https://maps.app.goo.gl/guntur-ggh"
    },
    {
        name: "Area Hospital, Mangalagiri",
        address: "Near Mangalagiri Temple, Mangalagiri",
        phone: "0863-2524100",
        maps: "https://maps.app.goo.gl/mangalagiri-ah"
    },
    {
        name: "PHC Tadepalli",
        address: "Tadepalli, Guntur District",
        phone: "0863-2524100",
        maps: ""
    },
    {
        name: "PHC Pedakakani",
        address: "Pedakakani, Guntur District",
        phone: "",
        maps: ""
    },
];

const HospitalList = ({ hospitals, useFallback = true }) => {
    const { t } = useTranslation();
    const list = hospitals?.length ? hospitals : (useFallback ? fallbackHospitals : []);

    return (
        <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
                <MapPin className="text-primary-600" />
                {t('hospitals')} (Andhra Pradesh)
            </h3>
            {list.length === 0 && (
                <p className="text-sm text-gray-500">No nearby hospitals found for current location.</p>
            )}
            <div className="space-y-4">
                {list.map((hospital, index) => (
                    <div key={index} className="border-l-4 border-primary-500 pl-3">
                        <h4 className="font-semibold text-gray-800">{hospital.name}</h4>
                        <div className="text-sm text-gray-600 flex flex-col gap-1 mt-1">
                            <span>{hospital.address}</span>
                            {hospital.distanceKm !== undefined && (
                                <span className="text-xs text-gray-500">~{hospital.distanceKm} km away</span>
                            )}
                            <span className="flex items-center gap-1 text-primary-600">
                                <Phone size={14} /> {hospital.phone || 'Contact not available'}
                            </span>
                        </div>
                        {hospital.maps && (
                            <a
                                href={hospital.maps}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 underline mt-1 inline-block"
                            >
                                View on Map
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HospitalList;
