import { useState, useEffect } from 'react';

const STREAMER_MODE_KEY = 'streamer_mode_enabled';

export function useStreamerMode() {
  const [isStreamerMode, setIsStreamerMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STREAMER_MODE_KEY);
    if (stored === 'true') {
      setIsStreamerMode(true);
    }
  }, []);

  const toggleStreamerMode = () => {
    setIsStreamerMode((prev) => {
      const newValue = !prev;
      localStorage.setItem(STREAMER_MODE_KEY, String(newValue));
      return newValue;
    });
  };

  return { isStreamerMode, toggleStreamerMode };
}
