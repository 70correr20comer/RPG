import { useEffect, useState } from 'react';

export function useIsMobileControls() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia?.('(pointer: coarse) and (hover: none)');
    if (!mql) {
      setEnabled('ontouchstart' in window);
      return;
    }
    const update = () => setEnabled(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return enabled;
}
