import React, { useState } from 'react';
import { kodeAPI } from './services/simple-api';

const App = () => {
  const [messages, setMessages] = useState<Array<{id: string, text: string, sender: 'user' | 'ai'}>>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 初始化Agent
  const initializeAgent = async () => {
    try {
      setError(null);
      console.log('正在创建Agent...');
      const agentData = await kodeAPI.createAgent({
        templateId: 'chat-assistant'
      });
      
      console.log('Agent创建成功:', agentData);
      setAgentId(agentData.agentId);
      kodeAPI.setAgentId(agentData.agentId);
    } catch (error) {
      console.error('创建Agent失败:', error);
      setError(`创建Agent失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      console.log('发送消息:', inputText);
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
          console.log('收到事件:', data);

          if (data.type === 'text_chunk') {
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessage.id 
                ? { ...msg, text: msg.text + data.delta }
                : msg
            ));
          } else if (data.type === 'done') {
            setIsLoading(false);
            console.log('对话完成');
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

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>🤖 KODE AI 多轮对话测试</h1>
      
      {/* 状态显示 */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '10px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '5px' 
      }}>
        <p><strong>Agent ID:</strong> {agentId || '未创建'}</p>
        <p><strong>状态:</strong> {isLoading ? '🟡 思考中...' : '🟢 就绪'}</p>
        {error && <p style={{ color: 'red' }}><strong>错误:</strong> {error}</p>}
      </div>

      {/* 初始化按钮 */}
      {!agentId && (
        <button 
          onClick={initializeAgent}
          style={{
            padding: '10px 20px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          创建 Agent
        </button>
      )}

      {/* 对话历史 */}
      <div style={{
        height: '400px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        padding: '10px',
        overflowY: 'auto',
        marginBottom: '20px',
        backgroundColor: '#fafafa'
      }}>
        {messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>
            {agentId ? '开始输入消息进行对话...' : '请先创建Agent'}
          </p>
        ) : (
          messages.map(message => (
            <div key={message.id} style={{
              marginBottom: '10px',
              padding: '8px',
              borderRadius: '5px',
              backgroundColor: message.sender === 'user' ? '#e3f2fd' : '#f3e5f5',
              textAlign: message.sender === 'user' ? 'right' : 'left'
            }}>
              <strong>{message.sender === 'user' ? '👤 用户' : '🤖 AI'}:</strong> {message.text}
            </div>
          ))
        )}
      </div>

      {/* 输入区域 */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={agentId ? "输入消息..." : "请先创建Agent"}
          disabled={!agentId || isLoading}
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '16px'
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!agentId || isLoading || !inputText.trim()}
          style={{
            padding: '10px 20px',
            backgroundColor: (!agentId || isLoading || !inputText.trim()) ? '#ccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: (!agentId || isLoading || !inputText.trim()) ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '发送中...' : '发送'}
        </button>
      </div>

      {/* 测试说明 */}
      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#e8f5e8', 
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        <h3>🧪 测试功能:</h3>
        <ul>
          <li>✅ 多轮对话：AI会记住之前的对话内容</li>
          <li>✅ 流式响应：逐字显示AI回复</li>
          <li>✅ 工具调用：AI会模拟调用各种工具</li>
          <li>✅ 状态管理：实时显示Agent状态</li>
        </ul>
      </div>
    </div>
  );
};

export default App;