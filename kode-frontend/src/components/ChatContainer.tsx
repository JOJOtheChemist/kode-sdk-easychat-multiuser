import React from 'react';
import { Box, List, Paper, Typography } from '@mui/material';
import MessageBubble from './MessageBubble';
import { Message } from '../types/kode';

interface ChatContainerProps {
  messages: Message[];
  isStreaming?: boolean;
  streamingMessageId?: string;
  onCopyMessage?: (content: string) => void;
  onRefreshMessage?: (messageId: string) => void;
  onStopStreaming?: () => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  isStreaming = false,
  streamingMessageId,
  onCopyMessage,
  onRefreshMessage,
  onStopStreaming
}) => {
  const handleCopy = (content: string) => {
    onCopyMessage?.(content);
    // 可以添加复制成功提示
  };

  const handleRefresh = (messageId: string) => {
    onRefreshMessage?.(messageId);
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fafafa'
      }}
    >
      {/* 聊天头部 */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e0e0'
        }}
      >
        <Typography variant="h6" gutterBottom>
          🤖 KODE AI 对话
        </Typography>
        <Typography variant="caption" color="text.secondary">
          多轮对话 • 工具调用 • 实时流式响应 • 智能上下文管理
        </Typography>
      </Paper>

      {/* 消息列表 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {messages.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <Typography variant="h4" gutterBottom>
              👋
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              开始与 AI 对话
            </Typography>
            <Typography variant="body2" color="text.secondary">
              输入你的问题，AI 将智能调用工具并提供详细回答
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              支持：多轮对话 • 文件操作 • 代码执行 • 任务管理
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id || index}
                message={message}
                isStreaming={isStreaming && streamingMessageId === message.id}
                onCopy={handleCopy}
                onRefresh={() => handleRefresh(message.id)}
                onStop={isStreaming && streamingMessageId === message.id ? onStopStreaming : undefined}
              />
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default ChatContainer;