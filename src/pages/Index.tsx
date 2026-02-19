import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage } from "@/components/ChatMessage";
import { VoiceMicButton } from "@/components/VoiceMicButton";
import { streamChat } from "@/lib/chat-stream";
import { useVoice } from "@/hooks/use-voice";
import { Send, Loader2, Trash2, Volume2, VolumeX } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Msg = { role: "user" | "assistant"; content: string };
type Language = "en" | "hi" | "te";

const LANG_LABELS: Record<Language, string> = {
  en: "English",
  hi: "हिन्दी",
  te: "తెలుగు",
};

const PLACEHOLDERS: Record<Language, string> = {
  en: "Ask anything about farming, crops, schemes...",
  hi: "खेती, फसल, योजनाओं के बारे में कुछ भी पूछें...",
  te: "వ్యవసాయం, పంటలు, పథకాల గురించి ఏదైనా అడగండి...",
};

const WELCOME: Record<Language, string> = {
  en: "🙏 Namaste! I'm **Kisan Mitra**, your agricultural assistant. Ask me anything about:\n\n🌾 Crops & Farming\n🐛 Pest & Disease Management\n💊 Fertilizers\n🏛️ Government Schemes (PM-KISAN, Fasal Bima, etc.)\n📊 Market Prices & Selling\n🐄 Dairy, Poultry & Allied Activities\n\nYou can also use the 🎙️ mic button to speak!",
  hi: "🙏 नमस्ते! मैं **किसान मित्र** हूँ, आपका कृषि सहायक। मुझसे कुछ भी पूछें:\n\n🌾 फसलें और खेती\n🐛 कीट और रोग प्रबंधन\n💊 उर्वरक\n🏛️ सरकारी योजनाएं (PM-KISAN, फसल बीमा आदि)\n📊 बाजार भाव और बिक्री\n🐄 डेयरी, पोल्ट्री और संबद्ध गतिविधियां\n\nआप 🎙️ माइक बटन से बोलकर भी पूछ सकते हैं!",
  te: "🙏 నమస్తే! నేను **కిసాన్ మిత్ర**, మీ వ్యవసాయ సహాయకుడిని. ఏదైనా అడగండి:\n\n🌾 పంటలు & వ్యవసాయం\n🐛 చీడపీడల నిర్వహణ\n💊 ఎరువులు\n🏛️ ప్రభుత్వ పథకాలు (PM-KISAN, ఫసల్ బీమా మొ.)\n📊 మార్కెట్ ధరలు & అమ్మకం\n🐄 పాడి, కోళ్ల & అనుబంధ కార్యకలాపాలు\n\nమీరు 🎙️ మైక్ బటన్‌తో మాట్లాడి కూడా అడగవచ్చు!",
};

export default function KisanChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const {
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
  } = useVoice(language);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    stopSpeaking();

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    abortRef.current = new AbortController();

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => {
          setIsLoading(false);
          // Auto-speak the full response
          if (autoSpeak && assistantSoFar) {
            speak(assistantSoFar);
          }
        },
        signal: abortRef.current.signal,
      });
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error(e);
        toast.error(e.message || "Failed to get response");
      }
      setIsLoading(false);
    }
  };

  const handleVoice = async () => {
    try {
      const transcript = await startListening();
      if (transcript) {
        send(transcript);
      }
    } catch (e: any) {
      if (e.message !== "Cancelled") {
        toast.error(e.message);
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
    stopSpeaking();
    abortRef.current?.abort();
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌾</span>
            <div>
              <h1 className="text-lg font-bold leading-tight">Kisan Mitra</h1>
              <p className="text-xs opacity-80">AI Agricultural Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Language Selector */}
            <Select
              value={language}
              onValueChange={(v) => setLanguage(v as Language)}
            >
              <SelectTrigger className="w-[100px] h-8 text-xs bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(LANG_LABELS) as [Language, string][]).map(
                  ([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            {/* Mute/Unmute Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8"
              title={isMuted ? "Unmute voice" : "Mute voice"}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2
                  className={`w-4 h-4 ${isSpeaking ? "animate-pulse" : ""}`}
                />
              )}
            </Button>

            {/* Clear Chat */}
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Voice state banner */}
        {voiceState === "error" && errorMessage && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs flex items-center justify-between border-b">
            <span>{errorMessage}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-destructive"
              onClick={clearError}
            >
              Dismiss
            </Button>
          </div>
        )}

        {voiceState === "listening" && (
          <div className="px-4 py-2 bg-primary/10 text-primary text-xs text-center border-b animate-pulse">
            🎙️{" "}
            {language === "hi"
              ? "सुन रहा हूँ... बोलिए"
              : language === "te"
              ? "వింటున్నాను... మాట్లాడండి"
              : "Listening... speak now"}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && (
            <ChatMessage
              role="assistant"
              content={WELCOME[language]}
              onSpeak={() => speak(WELCOME[language])}
            />
          )}
          {messages.map((msg, i) => (
            <ChatMessage
              key={i}
              role={msg.role}
              content={msg.content}
              onSpeak={
                msg.role === "assistant" ? () => speak(msg.content) : undefined
              }
            />
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg">
                🌾
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-3 bg-card">
          <div className="flex gap-2 items-end max-w-3xl mx-auto">
            <VoiceMicButton
              voiceState={voiceState}
              isSupported={isRecognitionSupported()}
              errorMessage={errorMessage}
              disabled={isLoading}
              onPress={handleVoice}
              onClearError={clearError}
            />
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={PLACEHOLDERS[language]}
              className="min-h-[40px] max-h-[120px] resize-none rounded-xl"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            <Button
              size="icon"
              className="flex-shrink-0 h-10 w-10 rounded-full"
              onClick={() => send(input)}
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
