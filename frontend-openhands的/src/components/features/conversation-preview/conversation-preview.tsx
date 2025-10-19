import React from "react";

import { PreviewChatMessages } from "./preview-chat-messages";
import { PreviewComposer } from "./preview-composer";
import { PreviewHeader } from "./preview-header";
import type { PreviewMessage } from "./types";

const createInitialMessages = (): PreviewMessage[] => {
  const now = new Date();
  const first = {
    id: `assistant-${now.getTime()}`,
    author: "assistant" as const,
    content: "欢迎来到新版会话界面预览，这里先展示静态的渲染效果。",
    timestamp: now.toISOString(),
  };
  const second = {
    id: `assistant-${now.getTime() + 1}`,
    author: "assistant" as const,
    content:
      "稍后我们会把真实的数据流（REST + WebSocket）接入到同样的 UI 中。",
    timestamp: new Date(now.getTime() + 1000).toISOString(),
  };

  return [first, second];
};

export function ConversationPreview() {
  const [messages, setMessages] = React.useState<PreviewMessage[]>(
    () => createInitialMessages(),
  );
  const [inputValue, setInputValue] = React.useState<string>("你好");
  const [isBotThinking, setIsBotThinking] = React.useState<boolean>(false);
  const pendingReplyTimeout = React.useRef<number | undefined>(undefined);

  const handleReset = () => {
    if (pendingReplyTimeout.current) {
      window.clearTimeout(pendingReplyTimeout.current);
      pendingReplyTimeout.current = undefined;
    }

    setMessages(createInitialMessages());
    setInputValue("你好");
    setIsBotThinking(false);
  };

  const appendMessage = React.useCallback((message: PreviewMessage) => {
    setMessages((previous) => [...previous, message]);
  }, []);

  const handleSend = React.useCallback(
    (value: string) => {
      const trimmed = value.trim();

      if (!trimmed) {
        return;
      }

      const now = new Date();
      const userMessage: PreviewMessage = {
        id: `user-${now.getTime()}`,
        author: "user",
        content: trimmed,
        timestamp: now.toISOString(),
      };

      appendMessage(userMessage);
      setInputValue("");
      setIsBotThinking(true);

      pendingReplyTimeout.current = window.setTimeout(() => {
        const botReply: PreviewMessage = {
          id: `assistant-${Date.now()}`,
          author: "assistant",
          content: `收到「${trimmed}」。后续接入逻辑后，这里会展示真实响应。`,
          timestamp: new Date().toISOString(),
        };

        appendMessage(botReply);
        setIsBotThinking(false);
        pendingReplyTimeout.current = undefined;
      }, 450);
    },
    [appendMessage],
  );

  React.useEffect(() => {
    return () => {
      if (pendingReplyTimeout.current) {
        window.clearTimeout(pendingReplyTimeout.current);
        pendingReplyTimeout.current = undefined;
      }
    };
  }, []);

  return (
    <div className="flex h-full flex-col bg-base-200 md:bg-transparent">
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <PreviewHeader onReset={handleReset} />

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <PreviewChatMessages
            messages={messages}
            isBotThinking={isBotThinking}
          />

          <PreviewComposer
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSend}
            disabled={isBotThinking}
          />
        </div>
      </div>
    </div>
  );
}
