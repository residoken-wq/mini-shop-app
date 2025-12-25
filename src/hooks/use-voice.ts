"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type VoiceState = {
    isListening: boolean;
    transcript: string;
    error: string | null;
};

export function useVoice() {
    const [state, setState] = useState<VoiceState>({
        isListening: false,
        transcript: "",
        error: null,
    });

    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const r = new SpeechRecognition();
                r.continuous = false; // Single query for input fields
                r.interimResults = true;
                r.lang = "vi-VN"; // Default to Vietnamese

                r.onstart = () => {
                    setState((prev) => ({ ...prev, isListening: true, error: null }));
                };

                r.onresult = (event: any) => {
                    let interimTranscript = "";
                    let finalTranscript = "";

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }

                    setState((prev) => ({
                        ...prev,
                        transcript: finalTranscript || interimTranscript,
                    }));
                };

                r.onerror = (event: any) => {
                    setState((prev) => ({
                        ...prev,
                        isListening: false,
                        error: event.error
                    }));
                };

                r.onend = () => {
                    setState((prev) => ({ ...prev, isListening: false }));
                };

                recognitionRef.current = r;
            } else {
                setState(prev => ({ ...prev, error: "Browser not supported" }));
            }
        }
    }, []);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !state.isListening) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error(e);
            }
        }
    }, [state.isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && state.isListening) {
            recognitionRef.current.stop();
        }
    }, [state.isListening]);

    const resetTranscript = useCallback(() => {
        setState(prev => ({ ...prev, transcript: "" }));
    }, []);

    return {
        isListening: state.isListening,
        transcript: state.transcript,
        error: state.error,
        startListening,
        stopListening,
        resetTranscript,
    };
}
