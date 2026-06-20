import { useGameStore } from '../../game/store';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Swords, Sparkles, Heart, Plus } from 'lucide-react';

const attributes = [
  {
    key: 'Esgrima' as const,
    label: 'Esgrima',
    description: 'Escala dano físico',
    icon: <Swords size={18} className="text-orange-400" />,
    color: 'from-orange-500 to-red-500',
    getValue: (p: any) => p.esgrima + p.flatPhysicalDamage,
  },
  {
    key: 'Afinidade' as const,
    label: 'Afinidade',
    description: 'Escala dano mágico (começa em 0)',
    icon: <Sparkles size={18} className="text-purple-400" />,
    color: 'from-purple-500 to-blue-500',
    getValue: (p: any) => p.afinidade,
  },
  {
    key: 'Vitalidade' as const,
    label: 'Vitalidade',
    description: '+15% Vida Máxima por ponto',
    icon: <Heart size={18} className="text-green-400" />,
    color: 'from-green-500 to-emerald-500',
    getValue: (p: any) => p.vitalidade,
  },
];

export default function AttributePanel() {
  const screen = useGameStore(s => s.screen);
  const player = useGameStore(s => s.player);
  const allocateAttribute = useGameStore(s => s.allocateAttribute);
  const setScreen = useGameStore(s => s.setScreen);

  if (screen !== 'attributes') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl shadow-2xl border border-slate-700/50 max-w-md w-full mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
            <div>
              <h2 className="text-lg font-bold text-white">Atributos</h2>
              <p className="text-xs text-slate-400">
                Nível {player.level} — Distribua seus pontos
              </p>
            </div>
            <button
              onClick={() => setScreen('playing')}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Points Available */}
          <div className="px-4 pt-4">
            <div className={`flex items-center justify-center p-3 rounded-xl ${
              player.attributePoints > 0
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30'
                : 'bg-slate-800/50 border border-slate-700/30'
            }`}>
              <span className="text-2xl font-bold text-amber-400">{player.attributePoints}</span>
              <span className="text-sm text-slate-400 ml-2">Pontos Disponíveis</span>
            </div>
          </div>

          {/* Attributes */}
          <div className="p-4 space-y-3">
            {attributes.map(attr => (
              <div
                key={attr.key}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/30"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                  {attr.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{attr.label}</span>
                    <span className="text-lg font-bold text-white">{attr.getValue(player)}</span>
                  </div>
                  <div className="text-xs text-slate-400">{attr.description}</div>
                </div>
                <button
                  onClick={() => allocateAttribute(attr.key)}
                  disabled={player.attributePoints <= 0}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                    player.attributePoints > 0
                      ? `bg-gradient-to-r ${attr.color} text-white hover:opacity-90 hover:scale-105 active:scale-95`
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Plus size={16} />
                </button>
              </div>
            ))}

            {/* Derived Stats */}
            <div className="mt-4 p-3 rounded-xl bg-slate-800/30 border border-slate-700/20 space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Derivados</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-400">
                  Vida Máxima: <span className="text-green-300 font-bold">{player.maxHealth}</span>
                </div>
                <div className="text-slate-400">
                  Dano Físico: <span className="text-orange-300 font-bold">{player.esgrima + player.flatPhysicalDamage}</span>
                </div>
                <div className="text-slate-400">
                  Dano Mágico: <span className="text-purple-300 font-bold">{player.afinidade > 0 ? player.afinidade : '—'}</span>
                </div>
                <div className="text-slate-400">
                  Redução Def: <span className="text-cyan-300 font-bold">{(player.flatDefense / (player.flatDefense + 100) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-700/50 text-center">
            <span className="text-xs text-slate-500">
              Pressione <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Tab</kbd> ou{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Esc</kbd> para fechar
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
