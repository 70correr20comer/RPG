import { useGameStore } from '../../game/store';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { Skull } from 'lucide-react';

export default function DeathPopup() {
  const deathMessage = useGameStore(s => s.deathMessage);
  const clearDeathMessage = useGameStore(s => s.clearDeathMessage);

  useEffect(() => {
    if (deathMessage) {
      const timer = setTimeout(clearDeathMessage, 5000);
      return () => clearTimeout(timer);
    }
  }, [deathMessage, clearDeathMessage]);

  return (
    <AnimatePresence>
      {deathMessage && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
        >
          <div className="bg-gradient-to-b from-red-950 to-slate-950 rounded-2xl shadow-2xl border border-red-500/30 p-5 max-w-sm mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Skull size={24} className="text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-red-300">Morte!</h3>
            </div>
            <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
              {deathMessage}
            </pre>
            <p className="text-xs text-slate-500 mt-3">
              Teleportado para a Cidade Central...
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
