import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  Grid,
  LinearProgress
} from '@mui/material';
import { 
  Circle as StatusIcon,
  Memory as MemoryIcon,
  Message as MessageIcon,
  Bookmark as BookmarkIcon
} from '@mui/icons-material';
import { AgentStatus, AgentInfo } from '../types/kode';

interface AgentStatusDisplayProps {
  status: AgentStatus;
  info: AgentInfo;
}

const AgentStatusDisplay: React.FC<AgentStatusDisplayProps> = ({ 
  status, 
  info 
}) => {
  const getStatusColor = (state: string) => {
    switch (state) {
      case 'READY':
        return 'success';
      case 'WORKING':
        return 'warning';
      case 'PAUSED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (state: string) => {
    switch (state) {
      case 'READY':
        return '🟢 准备就绪';
      case 'WORKING':
        return '🟡 工作中';
      case 'PAUSED':
        return '🔴 已暂停';
      default:
        return '⚪ 未知状态';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          🤖 Agent 状态
        </Typography>

        <Grid container spacing={2}>
          {/* Agent 基本信息 */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                基本信息
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Agent ID:
                  </Typography>
                  <Chip 
                    label={info.agentId.slice(0, 8) + '...'} 
                    size="small" 
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    模板: {info.templateId}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    创建时间: {formatDate(info.createdAt)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* 运行状态 */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                运行状态
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <StatusIcon 
                  color={getStatusColor(status.state) as any}
                  sx={{ mr: 1 }}
                />
                <Typography variant="body2">
                  {getStatusText(status.state)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={status.state === 'WORKING' ? 50 : status.state === 'READY' ? 100 : 0}
                sx={{ mb: 1 }}
              />
            </Box>
          </Grid>

          {/* 对话统计 */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                对话统计
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MessageIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2">
                  消息数量: {info.messageCount}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BookmarkIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2">
                  当前序号: {status.lastBookmark?.seq || 0}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  最后活动: {status.lastBookmark?.timestamp ? 
                    new Date(status.lastBookmark.timestamp).toLocaleTimeString() : '-'
                  }
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* 系统信息 */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                系统信息
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MemoryIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2">
                  步数: {status.stepCount}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2">
                  SFP索引: {status.lastSfpIndex}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2">
                  光标位置: {status.cursor}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* 断点信息 */}
          {status.breakpoint && (
            <Grid item xs={12}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  断点状态
                </Typography>
                <Chip 
                  label={status.breakpoint}
                  size="small"
                  color="info"
                  variant="outlined"
                />
              </Box>
            </Grid>
          )}

          {/* 元数据 */}
          {info.metadata && Object.keys(info.metadata).length > 0 && (
            <Grid item xs={12}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  元数据
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(info.metadata).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}: ${String(value)}`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default AgentStatusDisplay;