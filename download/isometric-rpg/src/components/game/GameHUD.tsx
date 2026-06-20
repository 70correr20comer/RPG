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
  const gameTime = useGameStore(s => s.gameTime);
  const quests = useGameStore(s => s.quests);
  const bossState = useGameStore(s => s.bossState);
  const showControls = useGameStore(s => s.showControls);

  const hpPercent = (player.currentHealth / player.maxHealth) * 100;
  const xpPercent = (player.currentXP / player.requiredXP) * 100;
  const minutes = Math.floor(gameTime / 60);
  const seconds = Math.floor(gameTime % 60);

  const activeQuests = quests.filter(q => q.status === 'active');
  const boss = bossState?.enemy;

  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none z-10">
      {/* Boss HP Bar (full width) */}
      {boss && bossState?.active && (
        <div className="mx-auto max-w-xl px-4 pt-2">
          <div className="bg-black/80 backdrop-blur-sm rounded-xl p-3 border border-purple-500/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-purple-400 font-bold text-sm">💀 {boss.name}</span>
              <span className="text-purple-300 text-xs">Fase {boss.bossPhase || 1}</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-red-500 rounded-full transition-all duration-300"
                style={{ width: `${(boss.health / boss.maxHealth) * 100}%` }}
              />
            </div>
            <div className="text-right text-xs text-purple-300 mt-0.5">
              {Math.round(boss.health)} / {boss.maxHealth}
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-start justify-between p-3">
        {/* Left: Player Stats */}
        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 space-y-2 pointer-events-auto min-w-[220px]">
          {/* Level */}
          <div className="flex items-center gap-2 text-amber-400">
            <Star size={14} />
            <span className="font-bold text-sm">Nível {player.level}</span>
            <span className="text-xs text-slate-400 ml-auto">Lvl {player.level}</span>
          </div>

          {/* HP Bar */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-red-400 flex items-center gap-1">❤ HP</span>
              <span className="text-slate-300">{player.currentHealth}/{player.maxHealth}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-300" style={{ width: `${hpPercent}%` }} />
            </div>
          </div>

          {/* XP Bar */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-400 flex items-center gap-1">⭐ XP</span>
              <span className="text-slate-300">{player.currentXP.toFixed(0)}/{player.requiredXP}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-300" style={{ width: `${xpPercent}%` }} />
            </div>
          </div>

          {/* Coins & Potions */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-yellow-400">💰 {player.coins}</span>
            <span className="text-green-400">💊 {player.healthPotions}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="text-orange-300">⚔ {player.esgrima + player.flatPhysicalDamage}</span>
            <span className="text-blue-300">✦ {player.afinidade}</span>
            <span className="text-green-300">❤ {player.vitalidade}</span>
            <span className="text-cyan-300">🛡 {player.flatDefense}</span>
            {player.hasAOE && <span className="text-amber-400 font-bold">⚔ AOE</span>}
          </div>

          {/* Shadow Shield Status */}
          {(player as any).hasShadowShield && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-purple-300">🛡️ Escudo Sombrio</span>
              {(player as any).shadowShieldCooldown > 0 ? (
                <span className="text-red-400">Cooldown: {Math.ceil((player as any).shadowShieldCooldown)}s</span>
              ) : (player as any).shadowShieldActive ? (
                <span className="text-green-400 animate-pulse">ATIVO</span>
              ) : (
                <span className="text-slate-400">Shift para ativar</span>
              )}
            </div>
          )}

          {/* Spell Tier Info */}
          {player.spellTier > 0 && (
            <div className="text-[10px] text-slate-500">
              Magias: Nível {player.spellTier}
              {player.spellTier >= 2 && <span className="text-amber-400"> · Área Pequena</span>}
              {player.spellTier >= 3 && <span className="text-red-400"> · Área Média</span>}
            </div>
          )}

          {/* Spell Bar */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Magias:</span>
            {[
              { key: 'F', element: 'Fire', icon: '🔥', color: 'from-red-500 to-orange-500' },
              { key: 'G', element: 'Water', icon: '❄️', color: 'from-blue-500 to-cyan-500' },
              { key: 'V', element: 'Earth', icon: '🪨', color: 'from-green-500 to-emerald-500' },
              { key: 'R', element: 'Air', icon: '💨', color: 'from-slate-400 to-slate-300' },
            ].map(spell => {
              const isActive = player.equippedSpell === spell.element;
              const canCast = player.attackCooldown <= 0;
              return (
                <div
                  key={spell.element}
                  className={`relative flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                    isActive
                      ? `bg-gradient-to-r ${spell.color} text-white shadow-lg`
                      : 'bg-slate-800/50 text-slate-400'
                  }`}
                >
                  <kbd className={`px-1 rounded text-[10px] font-mono ${isActive ? 'bg-white/20' : 'bg-slate-700'}`}>
                    {spell.key}
                  </kbd>
                  <span>{spell.icon}</span>
                  {isActive && player.spellTier > 0 && (
                    <span className="text-[10px] opacity-80">Lv{player.spellTier}</span>
                  )}
                  {!canCast && <div className="absolute inset-0 bg-black/40 rounded-lg" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Map & Time */}
        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 text-right pointer-events-auto">
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            {MAP_NAMES[currentMap] || currentMap}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Quest Tracker (left side, below stats) */}
      {activeQuests.length > 0 && (
        <div className="absolute left-3 top-[280px] pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 min-w-[200px] border border-cyan-500/20">
            <div className="flex items-center gap-2 text-cyan-400 mb-2">
              <ScrollText size={12} />
              <span className="font-bold text-xs">MISSÕES ATIVAS</span>
            </div>
            {activeQuests.map(quest => (
              <div key={quest.id} className="mb-2 last:mb-0">
                <div className="flex items-center gap-1 text-xs text-white font-medium">
                  <Target size={10} className="text-cyan-400" />
                  {quest.name}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {quest.description}
                </div>
                <div className="mt-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (quest.currentCount / quest.targetCount) * 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-cyan-300 mt-0.5">
                  {quest.currentCount}/{quest.targetCount}
                  {quest.currentCount >= quest.targetCount && (
                    <span className="text-green-400 ml-1">✓ Completa! Fale com o NPC</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom: Controls hint */}
      {showControls && (
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="text-center">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 inline-block text-xs text-slate-500">
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">WASD</kbd> Mover
            {' · '}
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Espaço</kbd> Atacar
            {' · '}
            <kbd className="px-1 py-0.5 bg-red-900 rounded text-red-300 font-mono">F</kbd>🔥
            {' '}
            <kbd className="px-1 py-0.5 bg-blue-900 rounded text-blue-300 font-mono">G</kbd>❄️
            {' '}
            <kbd className="px-1 py-0.5 bg-green-900 rounded text-green-300 font-mono">V</kbd>🪨
            {' '}
            <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">R</kbd>💨
            {' · '}
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">E</kbd> Loja/NPC
            {' · '}
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Tab</kbd> Atributos
            {' · '}
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">P</kbd> Poção
            {' · '}
            <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Q</kbd> Ocultar Tutorial
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
