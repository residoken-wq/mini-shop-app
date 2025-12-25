"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useVoice } from "@/hooks/use-voice";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface VoiceInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onTranscript?: (value: string) => void;
}

export function VoiceInput({ className, onTranscript, value, onChange, ...props }: VoiceInputProps) {
    const { isListening, transcript, startListening, stopListening, resetTranscript } = useVoice();

    useEffect(() => {
        if (transcript && onTranscript) {
            onTranscript(transcript);
        }
    }, [transcript, onTranscript]);

    const toggle = () => {
        if (isListening) {
            stopListening();
        } else {
            resetTranscript();
            startListening();
        }
    };

    return (
        <div className="relative flex items-center w-full">
            <Input
                className={cn("pr-10", className)}
                value={value}
                onChange={onChange}
                {...props}
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("absolute right-0 h-full px-3 text-muted-foreground hover:text-primary", isListening && "text-red-500 animate-pulse")}
                onClick={toggle}
            >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
        </div>
    );
}
