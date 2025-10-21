import React from 'react';
import { Message } from '../types';
import './MessageItem.css';

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className={`message-item ${message.role}`}>
      <div className="message-header">
        <span className="message-role">
          {message.role === 'user' ? '👤 用户' : '🤖 助手'}
        </span>
        <span className="message-time">{formatTime(message.timestamp)}</span>
      </div>
      <div className="message-content">
        {message.content || (message.isStreaming ? '正在输入...' : '')}
        {message.isStreaming && (
          <span className="streaming-indicator">▊</span>
        )}
      </div>
    </div>
  );
};

export default MessageItem;

