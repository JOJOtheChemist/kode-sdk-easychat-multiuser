import React from "react";
import { io, type Socket } from "socket.io-client";

type MessageKind = "message" | "tool" | "status" | "error";
type MessageSource = "user" | "agent" | "system";

interface SimpleMessage {
  id: string;
  source: MessageSource;
  kind: MessageKind;
  content: string;
  details?: string;
}

interface ChatPageProps {
  conversationId?: string;
}

function resolveBackendUrl(): string {
  const envBase = import.meta.env.VITE_BACKEND_BASE_URL as string | undefined;
  if (!envBase || envBase.trim().length === 0) {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  if (envBase.startsWith("http://") || envBase.startsWith("https://")) {
    return envBase;
  }
  return `${window.location.protocol}//${envBase}`;
}

export function ChatPage({ conversationId = "demo" }: ChatPageProps) {
  const [messages, setMessages] = React.useState<SimpleMessage[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [connectionStatus, setConnectionStatus] = React.useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [agentReady, setAgentReady] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const socketRef = React.useRef<Socket | null>(null);

  const backendUrl = React.useMemo(() => resolveBackendUrl(), []);

  React.useEffect(() => {
    setConnectionStatus("connecting");
    setAgentReady(false);
    const socket = io(backendUrl, {
      transports: ["websocket"],
      path: "/socket.io",
      query: {
        conversation_id: conversationId,
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus("connected");
    });

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected");
    });

    socket.on("oh_event", (event: Record<string, any>) => {
      setIsSending(false);

      const eventType = event.type as string | undefined;
      const source = (event.source as MessageSource | undefined) ?? "system";

      if (eventType === "message") {
        const text =
          (event.args && typeof event.args.content === "string"
            ? event.args.content
            : "") || (typeof event.message === "string" ? event.message : "");
        if (!text) return;

        setMessages((prev) => {
          const next = [...prev];
          const lastAgentIndex = [...next]
            .reverse()
            .findIndex(
              (msg) => msg.source === source && msg.kind === "message",
            );
          if (lastAgentIndex === -1 || source === "user") {
            next.push({
              id: event.id ?? `${Date.now()}`,
              source,
              kind: "message",
              content: text,
            });
            return next;
          }
          const actualIndex = next.length - 1 - lastAgentIndex;
          next[actualIndex] = {
            ...next[actualIndex],
            content: `${next[actualIndex].content}${text}`,
          };
          return next;
        });
        return;
      }

      if (eventType === "tool_call_start") {
        const name =
          event.extras?.tool_name || event.action || "未知工具";
        const details =
          event.args && Object.keys(event.args).length > 0
            ? JSON.stringify(event.args, null, 2)
            : undefined;
        setMessages((prev) => [
          ...prev,
          {
            id: event.id ?? `${Date.now()}`,
            source: "agent",
            kind: "tool",
            content: `🔄 工具 ${name} 开始执行`,
            details,
          },
        ]);
        return;
      }

      if (eventType === "tool_call_end") {
        const name =
          event.extras?.tool_name || event.action || "未知工具";
        const result =
          event.extras?.result !== undefined
            ? JSON.stringify(event.extras.result, null, 2)
            : undefined;
        setMessages((prev) => [
          ...prev,
          {
            id: event.id ?? `${Date.now()}`,
            source: "agent",
            kind: "tool",
            content: `✅ 工具 ${name} 完成`,
            details: result,
          },
        ]);
        return;
      }

      if (eventType === "agent_state_change") {
        if (
          event.extras?.agent_state === "ready" ||
          event.message === "Agent ready"
        ) {
          setAgentReady(true);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: event.id ?? `${Date.now()}`,
            source: "system",
            kind: "status",
            content: event.message || "Agent 状态更新",
          },
        ]);
        return;
      }

      if (eventType === "error") {
        setMessages((prev) => [
          ...prev,
          {
            id: event.id ?? `${Date.now()}`,
            source: "system",
            kind: "error",
            content: event.message || "发生未知错误",
          },
        ]);
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [backendUrl, conversationId]);

  React.useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSubmit = React.useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const text = inputValue.trim();
      if (!text || !socketRef.current || connectionStatus !== "connected") {
        return;
      }
      if (!agentReady) {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}`,
            source: "system",
            kind: "status",
            content: "Agent 正在初始化，请稍候…",
          },
        ]);
        return;
      }

      setIsSending(true);
      socketRef.current.emit("oh_user_action", {
        action: "message",
        args: {
          content: text,
          image_urls: [],
          file_urls: [],
          timestamp: new Date().toISOString(),
        },
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          source: "user",
          kind: "message",
          content: text,
        },
      ]);
      setInputValue("");
    },
    [inputValue, connectionStatus, agentReady],
  );

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-zinc-800 bg-[#161821] shadow-lg">
        <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 gap-4">
          <div className="min-w-0">
            <p className="text-sm text-zinc-400">当前会话 ID</p>
            <p className="text-base font-medium text-white truncate">
              {conversationId}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-right">
            <span
              className={`text-sm ${connectionStatus === "connected" ? "text-emerald-400" : connectionStatus === "connecting" ? "text-amber-400" : "text-rose-400"}`}
            >
              {connectionStatus === "connected"
                ? "已连接"
                : connectionStatus === "connecting"
                  ? "连接中..."
                  : "已断开"}
            </span>
            {connectionStatus === "connected" && (
              <span className="text-zinc-400">
                {agentReady ? "Agent 已就绪，可发送消息" : "Agent 正在初始化…"}
              </span>
            )}
          </div>
        </header>

        <div
          ref={viewportRef}
          className="h-[65vh] overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar"
        >
          {messages.length === 0 && (
            <p className="text-sm text-zinc-500">
              发送第一条消息开始对话吧。
            </p>
          )}
          {messages.map((msg) => (
            <article
              key={msg.id}
              className={`rounded-md px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.kind === "error"
                  ? "bg-rose-600/10 border border-rose-600/30"
                  : msg.kind === "status"
                    ? "bg-zinc-700/20 border border-zinc-600/30"
                    : msg.source === "user"
                      ? "bg-sky-500/10 border border-sky-500/30"
                      : "bg-emerald-500/10 border border-emerald-500/30"
              }`}
            >
              <header className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-zinc-400">
                <span>
                  {msg.source === "user"
                    ? "用户"
                    : msg.source === "agent"
                      ? "助手"
                      : "系统"}
                  {msg.kind === "tool" && " · 工具执行"}
                  {msg.kind === "error" && " · 错误"}
                </span>
              </header>
              <p className="text-sm leading-relaxed text-zinc-100">
                {msg.content}
              </p>
              {msg.details && (
                <pre className="mt-2 text-xs leading-relaxed text-zinc-300 bg-black/30 rounded-md px-2 py-1 overflow-x-auto">
                  {msg.details}
                </pre>
              )}
            </article>
          ))}
        </div>

        <footer className="border-t border-zinc-800 px-4 py-3">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3"
            autoComplete="off"
          >
            <input
              className="flex-1 rounded-md bg-[#10121a] border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/60"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="输入消息，回车发送给智谱大模型"
            />
            <button
              type="submit"
              disabled={
                isSending ||
                connectionStatus !== "connected" ||
                !agentReady ||
                inputValue.trim().length === 0
              }
              className="shrink-0 rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSending ? "发送中…" : "发送"}
            </button>
          </form>
        </footer>
      </section>
    </div>
  );
}
