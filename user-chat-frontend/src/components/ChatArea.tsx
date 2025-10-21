import React, { useState, useRef, useEffect } from 'react';
import { Session, Message } from '../types';
import MessageItem from './MessageItem';
import './ChatArea.css';

interface ChatAreaProps {
  session?: Session;
  messages: Message[];
  onSendMessage: (content: string) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ session, messages, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  if (!session) {
    return (
      <div className="chat-area">
        <div className="no-session">
          <h2>请选择一个对话</h2>
          <p>或创建一个新的对话开始聊天</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <div className="chat-header">
        <h2>{session.name}</h2>
        <div className="session-info">
          <span className="session-id-badge">{session.id}</span>
          <span className="message-count">{messages.length} 条消息</span>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-messages">
            <p>还没有消息，开始对话吧！</p>
          </div>
        ) : (
          messages.map(message => (
            <MessageItem key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="input-area" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="输入消息..."
          className="message-input"
        />
        <button type="submit" className="send-button" disabled={!inputValue.trim()}>
          发送
        </button>
      </form>
    </div>
  );
};

export default ChatArea;

