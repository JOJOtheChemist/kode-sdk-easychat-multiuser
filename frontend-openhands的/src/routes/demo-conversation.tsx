import React from "react";
import { Spinner } from "@heroui/react";
import { useParams, useNavigate } from "react-router";

const BACKEND_BASE_URL =
  import.meta.env.VITE_DEMO_BACKEND_URL || "http://localhost:3000";

type TextMessage = {
  id: string;
  kind: "text";
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

type ToolMessage = {
  id: string;
  kind: "tool";
  name: string;
  status: "running" | "completed" | "error";
  input?: string;
  result?: string;
  durationMs?: number;
};

type EventMessage = {
  id: string;
  kind: "event";
  title: string;
  details: string;
};

type ChatEntry = TextMessage | ToolMessage | EventMessage;

type BackendEnvelope = {
  cursor?: { seq: number; timestamp: number };
  bookmark?: { seq: number; timestamp: number };
  event: {
    type: string;
    delta?: string;
    message?: string;
    content?: string;
    call?: {
      id?: string;
      name?: string;
      input?: unknown;
      output?: unknown;
      durationMs?: number;
    };
    inputTokens?: number;
    outputTokens?: number;
    [key: string]: unknown;
  };
};

const INITIAL_PROMPT = "你好";

const DemoConversationRoute: React.FC = () => {
  const params = useParams();
  const navigate = useNavigate();
  const urlConversationId = params.conversationId;
  
  const [conversationId, setConversationId] = React.useState<string | null>(
    urlConversationId || null,
  );
  const [messages, setMessages] = React.useState<ChatEntry[]>([]);
  const [inputValue, setInputValue] = React.useState(INITIAL_PROMPT);
  const [isInitializing, setIsInitializing] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const eventSourceRef = React.useRef<EventSource | null>(null);
  const assistantMessageIdRef = React.useRef<string | null>(null);
  const toolMessageMapRef = React.useRef<Record<string, string>>({});
  const eventCounterRef = React.useRef(0);
  const hasCompletedRef = React.useRef(false);

  const appendAssistantDelta = React.useCallback((delta: string) => {
    if (!delta) return;

    setMessages((prev) => {
      const currentId = assistantMessageIdRef.current;
      if (currentId) {
        return prev.map((message) =>
          message.id === currentId && message.kind === "text"
            ? { ...message, content: message.content + delta }
            : message,
        );
      }

      const newId = `assistant-${Date.now()}`;
      assistantMessageIdRef.current = newId;

      return [
        ...prev,
        {
          id: newId,
          kind: "text",
          role: "assistant",
          content: delta,
          streaming: true,
        },
      ];
    });
  }, []);

  const finalizeAssistantMessage = React.useCallback(() => {
    const currentId = assistantMessageIdRef.current;
    if (!currentId) return;

    setMessages((prev) =>
      prev.map((message) =>
        message.id === currentId && message.kind === "text"
          ? { ...message, streaming: false }
          : message,
      ),
    );
    assistantMessageIdRef.current = null;
  }, []);

  const appendEventMessage = React.useCallback((title: string, details: string) => {
    const id = `event-${Date.now()}-${eventCounterRef.current++}`;
    setMessages((prev) => [
      ...prev,
      {
        id,
        kind: "event",
        title,
        details,
      },
    ]);
  }, []);

  const formatStructuredData = React.useCallback((value: unknown): string => {
    if (value === null || value === undefined) {
      return "（无内容）";
    }

    if (typeof value === "string") {
      return value.trim().length > 0 ? value : "（空字符串）";
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, []);

  const handleToolStart = React.useCallback(
    (envelope: BackendEnvelope) => {
      const call = envelope.event.call ?? {};
      const toolId = call.id || `${call.name ?? "tool"}-${Date.now()}`;
      toolMessageMapRef.current[toolId] = toolId;

      setMessages((prev) => [
        ...prev,
        {
          id: toolId,
          kind: "tool",
          name: call.name ?? "未命名工具",
          status: "running",
          input: formatStructuredData(call.input ?? {}),
        },
      ]);
    },
    [formatStructuredData],
  );

  const handleToolEnd = React.useCallback(
    (envelope: BackendEnvelope) => {
      const call = envelope.event.call ?? {};
      const toolId =
        call.id ||
        Object.keys(toolMessageMapRef.current).find((key) =>
          key.startsWith(call.name ?? ""),
        );

      const messageId = toolId
        ? toolMessageMapRef.current[toolId]
        : `tool-${Date.now()}`;

      if (!toolMessageMapRef.current[messageId]) {
        toolMessageMapRef.current[messageId] = messageId;
        setMessages((prev) => [
          ...prev,
          {
            id: messageId,
            kind: "tool",
            name: call.name ?? "未命名工具",
            status: "completed",
            input: formatStructuredData(call.input ?? {}),
            result: formatStructuredData(call.output ?? envelope.event.content),
            durationMs: call.durationMs,
          },
        ]);
        return;
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.kind === "tool" && message.id === messageId
            ? {
                ...message,
                status: "completed",
                result: formatStructuredData(
                  call.output ?? envelope.event.content,
                ),
                durationMs: call.durationMs ?? message.durationMs,
              }
            : message,
        ),
      );
    },
    [formatStructuredData],
  );

  const parseEvent = React.useCallback((rawEvent: MessageEvent<string>) => {
    try {
      if (!rawEvent.data || rawEvent.data === 'undefined') {
        console.warn("⚠️ SSE数据为空或undefined，跳过");
        return null;
      }
      const parsed = JSON.parse(rawEvent.data) as BackendEnvelope;
      console.log("🔍 解析后的数据:", parsed);
      return parsed;
    } catch (parseError) {
      console.error("❌ Failed to parse SSE payload:", parseError);
      console.error("原始数据:", rawEvent.data);
      return null;
    }
  }, []);

  const openEventStream = React.useCallback(
    (id: string) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const streamUrl = `${BACKEND_BASE_URL}/api/conversations/${id}/events`;
      console.log(`📡 正在连接 SSE: ${streamUrl}`);
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        console.log("✅ SSE 连接已建立");
        setError(null); // 清除之前的错误
      };

      es.addEventListener("text_chunk", (event) => {
        console.log("📥 收到 text_chunk 事件:", event.data);
        const envelope = parseEvent(event);
        if (!envelope) {
          console.error("❌ 解析 text_chunk 失败");
          return;
        }

        console.log("🔍 envelope.event:", envelope.event);
        const delta =
          envelope.event.delta ??
          (typeof envelope.event.content === "string"
            ? envelope.event.content
            : "");
        console.log("✅ 提取的 delta:", JSON.stringify(delta));
        
        if (delta) {
          setError(null); // 收到有效消息，清除错误状态
          appendAssistantDelta(delta);
        } else {
          console.warn("⚠️ delta 为空，跳过此 chunk");
        }
      });

      es.addEventListener("text_chunk_end", (event) => {
        console.log("✅ 收到 text_chunk_end 事件:", event.data);
        finalizeAssistantMessage();
      });

      es.addEventListener("tool:start", (event) => {
        const envelope = parseEvent(event);
        if (!envelope) return;
        handleToolStart(envelope);
      });

      es.addEventListener("tool:end", (event) => {
        const envelope = parseEvent(event);
        if (!envelope) return;
        handleToolEnd(envelope);
      });

      es.addEventListener("token_usage", (event) => {
        const envelope = parseEvent(event);
        if (!envelope) return;
        const inputTokens = envelope.event.inputTokens ?? 0;
        const outputTokens = envelope.event.outputTokens ?? 0;
        appendEventMessage(
          "Token 使用",
          `输入 ${inputTokens}, 输出 ${outputTokens}`,
        );
      });

      es.addEventListener("error", (event: Event) => {
        // 注意：这里的"error"是SSE事件类型，不是onerror
        // 需要将Event转换为MessageEvent
        const messageEvent = event as unknown as MessageEvent<string>;
        if (messageEvent.data) {
          const envelope = parseEvent(messageEvent);
          if (envelope?.event?.message) {
            appendEventMessage("错误", envelope.event.message as string);
          } else {
            appendEventMessage("错误", "事件流发生未知错误");
          }
        }
      });

      es.addEventListener("done", (event) => {
        console.log("🏁 收到 done 事件:", event.data);
        hasCompletedRef.current = true;
        finalizeAssistantMessage();
        appendEventMessage("对话完成", "模型已结束本轮回复。");
      });

      es.onerror = (event) => {
        const esTarget = event.target as EventSource;

        console.log("⚠️ EventSource onerror 触发，readyState:", esTarget.readyState);
        
        // CONNECTING = 0, OPEN = 1, CLOSED = 2
        if (esTarget.readyState === EventSource.CONNECTING) {
          console.log("🔄 EventSource 正在重连...");
          return; // 正在重连，不显示错误
        }

        if (esTarget.readyState === EventSource.CLOSED) {
          if (hasCompletedRef.current) {
            console.log("✅ EventSource 正常关闭（对话已完成）");
            return; // 对话完成后的正常关闭
          }
          console.log("❌ EventSource 意外关闭");
          setError("事件流连接已关闭，请刷新页面重试。");
        } else {
          console.error("❌ EventSource 连接错误", event);
          setError("事件流连接中断，请检查后端服务。");
        }
      };
    },
    [
      appendAssistantDelta,
      appendEventMessage,
      finalizeAssistantMessage,
      handleToolEnd,
      handleToolStart,
      parseEvent,
    ],
  );

  const initializeConversation = React.useCallback(async () => {
    setIsInitializing(true);
    setError(null);
    eventCounterRef.current = 0;
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/conversations`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`创建会话失败：${response.status}`);
      }
      const data = await response.json();
      const newConversationId = data.conversationId;
      
      setConversationId(newConversationId);
      setMessages([]);
      toolMessageMapRef.current = {};
      assistantMessageIdRef.current = null;
      hasCompletedRef.current = false;
      
      // 重定向到新创建的会话URL
      navigate(`/demo/conversations/${newConversationId}`, { replace: true });
      
      openEventStream(newConversationId);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "创建会话时发生未知错误。",
      );
    } finally {
      setIsInitializing(false);
    }
  }, [navigate, openEventStream]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!conversationId) {
        setError("会话尚未初始化，无法发送消息。");
        return;
      }

      const trimmed = inputValue.trim();
      if (!trimmed) return;

      setIsSending(true);
      setError(null);
      hasCompletedRef.current = false;

      const messageId = `user-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: messageId, kind: "text", role: "user", content: trimmed },
      ]);
      setInputValue("");

      try {
        const response = await fetch(
          `${BACKEND_BASE_URL}/api/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: trimmed }),
          },
        );

        if (!response.ok) {
          throw new Error(`发送消息失败：${response.status}`);
        }
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "发送消息时发生未知错误。",
        );
        setMessages((prev) =>
          prev.map((message) =>
            message.id === messageId && message.kind === "text"
              ? { ...message, content: `${message.content}\n（发送失败）` }
              : message,
          ),
        );
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, inputValue],
  );

  const loadHistoryMessages = React.useCallback(async (convId: string) => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/conversations/${convId}/history`);
      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          console.log(`✅ 加载了 ${data.messages.length} 条历史消息`);
          setMessages(data.messages);
        }
      } else {
        console.log('⚠️ 无法加载历史消息，可能是新会话');
      }
    } catch (error) {
      console.error('加载历史消息失败:', error);
    }
  }, []);

  React.useEffect(() => {
    // 标记是否已取消
    let cancelled = false;
    
    if (urlConversationId) {
      // 如果URL中有conversationId，直接使用它
      console.log(`使用URL中的会话ID: ${urlConversationId}`);
      setConversationId(urlConversationId);
      
      // 先清空状态
      setMessages([]);
      toolMessageMapRef.current = {};
      assistantMessageIdRef.current = null;
      hasCompletedRef.current = false;
      eventCounterRef.current = 0;
      
      // 尝试加载历史消息
      loadHistoryMessages(urlConversationId).then(() => {
        // 如果组件已卸载，不执行后续操作
        if (cancelled) return;
        // 然后打开事件流
        openEventStream(urlConversationId);
      });
    } else {
      // 如果URL中没有conversationId，创建新会话
      console.log('URL中没有会话ID，创建新会话...');
      initializeConversation();
    }
    
    return () => {
      cancelled = true;
      console.log('🧹 清理 EventSource 连接');
      eventSourceRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlConversationId]); // 只依赖 urlConversationId，避免无限循环

  const isReady = conversationId !== null && !isInitializing;

  return (
    <div className="h-full flex flex-col bg-base">
      <header className="px-6 py-4 border-b border-divider flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">
            Demo Conversation
          </h1>
          <p className="text-sm text-[#A5A8AE]">
            {isInitializing && "正在创建后端会话..."}
            {!isInitializing && conversationId && (
              <>
                <span className="font-mono">会话 ID: {conversationId}</span>
                {urlConversationId && urlConversationId === conversationId && (
                  <span className="ml-2 text-[#5FDC63]">✓ URL匹配</span>
                )}
                {urlConversationId && urlConversationId !== conversationId && (
                  <span className="ml-2 text-[#ff6b6b]">⚠ URL不匹配</span>
                )}
                <span className="ml-2 text-[#A5A8AE]">
                  | 消息数: {messages.length}
                </span>
                {eventSourceRef.current && (
                  <span className="ml-2 text-[#5FDC63]">
                    | SSE: {eventSourceRef.current.readyState === 1 ? "已连接" : "未连接"}
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={initializeConversation}
          className="text-sm text-[#5F6CFF] hover:underline"
          disabled={isInitializing}
        >
          重新开始
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar-always">
        {error && (
          <div className="max-w-3xl mx-auto mb-4 rounded-lg border border-[#ff6b6b33] bg-[#ff6b6b11] px-4 py-3 text-sm text-[#ffb3b3]">
            {error}
          </div>
        )}

        {isInitializing && (
          <div className="h-full flex items-center justify-center text-[#A5A8AE] text-sm gap-2">
            <Spinner size="sm" color="secondary" /> 正在连接到后端服务...
          </div>
        )}

        {!isInitializing && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-[#A5A8AE] text-sm gap-2">
            <Spinner size="sm" color="secondary" />
            等待后端返回事件流...
          </div>
        )}

        <div className="flex flex-col gap-4 max-w-3xl mx-auto">
          {messages.map((message) => {
            if (message.kind === "text") {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"} w-full`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? "bg-[#5F6CFF] text-white rounded-br-sm"
                        : "bg-[#1F2229] text-[#EDEFF5] rounded-bl-sm"
                    }`}
                  >
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm">
                      {message.content}
                    </pre>
                    {!isUser && message.streaming && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-[#A5A8AE]">
                        <Spinner size="sm" /> 生成中...
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            if (message.kind === "tool") {
              return (
                <div
                  key={message.id}
                  className="border border-[#2E3138] bg-[#1B1D23] rounded-xl px-4 py-3 text-sm text-[#EDEFF5]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs uppercase tracking-wide text-[#5F6CFF]">
                      工具调用
                    </span>
                    <span className="font-semibold">{message.name}</span>
                    <ToolStatusBadge status={message.status} />
                    {typeof message.durationMs === "number" && (
                      <span className="text-xs text-[#A5A8AE]">
                        {message.durationMs} ms
                      </span>
                    )}
                  </div>
                  {message.input && (
                    <ExpandableBlock title="输入" value={message.input} />
                  )}
                  {message.result && (
                    <ExpandableBlock title="输出" value={message.result} />
                  )}
                  {!message.result && message.status === "running" && (
                    <div className="flex items-center gap-2 text-xs text-[#A5A8AE]">
                      <Spinner size="sm" /> 正在执行...
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={message.id}
                className="rounded-lg border border-[#2E3138] bg-[#1B1D23] px-4 py-3 text-sm text-[#C6C9D2]"
              >
                <div className="font-semibold text-[#5F6CFF]">
                  {message.title}
                </div>
                <pre className="mt-1 whitespace-pre-wrap break-words">
                  {message.details}
                </pre>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="px-6 py-4 border-t border-divider">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex flex-col gap-3"
        >
          <label
            htmlFor="demo-chat-input"
            className="text-sm text-[#A5A8AE] font-medium"
          >
            发送一条演示消息
          </label>
          <textarea
            id="demo-chat-input"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="输入消息后按 Enter 或点击发送。"
            className="bg-[#1B1D23] border border-[#2E3138] rounded-lg text-sm text-white resize-none h-20 px-3 py-2 outline-none focus:border-[#5F6CFF] focus:ring-2 focus:ring-[#5F6CFF33]"
            disabled={!isReady || isSending}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                inputValue.trim().length > 0 && isReady && !isSending
                  ? "bg-[#5F6CFF] text-white hover:bg-[#4A55E0]"
                  : "bg-[#2E3138] text-[#6B6F78] cursor-not-allowed"
              }`}
              disabled={!isReady || isSending || inputValue.trim().length === 0}
            >
              {isSending ? "发送中..." : "发送"}
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
};

function ToolStatusBadge({ status }: { status: ToolMessage["status"] }) {
  if (status === "running") {
    return (
      <span className="flex items-center gap-1 text-xs text-[#5F6CFF]">
        <Spinner size="sm" /> 执行中
      </span>
    );
  }

  if (status === "completed") {
    return <span className="text-xs text-[#5FDC63]">已完成</span>;
  }

  return <span className="text-xs text-[#ff6b6b]">出错</span>;
}

function ExpandableBlock({ title, value }: { title: string; value: string }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="mt-2 rounded-lg border border-[#2E3138] bg-[#111217]">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-xs text-[#A5A8AE]"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span className="font-semibold">{title}</span>
        <span>{expanded ? "收起" : "展开"}</span>
      </button>
      {expanded && (
        <pre className="px-3 pb-3 whitespace-pre-wrap break-words text-xs text-[#EDEFF5]">
          {value}
        </pre>
      )}
    </div>
  );
}

export default DemoConversationRoute;
