import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  Paper, 
  Typography,
  Chip,
  Tooltip
} from '@mui/material';
import { 
  Send as SendIcon,
  Mic as MicIcon,
  Stop as StopIcon
} from '@mui/icons-material';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "输入消息...",
  maxLength = 2000
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动聚焦
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicToggle = () => {
    if (!isRecording) {
      // 开始语音录制
      setIsRecording(true);
      // TODO: 实现语音识别功能
      console.log('开始语音录制');
    } else {
      // 停止语音录制
      setIsRecording(false);
      // TODO: 停止语音识别并获取结果
      console.log('停止语音录制');
    }
  };

  const characterCount = message.length;
  const isNearLimit = characterCount > maxLength * 0.9;
  const isAtLimit = characterCount >= maxLength;

  return (
    <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
      {/* 状态指示器 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
          {disabled ? '🔴 AI正在思考...' : '🟢 准备就绪'}
        </Typography>
        
        {isRecording && (
          <Chip
            label="🎤 录音中..."
            color="error"
            size="small"
            variant="outlined"
            sx={{ mr: 1 }}
          />
        )}

        <Typography variant="caption" color="text.secondary">
          多轮对话 • 支持工具调用 • 断点续传
        </Typography>
      </Box>

      {/* 输入区域 */}
      <Paper
        elevation={2}
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          p: 1,
          borderRadius: 2
        }}
      >
        {/* 文本输入框 */}
        <TextField
          ref={inputRef}
          multiline
          maxRows={4}
          minRows={1}
          fullWidth
          variant="outlined"
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          disabled={disabled}
          InputProps={{
            style: {
              border: 'none',
              padding: '8px 12px'
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': { border: 'none' },
              '&:hover fieldset': { border: 'none' },
              '&.Mui-focused fieldset': { border: 'none' }
            }
          }}
        />

        {/* 字符计数 */}
        {characterCount > 0 && (
          <Typography
            variant="caption"
            color={isAtLimit ? 'error' : isNearLimit ? 'warning.main' : 'text.secondary'}
            sx={{ mx: 1, alignSelf: 'flex-end', pb: 1 }}
          >
            {characterCount}/{maxLength}
          </Typography>
        )}

        {/* 语音录制按钮 */}
        <Tooltip title={isRecording ? "停止录音" : "语音输入"}>
          <IconButton
            onClick={handleMicToggle}
            color={isRecording ? 'error' : 'default'}
            sx={{ mx: 0.5 }}
          >
            {isRecording ? <StopIcon /> : <MicIcon />}
          </IconButton>
        </Tooltip>

        {/* 发送按钮 */}
        <Tooltip title="发送消息 (Enter)">
          <IconButton
            onClick={handleSend}
            disabled={!message.trim() || disabled || isRecording}
            color="primary"
            sx={{ mx: 0.5 }}
          >
            <SendIcon />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* 功能提示 */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          💡 提示：按 Enter 发送，Shift+Enter 换行 • 支持 markdown 格式 • AI可调用工具
        </Typography>
      </Box>
    </Box>
  );
};

export default ChatInput;