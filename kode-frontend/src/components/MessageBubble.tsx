import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton, 
  Tooltip,
  Chip,
  LinearProgress
} from '@mui/material';
import { 
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import { Message, ToolCallRecord } from '../types/kode';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onCopy?: (content: string) => void;
  onRefresh?: () => void;
  onStop?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming = false,
  onCopy,
  onRefresh,
  onStop
}) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // 模拟打字机效果
  useEffect(() => {
    if (isStreaming && message.type === 'assistant') {
      setIsTyping(true);
      setDisplayedContent(message.content);
      
      // 打字机效果
      let currentIndex = 0;
      const timer = setInterval(() => {
        if (currentIndex < message.content.length) {
          setDisplayedContent(message.content.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          setIsTyping(false);
          clearInterval(timer);
        }
      }, 30);

      return () => clearInterval(timer);
    } else {
      setDisplayedContent(message.content);
    }
  }, [message.content, isStreaming, message.type]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    onCopy?.(message.content);
  };

  const isUser = message.type === 'user';
  const isAssistant = message.type === 'assistant';
  const isTool = message.type === 'tool_call' || message.type === 'tool_result';

  const getBubbleColor = () => {
    if (isUser) return '#e3f2fd'; // 蓝色
    if (isAssistant) return '#f3e5f5'; // 紫色
    if (isTool) return '#e8f5e8'; // 绿色
    return '#f5f5f5'; // 灰色
  };

  const getAvatar = () => {
    if (isUser) return '👤';
    if (isAssistant) return '🤖';
    if (isTool) return '🔧';
    return '📄';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        mb: 2,
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start'
      }}
    >
      {/* 头像 */}
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          backgroundColor: getBubbleColor(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          mx: 1,
          flexShrink: 0
        }}
      >
        {getAvatar()}
      </Box>

      {/* 消息内容 */}
      <Box
        sx={{
          maxWidth: '70%',
          minWidth: '200px'
        }}
      >
        {/* 消息头部信息 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 1,
            justifyContent: isUser ? 'flex-end' : 'flex-start'
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            {message.type === 'user' && '用户'}
            {message.type === 'assistant' && 'AI助手'}
            {message.type === 'tool_call' && '工具调用'}
            {message.type === 'tool_result' && '工具结果'}
            {message.type === 'system' && '系统'}
          </Typography>
          
          {message.timestamp && (
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(message.timestamp, { 
                addSuffix: true, 
                locale: zhCN 
              })}
            </Typography>
          )}

          {/* 消息序号 */}
          {message.bookmark && (
            <Chip 
              label={`#${message.bookmark.seq}`} 
              size="small" 
              variant="outlined"
              sx={{ ml: 1, fontSize: '10px', height: '20px' }}
            />
          )}
        </Box>

        {/* 消息气泡 */}
        <Paper
          ref={contentRef}
          sx={{
            p: 2,
            backgroundColor: getBubbleColor(),
            borderRadius: 2,
            position: 'relative',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap'
          }}
        >
          {/* 流式传输进度条 */}
          {isStreaming && isTyping && (
            <LinearProgress
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                borderRadius: '8px 8px 0 0'
              }}
            />
          )}

          {/* 思考状态指示器 */}
          {message.isThinking && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                🤔 思考中...
              </Typography>
            </Box>
          )}

          {/* 消息内容 */}
          <Typography variant="body1">
            {displayedContent}
            {isTyping && <span>|</span>}
          </Typography>

          {/* 工具调用信息 */}
          {message.toolCall && (
            <Box sx={{ mt: 1, p: 1, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                🔧 工具: {message.toolCall.name}
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                状态: {message.toolCall.state}
                {message.toolCall.durationMs && ` (${message.toolCall.durationMs}ms)`}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* 操作按钮 */}
        <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', mt: 0.5 }}>
          <Tooltip title="复制">
            <IconButton size="small" onClick={handleCopy}>
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {isAssistant && onRefresh && (
            <Tooltip title="重新生成">
              <IconButton size="small" onClick={onRefresh}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {isStreaming && onStop && (
            <Tooltip title="停止生成">
              <IconButton size="small" onClick={onStop} color="error">
                <StopIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default MessageBubble;