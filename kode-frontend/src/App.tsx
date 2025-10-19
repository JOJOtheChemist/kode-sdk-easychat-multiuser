import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Grid, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Tooltip,
  Fab,
  Drawer,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Settings as SettingsIcon,
  History as HistoryIcon,
  Bookmark as BookmarkIcon,
  Refresh as RefreshIcon,
  KeyboardArrowUp as ScrollToTopIcon
} from '@mui/icons-material';
import ChatContainer from './components/ChatContainer';
import ChatInput from './components/ChatInput';
import AgentStatusDisplay from './components/AgentStatusDisplay';
import ToolCallDisplay from './components/ToolCallDisplay';
import { kodeAPI } from './services/api';
import { Message, ProgressEvent, AgentStatus, AgentInfo, ToolCallRecord } from './types/kode';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCallRecord[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // 初始化 Agent
  useEffect(() => {
    initializeAgent();
  }, []);

  // 监听滚动显示回到顶部按钮
  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current) {
        const { scrollTop } = chatContainerRef.current;
        setShowScrollTop(scrollTop > 300);
      }
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeAgent = async () => {
    try {
      // 创建新 Agent
      const agentData = await kodeAPI.createAgent({
        templateId: 'chat-assistant'
      });

      console.log('Agent 创建成功:', agentData);

      // 获取 Agent 状态和信息
      await updateAgentStatus();
    } catch (error) {
      console.error('初始化 Agent 失败:', error);
      // 显示错误提示
    }
  };

  const updateAgentStatus = async () => {
    try {
      const [status, info] = await Promise.all([
        kodeAPI.getAgentStatus(),
        kodeAPI.getAgentInfo()
      ]);
      
      setAgentStatus(status);
      setAgentInfo(info);
    } catch (error) {
      console.error('获取 Agent 状态失败:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSendMessage = async (text: string) => {
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
    setStreamingMessageId(aiMessage.id);
    setIsStreaming(true);

    try {
      // 发送消息并获取流式响应
      const eventSource = await kodeAPI.sendMessage(text);

      eventSource.onmessage = (event) => {
        try {
          const data: ProgressEvent = JSON.parse(event.data);
          
          switch (data.type) {
            case 'text_chunk':
              // 更新 AI 消息内容
              setMessages(prev => prev.map(msg => 
                msg.id === aiMessage.id 
                  ? { ...msg, content: msg.content + data.delta }
                  : msg
              ));
              break;

            case 'think_chunk':
              // 显示思考过程
              setMessages(prev => prev.map(msg => 
                msg.id === aiMessage.id 
                  ? { ...msg, isThinking: true, content: msg.content + data.delta }
                  : msg
              ));
              break;

            case 'tool:start':
              // 添加工具调用记录
              setToolCalls(prev => [...prev, data.toolCall]);
              break;

            case 'tool:end':
              // 更新工具调用状态
              setToolCalls(prev => prev.map(tool => 
                tool.id === data.toolCall.id 
                  ? data.toolCall
                  : tool
              ));
              break;

            case 'done':
              // 对话完成
              setMessages(prev => prev.map(msg => 
                msg.id === aiMessage.id 
                  ? { ...msg, bookmark: data.bookmark, isThinking: false }
                  : msg
              ));
              
              setIsStreaming(false);
              setStreamingMessageId(null);
              updateAgentStatus();
              eventSource.close();
              break;
          }
        } catch (error) {
          console.error('解析事件数据失败:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource 错误:', error);
        setIsStreaming(false);
        setStreamingMessageId(null);
        eventSource.close();
      };

    } catch (error) {
      console.error('发送消息失败:', error);
      setIsStreaming(false);
      setStreamingMessageId(null);
      
      // 更新消息为错误状态
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessage.id 
          ? { ...msg, content: '❌ 消息发送失败，请重试。' }
          : msg
      ));
    }
  };

  const handleCopyMessage = (content: string) => {
    // 可以添加复制成功提示
    console.log('复制消息:', content);
  };

  const handleRefreshMessage = (messageId: string) => {
    // 重新生成消息功能
    console.log('重新生成消息:', messageId);
  };

  const handleStopStreaming = () => {
    // 停止流式响应
    setIsStreaming(false);
    setStreamingMessageId(null);
  };

  const handleInterruptTool = (toolId: string) => {
    // 中断工具执行
    kodeAPI.interruptAgent();
    console.log('中断工具:', toolId);
  };

  const drawerContent = (
    <Box sx={{ width: 350, p: 2 }}>
      {/* Agent 状态 */}
      {agentStatus && agentInfo && (
        <AgentStatusDisplay 
          status={agentStatus} 
          info={agentInfo} 
        />
      )}

      {/* 工具调用记录 */}
      <ToolCallDisplay 
        toolCalls={toolCalls}
        onInterrupt={handleInterruptTool}
      />

      {/* TODO: 其他功能区域 */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          🚀 其他功能
        </Typography>
        
        {/* 功能预留区域 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            📝 **对话管理**
            - 导出对话历史
            - 搜索对话内容
            - 对话分类标签
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            🔧 **工具配置**
            - 自定义工具注册
            - 工具权限管理
            - 工具使用统计
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            📊 **数据分析**
            - 对话质量评估
            - 工具效率分析
            - 用户行为统计
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            🎨 **界面设置**
            - 主题切换
            - 字体大小调节
            - 布局自定义
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            🔐 **安全配置**
            - API 密钥管理
            - 权限控制设置
            - 审计日志查看
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* 主应用栏 */}
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🤖 KODE AI 对话系统
          </Typography>
          
          {/* 功能按钮 */}
          <Tooltip title="Agent 状态">
            <IconButton color="inherit" onClick={() => setSidebarOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="对话历史">
            <IconButton color="inherit">
              <HistoryIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="创建快照">
            <IconButton color="inherit">
              <BookmarkIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="刷新状态">
            <IconButton color="inherit" onClick={updateAgentStatus}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* 侧边栏 */}
      <Drawer
        anchor={isMobile ? 'right' : 'left'}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        variant={isMobile ? 'temporary' : 'persistent'}
      >
        <Toolbar />
        {drawerContent}
      </Drawer>

      {/* 主内容区域 */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        ml: isMobile ? 0 : 0
      }}>
        <Toolbar />
        
        {/* 对话容器 */}
        <Box 
          ref={chatContainerRef}
          sx={{ 
            flex: 1, 
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <ChatContainer
            messages={messages}
            isStreaming={isStreaming}
            streamingMessageId={streamingMessageId}
            onCopyMessage={handleCopyMessage}
            onRefreshMessage={handleRefreshMessage}
            onStopStreaming={handleStopStreaming}
          />
          
          {/* 滚动到底部 */}
          <div ref={messagesEndRef} />
        </Box>

        {/* 输入区域 */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isStreaming}
          placeholder="输入你的问题..."
        />
      </Box>

      {/* 回到顶部按钮 */}
      <Fab
        color="primary"
        size="small"
        onClick={scrollToTop}
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 20,
          display: showScrollTop ? 'flex' : 'none',
          zIndex: 1000
        }}
      >
        <ScrollToTopIcon />
      </Fab>
    </Box>
  );
};

export default App;