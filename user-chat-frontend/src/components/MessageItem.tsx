import React from 'react';
import { Message } from '../types';

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
    <div className={`message ${message.role} fade-in`}>
      <div className="message-bubble">
        {message.content || (message.isStreaming ? '正在输入...' : '')}
        {message.isStreaming && (
          <span className="loading-dots">
            <span className="loading-dot"></span>
            <span className="loading-dot"></span>
            <span className="loading-dot"></span>
          </span>
        )}
      </div>
      <div className="message-time">
        {message.role === 'user' ? '👤 用户' : '🤖 助手'} · {formatTime(message.timestamp)}
      </div>
    </div>
  );
};

export default MessageItem;

