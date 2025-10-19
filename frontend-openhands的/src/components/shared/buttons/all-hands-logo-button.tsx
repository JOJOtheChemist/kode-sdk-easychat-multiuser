import { useTranslation } from "node_modules/react-i18next";
import { I18nKey } from "#/i18n/declaration";
import SideBarLogo from "#/assets/branding/all-hands-sidebar.png";
import { TooltipButton } from "./tooltip-button";

export function AllHandsLogoButton() {
  const { t } = useTranslation();

  return (
    <TooltipButton
      tooltip={t(I18nKey.BRANDING$ALL_HANDS_AI)}
      ariaLabel={t(I18nKey.BRANDING$ALL_HANDS_LOGO)}
      navLinkTo="/"
    >
      <span className="flex h-[54px] w-[83px] items-center justify-center">
        <img
          src={SideBarLogo}
          alt=""
          loading="lazy"
          className="max-h-full max-w-full"
        />
      </span>
    </TooltipButton>
  );
}
