import React from "react";

export function ErrorBoundary() {
  return (
    <div style={{ minHeight: "100vh", background: "#0b0c0f", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ padding: "24px", background: "#161821", borderRadius: "12px" }}>
        <h1 style={{ fontSize: "18px", marginBottom: "8px" }}>出错了</h1>
        <p>请检查后端服务是否运行。</p>
      </div>
    </div>
  );
}

export default function RootLayout({ children }: React.PropsWithChildren) {
  return <>{children}</>;
}
