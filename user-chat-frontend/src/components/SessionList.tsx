import React from 'react';
import { Session } from '../types';
import './SessionList.css';

interface SessionListProps {
  sessions: Session[];
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
}

const SessionList: React.FC<SessionListProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateSession
}) => {
  return (
    <div className="session-list">
      <div className="session-list-header">
        <h2>用户: user2</h2>
        <button className="create-session-btn" onClick={onCreateSession}>
          ＋ 新建对话
        </button>
      </div>
      
      <div className="sessions">
        {sessions.map(session => (
          <div
            key={session.id}
            className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
            onClick={() => onSelectSession(session.id)}
          >
            <div className="session-name">{session.name}</div>
            <div className="session-id">{session.id}</div>
          </div>
        ))}
      </div>

      <div className="session-list-footer">
        <div className="info-item">
          <strong>后端:</strong> localhost:2500
        </div>
        <div className="info-item">
          <strong>前端:</strong> localhost:8888
        </div>
        <div className="info-item">
          <strong>Agent:</strong> schedule-assistant
        </div>
      </div>
    </div>
  );
};

export default SessionList;

