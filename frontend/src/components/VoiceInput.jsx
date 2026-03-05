import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

const VoiceInput = ({ language, onResult, isListening, setIsListening }) => {
    const [recognition, setRecognition] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        // Check if browser supports speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Speech recognition is not supported in this browser.');
            return;
        }

        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = language === 'te' ? 'te-IN' : 'en-IN';

        rec.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                }
            }
            if (finalTranscript) {
                onResult(finalTranscript);
            }
        };

        rec.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
            setError('Error recognizing speech. Please try again.');
        };

        rec.onend = () => {
            setIsListening(false);
        };

        setRecognition(rec);
    }, [language, onResult, setIsListening]);

    const toggleListen = () => {
        if (isListening) {
            recognition?.stop();
            setIsListening(false);
        } else {
            setError('');
            try {
                recognition?.start();
                setIsListening(true);
            } catch (e) {
                console.error(e);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <button
                type="button"
                onClick={toggleListen}
                className={`p-4 rounded-full shadow-lg transition-all ${isListening
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white'
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                    }`}
            >
                {isListening ? <MicOff size={32} /> : <Mic size={32} />}
            </button>
            {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
            <p className="text-gray-500 text-xs mt-2">
                {isListening ? (language === 'te' ? 'వింటున్నాము...' : 'Listening...') : (language === 'te' ? 'మాట్లాడటానికి నొక్కండి' : 'Tap to speak')}
            </p>
        </div>
    );
};

export default VoiceInput;
