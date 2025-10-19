import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  LinearProgress, 
  Chip, 
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Build as ToolIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Science as ExperimentIcon
} from '@mui/icons-material';

interface ToolCallRecord {
  id: string;
  name: string;
  input?: any;
  state: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  result?: any;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
}

interface ToolCallDisplayProps {
  toolCalls: ToolCallRecord[];
  onInterrupt?: (toolId: string) => void;
}

const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ 
  toolCalls, 
  onInterrupt 
}) => {
  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'PENDING':
        return <PendingIcon color="warning" />;
      case 'EXECUTING':
        return <LinearProgress sx={{ width: 20, height: 20 }} />;
      case 'COMPLETED':
        return <SuccessIcon color="success" />;
      case 'FAILED':
        return <ErrorIcon color="error" />;
      default:
        return <ToolIcon />;
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'PENDING':
        return 'warning';
      case 'EXECUTING':
        return 'info';
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (state: string) => {
    switch (state) {
      case 'PENDING':
        return '等待执行';
      case 'EXECUTING':
        return '执行中';
      case 'COMPLETED':
        return '已完成';
      case 'FAILED':
        return '执行失败';
      default:
        return '未知状态';
    }
  };

  const getToolIcon = (toolName: string) => {
    if (toolName.includes('file') || toolName.includes('read')) {
      return '📄';
    } else if (toolName.includes('write') || toolName.includes('create')) {
      return '✏️';
    } else if (toolName.includes('bash') || toolName.includes('run')) {
      return '⚡';
    } else if (toolName.includes('search') || toolName.includes('web')) {
      return '🔍';
    } else if (toolName.includes('todo')) {
      return '📝';
    } else {
      return '🔧';
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  const formatInput = (input: any) => {
    if (typeof input === 'string') return input;
    if (typeof input === 'object' && input !== null) {
      return JSON.stringify(input, null, 2);
    }
    return String(input);
  };

  const formatResult = (result: any) => {
    if (typeof result === 'string') return result;
    if (typeof result === 'object' && result !== null) {
      return JSON.stringify(result, null, 2);
    }
    return String(result);
  };

  if (toolCalls.length === 0) {
    return (
      <Card sx={{ mb: 2, bgcolor: '#f8f9fa' }}>
        <CardContent sx={{ textAlign: 'center', py: 3 }}>
          <Avatar sx={{ 
            bgcolor: 'grey.300', 
            width: 48, 
            height: 48, 
            margin: '0 auto 16px' 
          }}>
            <ToolIcon />
          </Avatar>
          <Typography variant="body2" color="text.secondary">
            暂无工具调用记录
          </Typography>
          <Typography variant="caption" color="text.secondary">
            当AI需要执行任务时会自动调用工具
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 2, bgcolor: '#fafafa' }}>
      <CardContent>
        {/* 标题和统计 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            <ExperimentIcon />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="div">
              🔧 工具调用监控
            </Typography>
            <Typography variant="caption" color="text.secondary">
              本次对话共调用 {toolCalls.length} 个工具
            </Typography>
          </Box>
          <Chip 
            label={`${toolCalls.filter(t => t.state === 'COMPLETED').length}/${toolCalls.length} 成功`}
            color="primary" 
            size="small" 
            variant="outlined"
          />
        </Box>

        {/* 工具调用列表 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {toolCalls.map((toolCall, index) => (
            <Card 
              key={toolCall.id} 
              variant="outlined" 
              sx={{ 
                bgcolor: 'background.paper',
                border: `1px solid ${getStatusColor(toolCall.state) === 'success' ? '#4caf50' : getStatusColor(toolCall.state) === 'error' ? '#f44336' : '#e0e0e0'}`
              }}
            >
              <CardContent sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  {/* 工具图标和状态 */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
                    <Typography variant="h4" sx={{ fontSize: '24px' }}>
                      {getToolIcon(toolCall.name)}
                    </Typography>
                    {getStatusIcon(toolCall.state)}
                  </Box>

                  {/* 工具信息 */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {toolCall.name}
                      </Typography>
                      <Chip
                        label={getStatusText(toolCall.state)}
                        size="small"
                        color={getStatusColor(toolCall.state) as any}
                        variant="outlined"
                      />
                      {toolCall.durationMs && (
                        <Chip
                          label={formatDuration(toolCall.durationMs)}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>

                    {/* 工具输入 */}
                    {toolCall.input && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          📥 输入参数:
                        </Typography>
                        <Box
                          sx={{
                            p: 1,
                            bgcolor: 'grey.50',
                            borderRadius: 1,
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            maxHeight: 80,
                            overflow: 'auto',
                            border: '1px solid #e0e0e0'
                          }}
                        >
                          {formatInput(toolCall.input)}
                        </Box>
                      </Box>
                    )}

                    {/* 工具结果 */}
                    {toolCall.result && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          📤 执行结果:
                        </Typography>
                        <Box
                          sx={{
                            p: 1,
                            bgcolor: 'success.50',
                            borderRadius: 1,
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            maxHeight: 100,
                            overflow: 'auto',
                            border: '1px solid #c8e6c9'
                          }}
                        >
                          {formatResult(toolCall.result)}
                        </Box>
                      </Box>
                    )}

                    {/* 错误信息 */}
                    {toolCall.error && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="error" sx={{ display: 'block', mb: 0.5 }}>
                          ❌ 错误信息:
                        </Typography>
                        <Box
                          sx={{
                            p: 1,
                            bgcolor: 'error.50',
                            borderRadius: 1,
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            color: 'error.main',
                            border: '1px solid #ffcdd2'
                          }}
                        >
                          {toolCall.error}
                        </Box>
                      </Box>
                    )}

                    {/* 时间信息 */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        开始: {toolCall.startedAt ? new Date(toolCall.startedAt).toLocaleTimeString() : '-'}
                      </Typography>
                      {toolCall.completedAt && (
                        <Typography variant="caption" color="text.secondary">
                          完成: {new Date(toolCall.completedAt).toLocaleTimeString()}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* 操作按钮 */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {toolCall.state === 'EXECUTING' && onInterrupt && (
                      <Tooltip title="中断工具执行">
                        <IconButton
                          size="small"
                          onClick={() => onInterrupt(toolCall.id)}
                          color="error"
                        >
                          <StopIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* 工具调用统计 */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            📊 本次对话工具使用统计
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip 
              label={`总计: ${toolCalls.length}`}
              size="small"
              color="primary"
            />
            <Chip 
              label={`成功: ${toolCalls.filter(t => t.state === 'COMPLETED').length}`}
              size="small"
              color="success"
            />
            <Chip 
              label={`失败: ${toolCalls.filter(t => t.state === 'FAILED').length}`}
              size="small"
              color="error"
            />
            <Chip 
              label={`总耗时: ${toolCalls.reduce((sum, t) => sum + (t.durationMs || 0), 0)}ms`}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ToolCallDisplay;