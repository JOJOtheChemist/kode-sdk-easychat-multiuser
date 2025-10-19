import React, { useState, useEffect } from 'react';
import { kodeAPI } from './services/simple-api';
import ToolCallDisplay from './components/ToolCallDisplay';

// 扩展API服务以支持设置更新
const extendedAPI = {
  ...kodeAPI,
  
  async updateAgentSettings(settings: { exposeThinking?: boolean; enableTools?: boolean }) {
    const agentId = kodeAPI.getAgentId();
    if (!agentId) {
      throw new Error('No active agent');
    }

    const response = await fetch(`http://localhost:8080/api/agents/${agentId}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
};

const App = () => {
  const [messages, setMessages] = useState<Array<{id: string, text: string, sender: 'user' | 'ai' | 'thinking' | 'tool'}>>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    exposeThinking: true,
    enableTools: true
  });
  const [toolCalls, setToolCalls] = useState<Array<{
    id: string;
    name: string;
    input?: any;
    state: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
    result?: any;
    error?: string;
    startedAt?: number;
    completedAt?: number;
    durationMs?: number;
  }>>([]);

  // 初始化Agent
  const initializeAgent = async () => {
    try {
      setError(null);
      console.log('正在创建KODE Agent...');
      const agentData = await kodeAPI.createAgent({
        templateId: 'chat-assistant',
        settings: settings
      });
      
      console.log('KODE Agent创建成功:', agentData);
      setAgentId(agentData.agentId);
      kodeAPI.setAgentId(agentData.agentId);
      
      // 更新设置
      if (agentData.settings) {
        setSettings(agentData.settings);
      }
    } catch (error) {
      console.error('创建Agent失败:', error);
      setError(`创建Agent失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 更新设置
  const updateSettings = async (newSettings: Partial<typeof settings>) => {
    try {
      const updated = await extendedAPI.updateAgentSettings(newSettings);
      setSettings(prev => ({ ...prev, ...newSettings }));
      console.log('设置已更新:', updated);
    } catch (error) {
      console.error('更新设置失败:', error);
      setError(`更新设置失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 发送消息
  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user' as const
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      console.log('发送消息到KODE Agent:', inputText);
      const eventSource = await kodeAPI.sendMessage(inputText);

      // 创建AI消息占位符
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: '',
        sender: 'ai' as const
      };

      setMessages(prev => [...prev, aiMessage]);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('收到KODE事件:', data.type, data.delta ? data.delta.substring(0, 20) + '...' : '');

          if (data.type === 'think_chunk_start') {
            // 添加思考消息
            const thinkingMessage = {
              id: (Date.now() + 2).toString(),
              text: '🤔 正在思考...',
              sender: 'thinking' as const
            };
            setMessages(prev => [...prev, thinkingMessage]);
          } else if (data.type === 'think_chunk') {
            // 更新思考内容
            setMessages(prev => prev.map(msg => 
              msg.sender === 'thinking' 
                ? { ...msg, text: `🤔 ${data.delta}` }
                : msg
            ));
          } else if (data.type === 'think_chunk_end') {
            // 思考结束，移除思考消息
            setTimeout(() => {
              setMessages(prev => prev.filter(msg => msg.sender !== 'thinking'));
            }, 500);
          } else if (data.type === 'tool:start') {
            // 添加工具调用消息
            const toolMessage = {
              id: (Date.now() + 3).toString(),
              text: `🔧 调用工具: ${data.toolCall.name}`,
              sender: 'tool' as const
            };
            setMessages(prev => [...prev, toolMessage]);
            
            // 更新工具调用状态
            setToolCalls(prev => [...prev, {
              ...data.toolCall,
              state: 'EXECUTING',
              startedAt: Date.now()
            }]);
          } else if (data.type === 'tool:end') {
            // 更新工具结果
            setMessages(prev => prev.map(msg => 
              msg.sender === 'tool' 
                ? { ...msg, text: `✅ ${data.toolCall.name} 完成: ${data.toolCall.result?.substring(0, 50)}...` }
                : msg
            ));
            
            // 更新工具调用状态
            setToolCalls(prev => prev.map(tool => 
              tool.id === data.toolCall.id 
                ? { 
                    ...tool, 
                    ...data.toolCall,
                    state: 'COMPLETED',
                    completedAt: Date.now(),
                    durationMs: data.toolCall.durationMs || (Date.now() - (tool.startedAt || Date.now()))
                  }
                : tool
            ));
          } else if (data.type === 'text_chunk') {
            // 更新AI回复
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessage.id 
                ? { ...msg, text: msg.text + data.delta }
                : msg
            ));
          } else if (data.type === 'done') {
            setIsLoading(false);
            console.log('KODE对话完成');
            eventSource.close();
          }
        } catch (error) {
          console.error('解析事件失败:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource错误:', error);
        setError('连接中断，请重试');
        setIsLoading(false);
        eventSource.close();
      };

    } catch (error) {
      console.error('发送消息失败:', error);
      setError(`发送失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 清空对话
  const clearConversation = () => {
    setMessages([]);
    setToolCalls([]);
    setError(null);
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '900px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* 标题和状态 */}
      <div style={{ 
        backgroundColor: 'white',
        padding: '20px', 
        borderRadius: '10px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>🤖 KODE SDK 多轮对话系统</h1>
        
        {/* 状态和控制 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>Agent ID:</strong> {agentId ? agentId.slice(-8) : '未创建'}
            </p>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>状态:</strong> {isLoading ? '🟡 处理中...' : '🟢 就绪'}
            </p>
          </div>
          
          {/* 设置控制 */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={settings.exposeThinking}
                onChange={(e) => updateSettings({ exposeThinking: e.target.checked })}
                style={{ marginRight: '5px' }}
              />
              思考模式
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={settings.enableTools}
                onChange={(e) => updateSettings({ enableTools: e.target.checked })}
                style={{ marginRight: '5px' }}
              />
              工具调用
            </label>
            
            <button
              onClick={clearConversation}
              style={{
                padding: '5px 10px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              清空对话
            </button>
          </div>
        </div>

        {error && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#ffebee', 
            color: '#c62828',
            borderRadius: '5px',
            fontSize: '14px'
          }}>
            <strong>错误:</strong> {error}
          </div>
        )}
      </div>

      {/* 初始化按钮 */}
      {!agentId && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button 
            onClick={initializeAgent}
            style={{
              padding: '15px 30px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            🚀 创建 KODE Agent
          </button>
        </div>
      )}

      {/* 对话历史 */}
      <div style={{
        height: '450px',
        border: '1px solid #ddd',
        borderRadius: '10px',
        padding: '15px',
        overflowY: 'auto',
        marginBottom: '20px',
        backgroundColor: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🤖</div>
            <h3 style={{ margin: '0 0 10px 0' }}>KODE AI 助手</h3>
            <p>{agentId ? '开始输入消息进行智能对话...' : '请先创建 Agent'}</p>
            {agentId && (
              <div style={{ marginTop: '20px', fontSize: '12px', color: '#999' }}>
                <p>✅ 多轮对话记忆</p>
                <p>✅ {settings.exposeThinking ? '思考过程可见' : '思考过程隐藏'}</p>
                <p>✅ {settings.enableTools ? '工具调用启用' : '工具调用禁用'}</p>
              </div>
            )}
          </div>
        ) : (
          messages.map(message => (
            <div key={message.id} style={{
              marginBottom: '15px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 
                message.sender === 'user' ? '#e3f2fd' : 
                message.sender === 'thinking' ? '#fff3e0' :
                message.sender === 'tool' ? '#e8f5e8' :
                '#f3e5f5',
              textAlign: message.sender === 'user' ? 'right' : 'left',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                {message.sender === 'user' && '👤 用户'}
                {message.sender === 'ai' && '🤖 KODE AI'}
                {message.sender === 'thinking' && '🤔 思考中'}
                {message.sender === 'tool' && '🔧 工具调用'}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                {message.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 输入区域 */}
      <div style={{ 
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={agentId ? "输入消息，测试多轮对话..." : "请先创建Agent"}
            disabled={!agentId || isLoading}
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!agentId || isLoading || !inputText.trim()}
            style={{
              padding: '12px 20px',
              backgroundColor: (!agentId || isLoading || !inputText.trim()) ? '#ccc' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: (!agentId || isLoading || !inputText.trim()) ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'background-color 0.3s'
            }}
          >
            {isLoading ? '🔄 处理中' : '📤 发送'}
          </button>
        </div>
      </div>

      {/* 工具调用监控 */}
        {agentId && toolCalls.length > 0 && (
          <ToolCallDisplay 
            toolCalls={toolCalls}
            onInterrupt={(toolId) => {
              console.log('中断工具:', toolId);
              // TODO: 实现工具中断功能
            }}
          />
        )}

        {/* 测试说明 */}
      {agentId && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '10px',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>🧪 KODE SDK 功能测试:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <div>✅ <strong>多轮对话</strong>: AI会记住对话历史</div>
            <div>✅ <strong>思考模式</strong>: {settings.exposeThinking ? '显示AI思考过程' : '隐藏思考过程'}</div>
            <div>✅ <strong>工具调用</strong>: {settings.enableTools ? '自动检测并调用工具' : '禁用工具调用'}</div>
            <div>✅ <strong>流式响应</strong>: 实时显示AI回复过程</div>
            {toolCalls.length > 0 && (
              <div>🔧 <strong>工具统计</strong>: 本次调用 {toolCalls.length} 个工具</div>
            )}
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            <strong>建议测试:</strong> "建立2个html文件" → "帮我创建todo任务" → "搜索相关信息"
          </div>
        </div>
      )}
    </div>
  );
};

export default App;