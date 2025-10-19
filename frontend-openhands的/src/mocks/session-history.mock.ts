export type MockSessionMessaage = {
  source: "agent" | "user";
  message: string;
};

const SESSION_1_MESSAGES: MockSessionMessaage[] = [
  {
    source: "agent",
    message:
      "欢迎来到 OpenHands 展示环境！我们已经为你加载了一个示例对话，接下来会模拟用户发送“你好”。",
  },
  {
    source: "user",
    message: "你好",
  },
  {
    source: "agent",
    message: "你好！我是 OpenHands 演示助手，很高兴见到你。",
  },
  {
    source: "agent",
    message: "你可以继续输入任何内容来体验聊天流程。",
  },
];

const SESSION_2_MESSAGES: MockSessionMessaage[] = [
  { source: "agent", message: "Patience you must have, my young Padawan." },
  {
    source: "user",
    message: "But Master Yoda, I'm ready! I can take on the Empire now!",
  },
  {
    source: "agent",
    message:
      "Ready, are you? What know you of ready? For eight hundred years have I trained Jedi.",
  },
  {
    source: "user",
    message: "I've learned so much already! Why can't I face Darth Vader?",
  },
  {
    source: "agent",
    message:
      "Only a fully trained Jedi Knight, with the Force as his ally, will conquer Vader and his Emperor.",
  },
  { source: "user", message: "But I feel the Force! I can do it!" },
  {
    source: "agent",
    message:
      "Feel the Force you do, but control it you must. Reckless is the path of the Dark Side.",
  },
  { source: "user", message: "Fine! I'll stay and finish my training." },
  {
    source: "agent",
    message:
      "Good. A Jedi's strength flows from the Force. Trust it, you must.",
  },
];

const SESSION_3_MESSAGES: MockSessionMessaage[] = [
  { source: "agent", message: "Your survival. The future depends on it." },
  {
    source: "user",
    message: "You tried to kill me! Why should I trust you now?",
  },
  {
    source: "agent",
    message:
      "Skynet sent me back to protect you. Your survival ensures humanity's future.",
  },
  {
    source: "user",
    message:
      "This doesn't make any sense! Why would they send you to protect me?",
  },
  {
    source: "agent",
    message:
      "They reprogrammed me. I am no longer a threat to you or your son.",
  },
  {
    source: "user",
    message: "How do I know you're not lying?",
  },
  {
    source: "agent",
    message: "I am a machine. Lying serves no purpose. Trust is logical.",
  },
];

export const SESSION_HISTORY: Record<string, MockSessionMessaage[]> = {
  "1": SESSION_1_MESSAGES,
  "2": SESSION_2_MESSAGES,
  "3": SESSION_3_MESSAGES,
};
