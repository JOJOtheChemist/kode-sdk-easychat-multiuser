import { ChatInterface } from "../../chat/chat-interface";

export function ChatInterfaceWrapper() {
  return (
    <div className="flex justify-center w-full h-full">
      <div className="w-full transition-all duration-300 ease-in-out max-w-6xl">
        <ChatInterface />
      </div>
    </div>
  );
}
