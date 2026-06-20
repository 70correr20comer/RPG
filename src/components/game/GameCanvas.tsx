import { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '../../game/store';
import { renderGame, RenderState, DamageNumber } from '../../game/renderer';
import { MAPS, isoToScreen, QUEST_SLAY67_ID, QUEST_BOSS_ID, QUEST_ALL_ELDER_ID } from '../../game/constants';
import { distance } from '../../game/constants';
import { handleActionKeyDown, handleActionKeyUp } from '../../game/inputActions';

// ─── Mobile Input Props ─────────────────────────────
type GameCanvasProps = {
  keysRef?: React.MutableRefObject<Set<string>>;
  moveRef?: React.MutableRefObject<{ x: number; y: number }>;
};

// ─── Damage Numbers State (ref to avoid re-renders) ──

const damageNumbersRef: DamageNumber[] = [];

function addDamageNumber(x: number, y: number, text: string, color: string) {
  damageNumbersRef.push({ x, y, text, color, life: 1.2, maxLife: 1.2 });
}

export default function GameCanvas(props: GameCanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalKeysRef = useRef<Set<string>>(new Set());
  const internalMoveRef = useRef({ x: 0, y: 0 });

  const keysRef = props.keysRef ?? internalKeysRef;
  const moveRef = props.moveRef ?? internalMoveRef;
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

    // ─── Handle Input (keyboard + mobile joystick) ──
    const mv = moveRef.current;
    let dx = 0, dy = 0;

    if (Math.hypot(mv.x, mv.y) > 0.15) {
      // Mobile joystick input
      dx = mv.x;
      dy = mv.y;
    } else {
      // Keyboard input
      const keys = keysRef.current;
      if (keys.has('w') || keys.has('arrowup')) dy = -1;
      if (keys.has('s') || keys.has('arrowdown')) dy = 1;
      if (keys.has('a') || keys.has('arrowleft')) dx = -1;
      if (keys.has('d') || keys.has('arrowright')) dx = 1;
    }

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
      bossEntranceAnimation: currentState2.bossEntranceAnimation,
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
      handleActionKeyDown(key, e);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
      handleActionKeyUp(e.key);

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
