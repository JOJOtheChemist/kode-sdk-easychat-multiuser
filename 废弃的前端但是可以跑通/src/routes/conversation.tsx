import React from "react";
import { useParams } from "react-router";
import { ChatPage } from "../minimal/chat-page";

export default function ConversationRoute() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId ?? "demo";

  return <ChatPage conversationId={conversationId} />;
}
