// KODE SDK 事件类型定义
export interface Bookmark {
  seq: number;
  timestamp: number;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  input: any;
  state: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  result?: any;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
}

export interface ProgressTextChunkEvent {
  channel: 'progress';
  type: 'text_chunk';
  delta: string;
  bookmark?: Bookmark;
}

export interface ProgressThinkChunkEvent {
  channel: 'progress';
  type: 'think_chunk';
  delta: string;
  bookmark?: Bookmark;
}

export interface ProgressToolStartEvent {
  channel: 'progress';
  type: 'tool:start';
  toolCall: ToolCallRecord;
}

export interface ProgressToolEndEvent {
  channel: 'progress';
  type: 'tool:end';
  toolCall: ToolCallRecord;
}

export interface ProgressDoneEvent {
  channel: 'progress';
  type: 'done';
  bookmark: Bookmark;
}

export type ProgressEvent = 
  | ProgressTextChunkEvent
  | ProgressThinkChunkEvent
  | ProgressToolStartEvent
  | ProgressToolEndEvent
  | ProgressDoneEvent;

// Agent 状态类型
export interface AgentStatus {
  agentId: string;
  state: 'READY' | 'WORKING' | 'PAUSED';
  stepCount: number;
  lastSfpIndex: number;
  lastBookmark: Bookmark;
  cursor: number;
  breakpoint: string;
}

export interface AgentInfo {
  agentId: string;
  templateId: string;
  createdAt: string;
  lineage: string[];
  configVersion: string;
  messageCount: number;
  lastSfpIndex: number;
  lastBookmark?: Bookmark;
  breakpoint?: string;
  metadata?: Record<string, any>;
}

// 消息类型
export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'tool_call' | 'tool_result';
  content: string;
  timestamp: number;
  bookmark?: Bookmark;
  toolCall?: ToolCallRecord;
  isThinking?: boolean;
}

// API 请求/响应类型
export interface CreateAgentRequest {
  templateId: string;
  modelConfig?: {
    provider: string;
    model: string;
    apiKey: string;
  };
  sandbox?: {
    kind: string;
    workDir: string;
    enforceBoundary: boolean;
  };
}

export interface SendMessageRequest {
  text: string;
  kind?: 'user' | 'reminder';
}

export interface SendMessageResponse {
  messageId: string;
  bookmark: Bookmark;
}