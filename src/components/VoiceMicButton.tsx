import { Mic, MicOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { VoiceState } from "@/hooks/use-voice";
import { cn } from "@/lib/utils";

type Props = {
  voiceState: VoiceState;
  isSupported: boolean;
  errorMessage: string;
  disabled?: boolean;
  onPress: () => void;
  onClearError: () => void;
};

export function VoiceMicButton({
  voiceState,
  isSupported,
  errorMessage,
  disabled,
  onPress,
  onClearError,
}: Props) {
  if (!isSupported) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="flex-shrink-0 h-10 w-10 rounded-full opacity-50 cursor-not-allowed"
            disabled
          >
            <MicOff className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-[200px]">
            Voice input not supported in this browser. Use Chrome, Edge, or Safari.
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const isError = voiceState === "error";
  const isListening = voiceState === "listening";
  const isProcessing = voiceState === "processing";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isListening ? "destructive" : isError ? "outline" : "outline"}
          size="icon"
          className={cn(
            "flex-shrink-0 h-10 w-10 rounded-full relative",
            isListening && "ring-2 ring-destructive/50 ring-offset-2 ring-offset-background",
            isError && "border-destructive text-destructive"
          )}
          onClick={isError ? onClearError : onPress}
          disabled={disabled || isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isError ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Mic className={cn("w-5 h-5", isListening && "animate-pulse")} />
          )}
          {isListening && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs max-w-[200px]">
          {isError
            ? errorMessage || "Error occurred. Tap to retry."
            : isListening
            ? "Listening... speak now"
            : isProcessing
            ? "Processing speech..."
            : "Tap to speak"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
