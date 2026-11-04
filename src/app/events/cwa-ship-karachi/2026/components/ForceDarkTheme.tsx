"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

const ForceDarkTheme = () => {
  const { theme, setTheme } = useTheme();
  const previousThemeRef = useRef<string>("system");
  const hasAppliedRef = useRef(false);

  useEffect(() => {
    if (!hasAppliedRef.current) {
      previousThemeRef.current = theme || "system";
      setTheme("dark");
      hasAppliedRef.current = true;
    }

    return () => {
      setTheme(previousThemeRef.current);
    };
  }, [setTheme, theme]);

  return null;
};

export default ForceDarkTheme;
