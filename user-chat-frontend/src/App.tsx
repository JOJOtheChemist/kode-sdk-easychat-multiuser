import React, { useState, useEffect } from 'react';
import SessionList from './components/SessionList';
import ChatArea from './components/ChatArea';
import { Session, Message } from './types';
import './App.css';

const USER_ID = 'user2';
const AGENT_ID = 'schedule-assistant';

function App() {
  const [sessions, setSessions] = useState<Session[]>([
    { id: 'session_1', name: '会话1', createdAt: new Date() },
    { id: 'session_2', name: '会话2', createdAt: new Date() }
  ]);
  
  const [currentSessionId, setCurrentSessionId] = useState<string>('session_1');
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    'session_1': [],
    'session_2': []
  });

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const handleCreateSession = () => {
    const sessionName = prompt('请输入新会话名称:');
    if (!sessionName) return;

    const sessionId = sessionName.toLowerCase().replace(/\s+/g, '_');
    const newSession: Session = {
      id: sessionId,
      name: sessionName,
      createdAt: new Date()
    };

    setSessions([...sessions, newSession]);
    setMessages({ ...messages, [sessionId]: [] });
    setCurrentSessionId(sessionId);
  };

  const handleSendMessage = async (content: string) => {
    if (!currentSessionId) return;

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => ({
      ...prev,
      [currentSessionId]: [...(prev[currentSessionId] || []), userMessage]
    }));

    // 添加一个空的助手消息，用于流式更新
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    setMessages(prev => ({
      ...prev,
      [currentSessionId]: [...prev[currentSessionId], assistantMessage]
    }));

    try {
      // 发送请求到后端
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: USER_ID,
          agentId: AGENT_ID,
          sessionId: currentSessionId,
          message: content
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法获取响应流');
      }

      let buffer = '';
      let accumulatedContent = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          // 解析 event: 行
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          }
          // 解析 data: 行
          else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              console.log('[SSE]', currentEvent, data);
              
              // 处理文本内容 (text, thinking)
              if (currentEvent === 'text' || currentEvent === 'thinking') {
                if (data.delta) {
                  accumulatedContent += data.delta;
                  
                  setMessages(prev => ({
                    ...prev,
                    [currentSessionId]: prev[currentSessionId].map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    )
                  }));
                }
              }
              // 处理工具开始
              else if (currentEvent === 'tool_start') {
                const toolInfo = `\n\n🔧 [工具调用] ${data.name}\n`;
                accumulatedContent += toolInfo;
                
                setMessages(prev => ({
                  ...prev,
                  [currentSessionId]: prev[currentSessionId].map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                }));
              }
              // 处理工具结束
              else if (currentEvent === 'tool_end') {
                const toolInfo = `✅ ${data.name} 完成 (${data.duration}ms)\n`;
                accumulatedContent += toolInfo;
                
                setMessages(prev => ({
                  ...prev,
                  [currentSessionId]: prev[currentSessionId].map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                }));
              }
              // 处理完成
              else if (currentEvent === 'complete') {
                setMessages(prev => ({
                  ...prev,
                  [currentSessionId]: prev[currentSessionId].map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, isStreaming: false }
                      : msg
                  )
                }));
              }
              // 处理错误
              else if (currentEvent === 'error') {
                accumulatedContent += `\n\n❌ 错误: ${data.message || '未知错误'}`;
                setMessages(prev => ({
                  ...prev,
                  [currentSessionId]: prev[currentSessionId].map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent, isStreaming: false }
                      : msg
                  )
                }));
              }
              
              // 重置当前事件
              currentEvent = '';
            } catch (e) {
              console.error('解析 SSE 数据失败:', e, line);
            }
          }
        }
      }

      // 确保流式标志被移除
      setMessages(prev => ({
        ...prev,
        [currentSessionId]: prev[currentSessionId].map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, isStreaming: false }
            : msg
        )
      }));

    } catch (error) {
      console.error('发送消息失败:', error);
      
      setMessages(prev => ({
        ...prev,
        [currentSessionId]: prev[currentSessionId].map(msg =>
          msg.id === assistantMessageId
            ? { 
                ...msg, 
                content: `❌ 发送失败: ${error instanceof Error ? error.message : '未知错误'}`,
                isStreaming: false 
              }
            : msg
        )
      }));
    }
  };

  return (
    <div className="app">
      <SessionList
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onCreateSession={handleCreateSession}
      />
      <ChatArea
        session={currentSession}
        messages={messages[currentSessionId] || []}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}

export default App;

