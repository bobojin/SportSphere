import { useLayoutEffect, useRef } from "react";

export function useTopbarOffset() {
  const topbarRef = useRef(null);

  useLayoutEffect(() => {
    const element = topbarRef.current;
    if (!element || typeof window === "undefined") {
      return undefined;
    }

    const rootStyle = document.documentElement.style;
    const updateOffset = () => {
      const { height } = element.getBoundingClientRect();
      rootStyle.setProperty("--topbar-offset", `${Math.ceil(height)}px`);
    };

    updateOffset();

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateOffset) : null;
    resizeObserver?.observe(element);
    window.addEventListener("resize", updateOffset);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateOffset);
      rootStyle.removeProperty("--topbar-offset");
    };
  }, []);

  return topbarRef;
}
