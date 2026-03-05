import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const VoiceOutput = ({ text, language }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const normalizedLanguage = String(language || '').toLowerCase();
    const isTelugu = normalizedLanguage === 'te' || normalizedLanguage.startsWith('te-') || normalizedLanguage.includes('telugu');

    const pickSpeechVoice = () => {
        const voices = window.speechSynthesis.getVoices?.() || [];
        if (!voices.length) return null;

        if (isTelugu) {
            return (
                voices.find((voice) => /^te(-|$)/i.test(voice.lang)) ||
                voices.find((voice) => /telugu/i.test(`${voice.name} ${voice.lang}`)) ||
                null
            );
        }

        return voices.find((voice) => /^en(-|$)/i.test(voice.lang)) || null;
    };

    useEffect(() => {
        // Cancel any ongoing speech when component unmounts
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const toggleVoice = () => {
        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
        } else {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);

                utterance.lang = isTelugu ? 'te-IN' : 'en-IN';
                const selectedVoice = pickSpeechVoice();

                if (isTelugu && !selectedVoice) {
                    alert('Telugu voice is not installed on this device/browser. Please install a Telugu TTS voice.');
                    return;
                }
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }

                // Sometimes te-IN voices are not available on all systems, it will fallback to default
                utterance.onend = () => setIsPlaying(false);
                utterance.onerror = () => setIsPlaying(false);

                window.speechSynthesis.speak(utterance);
                setIsPlaying(true);
            } else {
                alert(isTelugu ? 'మీ బ్రౌజర్ వాయిస్ మద్దతు ఇవ్వడం లేదు' : 'Your browser does not support text-to-speech');
            }
        }
    };

    return (
        <button
            onClick={toggleVoice}
            className={`flex items-center gap-2 p-3 text-sm rounded-lg font-medium transition ${isPlaying ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
        >
            {isPlaying ? (
                <>
                    <VolumeX size={18} /> {isTelugu ? 'ఆపు' : 'Stop Audio'}
                </>
            ) : (
                <>
                    <Volume2 size={18} /> {isTelugu ? 'వినండి' : 'Listen'}
                </>
            )}
        </button>
    );
};

export default VoiceOutput;
