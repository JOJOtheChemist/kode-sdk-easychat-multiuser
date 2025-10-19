import { useWindowSize } from "@uidotdev/usehooks";
import { MobileLayout } from "./mobile-layout";
import { DesktopLayout } from "./desktop-layout";

export function ConversationMain() {
  const { width } = useWindowSize();

  if (width && width <= 1024) {
    return <MobileLayout />;
  }

  return <DesktopLayout />;
}
