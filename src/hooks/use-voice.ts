import { useCallback, useRef } from "react";

type Language = "en" | "hi" | "te";

const LANG_MAP: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

export function useVoice(language: Language) {
  const synthRef = useRef(window.speechSynthesis);

  const startListening = useCallback(
    (): Promise<string> =>
      new Promise((resolve, reject) => {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          reject(new Error("Speech recognition not supported in this browser"));
          return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = LANG_MAP[language];
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          resolve(event.results[0][0].transcript);
        };
        recognition.onerror = (event: any) => {
          reject(new Error(event.error));
        };
        recognition.start();
      }),
    [language]
  );

  const speak = useCallback(
    (text: string) => {
      synthRef.current.cancel();
      // Strip markdown for cleaner speech
      const clean = text
        .replace(/[#*_~`>]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\n+/g, ". ");
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = LANG_MAP[language];
      utterance.rate = 0.9;
      synthRef.current.speak(utterance);
    },
    [language]
  );

  const stopSpeaking = useCallback(() => {
    synthRef.current.cancel();
  }, []);

  return { startListening, speak, stopSpeaking };
}
