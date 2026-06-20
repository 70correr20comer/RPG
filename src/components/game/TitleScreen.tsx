import { useGameStore } from '../../game/store';
import { motion } from 'framer-motion';
import { Play, Swords, Shield, Sparkles, Map, Save, Trash2 } from 'lucide-react';

export default function TitleScreen() {
  const startGame = useGameStore(s => s.startGame);
  const continueGame = useGameStore(s => s.continueGame);
  const hasSave = useGameStore(s => s.hasSave);
  const deleteSave = useGameStore(s => s.deleteSave);
  const screen = useGameStore(s => s.screen);

  if (screen !== 'title') return null;

  const saveExists = hasSave();

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-indigo-400/30 rounded-full"
            initial={{
              x: Math.random() * 100 + '%',
              y: Math.random() * 100 + '%',
            }}
            animate={{
              y: [null, '-10%'],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center relative z-10"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', damping: 12 }}
          className="mb-8"
        >
          <div className="text-6xl mb-4">⚔️</div>
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400 mb-2">
            ISOMETRIC RPG
          </h1>
          <p className="text-slate-400 text-lg">Terras Cinzas</p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center gap-6 mb-10"
        >
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Swords size={16} className="text-orange-400" />
            <span>Combate</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Shield size={16} className="text-cyan-400" />
            <span>Atributos</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Sparkles size={16} className="text-purple-400" />
            <span>Feitiços</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Map size={16} className="text-green-400" />
            <span>2 Mapas</span>
          </div>
        </motion.div>

        {/* Start Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col items-center gap-3"
        >
          {saveExists && (
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(34, 197, 94, 0.4)' }}
              whileTap={{ scale: 0.95 }}
              onClick={continueGame}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-shadow flex items-center gap-3"
            >
              <Save size={20} />
              CONTINUAR
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(99, 102, 241, 0.4)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { if (saveExists) deleteSave(); startGame(); }}
            className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow flex items-center gap-3"
          >
            <Play size={20} />
            {saveExists ? 'NOVO JOGO' : 'JOGAR'}
          </motion.button>

          {saveExists && (
            <button
              onClick={() => { if (confirm('Apagar save?')) { deleteSave(); } }}
              className="text-xs text-slate-600 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <Trash2 size={12} />
              Apagar save
            </button>
          )}
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 space-y-1"
        >
          <p className="text-slate-600 text-xs">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">WASD</kbd> Mover
            {' · '}
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Espaço</kbd> Atacar
            {' · '}
            <kbd className="px-1.5 py-0.5 bg-red-900 rounded text-red-300 font-mono">F</kbd>🔥
            {' '}
            <kbd className="px-1.5 py-0.5 bg-blue-900 rounded text-blue-300 font-mono">G</kbd>❄️
            {' '}
            <kbd className="px-1.5 py-0.5 bg-green-900 rounded text-green-300 font-mono">V</kbd>🪨
            {' '}
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">R</kbd>💨
          </p>
          <p className="text-slate-600 text-xs">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">E</kbd> Interagir
            {' · '}
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Tab</kbd> Atributos
            {' · '}
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">P</kbd> Poção
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
