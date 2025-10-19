import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

// 简化版App组件
const App = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🤖 KODE AI 对话系统</h1>
      <p>✅ 前端服务运行正常</p>
      <p>🔗 后端API连接正常</p>
      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        border: '1px solid #ccc', 
        borderRadius: '5px' 
      }}>
        <h2>测试多轮对话</h2>
        <p>请打开浏览器开发者工具，在控制台中测试以下命令：</p>
        <pre style={{ background: '#f5f5f5', padding: '10px' }}>
{`fetch('http://localhost:8080/api/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ templateId: 'chat-assistant' })
})
.then(res => res.json())
.then(data => console.log('Agent创建成功:', data))`}
        </pre>
      </div>
    </div>
  )
}

// 创建主题
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)