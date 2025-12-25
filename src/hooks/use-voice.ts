// src/hooks/use-voice.ts
import { useState, useEffect, useCallback } from 'react';

export const useVoiceInput = () => {
    const [text, setText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            setIsSupported(true);
        }
    }, []);

    const startListening = useCallback(() => {
        if (!isSupported) return;

        // @ts-ignore - Vì TypeScript mặc định chưa có type cho webkitSpeechRecognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'vi-VN'; // Quan trọng: Set tiếng Việt
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setText(transcript);
        };

        recognition.onend = () => setIsListening(false);

        recognition.start();
    }, [isSupported]);

    return { text, isListening, startListening, isSupported, setText };
};