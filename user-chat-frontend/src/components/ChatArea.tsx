import React, { useState, useRef, useEffect } from 'react';
import { Session, Message } from '../types';
import MessageItem from './MessageItem';
import QuickTemplates from './QuickTemplates';

interface ChatAreaProps {
  session?: Session;
  messages: Message[];
  onSendMessage: (content: string) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ session, messages, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleSelectTemplate = (template: string) => {
    setInputValue(template);
    // 聚焦到输入框，方便用户继续编辑
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  if (!session) {
    return (
      <div className="chat-area">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: 'var(--text-basic)',
          textAlign: 'center'
        }}>
          <h2 style={{ 
            fontSize: '24px', 
            marginBottom: '12px',
            color: 'var(--text-content-2)'
          }}>请选择一个对话</h2>
          <p style={{ fontSize: '16px' }}>或创建一个新的对话开始聊天</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <div className="chat-header">
        <h3>{session.name}</h3>
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          fontSize: '12px',
          color: 'var(--text-basic)',
          marginTop: '4px'
        }}>
          <span style={{ 
            background: 'var(--bg-editor-active)', 
            padding: '2px 8px', 
            borderRadius: '4px',
            fontFamily: 'monospace'
          }}>
            {session.id}
          </span>
          <span>{messages.length} 条消息</span>
        </div>
      </div>

      {/* 快捷模板按钮 */}
      <QuickTemplates onSelectTemplate={handleSelectTemplate} />

      <div className="chat-messages custom-scrollbar">
        {messages.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '200px',
            color: 'var(--text-basic)',
            fontSize: '16px'
          }}>
            <p>还没有消息，开始对话吧！</p>
          </div>
        ) : (
          messages.map(message => (
            <MessageItem key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <form className="chat-input-container" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入消息，或点击上方快捷按钮选择模板..."
            className="chat-input"
          />
          <button 
            type="submit" 
            className="send-button" 
            disabled={!inputValue.trim()}
          >
            发送
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;

