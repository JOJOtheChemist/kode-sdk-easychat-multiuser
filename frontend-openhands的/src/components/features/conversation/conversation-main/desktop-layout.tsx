import { ChatInterfaceWrapper } from "./chat-interface-wrapper";
import { ConversationTabContent } from "../conversation-tabs/conversation-tab-content/conversation-tab-content";

export function DesktopLayout() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel (Chat) - force full width */}
        <div className="flex flex-col bg-base overflow-hidden flex-1">
          <ChatInterfaceWrapper />
        </div>

        {/* Right Panel - hidden but retained for future expansion */}
        <div style={{ display: "none" }}>
          <div className="flex flex-col flex-1 gap-3 min-w-max h-full">
            <ConversationTabContent />
          </div>
        </div>
      </div>
    </div>
  );
}
