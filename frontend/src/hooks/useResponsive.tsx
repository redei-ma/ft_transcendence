import { useState, useEffect } from 'react';

export function useResponsive() {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return {
    isMobile: width < 768,   // phones
    isTablet: width < 1040,  // phones + tablets (below desktop)
  };
}
