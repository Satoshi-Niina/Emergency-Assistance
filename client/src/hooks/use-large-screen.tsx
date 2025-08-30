import { useState, useEffect } from 'react';

export const useIsLargeScreen = (): boolean => {
  const [isLarge, setIsLarge] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 0;
      setIsLarge(w >= 1280);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return isLarge;
};
