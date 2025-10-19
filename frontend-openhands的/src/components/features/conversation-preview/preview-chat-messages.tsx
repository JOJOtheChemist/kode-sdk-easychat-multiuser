import React from "react";

import type { PreviewMessage } from "./types";

type PreviewChatMessagesProps = {
  messages: PreviewMessage[];
  isBotThinking: boolean;
};

export function PreviewChatMessages({
  messages,
  isBotThinking,
}: PreviewChatMessagesProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const node = scrollRef.current;

    if (!node) {
      return;
    }

    node.scrollTo({
      top: node.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isBotThinking]);

  return (
    <div className="flex-1 overflow-hidden rounded-lg border border-base-300 bg-base">
      <div
        ref={scrollRef}
        className="custom-scrollbar-always h-full space-y-4 overflow-y-auto px-4 py-6"
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isBotThinking && <ThinkingBubble />}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: PreviewMessage }) {
  const isUser = message.author === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-primary text-primary-content"
            : "bg-base-200 text-base-content",
        ].join(" ")}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <span className="mt-2 block text-xs opacity-60">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-2xl bg-base-200 px-4 py-3 text-sm text-base-content/80 shadow-sm">
        <span className="inline-flex h-2 w-2 animate-bounce rounded-full bg-base-content/60" />
        <span className="inline-flex h-2 w-2 animate-bounce rounded-full bg-base-content/60 [animation-delay:120ms]" />
        <span className="inline-flex h-2 w-2 animate-bounce rounded-full bg-base-content/60 [animation-delay:240ms]" />
        <span>助手正在思考…</span>
      </div>
    </div>
  );
}

