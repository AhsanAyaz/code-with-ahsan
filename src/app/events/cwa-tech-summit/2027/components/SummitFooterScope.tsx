"use client";

import { useEffect } from "react";

/**
 * The site footer is rendered by the root layout, outside this page. While the
 * summit page is mounted, flag <body> with data-summit so the scoped styles in
 * this route's layout (SUMMIT_FOOTER_CSS) can restyle it; the flag goes when
 * the visitor navigates away, so no other page is affected.
 */
const SummitFooterScope = () => {
  useEffect(() => {
    document.body.setAttribute("data-summit", "");
    return () => document.body.removeAttribute("data-summit");
  }, []);
  return null;
};

export default SummitFooterScope;
