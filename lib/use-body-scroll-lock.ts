// Lock body scroll WITHOUT a layout shift. The naive `body.overflow = hidden`
// approach removes the OS scrollbar and shifts content right by 15–17 px on
// desktop. We compensate by also adding right padding equal to the scrollbar
// width, so the visible viewport width stays identical.

import { useEffect } from "react";

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const body = document.body;
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
    };
  }, [active]);
}
