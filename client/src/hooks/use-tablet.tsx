import { useState, useEffect } from 'react';

export const useIsTablet = (): boolean => {
  const [isTablet, setIsTablet] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 0;
      setIsTablet(w >= 640 && w < 1024);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return isTablet;
};
