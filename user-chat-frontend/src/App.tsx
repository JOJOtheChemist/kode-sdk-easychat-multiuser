import React, { useState, useEffect } from 'react';
import SessionList from './components/SessionList';
import ChatArea from './components/ChatArea';
import { Session, Message } from './types';
import './styles/theme.css';

const USER_ID = 'yeya';
const AGENT_ID = 'schedule-assistant';

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  // 从后端加载会话列表
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/sessions?userId=${USER_ID}`);
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.sessions) {
            const formattedSessions = data.sessions.map((s: any) => ({
              id: s.id || s.agentId,
              name: s.name || s.customName || `会话 ${s.id}`,
              createdAt: s.createdAt ? new Date(s.createdAt) : new Date()
            }));
            setSessions(formattedSessions);
            
            // 如果有会话，选择第一个作为当前会话
            if (formattedSessions.length > 0) {
              const firstSessionId = formattedSessions[0].id;
              setCurrentSessionId(firstSessionId);
              // 加载第一个会话的历史消息
              setTimeout(() => {
                loadSessionMessages(firstSessionId);
              }, 100);
            }
          }
        }
      } catch (error) {
        console.error('加载会话列表失败:', error);
        // 如果后端不可用，使用默认会话
        const defaultSessions = [
          { id: 'session_1', name: '会话1', createdAt: new Date() },
          { id: 'session_2', name: '会话2', createdAt: new Date() }
        ];
        setSessions(defaultSessions);
        setCurrentSessionId('session_1');
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, []);

  // 加载会话历史消息
  const loadSessionMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}?userId=${USER_ID}`);
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.session && data.session.messages) {
          const formattedMessages = data.session.messages.map((msg: any, index: number) => {
            // 处理复杂的消息内容格式
            let content = '';
            if (Array.isArray(msg.content)) {
              // 处理数组格式的内容
              content = msg.content
                .filter((item: any) => item.type === 'text')
                .map((item: any) => item.text)
                .join('');
            } else if (typeof msg.content === 'string') {
              content = msg.content;
            }
            
            return {
              id: msg.id || `${sessionId}-msg-${index}`,
              role: msg.role,
              content: content,
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
              isStreaming: false
            };
          });
          
          setMessages(prev => ({
            ...prev,
            [sessionId]: formattedMessages
          }));
        }
      }
    } catch (error) {
      console.error('加载会话消息失败:', error);
    }
  };

  // 处理会话切换
  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    // 如果该会话还没有加载消息，则加载历史消息
    if (!messages[sessionId] || messages[sessionId].length === 0) {
      await loadSessionMessages(sessionId);
    }
  };

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
      let thinkingContent = '';
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
              
              // 处理文本内容 (只处理text事件，thinking事件单独处理)
              if (currentEvent === 'text') {
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
              // 处理开始事件 (从thinking转换到text)
              else if (currentEvent === 'start') {
                // 清空thinking内容，开始显示text内容
                thinkingContent = '';
                accumulatedContent = '';
              }
              // 处理思考过程 (thinking事件单独累积)
              else if (currentEvent === 'thinking') {
                if (data.delta) {
                  thinkingContent += data.delta;
                  // 显示思考内容，但不影响最终的text内容
                  setMessages(prev => ({
                    ...prev,
                    [currentSessionId]: prev[currentSessionId].map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: thinkingContent }
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

  if (isLoading) {
    return (
      <div className="app">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>加载会话列表中...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <SessionList
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
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

