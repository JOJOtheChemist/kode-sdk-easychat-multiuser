import { useState, useEffect, useRef } from 'react';
import { kodeAPI } from '../services/api';
import { ProgressEvent, Message, ToolCallRecord } from '../types/kode';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCallRecord[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    // 添加用户消息
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);

    // 创建 AI 消息占位符
    const aiMessage: Message = {
      id: `ai_${Date.now()}`,
      type: 'assistant',
      content: '',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, aiMessage]);
    setCurrentMessageId(aiMessage.id);
    setIsStreaming(true);

    try {
      const eventSource = await kodeAPI.sendMessage(text);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data: ProgressEvent = JSON.parse(event.data);
          handleProgressEvent(data, aiMessage.id);
        } catch (error) {
          console.error('解析事件数据失败:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource 错误:', error);
        stopStreaming();
      };

    } catch (error) {
      console.error('发送消息失败:', error);
      stopStreaming();
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessage.id 
          ? { ...msg, content: '❌ 消息发送失败，请重试。' }
          : msg
      ));
    }
  };

  const handleProgressEvent = (data: ProgressEvent, messageId: string) => {
    switch (data.type) {
      case 'text_chunk':
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: msg.content + data.delta }
            : msg
        ));
        break;

      case 'think_chunk':
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isThinking: true, content: msg.content + data.delta }
            : msg
        ));
        break;

      case 'tool:start':
        setToolCalls(prev => [...prev, data.toolCall]);
        break;

      case 'tool:end':
        setToolCalls(prev => prev.map(tool => 
          tool.id === data.toolCall.id 
            ? data.toolCall
            : tool
        ));
        break;

      case 'done':
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, bookmark: data.bookmark, isThinking: false }
            : msg
        ));
        
        stopStreaming();
        break;
    }
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    setCurrentMessageId(null);
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setToolCalls([]);
  };

  return {
    messages,
    isStreaming,
    currentMessageId,
    toolCalls,
    sendMessage,
    stopStreaming,
    clearMessages
  };
};