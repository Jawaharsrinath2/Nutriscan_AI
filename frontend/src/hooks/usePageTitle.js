import { useEffect } from "react";

const APP = "NutriScan AI";

/** Sets the browser tab title for a page; restores the app name when the page unmounts. */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP}` : APP;
    return () => {
      document.title = APP;
    };
  }, [title]);
}
