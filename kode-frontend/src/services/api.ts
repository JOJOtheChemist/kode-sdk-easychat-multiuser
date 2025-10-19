import axios from 'axios';
import { CreateAgentRequest, SendMessageRequest, SendMessageResponse, AgentStatus, AgentInfo } from '../types/kode';

const API_BASE_URL = '/api';

class KodeAPIService {
  private agentId: string | null = null;

  // 设置当前 Agent ID
  setAgentId(agentId: string) {
    this.agentId = agentId;
  }

  // 获取当前 Agent ID
  getAgentId(): string | null {
    return this.agentId;
  }

  // 创建 Agent
  async createAgent(request: CreateAgentRequest) {
    const response = await axios.post(`${API_BASE_URL}/agents`, request);
    this.agentId = response.data.agentId;
    return response.data;
  }

  // 恢复 Agent
  async resumeAgent(agentId: string, overrides?: any) {
    const response = await axios.post(`${API_BASE_URL}/agents/${agentId}/resume`, { overrides });
    this.agentId = agentId;
    return response.data;
  }

  // 发送消息 (支持 SSE 流式响应)
  async sendMessage(text: string, options?: { kind?: 'user' | 'reminder' }) {
    if (!this.agentId) {
      throw new Error('No active agent. Please create or resume an agent first.');
    }

    const request: SendMessageRequest = {
      text,
      kind: options?.kind || 'user'
    };

    // 创建 EventSource 连接获取流式响应
    const eventSource = new EventSource(
      `${API_BASE_URL}/agents/${this.agentId}/chat?text=${encodeURIComponent(text)}&kind=${request.kind}`
    );

    return eventSource;
  }

  // 获取 Agent 状态
  async getAgentStatus(agentId?: string): Promise<AgentStatus> {
    const targetAgentId = agentId || this.agentId;
    if (!targetAgentId) {
      throw new Error('No agent ID provided');
    }

    const response = await axios.get(`${API_BASE_URL}/agents/${targetAgentId}/status`);
    return response.data;
  }

  // 获取 Agent 信息
  async getAgentInfo(agentId?: string): Promise<AgentInfo> {
    const targetAgentId = agentId || this.agentId;
    if (!targetAgentId) {
      throw new Error('No agent ID provided');
    }

    const response = await axios.get(`${API_BASE_URL}/agents/${targetAgentId}/info`);
    return response.data;
  }

  // 中断当前工具执行
  async interruptAgent(agentId?: string) {
    const targetAgentId = agentId || this.agentId;
    if (!targetAgentId) {
      throw new Error('No agent ID provided');
    }

    const response = await axios.post(`${API_BASE_URL}/agents/${targetAgentId}/interrupt`);
    return response.data;
  }

  // 创建快照
  async createSnapshot(agentId?: string, label?: string) {
    const targetAgentId = agentId || this.agentId;
    if (!targetAgentId) {
      throw new Error('No agent ID provided');
    }

    const response = await axios.post(`${API_BASE_URL}/agents/${targetAgentId}/snapshot`, { label });
    return response.data;
  }

  // 获取可用模板列表
  async getTemplates() {
    const response = await axios.get(`${API_BASE_URL}/templates`);
    return response.data;
  }
}

export const kodeAPI = new KodeAPIService();