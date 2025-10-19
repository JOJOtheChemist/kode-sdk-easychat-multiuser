import React from "react";

type PreviewComposerProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
};

export function PreviewComposer({
  value,
  disabled,
  onChange,
  onSubmit,
}: PreviewComposerProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(value);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-base-300 bg-base p-4 shadow-sm"
    >
      <label className="text-sm font-medium text-base-content/70">
        输入消息（已为你填入'你好'）
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="w-full resize-none rounded-md border border-base-300 bg-base px-3 py-2 text-sm text-base-content outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        placeholder="试着向助手打个招呼吧…"
        aria-label="模拟会话输入框"
        disabled={disabled}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-base-content/60">
          当前演示不会真正发送数据，仅用于观察 UI 表现。
        </p>

        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-content transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          发送
        </button>
      </div>
    </form>
  );
}
