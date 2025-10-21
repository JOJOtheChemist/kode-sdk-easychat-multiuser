import React from 'react';

interface QuickTemplatesProps {
  onSelectTemplate: (template: string) => void;
}

const templates = [
  '记录当日工作完成：今日[时间段]工作完成，速记高光时刻！',
  '添加新日程：新增日程安排，让每一刻都有意义！',
  '总结近期工作：总结近期工作，看见成长每一步！',
  '查询近期日程：查近期日程，从容掌控每一天！',
  '创建新任务（含项目/子任务）：创建新任务（含项目子任务），开启高效挑战！',
  '删除日程/任务：删除冗余日程/任务，聚焦重要优先项！',
  '查询高频任务（项目/子任务）：查高频任务（项目子任务），优化效率再升级！'
];

const QuickTemplates: React.FC<QuickTemplatesProps> = ({ onSelectTemplate }) => {
  return (
    <div style={{ 
      padding: '16px 20px', 
      background: 'var(--bg-base-secondary)',
      borderBottom: '1px solid var(--border)'
    }}>
      <div style={{ 
        fontSize: '12px', 
        color: 'var(--text-basic)', 
        marginBottom: '8px',
        fontWeight: '500'
      }}>
        💡 快捷操作
      </div>
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        flexWrap: 'wrap' 
      }}>
        {templates.map((template, index) => (
          <button
            key={index}
            className="send-button"
            onClick={() => onSelectTemplate(template)}
            type="button"
            style={{
              background: 'var(--bg-editor-active)',
              color: 'var(--text-content)',
              border: '1px solid var(--border)',
              fontSize: '12px',
              fontWeight: '500',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
              lineHeight: '1.4',
              maxWidth: '280px',
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-primary)';
              e.currentTarget.style.color = 'var(--bg-base)';
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-editor-active)';
              e.currentTarget.style.color = 'var(--text-content)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            {template}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickTemplates;