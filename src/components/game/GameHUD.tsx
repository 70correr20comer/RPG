import { useEffect } from 'react';
import { useGameStore } from '../../game/store';
import { Star, ScrollText, Target } from 'lucide-react';

const MAP_NAMES: Record<string, string> = {
  CidadeCentral: '🏠 Cidade Central',
  TerrasCinzas: '⚔️ Terras Cinzas',
  TerrasCinzaEscuro: '🌑 Terras Cinza Escuro',
  TerrasForte: '💀 Arena do Boss',
  NovaCidade: '🏰 Nova Cidade',
};

export default function GameHUD() {
  const player = useGameStore(s => s.player);
  const currentMap = useGameStore(s => s.currentMap);
  const quests = useGameStore(s => s.quests);
  const bossState = useGameStore(s => s.bossState);
  const showControls = useGameStore(s => s.showControls);
  const tutorialVisible = useGameStore(s => s.tutorialVisible);

  const hpPercent = (player.currentHealth / player.maxHealth) * 100;
  const xpPercent = (player.currentXP / player.requiredXP) * 100;

  const activeQuests = quests.filter(q => q.status === 'active');
  const boss = bossState?.enemy;

  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none z-10">
      {/* Boss HP Bar (full width) */}
      {boss && bossState?.active && (
        <div className="mx-auto max-w-lg px-3 pt-1.5">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg p-2 border border-purple-500/30">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-purple-400 font-bold text-xs">
                {boss.isDragonForm ? '🐉' : '💀'} {boss.name}
              </span>
              <span className="text-purple-300 text-[10px]">
                {boss.isDragonForm ? '🐉 DRAGÃO' : `Fase ${boss.bossPhase || 1}`}
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  boss.isDragonForm
                    ? 'bg-gradient-to-r from-red-600 via-orange-500 to-red-600'
                    : 'bg-gradient-to-r from-purple-600 to-red-500'
                }`}
                style={{ width: `${(boss.health / boss.maxHealth) * 100}%` }}
              />
            </div>
            <div className="text-right text-[10px] text-purple-300 mt-0.5">
              {Math.round(boss.health)} / {boss.maxHealth}
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-start justify-between p-2">
        {/* Left: Player Stats (Compact) */}
        <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 space-y-1 pointer-events-auto min-w-[180px] max-w-[200px]">
          {/* Level */}
          <div className="flex items-center gap-1 text-amber-400">
            <Star size={11} />
            <span className="font-bold text-xs">Nível {player.level}</span>
          </div>

          {/* HP Bar */}
          <div className="space-y-0">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-red-400">❤ HP</span>
              <span className="text-slate-300">{player.currentHealth}/{player.maxHealth}</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-300" style={{ width: `${hpPercent}%` }} />
            </div>
          </div>

          {/* XP Bar */}
          <div className="space-y-0">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-purple-400">⭐ XP</span>
              <span className="text-slate-300">{player.currentXP.toFixed(0)}/{player.requiredXP}</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-300" style={{ width: `${xpPercent}%` }} />
            </div>
          </div>

          {/* Coins & Potions */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-yellow-400">💰 {player.coins}</span>
            <span className="text-green-400">💊 {player.healthPotions}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-[10px] flex-wrap">
            <span className="text-orange-300">⚔ {player.esgrima + player.flatPhysicalDamage}</span>
            <span className="text-blue-300">✦ {player.afinidade}</span>
            <span className="text-green-300">❤ {player.vitalidade}</span>
            <span className="text-cyan-300">🛡 {player.flatDefense}</span>
            {player.hasAOE && <span className="text-amber-400 font-bold">⚔ AOE</span>}
          </div>

          {/* Shadow Shield Status */}
          {(player as any).hasShadowShield && (
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-purple-300">🛡️ Escudo</span>
              {(player as any).shadowShieldCooldown > 0 ? (
                <span className="text-red-400">CD:{Math.ceil((player as any).shadowShieldCooldown)}s</span>
              ) : (player as any).shadowShieldActive ? (
                <span className="text-green-400 animate-pulse">ATIVO</span>
              ) : (
                <span className="text-slate-400">Shift</span>
              )}
            </div>
          )}

          {/* Spell Info */}
          {Object.keys(player.purchasedSpells || {}).length > 0 && (
            <div className="text-[9px] text-slate-500">
              Magias: {Object.entries(player.purchasedSpells || {}).map(([el, tier]) => {
                const icons: Record<string, string> = { Fire: '🔥', Water: '❄️', Earth: '🪨', Air: '💨' };
                return `${icons[el] || ''} Lv${tier}`;
              }).join(' · ')}
            </div>
          )}

          {/* Spell Bar */}
          <div className="flex items-center gap-1 mt-0.5">
            {[
              { key: 'F', element: 'Fire' as const, icon: '🔥', color: 'from-red-500 to-orange-500', tierColor: 'text-orange-300' },
              { key: 'G', element: 'Water' as const, icon: '❄️', color: 'from-blue-500 to-cyan-500', tierColor: 'text-blue-300' },
              { key: 'V', element: 'Earth' as const, icon: '🪨', color: 'from-green-500 to-emerald-500', tierColor: 'text-green-300' },
              { key: 'R', element: 'Air' as const, icon: '💨', color: 'from-slate-400 to-slate-300', tierColor: 'text-slate-200' },
            ].map(spell => {
              const isActive = player.equippedSpell === spell.element;
              const isPurchased = (player.purchasedSpells as Record<string, number> | undefined)?.[spell.element] !== undefined;
              const purchasedTier = (player.purchasedSpells as Record<string, number> | undefined)?.[spell.element] || 0;
              const canCast = player.attackCooldown <= 0 && isPurchased;
              return (
                <div
                  key={spell.element}
                  className={`relative flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] transition-all ${
                    isPurchased
                      ? isActive
                        ? `bg-gradient-to-r ${spell.color} text-white shadow-lg`
                        : 'bg-slate-700/80 text-slate-200 border border-slate-500/50'
                      : 'bg-slate-800/50 text-slate-600'
                  }`}
                >
                  <kbd className={`px-0.5 rounded text-[8px] font-mono ${isPurchased ? 'bg-white/20' : 'bg-slate-700'}`}>
                    {spell.key}
                  </kbd>
                  <span className={isPurchased ? '' : 'opacity-40'}>{spell.icon}</span>
                  {isPurchased && (
                    <span className={`text-[8px] ${isActive ? 'opacity-80' : spell.tierColor}`}>Lv{purchasedTier}</span>
                  )}
                  {!canCast && isPurchased && <div className="absolute inset-0 bg-black/40 rounded" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Map Name (no timer) */}
        <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 text-right pointer-events-auto">
          <div className="flex items-center gap-1 text-slate-300 text-xs">
            {MAP_NAMES[currentMap] || currentMap}
          </div>
        </div>
      </div>

      {/* Quest Tracker (left side, below stats) */}
      {activeQuests.length > 0 && (
        <div className="absolute left-2 top-[240px] pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 min-w-[170px] border border-cyan-500/20">
            <div className="flex items-center gap-1 text-cyan-400 mb-1">
              <ScrollText size={10} />
              <span className="font-bold text-[10px]">MISSÕES</span>
            </div>
            {activeQuests.map(quest => (
              <div key={quest.id} className="mb-1.5 last:mb-0">
                <div className="flex items-center gap-1 text-[10px] text-white font-medium">
                  <Target size={8} className="text-cyan-400" />
                  {quest.name}
                </div>
                <div className="text-[9px] text-slate-400 mt-0">
                  {quest.description}
                </div>
                <div className="mt-0.5 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (quest.currentCount / quest.targetCount) * 100)}%` }}
                  />
                </div>
                <div className="text-[9px] text-cyan-300 mt-0">
                  {quest.currentCount}/{quest.targetCount}
                  {quest.currentCount >= quest.targetCount && (
                    <span className="text-green-400 ml-1">✓ Fale NPC</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom: Controls hint (auto-hide after 40s) */}
      {showControls && tutorialVisible && (
      <div className="absolute bottom-0 left-0 right-0 p-2">
        <div className="text-center">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 inline-block text-[10px] text-slate-500">
            <kbd className="px-0.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">WASD</kbd> Mover
            {' · '}
            <kbd className="px-0.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Espaço</kbd> Atacar
            {' · '}
            <kbd className="px-0.5 py-0.5 bg-red-900 rounded text-red-300 font-mono">F</kbd>🔥
            {' '}
            <kbd className="px-0.5 py-0.5 bg-blue-900 rounded text-blue-300 font-mono">G</kbd>❄️
            {' '}
            <kbd className="px-0.5 py-0.5 bg-green-900 rounded text-green-300 font-mono">V</kbd>🪨
            {' '}
            <kbd className="px-0.5 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">R</kbd>💨
            {' · '}
            <kbd className="px-0.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">E</kbd> Loja/NPC
            {' · '}
            <kbd className="px-0.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Tab</kbd> Atributos
            {' · '}
            <kbd className="px-0.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">P</kbd> Poção
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
