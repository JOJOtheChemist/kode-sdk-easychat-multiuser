import { ChatInterface } from "../../chat/chat-interface";
import { ConversationTabContent } from "../conversation-tabs/conversation-tab-content/conversation-tab-content";

export function MobileLayout() {
  return (
    <div className="relative flex-1 flex flex-col">
      {/* Chat area - 强制全屏显示 */}
      <div className="bg-base overflow-hidden flex-1">
        <ChatInterface />
      </div>

      {/* Bottom panel - 完全隐藏 */}
      <div style={{ display: "none" }}>
        <div className="h-full flex flex-col gap-3 pb-2 md:pb-0 pt-2">
          <ConversationTabContent />
        </div>
      </div>
    </div>
  );
}
