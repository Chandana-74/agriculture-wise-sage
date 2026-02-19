import { useCallback, useRef, useState } from "react";

type Language = "en" | "hi" | "te";

export type VoiceState = "idle" | "listening" | "processing" | "error";

const LANG_MAP: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

/** Check if Web Speech API is available */
function getSpeechRecognitionCtor(): (new () => any) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Find the best voice for a given BCP-47 language tag.
 * Falls back to any English voice, then default.
 */
function findVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  // Exact match
  const exact = voices.find((v) => v.lang === lang);
  if (exact) return exact;
  // Prefix match (e.g. "hi" matches "hi-IN")
  const prefix = lang.split("-")[0];
  const partial = voices.find((v) => v.lang.startsWith(prefix));
  if (partial) return partial;
  // Fallback to English
  const en = voices.find((v) => v.lang.startsWith("en"));
  if (en) return en;
  return null;
}

export function useVoice(language: Language) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isMuted, setIsMuted] = useState(false);
  const synthRef = useRef(
    typeof window !== "undefined" ? window.speechSynthesis : null
  );
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  /** Whether the browser supports speech recognition */
  const isRecognitionSupported = useCallback(() => {
    return getSpeechRecognitionCtor() !== null;
  }, []);

  /**
   * Start listening via Web Speech API.
   * Must be called from a user gesture (click handler) for iOS Safari compat.
   */
  const startListening = useCallback(
    (): Promise<string> =>
      new Promise((resolve, reject) => {
        setErrorMessage("");
        const Ctor = getSpeechRecognitionCtor();
        if (!Ctor) {
          const msg =
            "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.";
          setVoiceState("error");
          setErrorMessage(msg);
          reject(new Error(msg));
          return;
        }

        setVoiceState("listening");

        const recognition = new Ctor();
        recognition.lang = LANG_MAP[language];
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        // Timeout safety: if no result in 10s, stop
        const timeout = setTimeout(() => {
          recognition.stop();
          setVoiceState("idle");
          reject(new Error("No speech detected. Please try again."));
        }, 10000);

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          clearTimeout(timeout);
          setVoiceState("processing");
          const transcript = event.results[0]?.[0]?.transcript || "";
          setTimeout(() => setVoiceState("idle"), 300);
          resolve(transcript);
        };

        recognition.onerror = (event: any) => {
          clearTimeout(timeout);
          const errorCode = event.error as string;
          let msg = "Voice input failed.";

          switch (errorCode) {
            case "not-allowed":
              msg =
                "Microphone access denied. Please allow microphone permission in your browser settings and try again.";
              break;
            case "no-speech":
              msg = "No speech detected. Please speak clearly and try again.";
              break;
            case "network":
              msg =
                "Network error during speech recognition. Please check your internet connection.";
              break;
            case "audio-capture":
              msg =
                "No microphone found. Please connect a microphone and try again.";
              break;
            case "aborted":
              setVoiceState("idle");
              reject(new Error("Cancelled"));
              return;
            default:
              msg = `Voice error: ${errorCode}`;
          }

          setVoiceState("error");
          setErrorMessage(msg);
          reject(new Error(msg));
        };

        recognition.onend = () => {
          // Only reset if still in listening state (not if result already processed)
          setVoiceState((prev) =>
            prev === "listening" ? "idle" : prev
          );
        };

        try {
          recognition.start();
        } catch (err: any) {
          clearTimeout(timeout);
          // iOS Safari may throw if not triggered by user gesture
          const msg =
            "Could not start microphone. Please tap the mic button to speak.";
          setVoiceState("error");
          setErrorMessage(msg);
          reject(new Error(msg));
        }
      }),
    [language]
  );

  /** Speak text aloud using SpeechSynthesis. Strips markdown. */
  const speak = useCallback(
    (text: string) => {
      if (isMuted || !isSpeechSynthesisAvailable() || !synthRef.current) return;

      synthRef.current.cancel();

      // Strip markdown for cleaner speech
      const clean = text
        .replace(/[#*_~`>]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\n+/g, ". ")
        .replace(/\s+/g, " ")
        .trim();

      if (!clean) return;

      // Chrome bug: voices may not be loaded yet
      const trySpeak = () => {
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = LANG_MAP[language];
        utterance.rate = 0.9;

        const voice = findVoice(LANG_MAP[language]);
        if (voice) utterance.voice = voice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        currentUtteranceRef.current = utterance;
        synthRef.current?.speak(utterance);
      };

      // Ensure voices are loaded (Chrome loads them async)
      if (speechSynthesis.getVoices().length === 0) {
        speechSynthesis.onvoiceschanged = () => {
          trySpeak();
          speechSynthesis.onvoiceschanged = null;
        };
        // If voices still don't load in 500ms, try anyway
        setTimeout(trySpeak, 500);
      } else {
        trySpeak();
      }
    },
    [language, isMuted]
  );

  /** Stop any ongoing speech */
  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
    currentUtteranceRef.current = null;
  }, []);

  /** Toggle mute on/off. Stops speech if muting. */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (!prev) {
        // Muting — stop current speech
        synthRef.current?.cancel();
        setIsSpeaking(false);
      }
      return !prev;
    });
  }, []);

  /** Reset error state */
  const clearError = useCallback(() => {
    setVoiceState("idle");
    setErrorMessage("");
  }, []);

  return {
    voiceState,
    errorMessage,
    isMuted,
    isSpeaking,
    isRecognitionSupported,
    startListening,
    speak,
    stopSpeaking,
    toggleMute,
    clearError,
  };
}
