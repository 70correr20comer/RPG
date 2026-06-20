import { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '../../game/store';
import { renderGame, RenderState, DamageNumber } from '../../game/renderer';
import { MAPS, isoToScreen, QUEST_SLAY67_ID, QUEST_BOSS_ID, QUEST_ALL_ELDER_ID } from '../../game/constants';
import { distance } from '../../game/constants';

// ─── Damage Numbers State (ref to avoid re-renders) ──

const damageNumbersRef: DamageNumber[] = [];

function addDamageNumber(x: number, y: number, text: string, color: string) {
  damageNumbersRef.push({ x, y, text, color, life: 1.2, maxLife: 1.2 });
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const lastTimeRef = useRef(0);
  const frameRef = useRef<number>(0);
  const attackFlashRef = useRef(0);
  const aoeFlashRef = useRef(0);
  const enemyAttackTimers = useRef<Map<string, number>>(new Map());
  const hasMovementInput = useRef(false);

  const store = useGameStore;

  // ─── Game Loop ────────────────────────────────────

  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Delta time
    const dt = lastTimeRef.current ? Math.min((timestamp - lastTimeRef.current) / 1000, 0.05) : 0.016;
    lastTimeRef.current = timestamp;

    const state = store.getState();
    if (!state.isPlaying || state.screen !== 'playing') {
      frameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Decrement attack cooldown
    if (state.player.attackCooldown > 0) {
      store.setState(s => ({
        player: { ...s.player, attackCooldown: Math.max(0, s.player.attackCooldown - dt) }
      }));
    }

    // Update shadow shield cooldown
    if (state.player.hasShadowShield && state.player.shadowShieldCooldown > 0) {
      state.updateShieldCooldown(dt);
    }

    // Update game time
    const gameTime = state.gameTime + dt;
    store.setState({ gameTime });

    // ─── Handle Input ────────────────────────
    const keys = keysRef.current;
    let dx = 0, dy = 0;
    if (keys.has('w') || keys.has('arrowup')) dy = -1;
    if (keys.has('s') || keys.has('arrowdown')) dy = 1;
    if (keys.has('a') || keys.has('arrowleft')) dx = -1;
    if (keys.has('d') || keys.has('arrowright')) dx = 1;

    hasMovementInput.current = dx !== 0 || dy !== 0;

    if (dx !== 0 || dy !== 0) {
      state.movePlayer(dx, dy, dt);
    } else {
      // FIX: Stop player marching when no input
      const currentState = store.getState();
      if (currentState.player.isMoving) {
        store.setState(s => ({
          player: { ...s.player, isMoving: false }
        }));
      }
    }

    // ─── Auto Attack (Space) ─────────────────
    if (keys.has(' ') && (state.currentMap === 'TerrasCinzas' || state.currentMap === 'TerrasCinzaEscuro' || state.currentMap === 'TerrasForte')) {
      const prevDamage = state.lastDamageDealt;
      state.playerAttack();
      const newDamage = store.getState().lastDamageDealt;
      if (newDamage > 0 && newDamage !== prevDamage) {
        if (store.getState().player.hasAOE) {
          aoeFlashRef.current = 0.3;
        } else {
          attackFlashRef.current = 0.15;
        }
        const ps = store.getState().player;
        const nearestEnemy = store.getState().enemies.reduce((nearest, e) => {
          const d = distance(ps.position, e.position);
          return d < (nearest?.d ?? Infinity) ? { e, d } : nearest;
        }, null as { e: any; d: number } | null);
        if (nearestEnemy) {
          const { sx, sy } = isoToScreen(nearestEnemy.e.position.x, nearestEnemy.e.position.y);
          addDamageNumber(sx, sy - 20, `-${newDamage}`, '#f59e0b');
        }
      }
    }

    attackFlashRef.current = Math.max(0, attackFlashRef.current - dt);
    aoeFlashRef.current = Math.max(0, aoeFlashRef.current - dt);

    // ─── Enemy AI ────────────────────────────
    const currentState = store.getState();
    if (currentState.currentMap === 'TerrasCinzas' || currentState.currentMap === 'TerrasCinzaEscuro' || currentState.currentMap === 'TerrasForte') {
      const { player, enemies } = currentState;
      const timers = enemyAttackTimers.current;

      for (const enemy of enemies) {
        if (enemy.isBoss) continue; // Boss has its own AI
        const dist = distance(player.position, enemy.position);
        if (dist < 1.8) {
          const lastAttack = timers.get(enemy.id) || 0;
          if (gameTime - lastAttack > 1.2) {
            timers.set(enemy.id, gameTime);
            currentState.enemyAttackPlayer(enemy);

            const ps = store.getState().player;
            addDamageNumber(
              ps.position.x * 32,
              ps.position.y * 16 - 30,
              `-${Math.round(enemy.attackPower * (1 - ps.flatDefense / (ps.flatDefense + 100)))}`,
              '#ef4444',
            );
          }
        }
      }

      // Update enemies
      currentState.updateEnemies(dt);
      currentState.updateTombstones(dt);

      // Update spell projectiles
      currentState.updateProjectiles(dt);
      currentState.updateExplosions(dt);

      // Update boss AI
      if (currentState.currentMap === 'TerrasForte') {
        currentState.updateBoss(dt, gameTime);
      }
    }

    // ─── Update Damage Numbers ───────────────
    for (let i = damageNumbersRef.length - 1; i >= 0; i--) {
      damageNumbersRef[i].life -= dt;
      if (damageNumbersRef[i].life <= 0) {
        damageNumbersRef.splice(i, 1);
      }
    }

    // ─── Render ──────────────────────────────
    const currentState2 = store.getState();
    const mapDef = MAPS[currentState2.currentMap];

    const renderState: RenderState = {
      player: currentState2.player,
      enemies: currentState2.enemies,
      tombstones: currentState2.tombstones,
      npcs: mapDef.npcs,
      mapDef,
      cameraX: 0,
      cameraY: 0,
      gameTime: currentState2.gameTime,
      attackFlash: attackFlashRef.current,
      aoeFlash: aoeFlashRef.current,
      damageNumbers: damageNumbersRef,
      spellProjectiles: currentState2.spellProjectiles,
      quests: currentState2.quests,
      bossMeteors: currentState2.bossState?.meteors || [],
      spellExplosions: currentState2.spellExplosions || [],
      currentMap: currentState2.currentMap,
      dragonAnimation: currentState2.dragonAnimation,
      showBossQuestGiver: currentState2.showBossQuestGiver,
    };

    // Resize canvas
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    renderGame(ctx, canvas.width, canvas.height, renderState);

    frameRef.current = requestAnimationFrame(gameLoop);
  }, [store]);

  // ─── Key Handlers ─────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);

      const state = store.getState();
      if (state.screen !== 'playing') return;

      // Shift: Activate shadow shield
      if (key === 'shift') {
        state.setShieldActive(true);
      }

      // E: Open shop near shopkeeper or talk to quest NPC
      if (key === 'e') {
        const mapDef = MAPS[state.currentMap];
        // Check static NPCs first
        for (const npc of mapDef.npcs) {
          if (distance(state.player.position, npc.position) < 3) {
            if (npc.type === 'questgiver' || npc.type === 'questgiver2') {
              // Quest NPC interaction
              let quest;
              if (npc.type === 'questgiver2') {
                // Sentinela: offer quest_slay67, then after completion check for boss quest
                const q2 = state.quests.find(q => q.id === QUEST_SLAY67_ID);
                const q3 = state.quests.find(q => q.id === QUEST_BOSS_ID);
                if (q2?.status === 'completed' && q3 && q3.status !== 'completed') {
                  quest = q3;
                } else {
                  quest = q2;
                }
              } else if (npc.type === 'questgiver') {
                // Elder Scholar: offer the first available/incomplete quest
                const elderQuests = state.quests.filter(q => q.giverNPCId === npc.id);
                quest = elderQuests.find(q => q.status === 'active') || elderQuests.find(q => q.status === 'available');
              }
              if (quest) {
                if (quest.status === 'available') {
                  state.acceptQuest(quest.id);
                  store.setState({ levelUpMessage: `📜 Missão Aceita: ${quest.name}\n${quest.description}` });
                } else if (quest.status === 'active') {
                  // Check completion for different quest types
                  let isComplete = false;
                  if (quest.type === 'kill' || quest.type === 'multikill' || quest.type === 'attribute') {
                    isComplete = quest.currentCount >= quest.targetCount;
                  }
                  if (isComplete) {
                    const isSlay67 = quest.id === QUEST_SLAY67_ID;
                    store.setState(s => {
                      const newQuests = s.quests.map(q =>
                        q.id === quest.id ? { ...q, status: 'completed' as const } : q
                      );
                      // When quest_slay67 completes, trigger dragon animation and show boss quest giver
                      if (isSlay67) {
                        setTimeout(() => {
                          store.getState().triggerDragonAnimation();
                        }, 500);
                      }
                      return {
                        quests: newQuests,
                        player: {
                          ...s.player,
                          coins: s.player.coins + quest.rewardCoins,
                          currentXP: s.player.currentXP + quest.rewardXP,
                        },
                        showBossQuestGiver: isSlay67 ? true : s.showBossQuestGiver,
                        levelUpMessage: isSlay67
                          ? `✅ Missão Completa: ${quest.name}!\n+${quest.rewardCoins} moedas, +${quest.rewardXP} XP\n🐉 Um dragão está surgindo...`
                          : `✅ Missão Completa: ${quest.name}!\n+${quest.rewardCoins} moedas, +${quest.rewardXP} XP\nPortal desbloqueado!`,
                      };
                    });
                  } else {
                    store.setState({ levelUpMessage: `📜 ${quest.name}: ${quest.currentCount}/${quest.targetCount}` });
                  }
                } else if (quest.status === 'completed') {
                  store.setState({ levelUpMessage: `✅ Missão já concluída!` });
                }
              }
              return;
            } else {
              // Shopkeeper
              if (state.currentMap === 'TerrasCinzaEscuro' || state.currentMap === 'NovaCidade') {
                state.setScreen('darkShop');
              } else {
                state.setScreen('shop');
              }
              return;
            }
          }
        }
        // Check dynamic boss quest giver (near position 19, 13 in NovaCidade)
        if (state.showBossQuestGiver && state.currentMap === 'NovaCidade') {
          const bossNPCPos = { x: 19, y: 13 };
          if (distance(state.player.position, bossNPCPos) < 3) {
            const bossQuest = state.quests.find(q => q.id === QUEST_BOSS_ID);
            if (bossQuest) {
              if (bossQuest.status === 'available') {
                state.acceptQuest(bossQuest.id);
                store.setState({ levelUpMessage: `📜 Missão Aceita: ${bossQuest.name}\n${bossQuest.description}` });
              } else if (bossQuest.status === 'active') {
                store.setState({ levelUpMessage: `📜 ${bossQuest.name}: Enfrente o Boss!` });
              } else if (bossQuest.status === 'completed') {
                store.setState({ levelUpMessage: `✅ Missão já concluída!` });
              }
            }
            return;
          }
        }
      }

      // Tab: Attributes
      if (key === 'tab') {
        e.preventDefault();
        state.setScreen(state.screen === 'attributes' ? 'playing' : 'attributes');
      }

      // P: Use potion
      if (key === 'p') {
        state.usePotion();
      }

      // Q: Toggle controls hint
      if (key === 'q') {
        state.toggleControls();
      }

      // F: Fire spell
      if (key === 'f' && (state.currentMap === 'TerrasCinzas' || state.currentMap === 'TerrasCinzaEscuro' || state.currentMap === 'TerrasForte')) {
        state.castSpell('Fire');
      }

      // G: Water/Ice spell
      if (key === 'g' && (state.currentMap === 'TerrasCinzas' || state.currentMap === 'TerrasCinzaEscuro' || state.currentMap === 'TerrasForte')) {
        state.castSpell('Water');
      }

      // V: Earth spell
      if (key === 'v' && (state.currentMap === 'TerrasCinzas' || state.currentMap === 'TerrasCinzaEscuro' || state.currentMap === 'TerrasForte')) {
        state.castSpell('Earth');
      }

      // R: Air spell
      if (key === 'r' && (state.currentMap === 'TerrasCinzas' || state.currentMap === 'TerrasCinzaEscuro' || state.currentMap === 'TerrasForte')) {
        state.castSpell('Air');
      }

      // Escape: Close panels
      if (key === 'escape') {
        if (state.screen !== 'playing') {
          state.setScreen('playing');
        }
      }

      // Space: attack
      if (key === ' ' && (state.currentMap === 'TerrasCinzas' || state.currentMap === 'TerrasCinzaEscuro' || state.currentMap === 'TerrasForte')) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());

      const key = e.key.toLowerCase();
      // Shift released: deactivate shadow shield
      if (key === 'shift') {
        store.getState().setShieldActive(false);
      }

      // FIX: When all movement keys are released, stop player movement
      const keys = keysRef.current;
      const hasMovement = keys.has('w') || keys.has('arrowup') || keys.has('s') || keys.has('arrowdown') ||
        keys.has('a') || keys.has('arrowleft') || keys.has('d') || keys.has('arrowright');

      if (!hasMovement) {
        const state = store.getState();
        if (state.player.isMoving) {
          store.setState(s => ({
            player: { ...s.player, isMoving: false }
          }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [store]);

  // ─── Start Game Loop ──────────────────────────────

  useEffect(() => {
    frameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [gameLoop]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
