"use client";

import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Mic, MicOff } from "lucide-react";
import { useState, useRef, useEffect, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    placeholder?: string;
    className?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const VoiceInput = forwardRef<HTMLInputElement, VoiceInputProps>(({
    onTranscript,
    placeholder = "Nhập hoặc nói...",
    className,
    value,
    onChange
}, ref) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'vi-VN';

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                onTranscript(transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, [onTranscript]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    return (
        <div className={cn("relative flex items-center", className)}>
            <Input
                ref={ref}
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="pr-10"
            />
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "absolute right-1 hover:bg-transparent",
                    isListening ? "text-red-500 animate-pulse" : "text-muted-foreground"
                )}
                onClick={toggleListening}
            >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
        </div>
    );
});

VoiceInput.displayName = "VoiceInput";
