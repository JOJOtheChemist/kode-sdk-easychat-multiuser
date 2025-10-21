import React, { useState } from 'react';
import { Session } from '../types';

interface SessionListProps {
  sessions: Session[];
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

const SessionList: React.FC<SessionListProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleStartEdit = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingName(session.name);
  };

  const handleSaveEdit = () => {
    if (editingSessionId && editingName.trim()) {
      onRenameSession(editingSessionId, editingName.trim());
      setEditingSessionId(null);
      setEditingName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个会话吗？')) {
      onDeleteSession(sessionId);
    }
  };
  return (
    <div className="session-list">
      <div className="session-list-header">
        <h2>用户: yeya</h2>
        <button 
          className="send-button" 
          onClick={onCreateSession}
          style={{ marginTop: '12px', width: '100%' }}
        >
          ＋ 新建对话
        </button>
      </div>
      
      <div className="session-list-content custom-scrollbar">
        {sessions.map(session => (
          <div
            key={session.id}
            className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
            onClick={() => onSelectSession(session.id)}
          >
            {editingSessionId === session.id ? (
              <input
                type="text"
                className="chat-input"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveEdit}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  background: 'var(--bg-input)', 
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: 'var(--text-content)',
                  fontSize: '14px'
                }}
              />
            ) : (
              <>
                <div className="session-item-name">{session.name}</div>
                <div className="session-item-time">
                  {session.createdAt.toLocaleDateString()}
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  marginTop: '8px',
                  opacity: session.id === currentSessionId ? 1 : 0,
                  transition: 'opacity 0.2s ease'
                }}>
                  <button
                    className="send-button"
                    style={{ 
                      padding: '4px 8px', 
                      fontSize: '12px',
                      background: 'var(--bg-editor-active)',
                      color: 'var(--text-content)'
                    }}
                    onClick={(e) => handleStartEdit(e, session)}
                    title="重命名会话"
                  >
                    ✏️
                  </button>
                  <button
                    className="send-button"
                    style={{ 
                      padding: '4px 8px', 
                      fontSize: '12px',
                      background: 'var(--color-danger)',
                      color: 'white'
                    }}
                    onClick={(e) => handleDelete(e, session.id)}
                    title="删除会话"
                  >
                    🗑️
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{ 
        padding: '16px', 
        borderTop: '1px solid var(--border)',
        fontSize: '12px',
        color: 'var(--text-basic)',
        background: 'var(--bg-editor-sidebar)'
      }}>
        <div style={{ marginBottom: '4px' }}>
          <strong>后端:</strong> localhost:2500
        </div>
        <div style={{ marginBottom: '4px' }}>
          <strong>前端:</strong> localhost:8888
        </div>
        <div>
          <strong>Agent:</strong> schedule-assistant
        </div>
      </div>
    </div>
  );
};

export default SessionList;

