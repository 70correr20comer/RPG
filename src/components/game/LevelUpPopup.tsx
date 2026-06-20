import { useGameStore } from '../../game/store';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { Star } from 'lucide-react';

export default function LevelUpPopup() {
  const levelUpMessage = useGameStore(s => s.levelUpMessage);
  const clearLevelUpMessage = useGameStore(s => s.clearLevelUpMessage);

  useEffect(() => {
    if (levelUpMessage) {
      const timer = setTimeout(clearLevelUpMessage, 3000);
      return () => clearTimeout(timer);
    }
  }, [levelUpMessage, clearLevelUpMessage]);

  return (
    <AnimatePresence>
      {levelUpMessage && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-40"
        >
          <div className="bg-gradient-to-b from-amber-950 to-slate-950 rounded-2xl shadow-2xl border border-amber-500/30 p-5 max-w-sm mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Star size={24} className="text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-amber-300">Level Up!</h3>
            </div>
            <p className="text-sm text-slate-300">{levelUpMessage}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
