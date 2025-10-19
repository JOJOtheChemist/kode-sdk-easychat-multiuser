import React from "react";
import { ChatPage } from "./chat-page";

export function MinimalApp() {
  return (
    <div className="min-h-screen bg-[#0b0c0f] text-white">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">最简 AI 对话界面</h1>
          <p className="text-sm text-zinc-400">
            后端端口：3001 · 前端端口：3020 · 当前仅保留消息输入、模型回复与工具事件展示。
          </p>
        </header>
        <main>
          <ChatPage conversationId="demo-conversation" />
        </main>
      </div>
    </div>
  );
}
