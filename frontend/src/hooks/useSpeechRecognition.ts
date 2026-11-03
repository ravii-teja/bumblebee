"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      [index: number]: { transcript: string };
      isFinal?: boolean;
    };
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((err: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}

export function useSpeechRecognition(onCommand?: (command: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    const win = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  });

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isPausedRef = useRef(false);
  const isVoiceActiveRef = useRef(false);
  const onCommandRef = useRef(onCommand);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTranscriptRef = useRef("");

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    isVoiceActiveRef.current = isVoiceActive;
  }, [isVoiceActive]);

  const safeStop = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // Ignore
    }
    setIsListening(false);
  }, []);

  const dispatchCommand = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Stop recognition briefly to clear audio buffers for the next turn
    safeStop();
    setTranscript(clean);
    currentTranscriptRef.current = "";

    if (onCommandRef.current) {
      onCommandRef.current(clean);
    }
  }, [safeStop]);

  const safeStart = useCallback(() => {
    if (!recognitionRef.current || isPausedRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // Already running or starting
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) return;

    const recog = new SpeechRecognitionClass();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = "en-US";

    recog.onresult = (event: SpeechRecognitionEventLike) => {
      // Audio Ducking: Ignore sound while assistant is speaking TTS
      if (isPausedRef.current || (typeof window !== "undefined" && window.speechSynthesis?.speaking)) {
        return;
      }

      let segment = "";
      let hasFinal = false;

      // Only inspect results starting from event.resultIndex to prevent past turn accumulation
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        segment += item[0].transcript + " ";
        if (item.isFinal) {
          hasFinal = true;
        }
      }

      const trimmed = segment.trim();
      if (!trimmed) return;

      setTranscript(trimmed);
      currentTranscriptRef.current = trimmed;

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // If recognized as final sentence or after 800ms silence, dispatch conversational turn
      if (hasFinal) {
        dispatchCommand(trimmed);
      } else {
        silenceTimerRef.current = setTimeout(() => {
          if (currentTranscriptRef.current) {
            dispatchCommand(currentTranscriptRef.current);
          }
        }, 800);
      }
    };

    recog.onerror = (err: unknown) => {
      const e = err as { error?: string };
      if (e?.error !== "no-speech" && e?.error !== "aborted") {
        console.warn("Speech recognition notice:", e?.error || err);
      }
    };

    recog.onend = () => {
      setIsListening(false);
      // Continuous hands-free loop: if voice mode is still engaged and not speaking TTS, restart cleanly
      if (isVoiceActiveRef.current && !isPausedRef.current) {
        setTimeout(() => {
          if (isVoiceActiveRef.current && !isPausedRef.current) {
            safeStart();
          }
        }, 200);
      }
    };

    recognitionRef.current = recog;

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      safeStop();
      recognitionRef.current = null;
    };
  }, [dispatchCommand, safeStart, safeStop]);

  // Pause recognition while assistant is speaking TTS (audio ducking)
  const pauseForSpeaking = useCallback(() => {
    isPausedRef.current = true;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    safeStop();
  }, [safeStop]);

  // Resume listening after assistant finishes speaking
  const resumeAfterSpeaking = useCallback(() => {
    isPausedRef.current = false;
    if (isVoiceActiveRef.current) {
      setTimeout(() => {
        if (isVoiceActiveRef.current && !isPausedRef.current) {
          setTranscript("");
          currentTranscriptRef.current = "";
          safeStart();
        }
      }, 300);
    }
  }, [safeStart]);

  const toggleListening = useCallback(() => {
    if (isVoiceActive) {
      // User manually stopped voice mode
      setIsVoiceActive(false);
      isVoiceActiveRef.current = false;
      isPausedRef.current = false;
      setTranscript("");
      currentTranscriptRef.current = "";
      safeStop();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } else {
      // User activated voice mode
      setIsVoiceActive(true);
      isVoiceActiveRef.current = true;
      isPausedRef.current = false;
      setTranscript("");
      currentTranscriptRef.current = "";
      safeStart();
    }
  }, [isVoiceActive, safeStart, safeStop]);

  return {
    isListening,
    isVoiceActive,
    transcript,
    isSupported,
    toggleListening,
    pauseForSpeaking,
    resumeAfterSpeaking
  };
}
