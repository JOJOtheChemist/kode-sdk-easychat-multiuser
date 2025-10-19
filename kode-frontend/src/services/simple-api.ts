// 简化的API服务，使用原生fetch
import { CreateAgentRequest, AgentStatus, AgentInfo } from '../types/kode';

const API_BASE_URL = 'http://localhost:8080/api';

class KodeAPIService {
  private agentId: string | null = null;

  setAgentId(agentId: string) {
    this.agentId = agentId;
  }

  getAgentId(): string | null {
    return this.agentId;
  }

  async createAgent(request: CreateAgentRequest) {
    const response = await fetch(`${API_BASE_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    this.agentId = data.agentId;
    return data;
  }

  async sendMessage(text: string) {
    if (!this.agentId) {
      throw new Error('No active agent. Please create an agent first.');
    }

    // 创建 EventSource 连接获取流式响应
    const eventSource = new EventSource(
      `${API_BASE_URL}/agents/${this.agentId}/chat?text=${encodeURIComponent(text)}`
    );

    return eventSource;
  }

  async getAgentStatus(agentId?: string): Promise<AgentStatus> {
    const targetAgentId = agentId || this.agentId;
    if (!targetAgentId) {
      throw new Error('No agent ID provided');
    }

    const response = await fetch(`${API_BASE_URL}/agents/${targetAgentId}/status`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getAgentInfo(agentId?: string): Promise<AgentInfo> {
    const targetAgentId = agentId || this.agentId;
    if (!targetAgentId) {
      throw new Error('No agent ID provided');
    }

    const response = await fetch(`${API_BASE_URL}/agents/${targetAgentId}/info`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const kodeAPI = new KodeAPIService();