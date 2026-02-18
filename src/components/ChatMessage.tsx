import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";

type Props = {
  role: "user" | "assistant";
  content: string;
  onSpeak?: () => void;
};

export function ChatMessage({ role, content, onSpeak }: Props) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3 mb-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg">
          🌾
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
        {!isUser && content && onSpeak && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-7 px-2 text-muted-foreground hover:text-foreground"
            onClick={onSpeak}
          >
            <Volume2 className="w-3.5 h-3.5 mr-1" />
            <span className="text-xs">Listen</span>
          </Button>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground text-lg">
          👨‍🌾
        </div>
      )}
    </div>
  );
}
