import React from "react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { TIPS, getRandomTip } from "#/utils/tips";

export function RandomTip() {
  const { t } = useTranslation();
  const [randomTip, setRandomTip] = React.useState(() => TIPS[0]);

  // Update the random tip after the component mounts to avoid SSR mismatches.
  React.useEffect(() => {
    setRandomTip(getRandomTip());
  }, []);

  if (!randomTip) {
    return null;
  }

  return (
    <div className="space-y-1">
      <h4 className="font-bold">{t(I18nKey.TIPS$PROTIP)}:</h4>
      <p>
        {t(randomTip.key)}{" "}
        {randomTip.link ? (
          <a
            href={randomTip.link}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {t(I18nKey.TIPS$LEARN_MORE)}
          </a>
        ) : null}
      </p>
    </div>
  );
}
