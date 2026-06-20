import { useGameStore } from '../../game/store';
import { SHOP_ITEMS, DARK_SHOP_ITEMS } from '../../game/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, ShoppingCart, Shield, Swords, Sparkles, Heart } from 'lucide-react';

const typeIcons: Record<string, JSX.Element> = {
  Potion: <Heart size={16} className="text-green-400" />,
  Armor: <Shield size={16} className="text-cyan-400" />,
  Sword: <Swords size={16} className="text-orange-400" />,
  Spell: <Sparkles size={16} className="text-purple-400" />,
};

export default function ShopPanel() {
  const screen = useGameStore(s => s.screen);
  const player = useGameStore(s => s.player);
  const buyItem = useGameStore(s => s.buyItem);
  const setScreen = useGameStore(s => s.setScreen);

  const isDarkShop = screen === 'darkShop';
  const isOpen = screen === 'shop' || screen === 'darkShop';

  if (!isOpen) return null;

  const items = isDarkShop ? DARK_SHOP_ITEMS : SHOP_ITEMS;

  const categories = isDarkShop
    ? [
        { label: '✨ Feitiços Avançados', items: items.filter(i => i.type === 'Spell') },
        { label: '🛡 Equipamento Sombrio', items: items.filter(i => i.type === 'Armor' || i.type === 'Sword') },
        { label: '💊 Consumíveis', items: items.filter(i => i.type === 'Potion') },
      ]
    : [
        { label: '⭐ Presente Grátis', items: items.filter(i => i.price === 0) },
        { label: 'Consumíveis', items: items.filter(i => i.type === 'Potion') },
        { label: 'Armaduras', items: items.filter(i => i.type === 'Armor') },
        { label: 'Espadas', items: items.filter(i => i.type === 'Sword' && i.price > 0) },
        { label: 'Feitiços', items: items.filter(i => i.type === 'Spell') },
      ];

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
          className={`rounded-2xl shadow-2xl border max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden ${
            isDarkShop
              ? 'bg-gradient-to-b from-purple-950 to-slate-950 border-purple-500/30'
              : 'bg-gradient-to-b from-slate-900 to-slate-950 border-slate-700/50'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${
            isDarkShop ? 'border-purple-500/30' : 'border-slate-700/50'
          }`}>
            <div className="flex items-center gap-3">
              <ShoppingCart size={20} className={isDarkShop ? 'text-purple-400' : 'text-amber-400'} />
              <h2 className="text-lg font-bold text-white">
                {isDarkShop ? '🏚️ Cabana do Mercador Sombrio' : 'Loja do Mercador'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-yellow-400 text-sm flex items-center gap-1">
                <Coins size={14} /> {player.coins}
              </span>
              <button
                onClick={() => setScreen('playing')}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
            {categories.map(cat => (
              <div key={cat.label}>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {cat.label}
                </h3>
                <div className="space-y-2">
                  {cat.items.map(item => {
                    const isFree = item.price === 0;
                    const canAfford = isFree || player.coins >= item.price;
                    return (
                      <motion.button
                        key={item.id}
                        whileHover={canAfford ? { scale: 1.01 } : undefined}
                        whileTap={canAfford ? { scale: 0.99 } : undefined}
                        onClick={() => canAfford && buyItem(item.id)}
                        disabled={!canAfford}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          isFree
                            ? 'bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-500/40 hover:border-amber-400/60 cursor-pointer'
                            : canAfford
                              ? isDarkShop
                                ? 'bg-purple-900/30 border-purple-500/30 hover:bg-purple-800/30 hover:border-purple-400/50 cursor-pointer'
                                : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50 cursor-pointer'
                              : 'bg-slate-900/50 border-slate-800/50 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isDarkShop ? 'bg-purple-700/50' : 'bg-slate-700/50'
                        }`}>
                          {typeIcons[item.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white">{item.name}</div>
                          <div className="text-xs text-slate-400">{item.description}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {isFree ? (
                            <div className="text-sm font-bold text-amber-400">GRÁTIS</div>
                          ) : (
                            <>
                              <div className={`text-sm font-bold ${canAfford ? 'text-yellow-400' : 'text-slate-600'}`}>
                                {item.price}
                              </div>
                              <div className="text-xs text-slate-500">moedas</div>
                            </>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className={`p-3 border-t text-center ${isDarkShop ? 'border-purple-500/30' : 'border-slate-700/50'}`}>
            <span className="text-xs text-slate-500">
              Pressione <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Esc</kbd> ou{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">E</kbd> para fechar
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
