interface ChatSuggestionsProps {
  onSuggestionsClick: (value: string) => void;
}

export function ChatSuggestions(_props: ChatSuggestionsProps) {
  // Temporarily hide default chat suggestions during the demo.
  return null;
}

/*
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { I18nKey } from "#/i18n/declaration";
import { Suggestions } from "#/components/features/suggestions/suggestions";
import BunnyClock from "#/icons/chat-suggestions-rabbit.png";
import { SUGGESTIONS } from "#/utils/suggestions";
import { useConversationStore } from "#/state/conversation-store";

const SUGGESTION_TITLE_FONT_SIZE_PX = 32;
const BUNNY_CLOCK_ASPECT_RATIO = 726 / 1094;
const BUNNY_CLOCK_HEIGHT_PX = SUGGESTION_TITLE_FONT_SIZE_PX * 11;
const BUNNY_CLOCK_WIDTH_PX = Math.round(
  BUNNY_CLOCK_HEIGHT_PX * BUNNY_CLOCK_ASPECT_RATIO,
);

export function ChatSuggestions({ onSuggestionsClick }: ChatSuggestionsProps) {
  const { t } = useTranslation();
  const { shouldHideSuggestions } = useConversationStore();
  const landingTitle = t(I18nKey.HOME$LETS_START_BUILDING);

  return (
    <AnimatePresence>
      {!shouldHideSuggestions && (
        <motion.div
          data-testid="chat-suggestions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute top-0 left-0 right-0 bottom-[151px] flex flex-col items-center justify-center pointer-events-auto"
        >
          <div className="flex flex-col items-center p-4 rounded-xl w-full">
            <img
              src={BunnyClock}
              alt={landingTitle}
              loading="lazy"
              width={BUNNY_CLOCK_WIDTH_PX}
              height={BUNNY_CLOCK_HEIGHT_PX}
              className="max-w-full object-contain"
              style={{
                width: `${BUNNY_CLOCK_WIDTH_PX}px`,
                height: `${BUNNY_CLOCK_HEIGHT_PX}px`,
              }}
            />
            <span className="text-[32px] font-bold leading-5 text-white pt-4 pb-6">
              {landingTitle}
            </span>
          </div>
          <Suggestions
            suggestions={Object.entries(SUGGESTIONS.repo)
              .slice(0, 4)
              .map(([label, value]) => ({
                label,
                value,
              }))}
            onSuggestionClick={onSuggestionsClick}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
*/
