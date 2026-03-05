import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Volume2, Send, MapPin, ArrowRight, Bot, User as UserIcon } from 'lucide-react';
import api from '../api';

const SymptomInput = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const selectedLanguage = useMemo(() => {
        const lang = String(user?.language || '').toLowerCase();
        if (lang === 'te' || lang.startsWith('te-') || lang.includes('telugu')) return 'te';
        return 'en';
    }, [user?.language]);

    const welcomeMessage = useMemo(
        () => (selectedLanguage === 'te'
            ? 'నమస్కారం. మీకు ఉన్న లక్షణాలను ఒక్కొక్కటి చాట్‌లో పంపండి. నేను అర్థం చేసుకుని రిస్క్ విశ్లేషణ చేస్తాను.'
            : 'Hi. Please share your symptoms in chat messages one by one. I will summarize and analyze your risk.'),
        [selectedLanguage]
    );

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [location, setLocation] = useState(null);
    const [latestResult, setLatestResult] = useState(null);
    const [analyzedSymptoms, setAnalyzedSymptoms] = useState('');
    const [pendingRecoveryCheck, setPendingRecoveryCheck] = useState(false);
    const [latestHistoryRecordKey, setLatestHistoryRecordKey] = useState('');
    const recognitionRef = useRef(null);
    const messagesRef = useRef(messages);
    const listeningRef = useRef(false);
    const voiceLangRef = useRef(selectedLanguage === 'te' ? 'te-IN' : 'en-US');
    const networkRetryRef = useRef(false);
    const recoveryMemoryKey = `triage-recovery-status-${user?._id || user?.email || 'guest'}`;

    const buildHistoryRecordKey = (record) => {
        if (!record) return '';
        if (record._id) return String(record._id);
        return `${record.createdAt || ''}-${record.symptoms || ''}-${record.level || ''}`;
    };

    const getRecoveryMemory = () => {
        try {
            const stored = localStorage.getItem(recoveryMemoryKey);
            if (!stored) return {};
            const parsed = JSON.parse(stored);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    };

    const saveRecoveryMemory = (recordKey, status) => {
        if (!recordKey || !['yes', 'no'].includes(status)) return;
        const existing = getRecoveryMemory();
        localStorage.setItem(recoveryMemoryKey, JSON.stringify({
            ...existing,
            [recordKey]: {
                status,
                updatedAt: new Date().toISOString()
            }
        }));
    };

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        const initializeChatWithHistory = async () => {
            const baseMessage = [{ role: 'assistant', text: welcomeMessage }];

            try {
                const response = await api.get('/triage/history?limit=1');
                const latestRecord = response.data?.records?.[0];

                if (!latestRecord) {
                    setMessages(baseMessage);
                    setPendingRecoveryCheck(false);
                    setLatestHistoryRecordKey('');
                    return;
                }

                const recordKey = buildHistoryRecordKey(latestRecord);
                setLatestHistoryRecordKey(recordKey);

                const recoveryMemory = getRecoveryMemory();
                if (recordKey && ['yes', 'no'].includes(recoveryMemory?.[recordKey]?.status)) {
                    setMessages(baseMessage);
                    setPendingRecoveryCheck(false);
                    return;
                }

                const lastSymptoms = latestRecord.symptoms || (selectedLanguage === 'te' ? 'మునుపటి లక్షణాలు' : 'previous symptoms');
                const lastLevel = latestRecord.level || (selectedLanguage === 'te' ? 'అజ్ఞాత' : 'Unknown');

                const followupQuestion = selectedLanguage === 'te'
                    ? `మునుపటి కేసులో మీకు "${lastSymptoms}" లక్షణాలు ఉన్నాయి (రిస్క్: ${lastLevel}). అది ఇప్పుడు పూర్తిగా నయం అయిందా? (అవును / కాదు)`
                    : `In your previous case, symptoms were "${lastSymptoms}" (Risk: ${lastLevel}). Is that cured now? (yes / no)`;

                setMessages([...baseMessage, { role: 'assistant', text: followupQuestion }]);
                setPendingRecoveryCheck(true);
            } catch {
                setMessages(baseMessage);
                setPendingRecoveryCheck(false);
                setLatestHistoryRecordKey('');
            }
        };

        initializeChatWithHistory();
    }, [welcomeMessage, selectedLanguage]);

    useEffect(() => {
        listeningRef.current = isListening;
    }, [isListening]);

    useEffect(() => {
        voiceLangRef.current = selectedLanguage === 'te' ? 'te-IN' : 'en-US';
        networkRetryRef.current = false;
    }, [selectedLanguage]);

    const getVoiceErrorMessage = (errorCode) => {
        const isTelugu = selectedLanguage === 'te';
        if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
            return isTelugu ? 'మైక్ అనుమతిని అనుమతించండి' : 'Please allow microphone permission';
        }
        if (errorCode === 'audio-capture') {
            return isTelugu ? 'మైక్రోఫోన్ కనుగొనబడలేదు' : 'No microphone device found';
        }
        if (errorCode === 'no-speech') {
            return isTelugu ? 'స్వరము గుర్తించలేదు. మళ్లీ ప్రయత్నించండి.' : 'No speech detected. Please try again.';
        }
        if (errorCode === 'network') {
            return isTelugu ? 'వాయిస్ సేవకు నెట్‌వర్క్ లోపం వచ్చింది. ఇంటర్నెట్ చెక్ చేసి మళ్లీ ప్రయత్నించండి.' : 'Voice service network error. Check internet and try again.';
        }
        return isTelugu ? 'వాయిస్ ఇన్‌పుట్ విఫలమైంది. మళ్లీ ప్రయత్నించండి.' : 'Voice input failed. Please try again.';
    };

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = voiceLangRef.current;

        recognition.onresult = (event) => {
            const transcript = event.results?.[0]?.[0]?.transcript?.trim();
            if (!transcript) return;
            handleUserMessage(transcript);
        };

        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => {
            if (event?.error === 'aborted' && !listeningRef.current) {
                return;
            }

            if (event?.error === 'network' && !networkRetryRef.current) {
                networkRetryRef.current = true;
                voiceLangRef.current = 'en-US';
                recognition.lang = 'en-US';
                setError(selectedLanguage === 'te'
                    ? 'నెట్‌వర్క్ సమస్య ఉంది. ఇంగ్లీష్ వాయిస్‌తో మళ్లీ ప్రయత్నిస్తున్నాం...'
                    : 'Network issue detected. Retrying voice with English...');
                setTimeout(() => {
                    try {
                        recognition.start();
                        setIsListening(true);
                    } catch {
                        setIsListening(false);
                    }
                }, 250);
                return;
            }

            setIsListening(false);
            setError(getVoiceErrorMessage(event?.error));
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.stop();
            recognitionRef.current = null;
        };
    }, [selectedLanguage]);

    const pickSpeechVoice = (langCode) => {
        const voices = window.speechSynthesis.getVoices?.() || [];
        if (!voices.length) return null;

        if (langCode === 'te') {
            return (
                voices.find((voice) => /^te(-|$)/i.test(voice.lang)) ||
                voices.find((voice) => /telugu/i.test(`${voice.name} ${voice.lang}`)) ||
                null
            );
        }

        return voices.find((voice) => /^en(-|$)/i.test(voice.lang)) || null;
    };

    const speakText = (text) => {
        if (!('speechSynthesis' in window) || !text) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = selectedLanguage === 'te' ? 'te-IN' : 'en-IN';

        const selectedVoice = pickSpeechVoice(selectedLanguage);
        if (selectedLanguage === 'te' && !selectedVoice) {
            setError('Telugu voice is not installed on this device/browser. Please install a Telugu TTS voice.');
            return;
        }
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        window.speechSynthesis.speak(utterance);
    };

    const buildSymptomText = (messageList) => messageList
        .filter((message) => message.role === 'user')
        .map((message) => message.text)
        .join('. ');

    const analyzeAndRespond = async (nextMessages) => {
        const symptomText = buildSymptomText(nextMessages);
        if (!symptomText.trim()) return;

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/triage/analyze', {
                symptomText,
                language: selectedLanguage,
                location
            });

            setLatestResult(response.data);
            setAnalyzedSymptoms(symptomText);

            setMessages((prev) => ([
                ...prev,
                {
                    role: 'assistant',
                    text: selectedLanguage === 'te'
                        ? `మీ రిస్క్ స్థాయి ${response.data.level}. ${response.data.recommendation}`
                        : `Your risk level is ${response.data.level}. ${response.data.recommendation}`
                }
            ]));
        } catch (err) {
            setError(err.response?.data?.message || 'Error connecting to Gemini AI');
        } finally {
            setLoading(false);
        }
    };

    const classifyRecoveryAnswer = (value) => {
        const text = String(value || '').trim().toLowerCase();
        if (!text) return 'unknown';

        const yesMatches = ['yes', 'y', 'cured', 'resolved', 'fine', 'ok', 'okay', 'అవును', 'బాగుంది', 'నయమైంది'];
        const noMatches = ['no', 'n', 'not', 'not cured', 'still', 'continue', 'లేదు', 'కాదు', 'ఇంకా ఉంది'];

        if (yesMatches.some((item) => text.includes(item))) return 'yes';
        if (noMatches.some((item) => text.includes(item))) return 'no';
        return 'unknown';
    };

    const handleUserMessage = async (text) => {
        const cleanText = text.trim();
        if (!cleanText) return;

        if (pendingRecoveryCheck) {
            const nextMessages = [...messagesRef.current, { role: 'user', text: cleanText }];
            setMessages(nextMessages);
            setError('');

            const answerType = classifyRecoveryAnswer(cleanText);
            if (['yes', 'no'].includes(answerType) && latestHistoryRecordKey) {
                saveRecoveryMemory(latestHistoryRecordKey, answerType);

                // Send recovery status to backend
                if (answerType === 'yes') {
                    try {
                        await api.post('/recovery/cure-update', {
                            message: cleanText,
                            reportId: latestHistoryRecordKey,
                            language: selectedLanguage
                        });
                    } catch (err) {
                        console.error('Error updating recovery status:', err);
                    }
                }
            }

            const assistantReply = answerType === 'yes'
                ? (selectedLanguage === 'te'
                    ? 'బాగుంది. ఇప్పుడు కొత్త కేసు కోసం మీ ప్రస్తుత లక్షణాలు చెప్పండి.'
                    : 'Great. Now please share your current symptoms for the new case.')
                : answerType === 'no'
                    ? (selectedLanguage === 'te'
                        ? 'సరే. పాత సమస్య పూర్తిగా తగ్గలేదు. ఇప్పుడు మీ తాజా/కొనసాగుతున్న లక్షణాలు చెప్పండి, కొత్త కేసుగా విశ్లేషిస్తాను.'
                        : 'Understood. Previous condition is not fully cured. Please share your current/continuing symptoms; I will analyze this as a new case.')
                    : (selectedLanguage === 'te'
                        ? 'సరే. ఇప్పుడు మీ ప్రస్తుత లక్షణాలు చెప్పండి; కొత్త కేసుగా విశ్లేషిస్తాను.'
                        : 'Okay. Please share your current symptoms now; I will proceed with a new case analysis.');

            setMessages((prev) => [...prev, { role: 'assistant', text: assistantReply }]);
            setPendingRecoveryCheck(false);
            return;
        }

        const nextMessages = [...messagesRef.current, { role: 'user', text: cleanText }];
        setMessages(nextMessages);
        setError('');

        await analyzeAndRespond(nextMessages);
    };

    const handleSendMessage = async () => {
        if (!inputText.trim()) {
            setError(selectedLanguage === 'te' ? 'దయచేసి లక్షణాలను నమోదు చేయండి' : 'Please enter symptoms');
            return;
        }

        const textToSend = inputText;
        setInputText('');
        await handleUserMessage(textToSend);
    };

    const toggleVoiceInput = () => {
        if (!recognitionRef.current) {
            setError(selectedLanguage === 'te' ? 'ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ అందుబాటులో లేదు' : 'Voice input is not available in this browser');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            return;
        }

        try {
            setError('');
            networkRetryRef.current = false;
            recognitionRef.current.lang = voiceLangRef.current;
            recognitionRef.current.start();
            setIsListening(true);
        } catch {
            setIsListening(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100dvh-3.5rem)] bg-gradient-to-b from-gray-50 to-white relative animate-fade-in">
            {/* Top bar */}
            <div className="shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between gap-2">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">{t('symptoms')} Chatbot</h2>
                    <p className="text-xs text-gray-500">
                        {user.language === 'te'
                            ? 'వాయిస్ లేదా టైపింగ్ ద్వారా లక్షణాలు పంపండి'
                            : 'Send symptoms via voice or typing'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${location
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                        }`}
                        onClick={() => {
                            if (!navigator.geolocation) {
                                setError('Geolocation is not supported in this browser.');
                                return;
                            }
                            navigator.geolocation.getCurrentPosition(
                                (position) => {
                                    setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                                    setError('');
                                },
                                () => {
                                    setError(user.language === 'te' ? 'లొకేషన్ అనుమతి ఇవ్వండి' : 'Please allow location permission');
                                }
                            );
                        }}
                    >
                        <MapPin size={14} />
                        {location
                            ? (user.language === 'te' ? 'ఆన్' : 'On')
                            : (user.language === 'te' ? 'లొకేషన్' : 'Location')}
                    </button>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="mx-4 mt-2 bg-red-50 text-red-700 px-4 py-2.5 rounded-xl text-sm font-medium border border-red-100 animate-fade-in">
                    {error}
                </div>
            )}

            {/* View results banner */}
            {latestResult && (
                <div className="mx-4 mt-2">
                    <button
                        type="button"
                        onClick={() => navigate('/results', { state: { result: latestResult, symptomText: analyzedSymptoms } })}
                        className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-primary-50 to-emerald-50 border border-primary-200 hover:shadow-md transition-all active:scale-[0.98]"
                    >
                        <span className="text-sm font-semibold text-primary-800">
                            {user.language === 'te' ? 'వివరమైన ఫలితాలు చూడండి' : 'View detailed results'}
                        </span>
                        <ArrowRight size={16} className="text-primary-600" />
                    </button>
                </div>
            )}

            {/* Chat messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth">
                {messages.map((message, index) => (
                    <div
                        key={`${message.role}-${index}`}
                        className={`flex items-end gap-2 animate-slide-up ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {message.role === 'assistant' && (
                            <div className="shrink-0 w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                                <Bot size={14} className="text-primary-700" />
                            </div>
                        )}
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${message.role === 'user'
                                ? 'bg-primary-600 text-white rounded-br-md'
                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                            }`}
                        >
                            <span>{message.text}</span>
                            {message.role === 'assistant' && (
                                <button
                                    type="button"
                                    onClick={() => speakText(message.text)}
                                    className="inline-flex ml-2 align-middle text-primary-400 hover:text-primary-600 transition-colors"
                                    title={user.language === 'te' ? 'వినండి' : 'Listen'}
                                >
                                    <Volume2 size={14} />
                                </button>
                            )}
                        </div>
                        {message.role === 'user' && (
                            <div className="shrink-0 w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center">
                                <UserIcon size={14} className="text-white" />
                            </div>
                        )}
                    </div>
                ))}
                {loading && (
                    <div className="flex items-end gap-2 justify-start animate-slide-up">
                        <div className="shrink-0 w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                            <Bot size={14} className="text-primary-700" />
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input bar */}
            <div className="shrink-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-3 pt-2.5 pb-[max(env(safe-area-inset-bottom),0.75rem)] mb-16 lg:mb-0">
                <div className="flex items-center gap-2 max-w-2xl mx-auto">
                    <button
                        type="button"
                        onClick={toggleVoiceInput}
                        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isListening
                            ? 'bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse-soft'
                            : 'bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-700 active:scale-95'
                        }`}
                        title={user.language === 'te' ? 'వాయిస్ ఇన్‌పుట్' : 'Voice input'}
                    >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                    <div className="flex-1 relative">
                        <input
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder={user.language === 'te' ? 'లక్షణాన్ని టైప్ చేయండి...' : 'Type a symptom...'}
                            className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-12 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all"
                        />
                        <button
                            type="button"
                            onClick={handleSendMessage}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 active:scale-90 transition-all disabled:opacity-50"
                            disabled={!inputText.trim()}
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SymptomInput;
