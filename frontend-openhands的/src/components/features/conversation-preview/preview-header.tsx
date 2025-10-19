import React from "react";

type PreviewHeaderProps = {
  onReset: () => void;
};

export function PreviewHeader({ onReset }: PreviewHeaderProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-base p-4 shadow-md md:flex-row md:items-start md:justify-between">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-base-content/60">
          对话界面预览
        </p>
        <h1 className="text-xl font-semibold text-base-content">
          Kode Conversation Prototype
        </h1>
        <p className="text-sm text-base-content/70">
          该页面用于快速演示新版会话界面的布局，尚未接入实时数据与 WebSocket
          流程。
        </p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center justify-center rounded-md border border-base-300 bg-base-200 px-3 py-2 text-sm font-medium text-base-content shadow-sm transition hover:border-base-400 hover:bg-base-100"
      >
        重置预览
      </button>
    </div>
  );
}
