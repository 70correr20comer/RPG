import { PlayerState, Enemy, Tombstone, NPC, MapDefinition, Vec2, SpellProjectile, Quest, MeteorAttack, SpellExplosion, ArmorPiece } from './types';
import { TILE_W, TILE_H, ENEMY_TYPES, MAPS, isoToScreen, getArmorTier, ARMOR_TIER_COLORS } from './constants';

// ─── Color Palette ─────────────────────────────────

const COLORS = {
  player: '#6366f1',
  playerOutline: '#818cf8',
  playerAttacking: '#f59e0b',
  hpBar: '#ef4444',
  hpBarBg: '#1f2937',
  xpBar: '#8b5cf6',
  xpBarBg: '#1f2937',
  enemyHp: '#ef4444',
  enemyHpBg: '#1f2937',
  portal: '#8b5cf6',
  portalGlow: 'rgba(139, 92, 246, 0.3)',
  portalDark: '#c026d3',
  portalLocked: '#6b7280',
  tombstone: '#6b7280',
  tombstoneDark: '#4b5563',
  shopkeeper: '#f59e0b',
  shopkeeperGlow: 'rgba(245, 158, 11, 0.3)',
  questGiver: '#22d3ee',
  questGlow: 'rgba(34, 211, 238, 0.3)',
};

// ─── Particle System ───────────────────────────────

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
  type: 'dust' | 'spark' | 'hit' | 'levelup' | 'meteor' | 'explosion';
}

const particles: Particle[] = [];

function spawnParticles(x: number, y: number, count: number, color: string, type: Particle['type'], spread: number = 1) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 3 * spread,
      vy: (Math.random() - 0.5) * 2 * spread - 1,
      life: 0.3 + Math.random() * 0.5,
      maxLife: 0.3 + Math.random() * 0.5,
      size: 2 + Math.random() * 3,
      color,
      type,
    });
  }
}

function updateParticles(dt: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.vy += 2 * dt; // gravity
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function renderParticles(ctx: CanvasRenderingContext2D) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;

    if (p.type === 'spark') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'hit') {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    } else if (p.type === 'levelup') {
      ctx.fillStyle = p.color;
      ctx.font = `${8 + p.size}px sans-serif`;
      ctx.fillText('★', p.x, p.y);
    } else if (p.type === 'meteor') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'explosion') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ─── Screen Shake ──────────────────────────────────

let shakeIntensity = 0;
let shakeDuration = 0;

export function triggerShake(intensity: number = 3, duration: number = 0.15) {
  shakeIntensity = intensity;
  shakeDuration = duration;
}

function applyShake(ctx: CanvasRenderingContext2D, dt: number): { ox: number; oy: number } {
  if (shakeDuration > 0) {
    shakeDuration -= dt;
    const progress = shakeDuration / 0.15;
    const ox = (Math.random() - 0.5) * shakeIntensity * progress;
    const oy = (Math.random() - 0.5) * shakeIntensity * progress;
    ctx.translate(ox, oy);
    return { ox, oy };
  }
  return { ox: 0, oy: 0 };
}

// ─── Drawing Helpers ───────────────────────────────

function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  ratio: number,
  color: string, bgColor: string,
) {
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(0, w * Math.min(1, ratio)), h, h / 2);
  ctx.fill();
}

// ─── MAIN RENDER ───────────────────────────────────

export interface RenderState {
  player: PlayerState;
  enemies: Enemy[];
  tombstones: Tombstone[];
  npcs: NPC[];
  mapDef: MapDefinition;
  cameraX: number;
  cameraY: number;
  gameTime: number;
  attackFlash: number;
  aoeFlash: number;
  damageNumbers: DamageNumber[];
  spellProjectiles: SpellProjectile[];
  quests?: Quest[];
  bossMeteors?: MeteorAttack[];
  spellExplosions?: SpellExplosion[];
  currentMap?: string;
  dragonAnimation?: { active: boolean; startTime: number; duration: number } | null;
  bossEntranceAnimation?: { active: boolean; startTime: number } | null;
  showBossQuestGiver?: boolean;
}

export interface DamageNumber {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export function renderGame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: RenderState,
) {
  const { player, enemies, tombstones, npcs, mapDef, gameTime } = state;

  // Clear
  ctx.fillStyle = mapDef.bgColor;
  ctx.fillRect(0, 0, width, height);

  // Camera offset (center on player)
  const playerScreen = isoToScreen(player.position.x, player.position.y);
  const camX = width / 2 - playerScreen.sx;
  const camY = height / 2 - playerScreen.sy - 60;

  // Update particles
  updateParticles(0.016);

  // Spawn dust when walking
  if (player.isMoving && Math.random() < 0.3) {
    const ps = isoToScreen(player.position.x, player.position.y);
    spawnParticles(ps.sx, ps.sy + 4, 1, 'rgba(150,150,150,0.4)', 'dust', 0.3);
  }

  ctx.save();

  // Screen shake
  applyShake(ctx, 0.016);

  ctx.translate(camX, camY);

  // ─── Draw Grid ───────────────────────────
  drawGrid(ctx, mapDef, gameTime);

  // ─── Draw Portals ────────────────────────
  for (const portal of mapDef.portals) {
    // Portal requires quest check (also handle combined elder quest)
    let isLocked = false;
    if (portal.requiresQuest) {
      if (portal.requiresQuest === 'quest_all_elder') {
        isLocked = !(state.quests || []).some(q => q.id === 'quest_slay13' && q.status === 'completed') ||
                   !(state.quests || []).some(q => q.id === 'quest_multikill3' && q.status === 'completed') ||
                   !(state.quests || []).some(q => q.id === 'quest_afinidade1' && q.status === 'completed');
      } else {
        isLocked = !state.quests?.some(q => q.id === portal.requiresQuest && q.status === 'completed');
      }
    }
    const elderComplete = !isLocked && portal.requiresQuest === 'quest_all_elder';
    drawPortal(ctx, portal, gameTime, isLocked, elderComplete);
  }

  // ─── Draw Cabin Shop (in Nova Cidade) ────
  if (state.currentMap === 'NovaCidade') {
    drawCabinShop(ctx, gameTime);
  }

  // ─── Draw Tombstones ─────────────────────
  for (const ts of tombstones) {
    drawTombstone(ctx, ts, gameTime);
  }

  // ─── Draw NPCs ───────────────────────────
  for (const npc of npcs) {
    // Hide Sentinela do Abismo after quest_slay67 is completed
    if (npc.id === 'quest2' && state.quests?.some(q => q.id === 'quest_slay67' && q.status === 'completed')) {
      continue;
    }
    if (npc.type === 'questgiver' || npc.type === 'questgiver2') {
      drawQuestNPC(ctx, npc, player.position, gameTime);
    } else if (npc.type === 'bossQuestgiver') {
      drawBossQuestNPC(ctx, npc, player.position, gameTime);
    } else {
      drawNPC(ctx, npc, player.position, gameTime);
    }
  }
  // Draw dynamic boss quest giver if visible
  if (state.showBossQuestGiver && state.currentMap === 'NovaCidade') {
    const bossNPC: NPC = { id: 'bossQuestGiver', name: 'Mensageiro do Dragão', position: { x: 19, y: 13 }, type: 'bossQuestgiver' };
    drawBossQuestNPC(ctx, bossNPC, player.position, gameTime);
  }

  // ─── Draw Enemies ────────────────────────
  for (const enemy of enemies) {
    if (enemy.isBoss) {
      drawBoss(ctx, enemy, gameTime);
    } else {
      drawEnemy(ctx, enemy, gameTime);
    }
  }

  // ─── Draw Meteors (boss attacks) ─────────
  if (state.bossMeteors) {
    for (const meteor of state.bossMeteors) {
      drawMeteor(ctx, meteor, gameTime);
    }
  }

  // ─── Draw Player ─────────────────────────
  drawPlayer(ctx, player, state.attackFlash > 0, gameTime);

  // ─── Draw AOE Effect ─────────────────────
  if (state.aoeFlash > 0 && player.hasAOE) {
    drawAOEEffect(ctx, player, state.aoeFlash);
  }

  // ─── Draw Spell Projectiles ──────────────
  for (const proj of state.spellProjectiles) {
    drawSpellProjectile(ctx, proj, gameTime);
  }

  // ─── Draw Spell Explosions ───────────────
  if (state.spellExplosions) {
    for (const exp of state.spellExplosions) {
      drawSpellExplosion(ctx, exp, gameTime);
    }
  }

  // ─── Draw Boss Entrance Animation ───────
  if (state.bossEntranceAnimation?.active) {
    drawBossEntranceAnimation(ctx, state.bossEntranceAnimation, gameTime);
  }

  // ─── Draw Dragon Animation ───────────────
  if (state.dragonAnimation?.active) {
    drawDragonAnimation(ctx, state.dragonAnimation, gameTime);
  }

  // ─── Draw Particles ──────────────────────
  renderParticles(ctx);

  // ─── Draw Damage Numbers ─────────────────
  for (const dn of state.damageNumbers) {
    drawDamageNumber(ctx, dn);
  }

  ctx.restore();

  // ─── Draw Minimap ────────────────────────
  drawMinimap(ctx, width, height, player, enemies, mapDef);
}

// ═══════════════════════════════════════════════════
//  GRID (Improved tiles with variation)
// ═══════════════════════════════════════════════════

function drawGrid(ctx: CanvasRenderingContext2D, mapDef: MapDefinition, time: number) {
  const { w, h } = mapDef.gridSize;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const { sx, sy } = isoToScreen(x, y);

      const noise = ((x * 7 + y * 13) % 3) * 0.02;
      const isEdge = x === 0 || y === 0 || x === w - 1 || y === h - 1;

      let fillColor = mapDef.tileColor;
      if (isEdge) fillColor = mapDef.gridColor;

      const r = parseInt(fillColor.slice(1, 3), 16);
      const g = parseInt(fillColor.slice(3, 5), 16);
      const b = parseInt(fillColor.slice(5, 7), 16);
      const mod = 1 + noise;
      ctx.fillStyle = `rgb(${Math.min(255, r * mod | 0)}, ${Math.min(255, g * mod | 0)}, ${Math.min(255, b * mod | 0)})`;

      ctx.beginPath();
      ctx.moveTo(sx, sy - TILE_H / 2);
      ctx.lineTo(sx + TILE_W / 2, sy);
      ctx.lineTo(sx, sy + TILE_H / 2);
      ctx.lineTo(sx - TILE_W / 2, sy);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
}

// ═══════════════════════════════════════════════════
//  PORTAL (Enhanced — bigger, more impressive)
// ═══════════════════════════════════════════════════

function drawPortal(ctx: CanvasRenderingContext2D, portal: any, time: number, isLocked: boolean = false, elderComplete: boolean = false) {
  const { sx, sy } = isoToScreen(portal.position.x, portal.position.y);
  const pulse = 0.5 + 0.5 * Math.sin(time * 3);
  const isDragon = (portal as any).variant === 'dragon';
  // Portal changes to golden/green when elder quests complete
  const portalColor = isLocked ? COLORS.portalLocked : elderComplete ? '#22c55e' : isDragon ? '#dc2626' : COLORS.portal;
  const portalGlowColor = isLocked ? 'rgba(107, 114, 128, 0.2)' : elderComplete ? 'rgba(34, 197, 94, 0.4)' : isDragon ? 'rgba(220, 38, 38, 0.3)' : 'rgba(139, 92, 246, 0.3)';
  const scale = isDragon ? 1.6 : elderComplete ? 1.2 : 1; // Completed portals are bigger

  // Large outer glow
  const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, (60 + pulse * 20) * scale);
  grad.addColorStop(0, isLocked ? `rgba(107, 114, 128, ${0.2 + pulse * 0.1})` : elderComplete ? `rgba(34, 197, 94, ${0.4 + pulse * 0.2})` : isDragon ? `rgba(220, 38, 38, ${0.35 + pulse * 0.15})` : `rgba(139, 92, 246, ${0.35 + pulse * 0.15})`);
  grad.addColorStop(0.4, isLocked ? `rgba(75, 85, 99, ${0.15 + pulse * 0.05})` : elderComplete ? `rgba(21, 128, 61, ${0.25 + pulse * 0.1})` : isDragon ? `rgba(185, 28, 28, ${0.2 + pulse * 0.1})` : `rgba(192, 38, 211, ${0.2 + pulse * 0.1})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(sx, sy, (60 + pulse * 20) * scale, 0, Math.PI * 2);
  ctx.fill();

  // Outer spinning ring
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(time * 1.5);
  ctx.strokeStyle = isLocked ? `rgba(107, 114, 128, ${0.3 + pulse * 0.2})` : elderComplete ? `rgba(74, 222, 128, ${0.6 + pulse * 0.3})` : isDragon ? `rgba(248, 113, 113, ${0.5 + pulse * 0.3})` : `rgba(196, 181, 253, ${0.5 + pulse * 0.3})`;
  ctx.lineWidth = 2.5 * scale;
  ctx.beginPath();
  ctx.ellipse(0, 0, 32 * scale, 16 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Inner spinning ring (opposite direction)
  ctx.rotate(-time * 3);
  ctx.strokeStyle = isLocked ? `rgba(75, 85, 99, ${0.2 + pulse * 0.1})` : elderComplete ? `rgba(134, 239, 172, ${0.5 + pulse * 0.2})` : isDragon ? `rgba(254, 202, 202, ${0.4 + pulse * 0.2})` : `rgba(237, 233, 254, ${0.4 + pulse * 0.2})`;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.ellipse(0, 0, 24 * scale, 12 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Third ring
  ctx.rotate(time * 5);
  ctx.strokeStyle = isLocked ? `rgba(55, 65, 81, ${0.2})` : isDragon ? `rgba(220, 38, 38, ${0.3 + pulse * 0.2})` : `rgba(139, 92, 246, ${0.3 + pulse * 0.2})`;
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16 * scale, 8 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Energy vortex core
  const coreGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 16 * scale);
  if (isLocked) {
    coreGrad.addColorStop(0, '#9ca3af');
    coreGrad.addColorStop(0.5, '#6b7280');
    coreGrad.addColorStop(1, '#374151');
  } else if (elderComplete) {
    coreGrad.addColorStop(0, '#bbf7d0');
    coreGrad.addColorStop(0.3, '#4ade80');
    coreGrad.addColorStop(0.6, '#22c55e');
    coreGrad.addColorStop(1, '#15803d');
  } else if (isDragon) {
    coreGrad.addColorStop(0, '#fecaca');
    coreGrad.addColorStop(0.3, '#f87171');
    coreGrad.addColorStop(0.6, '#dc2626');
    coreGrad.addColorStop(1, '#991b1b');
  } else {
    coreGrad.addColorStop(0, '#ede9fe');
    coreGrad.addColorStop(0.3, '#a78bfa');
    coreGrad.addColorStop(0.6, '#8b5cf6');
    coreGrad.addColorStop(1, '#6d28d9');
  }
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(sx, sy, (12 + pulse * 3) * scale, 0, Math.PI * 2);
  ctx.fill();

  // Bright center orb
  ctx.fillStyle = isLocked ? 'rgba(156, 163, 175, 0.8)' : 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.arc(sx, sy, 4 + pulse * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Vertical energy beam
  if (!isLocked) {
    const beamAlpha = 0.1 + 0.1 * Math.sin(time * 4);
    ctx.save();
    ctx.globalAlpha = beamAlpha;
    const beamGrad = ctx.createLinearGradient(sx, sy - 30 * scale, sx, sy + 30 * scale);
    beamGrad.addColorStop(0, elderComplete ? 'rgba(34, 197, 94, 0)' : isDragon ? 'rgba(220, 38, 38, 0)' : 'rgba(139, 92, 246, 0)');
    beamGrad.addColorStop(0.5, elderComplete ? 'rgba(34, 197, 94, 0.5)' : isDragon ? 'rgba(220, 38, 38, 0.4)' : 'rgba(139, 92, 246, 0.4)');
    beamGrad.addColorStop(1, elderComplete ? 'rgba(34, 197, 94, 0)' : isDragon ? 'rgba(220, 38, 38, 0)' : 'rgba(139, 92, 246, 0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(sx - 2 * scale, sy - 30 * scale, 4 * scale, 60 * scale);
    ctx.restore();
  }

  // Rune symbols floating around
  if (!isLocked) {
    const runeChars = elderComplete ? ['✨', '🌿', '🔮', '✦'] : isDragon ? ['🐉', '🔥', '💀', '⚔'] : ['✦', '◆', '✧', '◇'];
    for (let i = 0; i < 4; i++) {
      const angle = time * 2 + (i / 4) * Math.PI * 2;
      const runeR = (26 + Math.sin(time * 3 + i) * 4) * scale;
      const rx = sx + Math.cos(angle) * runeR;
      const ry = sy + Math.sin(angle) * runeR * 0.5;
      ctx.fillStyle = elderComplete ? `rgba(74, 222, 128, ${0.5 + 0.3 * Math.sin(time * 4 + i)})` : isDragon ? `rgba(248, 113, 113, ${0.4 + 0.2 * Math.sin(time * 4 + i)})` : `rgba(196, 181, 253, ${0.4 + 0.2 * Math.sin(time * 4 + i)})`;
      ctx.font = isDragon ? '10px sans-serif' : '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(runeChars[i], rx, ry);
    }
  }

  // Label
  ctx.fillStyle = isLocked ? '#9ca3af' : elderComplete ? '#4ade80' : isDragon ? '#fca5a5' : '#c4b5fd';
  ctx.font = `bold ${12 * scale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (isLocked) {
    ctx.fillText('🔒 Portal Bloqueado', sx, sy + 42 * scale);
    ctx.fillStyle = '#6b7280';
    ctx.font = '9px sans-serif';
    ctx.fillText('Complete a missão', sx, sy + 56 * scale);
  } else if (elderComplete) {
    ctx.fillText('✨ Portal Desbloqueado! ✨', sx, sy + 42 * scale);
    ctx.fillStyle = '#86efac';
    ctx.font = '10px sans-serif';
    const destName = MAPS[portal.destination]?.name || portal.destination;
    ctx.fillText(`→ ${destName}`, sx, sy + 56 * scale);
  } else if (isDragon) {
    ctx.fillText('🐉 Portal do Dragão 🐉', sx, sy + 42 * scale);
    ctx.fillStyle = '#f87171';
    ctx.font = '10px sans-serif';
    const destName = MAPS[portal.destination]?.name || portal.destination;
    ctx.fillText(`→ ${destName}`, sx, sy + 56 * scale);
  } else {
    ctx.fillText('✦ Portal ✦', sx, sy + 42);
    ctx.fillStyle = '#a78bfa';
    ctx.font = '10px sans-serif';
    const destName = MAPS[portal.destination]?.name || portal.destination;
    ctx.fillText(`→ ${destName}`, sx, sy + 56);
  }

  // Spawn portal particles
  if (!isLocked && Math.random() < 0.15) {
    const particleColor = isDragon ? '#f87171' : '#a78bfa';
    spawnParticles(sx + (Math.random() - 0.5) * 30 * scale, sy + (Math.random() - 0.5) * 15 * scale, 1, particleColor, 'spark', 0.4);
  }
}

// ═══════════════════════════════════════════════════
//  CABIN SHOP (Dark Lands)
// ═══════════════════════════════════════════════════

function drawCabinShop(ctx: CanvasRenderingContext2D, time: number) {
  const { sx, sy } = isoToScreen(15, 5);
  const pulse = 0.5 + 0.5 * Math.sin(time * 2);

  // Cabin glow
  const grad = ctx.createRadialGradient(sx, sy - 10, 0, sx, sy - 10, 50);
  grad.addColorStop(0, `rgba(245, 158, 11, ${0.1 + pulse * 0.05})`);
  grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(sx, sy - 10, 50, 0, Math.PI * 2);
  ctx.fill();

  // Cabin base
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.moveTo(sx - 18, sy + 6);
  ctx.lineTo(sx - 18, sy - 14);
  ctx.lineTo(sx + 18, sy - 14);
  ctx.lineTo(sx + 18, sy + 6);
  ctx.closePath();
  ctx.fill();

  // Cabin front
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.moveTo(sx - 16, sy + 4);
  ctx.lineTo(sx - 16, sy - 12);
  ctx.lineTo(sx + 16, sy - 12);
  ctx.lineTo(sx + 16, sy + 4);
  ctx.closePath();
  ctx.fill();

  // Roof
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.moveTo(sx - 22, sy - 12);
  ctx.lineTo(sx, sy - 28);
  ctx.lineTo(sx + 22, sy - 12);
  ctx.closePath();
  ctx.fill();

  // Door
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(sx - 4, sy - 4, 8, 10);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(sx + 2, sy + 1, 1, 0, Math.PI * 2);
  ctx.fill();

  // Window with warm light
  ctx.fillStyle = `rgba(251, 191, 36, ${0.6 + pulse * 0.3})`;
  ctx.fillRect(sx + 6, sy - 8, 6, 5);
  ctx.fillRect(sx - 12, sy - 8, 6, 5);
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 1;
  ctx.strokeRect(sx + 6, sy - 8, 6, 5);
  ctx.strokeRect(sx - 12, sy - 8, 6, 5);

  // Chimney smoke
  ctx.fillStyle = 'rgba(156, 163, 175, 0.3)';
  for (let i = 0; i < 3; i++) {
    const smokeY = sy - 30 - i * 8 + Math.sin(time * 2 + i) * 3;
    const smokeX = sx + 10 + Math.sin(time * 1.5 + i * 2) * 4;
    ctx.beginPath();
    ctx.arc(smokeX, smokeY, 3 + i, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sign
  ctx.fillStyle = '#92400e';
  ctx.fillRect(sx - 10, sy - 20, 20, 8);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 6px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FEITIÇOS', sx, sy - 14);

  // Label
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Cabana do Mercador', sx, sy + 16);
}

// ═══════════════════════════════════════════════════
//  TOMBSTONE (Detailed with moss, cracks)
// ═══════════════════════════════════════════════════

function drawTombstone(ctx: CanvasRenderingContext2D, ts: Tombstone, time: number) {
  const { sx, sy } = isoToScreen(ts.position.x, ts.position.y);
  const bob = Math.sin(time * 2 + ts.position.x) * 1;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 6, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#57534e';
  ctx.beginPath();
  ctx.moveTo(sx - 10, sy + 2);
  ctx.lineTo(sx - 10, sy - 18);
  ctx.quadraticCurveTo(sx - 10, sy - 28, sx, sy - 28);
  ctx.quadraticCurveTo(sx + 10, sy - 28, sx + 10, sy - 18);
  ctx.lineTo(sx + 10, sy + 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#78716c';
  ctx.beginPath();
  ctx.moveTo(sx - 8, sy + 1);
  ctx.lineTo(sx - 8, sy - 16);
  ctx.quadraticCurveTo(sx - 8, sy - 25, sx, sy - 25);
  ctx.quadraticCurveTo(sx + 8, sy - 25, sx + 8, sy - 16);
  ctx.lineTo(sx + 8, sy + 1);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#44403c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy - 24);
  ctx.lineTo(sx, sy - 10);
  ctx.moveTo(sx - 5, sy - 18);
  ctx.lineTo(sx + 5, sy - 18);
  ctx.stroke();

  ctx.fillStyle = '#4d7c0f';
  ctx.beginPath();
  ctx.ellipse(sx - 4, sy - 26, 4, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#65a30d';
  ctx.beginPath();
  ctx.ellipse(sx + 3, sy - 27, 3, 1.5, 0.2, 0, Math.PI * 2);
  ctx.fill();

  const glowAlpha = 0.1 + 0.1 * Math.sin(time * 1.5 + ts.position.y);
  ctx.fillStyle = `rgba(168, 85, 247, ${glowAlpha})`;
  ctx.beginPath();
  ctx.arc(sx, sy - 15, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('💀', sx, sy - 30 + bob);
}

// ═══════════════════════════════════════════════════
//  QUEST NPC
// ═══════════════════════════════════════════════════

function drawQuestNPC(
  ctx: CanvasRenderingContext2D,
  npc: NPC,
  playerPos: Vec2,
  time: number,
) {
  const { sx, sy } = isoToScreen(npc.position.x, npc.position.y);
  const dist = distance(playerPos, npc.position);
  const bob = Math.sin(time * 2.5) * 1.5;
  const isNear = dist < 3;
  const isQuest2 = npc.type === 'questgiver2';

  // Glow when near
  if (isNear) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 4);
    const grad = ctx.createRadialGradient(sx, sy - 10, 0, sx, sy - 10, 40);
    grad.addColorStop(0, `rgba(34, 211, 238, ${0.2 + pulse * 0.15})`);
    grad.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy - 10, 40, 0, Math.PI * 2);
    ctx.fill();
  }

  // Quest indicator (floating !)
  const exclamY = sy - 52 + Math.sin(time * 4) * 3;
  ctx.fillStyle = '#22d3ee';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', sx, exclamY);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 4, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  if (isQuest2) {
    // Dark Sentinela - darker robes
    const robeGrad = ctx.createLinearGradient(sx, sy - 26, sx, sy);
    robeGrad.addColorStop(0, '#312e81');
    robeGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = robeGrad;
  } else {
    // Elder - wise robes
    const robeGrad = ctx.createLinearGradient(sx, sy - 26, sx, sy);
    robeGrad.addColorStop(0, '#0e7490');
    robeGrad.addColorStop(1, '#155e75');
    ctx.fillStyle = robeGrad;
  }
  ctx.beginPath();
  ctx.moveTo(sx - 10, sy - 4);
  ctx.lineTo(sx - 12, sy - 22);
  ctx.quadraticCurveTo(sx, sy - 26, sx + 12, sy - 22);
  ctx.lineTo(sx + 10, sy - 4);
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.fillStyle = isQuest2 ? '#a78bfa' : '#fbbf24';
  ctx.beginPath();
  ctx.arc(sx, sy - 28 + bob, 8, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(sx - 3, sy - 29 + bob, 1.5, 0, Math.PI * 2);
  ctx.arc(sx + 3, sy - 29 + bob, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Name
  ctx.fillStyle = isQuest2 ? '#c084fc' : '#22d3ee';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(npc.name, sx, sy - 50 + bob);

  // Interaction hint
  if (isNear) {
    const hintBob = Math.sin(time * 5) * 2;
    ctx.fillStyle = '#cffafe';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('[E] Falar', sx, sy + 18 + hintBob);
  }
}

// ═══════════════════════════════════════════════════
//  NPC — BOSS QUEST GIVER (Dragon Messenger)
// ═══════════════════════════════════════════════════

function drawBossQuestNPC(
  ctx: CanvasRenderingContext2D,
  npc: NPC,
  playerPos: Vec2,
  time: number,
) {
  const { sx, sy } = isoToScreen(npc.position.x, npc.position.y);
  const dist = distance(playerPos, npc.position);
  const bob = Math.sin(time * 3) * 1.5;
  const isNear = dist < 3;

  if (isNear) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 4);
    const grad = ctx.createRadialGradient(sx, sy - 10, 0, sx, sy - 10, 40);
    grad.addColorStop(0, `rgba(220, 38, 38, ${0.3 + pulse * 0.2})`);
    grad.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy - 10, 40, 0, Math.PI * 2);
    ctx.fill();
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 2, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark robe body
  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.moveTo(sx - 10, sy + 2);
  ctx.lineTo(sx - 12, sy - 20 + bob);
  ctx.lineTo(sx + 12, sy - 20 + bob);
  ctx.lineTo(sx + 10, sy + 2);
  ctx.closePath();
  ctx.fill();

  // Red trim
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(sx - 12, sy - 20 + bob);
  ctx.lineTo(sx, sy - 22 + bob);
  ctx.lineTo(sx + 12, sy - 20 + bob);
  ctx.lineTo(sx + 10, sy - 16 + bob);
  ctx.lineTo(sx, sy - 18 + bob);
  ctx.lineTo(sx - 10, sy - 16 + bob);
  ctx.closePath();
  ctx.fill();

  // Dragon symbol on chest
  ctx.fillStyle = '#fbbf24';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🐉', sx, sy - 8 + bob);

  // Head
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(sx, sy - 28 + bob, 8, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (red)
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(sx - 3, sy - 29 + bob, 1.5, 0, Math.PI * 2);
  ctx.arc(sx + 3, sy - 29 + bob, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Name
  ctx.fillStyle = '#fca5a5';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(npc.name, sx, sy - 50 + bob);

  // Floating exclamation (red)
  const exclBob = Math.sin(time * 5) * 3;
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('!', sx, sy - 60 + exclBob);

  // Interaction hint
  if (isNear) {
    const hintBob = Math.sin(time * 5) * 2;
    ctx.fillStyle = '#fecaca';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('[E] Falar', sx, sy + 18 + hintBob);
  }
}

// ═══════════════════════════════════════════════════
//  NPC — MERCHANT (Detailed character)
// ═══════════════════════════════════════════════════

function drawNPC(
  ctx: CanvasRenderingContext2D,
  npc: NPC,
  playerPos: Vec2,
  time: number,
) {
  const { sx, sy } = isoToScreen(npc.position.x, npc.position.y);
  const dist = distance(playerPos, npc.position);
  const bob = Math.sin(time * 3) * 1.5;
  const isNear = dist < 3;

  if (isNear) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 4);
    const grad = ctx.createRadialGradient(sx, sy - 10, 0, sx, sy - 10, 35);
    grad.addColorStop(0, `rgba(245, 158, 11, ${0.2 + pulse * 0.15})`);
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy - 10, 35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 4, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#78350f';
  ctx.fillRect(sx - 5, sy - 4, 4, 8);
  ctx.fillRect(sx + 1, sy - 4, 4, 8);

  ctx.fillStyle = '#451a03';
  ctx.fillRect(sx - 6, sy + 2, 5, 4);
  ctx.fillRect(sx + 1, sy + 2, 5, 4);

  const robeGrad = ctx.createLinearGradient(sx, sy - 24, sx, sy);
  robeGrad.addColorStop(0, '#b45309');
  robeGrad.addColorStop(1, '#92400e');
  ctx.fillStyle = robeGrad;
  ctx.beginPath();
  ctx.moveTo(sx - 10, sy - 4);
  ctx.lineTo(sx - 12, sy - 22);
  ctx.quadraticCurveTo(sx, sy - 26, sx + 12, sy - 22);
  ctx.lineTo(sx + 10, sy - 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#713f12';
  ctx.fillRect(sx - 10, sy - 10, 20, 3);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(sx, sy - 8.5, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.ellipse(sx - 13, sy - 16, 3, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(sx + 13, sy - 16, 3, 6, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(sx - 14, sy - 10, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx + 14, sy - 10, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(sx, sy - 28 + bob, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(sx - 3, sy - 29 + bob, 1.5, 0, Math.PI * 2);
  ctx.arc(sx + 3, sy - 29 + bob, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(sx, sy - 26 + bob, 3, 0.1, Math.PI - 0.1);
  ctx.stroke();

  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 34 + bob, 12, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const hatGrad = ctx.createLinearGradient(sx - 6, sy - 34 + bob, sx + 6, sy - 48 + bob);
  hatGrad.addColorStop(0, '#78350f');
  hatGrad.addColorStop(1, '#451a03');
  ctx.fillStyle = hatGrad;
  ctx.beginPath();
  ctx.moveTo(sx - 8, sy - 34 + bob);
  ctx.lineTo(sx, sy - 48 + bob);
  ctx.lineTo(sx + 8, sy - 34 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fbbf24';
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★', sx, sy - 40 + bob);

  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.ellipse(sx + 7, sy - 6, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(sx + 7, sy - 7, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(npc.name, sx, sy - 52 + bob);

  if (isNear) {
    const hintBob = Math.sin(time * 5) * 2;
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('[E] Abrir Loja', sx, sy + 18 + hintBob);

    if (Math.random() < 0.05) {
      spawnParticles(sx + (Math.random() - 0.5) * 20, sy - 20, 1, '#fbbf24', 'spark', 0.5);
    }
  }
}

// ═══════════════════════════════════════════════════
//  ENEMY (Detailed per-type sprites)
// ═══════════════════════════════════════════════════

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) {
  const { sx, sy } = isoToScreen(enemy.position.x, enemy.position.y);
  const bob = Math.sin(time * 4 + enemy.position.x * 2) * 1;
  const isHit = enemy.hitFlash > 0;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 5, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (enemy.type) {
    case 'skeleton': drawSkeleton(ctx, sx, sy, bob, isHit, time); break;
    case 'zombie': drawZombie(ctx, sx, sy, bob, isHit, time); break;
    case 'ghost': drawGhost(ctx, sx, sy, bob, isHit, time); break;
    case 'slime': drawSlime(ctx, sx, sy, bob, isHit, time); break;
    default: drawSkeleton(ctx, sx, sy, bob, isHit, time); break;
  }

  const hpRatio = enemy.health / enemy.maxHealth;
  drawBar(ctx, sx - 18, sy - 38, 36, 4, hpRatio, COLORS.enemyHp, COLORS.enemyHpBg);

  ctx.fillStyle = '#e5e7eb';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(enemy.name, sx, sy - 42);

  // Draw status effect indicators
  drawStatusEffectsOnEnemy(ctx, sx, sy, enemy.statusEffects, time);

  if (isHit && Math.random() < 0.4) {
    spawnParticles(sx, sy - 10, 3, '#ef4444', 'hit', 1.5);
  }
}

function drawSkeleton(ctx: CanvasRenderingContext2D, sx: number, sy: number, bob: number, isHit: boolean, time: number) {
  const color = isHit ? '#ffffff' : '#e2e8f0';
  const darkColor = isHit ? '#e5e7eb' : '#94a3b8';

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx - 3, sy);
  ctx.lineTo(sx - 5, sy + 6);
  ctx.moveTo(sx + 3, sy);
  ctx.lineTo(sx + 5, sy + 6);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.fillRect(sx - 6, sy - 16, 12, 12);
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(sx - 5, sy - 14 + i * 3);
    ctx.lineTo(sx + 5, sy - 14 + i * 3);
    ctx.stroke();
  }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(sx, sy - 22 + bob, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(sx - 3, sy - 23 + bob, 2.5, 0, Math.PI * 2);
  ctx.arc(sx + 3, sy - 23 + bob, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(sx - 3, sy - 23 + bob, 1.2, 0, Math.PI * 2);
  ctx.arc(sx + 3, sy - 23 + bob, 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sx - 4, sy - 18 + bob);
  ctx.lineTo(sx + 4, sy - 18 + bob);
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.save();
  ctx.translate(sx + 12, sy - 14);
  ctx.rotate(Math.sin(time * 3) * 0.2);
  ctx.fillRect(-1, -14, 2, 14);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-3, 0, 6, 3);
  ctx.restore();
}

function drawZombie(ctx: CanvasRenderingContext2D, sx: number, sy: number, bob: number, isHit: boolean, time: number) {
  const color = isHit ? '#ffffff' : '#4ade80';
  const darkColor = isHit ? '#d1fae5' : '#166534';

  ctx.fillStyle = '#365314';
  ctx.fillRect(sx - 5, sy - 2, 4, 8);
  ctx.fillRect(sx + 1, sy - 2, 4, 8);

  ctx.fillStyle = '#3f6212';
  ctx.beginPath();
  ctx.moveTo(sx - 6, sy + 2);
  ctx.lineTo(sx - 4, sy + 6);
  ctx.lineTo(sx - 2, sy + 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(sx - 8, sy - 2);
  ctx.lineTo(sx - 10, sy - 18);
  ctx.quadraticCurveTo(sx, sy - 22, sx + 10, sy - 18);
  ctx.lineTo(sx + 8, sy - 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#166534';
  ctx.fillRect(sx - 8, sy - 12, 16, 6);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(sx - 3, sy - 12);
  ctx.lineTo(sx - 1, sy - 8);
  ctx.lineTo(sx + 1, sy - 12);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(sx - 12, sy - 14, 3, 7, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(sx + 10, sy - 14);
  ctx.rotate(-0.5 + Math.sin(time * 2) * 0.2);
  ctx.fillStyle = color;
  ctx.fillRect(-2, 0, 4, 12);
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.arc(0, 14, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(sx, sy - 24 + bob, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(sx + 4, sy - 26 + bob, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(sx - 3, sy - 25 + bob, 2, 0, Math.PI * 2);
  ctx.arc(sx + 3, sy - 25 + bob, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(sx - 3, sy - 25 + bob, 1, 0, Math.PI * 2);
  ctx.arc(sx + 3, sy - 25 + bob, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawGhost(ctx: CanvasRenderingContext2D, sx: number, sy: number, bob: number, isHit: boolean, time: number) {
  const alpha = isHit ? 0.9 : 0.7;
  const floatY = Math.sin(time * 2) * 4;

  ctx.save();
  ctx.globalAlpha = alpha;

  const ghostGrad = ctx.createLinearGradient(sx, sy - 30 + floatY, sx, sy + 5 + floatY);
  ghostGrad.addColorStop(0, '#c4b5fd');
  ghostGrad.addColorStop(0.7, '#a78bfa');
  ghostGrad.addColorStop(1, 'rgba(167, 139, 250, 0)');
  ctx.fillStyle = ghostGrad;

  ctx.beginPath();
  ctx.moveTo(sx - 12, sy + 5 + floatY);
  ctx.quadraticCurveTo(sx - 8, sy - 2 + floatY, sx - 6, sy + 5 + floatY);
  ctx.quadraticCurveTo(sx - 3, sy - 2 + floatY, sx, sy + 5 + floatY);
  ctx.quadraticCurveTo(sx + 3, sy - 2 + floatY, sx + 6, sy + 5 + floatY);
  ctx.quadraticCurveTo(sx + 8, sy - 2 + floatY, sx + 12, sy + 5 + floatY);
  ctx.lineTo(sx + 12, sy - 12 + floatY);
  ctx.quadraticCurveTo(sx + 12, sy - 30 + floatY, sx, sy - 30 + floatY);
  ctx.quadraticCurveTo(sx - 12, sy - 30 + floatY, sx - 12, sy - 12 + floatY);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.ellipse(sx - 4, sy - 20 + floatY, 3, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(sx + 4, sy - 20 + floatY, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e0e7ff';
  ctx.beginPath();
  ctx.arc(sx - 4, sy - 21 + floatY, 1.5, 0, Math.PI * 2);
  ctx.arc(sx + 4, sy - 21 + floatY, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 14 + floatY, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#c4b5fd';
  for (let i = 0; i < 3; i++) {
    const trailY = sy + 8 + i * 4 + floatY;
    ctx.beginPath();
    ctx.ellipse(sx, trailY, 8 - i * 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSlime(ctx: CanvasRenderingContext2D, sx: number, sy: number, bob: number, isHit: boolean, time: number) {
  const squish = Math.sin(time * 5) * 2;
  const color = isHit ? '#ffffff' : '#4ade80';
  const darkColor = isHit ? '#d1fae5' : '#166534';

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(sx, sy - 6 + squish * 0.5, 12 + squish, 8 - squish * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(sx - 4, sy - 10 + squish * 0.5, 4, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(sx - 4, sy - 8 + squish * 0.5, 2, 0, Math.PI * 2);
  ctx.arc(sx + 4, sy - 8 + squish * 0.5, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(sx - 3, sy - 9 + squish * 0.5, 0.8, 0, Math.PI * 2);
  ctx.arc(sx + 5, sy - 9 + squish * 0.5, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(sx, sy - 5 + squish * 0.5, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();

  if (Math.random() < 0.02) {
    spawnParticles(sx + (Math.random() - 0.5) * 10, sy, 1, '#4ade80', 'dust', 0.2);
  }
}

// ═══════════════════════════════════════════════════
//  BOSS — Guardião das Trevas
// ═══════════════════════════════════════════════════

function drawBoss(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) {
  const { sx, sy } = isoToScreen(enemy.position.x, enemy.position.y);
  const bob = Math.sin(time * 2) * 2;
  const isHit = enemy.hitFlash > 0;
  const phase = enemy.bossPhase || 1;
  const hpRatio = enemy.health / enemy.maxHealth;
  const isDragon = enemy.isDragonForm;

  // Dragon form - draw completely different sprite
  if (isDragon) {
    drawDragonBoss(ctx, sx, sy, bob, isHit, time, enemy);
    return;
  }

  // Dark aura
  const auraRadius = 40 + Math.sin(time * 3) * 5;
  const auraGrad = ctx.createRadialGradient(sx, sy - 15, 0, sx, sy - 15, auraRadius);
  const auraColor = phase === 3 ? 'rgba(220, 38, 38,' : phase === 2 ? 'rgba(168, 85, 247,' : 'rgba(99, 102, 241,';
  auraGrad.addColorStop(0, `${auraColor} 0.15)`);
  auraGrad.addColorStop(1, `${auraColor} 0)`);
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(sx, sy - 15, auraRadius, 0, Math.PI * 2);
  ctx.fill();

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 8, 24, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (dark armor)
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(sx - 8, sy - 4, 6, 12);
  ctx.fillRect(sx + 2, sy - 4, 6, 12);

  // Boots
  ctx.fillStyle = '#0f0a2e';
  ctx.fillRect(sx - 10, sy + 6, 8, 5);
  ctx.fillRect(sx + 2, sy + 6, 8, 5);

  // Body (dark armor)
  const bodyGrad = ctx.createLinearGradient(sx, sy - 32, sx, sy);
  bodyGrad.addColorStop(0, '#312e81');
  bodyGrad.addColorStop(0.5, '#1e1b4b');
  bodyGrad.addColorStop(1, '#0f0a2e');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(sx - 14, sy - 4);
  ctx.lineTo(sx - 16, sy - 28);
  ctx.quadraticCurveTo(sx, sy - 34, sx + 16, sy - 28);
  ctx.lineTo(sx + 14, sy - 4);
  ctx.closePath();
  ctx.fill();

  // Armor plates
  ctx.fillStyle = 'rgba(148, 163, 184, 0.15)';
  ctx.beginPath();
  ctx.moveTo(sx - 10, sy - 24);
  ctx.lineTo(sx, sy - 28);
  ctx.lineTo(sx + 10, sy - 24);
  ctx.lineTo(sx + 6, sy - 12);
  ctx.lineTo(sx - 6, sy - 12);
  ctx.closePath();
  ctx.fill();

  // Belt with rune
  ctx.fillStyle = '#4c1d95';
  ctx.fillRect(sx - 14, sy - 12, 28, 4);
  ctx.fillStyle = '#a78bfa';
  ctx.beginPath();
  ctx.arc(sx, sy - 10, 3, 0, Math.PI * 2);
  ctx.fill();

  // Arms
  ctx.fillStyle = '#312e81';
  ctx.beginPath();
  ctx.ellipse(sx - 18, sy - 20, 4, 8, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(sx + 18, sy - 20, 4, 8, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Hands (glowing)
  ctx.fillStyle = '#c084fc';
  ctx.beginPath();
  ctx.arc(sx - 19, sy - 12, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx + 19, sy - 12, 3, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#4c1d95';
  ctx.beginPath();
  ctx.arc(sx, sy - 36 + bob, 12, 0, Math.PI * 2);
  ctx.fill();

  // Crown/horns
  ctx.fillStyle = '#7c3aed';
  // Left horn
  ctx.beginPath();
  ctx.moveTo(sx - 8, sy - 42 + bob);
  ctx.lineTo(sx - 12, sy - 54 + bob);
  ctx.lineTo(sx - 4, sy - 44 + bob);
  ctx.closePath();
  ctx.fill();
  // Right horn
  ctx.beginPath();
  ctx.moveTo(sx + 8, sy - 42 + bob);
  ctx.lineTo(sx + 12, sy - 54 + bob);
  ctx.lineTo(sx + 4, sy - 44 + bob);
  ctx.closePath();
  ctx.fill();

  // Eyes (glowing red)
  const eyeGlow = 0.7 + 0.3 * Math.sin(time * 5);
  ctx.fillStyle = `rgba(220, 38, 38, ${eyeGlow})`;
  ctx.beginPath();
  ctx.arc(sx - 4, sy - 37 + bob, 3, 0, Math.PI * 2);
  ctx.arc(sx + 4, sy - 37 + bob, 3, 0, Math.PI * 2);
  ctx.fill();

  // Eye glow effect
  ctx.fillStyle = `rgba(255, 100, 100, ${eyeGlow * 0.3})`;
  ctx.beginPath();
  ctx.arc(sx - 4, sy - 37 + bob, 6, 0, Math.PI * 2);
  ctx.arc(sx + 4, sy - 37 + bob, 6, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sx, sy - 32 + bob, 5, 0.3, Math.PI - 0.3);
  ctx.stroke();

  // Phase indicator
  const phaseColors = ['#6366f1', '#a855f7', '#ef4444'];
  ctx.fillStyle = phaseColors[phase - 1] || '#6366f1';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Fase ${phase}`, sx, sy - 58 + bob);

  // Boss name
  ctx.fillStyle = '#c084fc';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(enemy.name, sx, sy - 66 + bob);

  // HP Bar (larger)
  drawBar(ctx, sx - 30, sy - 74 + bob, 60, 6, hpRatio, '#ef4444', '#1f2937');

  // HP text
  ctx.fillStyle = '#fca5a5';
  ctx.font = '9px sans-serif';
  ctx.fillText(`${Math.round(enemy.health)}/${enemy.maxHealth}`, sx, sy - 78 + bob);

  // Hit particles
  if (isHit && Math.random() < 0.5) {
    spawnParticles(sx, sy - 15, 5, '#7c3aed', 'hit', 2);
  }

  // Ambient dark particles
  if (Math.random() < 0.08) {
    spawnParticles(sx + (Math.random() - 0.5) * 30, sy - 20, 1, '#7c3aed', 'spark', 0.5);
  }

  // Status effect visuals on boss
  if (enemy.statusEffects && enemy.statusEffects.length > 0) {
    for (const effect of enemy.statusEffects) {
      if (effect.type === 'burn') {
        // Fire particles around boss
        if (Math.random() < 0.3) {
          spawnParticles(sx + (Math.random() - 0.5) * 30, sy - 10, 1, '#f97316', 'spark', 0.5);
        }
        // Burn overlay
        ctx.save();
        ctx.globalAlpha = 0.15 + 0.1 * Math.sin(time * 8);
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 5, 20, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (effect.type === 'slow') {
        // Ice crystals on boss
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#93c5fd';
        for (let i = 0; i < 3; i++) {
          const angle = time * 2 + i * 2;
          ctx.beginPath();
          ctx.arc(sx + Math.cos(angle) * 15, sy - 10 + Math.sin(angle) * 8, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (effect.type === 'stun') {
        // Stars above head
        ctx.save();
        for (let i = 0; i < 3; i++) {
          const angle = time * 4 + i * 2.1;
          const starX = sx + Math.cos(angle) * 12;
          const starY = sy - 60 + Math.sin(angle) * 5;
          ctx.fillStyle = '#fbbf24';
          ctx.font = '10px sans-serif';
          ctx.fillText('⭐', starX, starY);
        }
        ctx.restore();
      }
    }
  }
}

// ═══════════════════════════════════════════════════
//  DRAGON BOSS FORM
// ═══════════════════════════════════════════════════

function drawDragonBoss(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  bob: number, isHit: boolean, time: number,
  enemy: Enemy,
) {
  const pulse = Math.sin(time * 3) * 0.1 + 1;

  // Fire aura
  const auraGrad = ctx.createRadialGradient(sx, sy - 10, 0, sx, sy - 10, 60 * pulse);
  auraGrad.addColorStop(0, 'rgba(220, 38, 38, 0.25)');
  auraGrad.addColorStop(0.5, 'rgba(234, 88, 12, 0.1)');
  auraGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(sx, sy - 10, 60 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 12, 35, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  ctx.save();
  ctx.strokeStyle = '#1e1b4b';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(sx + 20, sy + 5);
  for (let i = 0; i < 5; i++) {
    ctx.quadraticCurveTo(
      sx + 30 + i * 12, sy + 5 + Math.sin(time * 3 + i) * 5,
      sx + 36 + i * 12, sy + 8
    );
  }
  ctx.stroke();
  // Tail tip (fire)
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(sx + 85, sy + 2);
  ctx.lineTo(sx + 95, sy - 5 + Math.sin(time * 8) * 3);
  ctx.lineTo(sx + 85, sy + 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Body (dark scales)
  const bodyGrad = ctx.createLinearGradient(sx, sy - 40, sx, sy + 10);
  bodyGrad.addColorStop(0, '#312e81');
  bodyGrad.addColorStop(0.5, '#1e1b4b');
  bodyGrad.addColorStop(1, '#0f0a2e');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(sx, sy - 10, 22, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly scales
  ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 5, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(sx - 18, sy - 2, 8, 14);
  ctx.fillRect(sx + 10, sy - 2, 8, 14);
  // Claws
  ctx.fillStyle = '#dc2626';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(sx - 18 + i * 3, sy + 12);
    ctx.lineTo(sx - 16 + i * 3, sy + 16);
    ctx.lineTo(sx - 14 + i * 3, sy + 12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + 10 + i * 3, sy + 12);
    ctx.lineTo(sx + 12 + i * 3, sy + 16);
    ctx.lineTo(sx + 14 + i * 3, sy + 12);
    ctx.fill();
  }

  // Wings (animated)
  const wingFlap = Math.sin(time * 4) * 0.15;
  ctx.save();
  ctx.globalAlpha = 0.85;
  // Left wing
  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.moveTo(sx - 15, sy - 15);
  ctx.quadraticCurveTo(
    sx - 60 - Math.sin(time * 4) * 10, sy - 50 - wingFlap * 30,
    sx - 70, sy - 10
  );
  ctx.lineTo(sx - 15, sy);
  ctx.closePath();
  ctx.fill();
  // Wing membrane
  ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
  ctx.beginPath();
  ctx.moveTo(sx - 15, sy - 12);
  ctx.quadraticCurveTo(
    sx - 45, sy - 35 - wingFlap * 20,
    sx - 55, sy - 10
  );
  ctx.lineTo(sx - 15, sy);
  ctx.closePath();
  ctx.fill();
  // Right wing
  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.moveTo(sx + 15, sy - 15);
  ctx.quadraticCurveTo(
    sx + 60 + Math.sin(time * 4) * 10, sy - 50 - wingFlap * 30,
    sx + 70, sy - 10
  );
  ctx.lineTo(sx + 15, sy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
  ctx.beginPath();
  ctx.moveTo(sx + 15, sy - 12);
  ctx.quadraticCurveTo(
    sx + 45, sy - 35 - wingFlap * 20,
    sx + 55, sy - 10
  );
  ctx.lineTo(sx + 15, sy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Neck
  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.moveTo(sx - 10, sy - 20);
  ctx.quadraticCurveTo(sx - 5, sy - 45, sx, sy - 55);
  ctx.quadraticCurveTo(sx + 5, sy - 45, sx + 10, sy - 20);
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.fillStyle = '#312e81';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 58 + bob, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Horns
  ctx.fillStyle = '#7c3aed';
  ctx.beginPath();
  ctx.moveTo(sx - 10, sy - 66 + bob);
  ctx.lineTo(sx - 18, sy - 82 + bob);
  ctx.lineTo(sx - 4, sy - 68 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx + 10, sy - 66 + bob);
  ctx.lineTo(sx + 18, sy - 82 + bob);
  ctx.lineTo(sx + 4, sy - 68 + bob);
  ctx.closePath();
  ctx.fill();

  // Eyes (glowing red)
  const eyeGlow = 0.7 + 0.3 * Math.sin(time * 6);
  ctx.fillStyle = `rgba(220, 38, 38, ${eyeGlow})`;
  ctx.beginPath();
  ctx.arc(sx - 6, sy - 60 + bob, 4, 0, Math.PI * 2);
  ctx.arc(sx + 6, sy - 60 + bob, 4, 0, Math.PI * 2);
  ctx.fill();
  // Eye glow effect
  ctx.fillStyle = `rgba(255, 100, 100, ${eyeGlow * 0.3})`;
  ctx.beginPath();
  ctx.arc(sx - 6, sy - 60 + bob, 8, 0, Math.PI * 2);
  ctx.arc(sx + 6, sy - 60 + bob, 8, 0, Math.PI * 2);
  ctx.fill();

  // Mouth (fire breath preparation)
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sx, sy - 52 + bob, 6, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Fire particles from mouth
  if (Math.random() < 0.2) {
    spawnParticles(sx, sy - 55 + bob, 2, '#ef4444', 'spark', 0.8);
  }

  // Phase indicator
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🐉 FASE DRAGÃO', sx, sy - 88 + bob);

  // Boss name
  ctx.fillStyle = '#fca5a5';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(enemy.name, sx, sy - 98 + bob);

  // HP Bar (larger)
  drawBar(ctx, sx - 30, sy - 106 + bob, 60, 6, enemy.health / enemy.maxHealth, '#ef4444', '#1f2937');

  // HP text
  ctx.fillStyle = '#fca5a5';
  ctx.font = '9px sans-serif';
  ctx.fillText(`${Math.round(enemy.health)}/${enemy.maxHealth}`, sx, sy - 110 + bob);

  // Hit particles
  if (isHit && Math.random() < 0.5) {
    spawnParticles(sx, sy - 15, 5, '#dc2626', 'hit', 2);
  }

  // Ambient fire particles
  if (Math.random() < 0.1) {
    spawnParticles(sx + (Math.random() - 0.5) * 40, sy - 20, 1, '#f97316', 'meteor', 0.5);
  }

  // Status effect visuals
  if (enemy.statusEffects && enemy.statusEffects.length > 0) {
    for (const effect of enemy.statusEffects) {
      if (effect.type === 'burn') {
        if (Math.random() < 0.3) {
          spawnParticles(sx + (Math.random() - 0.5) * 40, sy - 15, 1, '#f97316', 'spark', 0.5);
        }
      }
      if (effect.type === 'slow') {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#93c5fd';
        for (let i = 0; i < 3; i++) {
          const angle = time * 2 + i * 2;
          ctx.beginPath();
          ctx.arc(sx + Math.cos(angle) * 20, sy - 10 + Math.sin(angle) * 10, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (effect.type === 'stun') {
        ctx.save();
        for (let i = 0; i < 3; i++) {
          const angle = time * 4 + i * 2.1;
          ctx.fillStyle = '#fbbf24';
          ctx.font = '10px sans-serif';
          ctx.fillText('⭐', sx + Math.cos(angle) * 15, sy - 75 + bob + Math.sin(angle) * 5);
        }
        ctx.restore();
      }
    }
  }
}

// ═══════════════════════════════════════════════════
//  METEOR ATTACK (Boss ability)
// ═══════════════════════════════════════════════════

function drawMeteor(ctx: CanvasRenderingContext2D, meteor: MeteorAttack, time: number) {
  const { sx, sy } = isoToScreen(meteor.position.x, meteor.position.y);

  if (meteor.phase === 'warning') {
    // Warning circle on ground
    const warningAlpha = 0.3 + 0.3 * Math.sin(time * 8);
    ctx.save();
    ctx.globalAlpha = warningAlpha;

    // Outer warning ring
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 40, 20, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Inner fill
    const warnGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 40);
    warnGrad.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
    warnGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = warnGrad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 40, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Countdown indicator
    const remaining = Math.max(0, meteor.impactTime - time);
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${remaining.toFixed(1)}s`, sx, sy - 5);

    // Crosshair
    ctx.strokeStyle = `rgba(239, 68, 68, ${warningAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - 15, sy);
    ctx.lineTo(sx + 15, sy);
    ctx.moveTo(sx, sy - 10);
    ctx.lineTo(sx, sy + 10);
    ctx.stroke();

    ctx.restore();
  } else if (meteor.phase === 'falling') {
    // Meteor falling from above
    const fallProgress = Math.min(1, (time - (meteor.impactTime - 0.5)) / 0.5);
    const meteorY = sy - 100 * (1 - fallProgress);
    const meteorSize = 8 + fallProgress * 12;

    // Fire trail
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const trailAlpha = (1 - i / 5) * 0.6;
      const trailY = meteorY - i * 8;
      ctx.globalAlpha = trailAlpha;
      ctx.fillStyle = i < 2 ? '#ef4444' : '#f97316';
      ctx.beginPath();
      ctx.arc(sx + (Math.random() - 0.5) * 4, trailY, meteorSize * (1 - i / 5) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Meteor core
    const meteorGrad = ctx.createRadialGradient(sx, meteorY, 0, sx, meteorY, meteorSize);
    meteorGrad.addColorStop(0, '#fbbf24');
    meteorGrad.addColorStop(0.4, '#ef4444');
    meteorGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = meteorGrad;
    ctx.beginPath();
    ctx.arc(sx, meteorY, meteorSize, 0, Math.PI * 2);
    ctx.fill();

    // Glow
    ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
    ctx.beginPath();
    ctx.arc(sx, meteorY, meteorSize * 2, 0, Math.PI * 2);
    ctx.fill();

    // Spawn trail particles
    spawnParticles(sx, meteorY, 2, '#ef4444', 'meteor', 0.5);
  }
}

// ═══════════════════════════════════════════════════
//  PLAYER (Detailed character with equipment)
// ═══════════════════════════════════════════════════

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  isAttacking: boolean,
  time: number,
) {
  const { sx, sy } = isoToScreen(player.position.x, player.position.y);
  const bob = player.isMoving ? Math.sin(time * 12) * 2 : Math.sin(time * 2) * 0.5;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 5, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glow
  const glowColor = isAttacking ? 'rgba(245, 158, 11, 0.4)' : 'rgba(99, 102, 241, 0.2)';
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.arc(sx, sy - 10, 24, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = '#1e3a5f';
  const legAnim = player.isMoving ? Math.sin(time * 12) * 3 : 0;
  ctx.fillRect(sx - 5, sy - 2 + legAnim, 4, 8);
  ctx.fillRect(sx + 1, sy - 2 - legAnim, 4, 8);

  // Boots
  ctx.fillStyle = '#78350f';
  ctx.fillRect(sx - 6, sy + 4 + legAnim, 5, 4);
  ctx.fillRect(sx + 1, sy + 4 - legAnim, 5, 4);

  // Body
  const bodyGrad = ctx.createLinearGradient(sx, sy - 22, sx, sy);
  bodyGrad.addColorStop(0, '#4f46e5');
  bodyGrad.addColorStop(1, '#3730a3');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(sx - 8, sy - 2);
  ctx.lineTo(sx - 10, sy - 20);
  ctx.quadraticCurveTo(sx, sy - 24, sx + 10, sy - 20);
  ctx.lineTo(sx + 8, sy - 2);
  ctx.closePath();
  ctx.fill();

  // Belt
  ctx.fillStyle = '#713f12';
  ctx.fillRect(sx - 9, sy - 8, 18, 3);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(sx, sy - 6.5, 2, 0, Math.PI * 2);
  ctx.fill();

  // Armor plate (shows strongest equipped armor visual)
  if (player.flatDefense > 0) {
    // Determine armor tier from equipped armors
    const equippedArmors = (player as any).equippedArmors || [];
    const strongestTier = equippedArmors.length > 0
      ? Math.max(...equippedArmors.map((a: any) => a.tier || 0))
      : player.flatDefense >= 25 ? 4 : player.flatDefense >= 15 ? 3 : player.flatDefense >= 10 ? 2 : 1;
    const armorColor = ARMOR_TIER_COLORS[strongestTier] || '#94a3b8';

    // Base armor plate
    ctx.fillStyle = armorColor;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(sx - 7, sy - 18);
    ctx.lineTo(sx, sy - 21);
    ctx.lineTo(sx + 7, sy - 18);
    ctx.lineTo(sx + 5, sy - 10);
    ctx.lineTo(sx - 5, sy - 10);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Armor highlight
    ctx.strokeStyle = `rgba(255,255,255,0.3)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - 5, sy - 16);
    ctx.lineTo(sx, sy - 18);
    ctx.lineTo(sx + 5, sy - 16);
    ctx.stroke();

    // Tier indicator (small dots)
    if (strongestTier >= 3) {
      for (let i = 0; i < Math.min(strongestTier - 2, 3); i++) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(sx - 3 + i * 3, sy - 14, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Shadow Shield visual (when active)
    if ((player as any).hasShadowShield && (player as any).shadowShieldActive) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 8);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy - 10, 22, -0.8, 0.8);
      ctx.stroke();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(sx, sy - 10, 22, -0.8, 0.8);
      ctx.lineTo(sx, sy - 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if ((player as any).hasShadowShield) {
      // Shield on back (idle)
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#6d28d9';
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy - 18);
      ctx.lineTo(sx - 12, sy - 14);
      ctx.lineTo(sx - 8, sy - 10);
      ctx.lineTo(sx - 4, sy - 14);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Arms
  ctx.fillStyle = '#4f46e5';
  ctx.beginPath();
  ctx.ellipse(sx - 12, sy - 14, 3, 7, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(sx + 10, sy - 14);
  if (isAttacking) {
    ctx.rotate(-1.2);
  } else {
    ctx.rotate(0.15 + Math.sin(time * 2) * 0.1);
  }
  ctx.fillStyle = '#4f46e5';
  ctx.fillRect(-2, 0, 4, 10);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, 12, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Sword
  if (player.flatPhysicalDamage > 0 || player.hasAOE) {
    ctx.save();
    ctx.translate(sx + 14, sy - 16);
    if (isAttacking) {
      ctx.rotate(-2.0 + Math.sin(time * 20) * 0.3);
    } else {
      ctx.rotate(0.5 + Math.sin(time * 2) * 0.1);
    }

    const bladeGrad = ctx.createLinearGradient(0, -16, 0, 0);
    bladeGrad.addColorStop(0, '#e2e8f0');
    bladeGrad.addColorStop(0.5, '#cbd5e1');
    bladeGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(-1, -16);
    ctx.lineTo(0, -18);
    ctx.lineTo(1, -16);
    ctx.lineTo(2, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(-1.5, 0);
    ctx.stroke();

    ctx.fillStyle = player.hasAOE ? '#f59e0b' : '#78350f';
    ctx.fillRect(-5, -1, 10, 3);

    ctx.fillStyle = '#451a03';
    ctx.fillRect(-1.5, 2, 3, 5);

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, 8, 2, 0, Math.PI * 2);
    ctx.fill();

    if (player.hasAOE) {
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
      ctx.fillRect(-3, -16, 6, 16);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  // Head
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(sx, sy - 28 + bob, 8, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.arc(sx, sy - 30 + bob, 8, Math.PI + 0.3, Math.PI * 2 - 0.3);
  ctx.fill();

  // Eyes
  const eyeOffX = player.facing.x * 1.5;
  const eyeOffY = player.facing.y * 0.5;
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(sx - 3 + eyeOffX, sy - 29 + bob + eyeOffY, 1.5, 0, Math.PI * 2);
  ctx.arc(sx + 3 + eyeOffX, sy - 29 + bob + eyeOffY, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(sx - 2.5 + eyeOffX, sy - 29.5 + bob + eyeOffY, 0.6, 0, Math.PI * 2);
  ctx.arc(sx + 3.5 + eyeOffX, sy - 29.5 + bob + eyeOffY, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (isAttacking) {
    ctx.arc(sx, sy - 25 + bob, 2, 0, Math.PI);
  } else {
    ctx.arc(sx, sy - 26 + bob, 2, 0.2, Math.PI - 0.2);
  }
  ctx.stroke();

  // Name & Level
  ctx.fillStyle = '#c7d2fe';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Lvl ${player.level}`, sx, sy - 40 + bob);

  // AOE indicator
  if (player.hasAOE) {
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('⚔ AOE', sx, sy - 48 + bob);
  }

  // HP Bar
  const hpRatio = player.currentHealth / player.maxHealth;
  drawBar(ctx, sx - 20, sy - 54 + bob, 40, 5, hpRatio, COLORS.hpBar, COLORS.hpBarBg);

  // HP Text
  ctx.fillStyle = '#fca5a5';
  ctx.font = '8px sans-serif';
  ctx.fillText(`${player.currentHealth}/${player.maxHealth}`, sx, sy - 56 + bob);

  // Enhanced attack particles and sword swing
  if (isAttacking) {
    const ps = isoToScreen(player.position.x, player.position.y);
    // Multiple wave particles for impact
    spawnParticles(ps.sx + 15, ps.sy - 15, 6, '#f59e0b', 'spark', 1.8);
    spawnParticles(ps.sx + 20, ps.sy - 10, 3, player.hasAOE ? '#fbbf24' : '#e2e8f0', 'spark', 1.2);
    triggerShake(2.5, 0.12);
    // Sword swing arc effect
    drawEnhancedSwordSwing(ctx, ps.sx, ps.sy, attackFlash, time, player);
  }

// ─── Spell Projectile ─────────────────────────────

const SPELL_COLORS: Record<string, { core: string; glow: string; trail: string; icon: string }> = {
  Fire: { core: '#ef4444', glow: '#f97316', trail: '#fbbf24', icon: '🔥' },
  Water: { core: '#3b82f6', glow: '#60a5fa', trail: '#93c5fd', icon: '❄️' },
  Earth: { core: '#84cc16', glow: '#a3e635', trail: '#bef264', icon: '🪨' },
  Air: { core: '#e2e8f0', glow: '#f1f5f9', trail: '#cbd5e1', icon: '💨' },
};

function drawSpellProjectile(ctx: CanvasRenderingContext2D, proj: SpellProjectile, time: number) {
  const colors = SPELL_COLORS[proj.element] || SPELL_COLORS.Fire;
  const size = 4 + proj.tier * 2;

  // Trail
  ctx.save();
  for (let i = 0; i < proj.trail.length; i++) {
    const t = proj.trail[i];
    const { sx: tsx, sy: tsy } = isoToScreen(t.x, t.y);
    const alpha = (i / proj.trail.length) * 0.5;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colors.trail;
    ctx.beginPath();
    ctx.arc(tsx, tsy, size * (i / proj.trail.length) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Glow
  const { sx, sy } = isoToScreen(proj.position.x, proj.position.y);
  const pulse = 0.5 + 0.5 * Math.sin(time * 10);

  ctx.save();
  ctx.globalAlpha = 0.4 + pulse * 0.2;
  const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 3);
  grad.addColorStop(0, colors.glow);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(sx, sy, size * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Core
  ctx.fillStyle = colors.core;
  ctx.beginPath();
  ctx.arc(sx, sy, size, 0, Math.PI * 2);
  ctx.fill();

  // Inner bright
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(sx, sy, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Element icon
  ctx.font = `${8 + proj.tier * 2}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(colors.icon, sx, sy);

  // Spawn trail particles
  if (Math.random() < 0.5) {
    spawnParticles(sx, sy, 1, colors.trail, 'spark', 0.3);
  }
}

// ═══════════════════════════════════════════════════
//  SPELL EXPLOSION EFFECT
// ═══════════════════════════════════════════════════

function drawSpellExplosion(ctx: CanvasRenderingContext2D, exp: SpellExplosion, time: number) {
  const { sx, sy } = isoToScreen(exp.position.x, exp.position.y);
  const alpha = exp.life / exp.maxLife;
  const progress = 1 - alpha;
  const radius = exp.radius * TILE_W * 0.5 * (0.5 + progress * 0.5);

  const colors = SPELL_COLORS[exp.element] || SPELL_COLORS.Fire;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Expanding ring
  ctx.strokeStyle = colors.core;
  ctx.lineWidth = 3 * alpha;
  ctx.beginPath();
  ctx.ellipse(sx, sy, radius, radius * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Inner glow fill
  const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius * 0.8);
  grad.addColorStop(0, `${colors.glow}40`);
  grad.addColorStop(1, `${colors.core}00`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(sx, sy, radius * 0.8, radius * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Radial burst lines
  ctx.strokeStyle = colors.trail;
  ctx.lineWidth = 1.5 * alpha;
  const numLines = exp.tier >= 3 ? 16 : 10;
  for (let i = 0; i < numLines; i++) {
    const angle = (i / numLines) * Math.PI * 2;
    const innerR = 8;
    const outerR = radius * 0.9;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(angle) * innerR, sy + Math.sin(angle) * innerR * 0.5);
    ctx.lineTo(sx + Math.cos(angle) * outerR, sy + Math.sin(angle) * outerR * 0.5);
    ctx.stroke();
  }

  // Element-specific effects
  if (exp.element === 'Fire') {
    // Fire burst
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = radius * Math.random();
      spawnParticles(sx + Math.cos(angle) * r, sy + Math.sin(angle) * r * 0.5, 1, '#fbbf24', 'spark', 0.5);
    }
  } else if (exp.element === 'Water') {
    // Ice crystals
    ctx.fillStyle = `rgba(147, 197, 253, ${alpha * 0.6})`;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + time * 2;
      const r = radius * 0.6;
      const ix = sx + Math.cos(angle) * r;
      const iy = sy + Math.sin(angle) * r * 0.5;
      ctx.beginPath();
      ctx.arc(ix, iy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (exp.element === 'Earth') {
    // Rock debris
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = radius * 0.7;
      const ix = sx + Math.cos(angle) * r;
      const iy = sy + Math.sin(angle) * r * 0.5;
      ctx.fillStyle = '#a3e635';
      ctx.fillRect(ix - 2, iy - 2, 4, 4);
    }
  } else if (exp.element === 'Air') {
    // Wind swirls
    ctx.strokeStyle = `rgba(241, 245, 249, ${alpha * 0.5})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const r = radius * (0.4 + i * 0.2);
      ctx.beginPath();
      ctx.ellipse(sx, sy, r, r * 0.4, time * 3 + i, 0, Math.PI * 1.5);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════
//  AOE EFFECT
// ═══════════════════════════════════════════════════

function drawAOEEffect(ctx: CanvasRenderingContext2D, player: PlayerState, aoeFlash: number) {
  const { sx, sy } = isoToScreen(player.position.x, player.position.y);
  const alpha = aoeFlash / 0.3;
  const radius = 70 + (1 - alpha) * 25;

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(sx, sy, radius, radius * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius * 0.8);
  grad.addColorStop(0, 'rgba(245, 158, 11, 0.15)');
  grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(sx, sy, radius * 0.8, radius * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const innerR = 12;
    const outerR = radius * 0.9;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(angle) * innerR, sy + Math.sin(angle) * innerR * 0.5);
    ctx.lineTo(sx + Math.cos(angle) * outerR, sy + Math.sin(angle) * outerR * 0.5);
    ctx.stroke();
  }

  if (alpha > 0.5) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = radius * 0.6 + Math.random() * radius * 0.3;
      spawnParticles(
        sx + Math.cos(angle) * r,
        sy + Math.sin(angle) * r * 0.5,
        1, '#fbbf24', 'spark', 0.5
      );
    }
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════
//  DAMAGE NUMBER
// ═══════════════════════════════════════════════════

function drawDamageNumber(ctx: CanvasRenderingContext2D, dn: DamageNumber) {
  const alpha = dn.life / dn.maxLife;
  const yOff = (1 - alpha) * -35;
  const scale = 1 + (1 - alpha) * 0.3;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(dn.x, dn.y + yOff);
  ctx.scale(scale, scale);

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(dn.text, 1, 1);

  ctx.fillStyle = dn.color;
  ctx.fillText(dn.text, 0, 0);

  ctx.restore();
}

// ═══════════════════════════════════════════════════
//  MINIMAP
// ═══════════════════════════════════════════════════

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  width: number, height: number,
  player: PlayerState,
  enemies: Enemy[],
  mapDef: MapDefinition,
) {
  const mmW = 130;
  const mmH = 130;
  const mmX = width - mmW - 12;
  const mmY = 12;
  const scaleX = mmW / mapDef.gridSize.w;
  const scaleY = mmH / mapDef.gridSize.h;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.beginPath();
  ctx.roundRect(mmX - 4, mmY - 4, mmW + 8, mmH + 8, 8);
  ctx.fill();

  ctx.fillStyle = mapDef.tileColor;
  ctx.beginPath();
  ctx.roundRect(mmX, mmY, mmW, mmH, 6);
  ctx.fill();

  for (const e of enemies) {
    ctx.fillStyle = e.isBoss ? '#a855f7' : '#ef4444';
    ctx.beginPath();
    ctx.arc(
      mmX + e.position.x * scaleX,
      mmY + e.position.y * scaleY,
      e.isBoss ? 4 : 2, 0, Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(
    mmX + player.position.x * scaleX,
    mmY + player.position.y * scaleY,
    3, 0, Math.PI * 2,
  );
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(mmX, mmY, mmW, mmH, 6);
  ctx.stroke();
}

// ═══════════════════════════════════════════════════
//  DRAGON ANIMATION (Rising from ground)
// ═══════════════════════════════════════════════════

function drawDragonAnimation(
  ctx: CanvasRenderingContext2D,
  anim: { active: boolean; startTime: number; duration: number },
  time: number,
) {
  const elapsed = (Date.now() - anim.startTime) / anim.duration; // 0 to 1
  if (elapsed > 1) return;

  // Center of screen (isometric center)
  const centerX = 0;
  const centerY = 0;

  // Phase 1: Ground cracks (0-0.3)
  if (elapsed < 0.3) {
    const progress = elapsed / 0.3;
    ctx.save();
    ctx.globalAlpha = progress * 0.8;

    // Cracks spreading from center
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2 + progress * 3;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const len = progress * 60;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * len + (Math.random() - 0.5) * 10,
        centerY + Math.sin(angle) * len * 0.5 + (Math.random() - 0.5) * 5,
      );
      ctx.stroke();
    }

    // Red glow on ground
    const glowGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 40 + progress * 30);
    glowGrad.addColorStop(0, `rgba(220, 38, 38, ${0.3 * progress})`);
    glowGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40 + progress * 30, 0, Math.PI * 2);
    ctx.fill();

    // Shake effect
    if (progress > 0.2) {
      triggerShake(4 * progress, 0.1);
    }

    ctx.restore();
  }

  // Phase 2: Dragon rising (0.2-0.8)
  if (elapsed > 0.2 && elapsed < 0.8) {
    const progress = (elapsed - 0.2) / 0.6;
    const riseY = progress * 120;
    const bob = Math.sin(time * 8) * 3;

    ctx.save();

    // Fire particles rising
    for (let i = 0; i < 12; i++) {
      const px = centerX + (Math.random() - 0.5) * 40;
      const py = centerY - riseY * Math.random();
      spawnParticles(px, py, 1, i % 2 === 0 ? '#ef4444' : '#f97316', 'meteor', 0.3);
    }

    // Dragon body (dark scales)
    const dragonY = centerY - riseY + bob;

    // Neck
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(centerX - 12, dragonY + 20);
    ctx.quadraticCurveTo(centerX - 20, dragonY - 10, centerX - 8, dragonY - 40);
    ctx.quadraticCurveTo(centerX, dragonY - 50, centerX + 8, dragonY - 40);
    ctx.quadraticCurveTo(centerX + 20, dragonY - 10, centerX + 12, dragonY + 20);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#312e81';
    ctx.beginPath();
    ctx.ellipse(centerX, dragonY - 50, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.moveTo(centerX - 10, dragonY - 58);
    ctx.lineTo(centerX - 16, dragonY - 74);
    ctx.lineTo(centerX - 4, dragonY - 60);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(centerX + 10, dragonY - 58);
    ctx.lineTo(centerX + 16, dragonY - 74);
    ctx.lineTo(centerX + 4, dragonY - 60);
    ctx.closePath();
    ctx.fill();

    // Eyes (glowing red)
    const eyeGlow = 0.7 + 0.3 * Math.sin(time * 8);
    ctx.fillStyle = `rgba(220, 38, 38, ${eyeGlow})`;
    ctx.beginPath();
    ctx.arc(centerX - 6, dragonY - 52, 3, 0, Math.PI * 2);
    ctx.arc(centerX + 6, dragonY - 52, 3, 0, Math.PI * 2);
    ctx.fill();

    // Eye glow
    ctx.fillStyle = `rgba(255, 100, 100, ${eyeGlow * 0.4})`;
    ctx.beginPath();
    ctx.arc(centerX - 6, dragonY - 52, 6, 0, Math.PI * 2);
    ctx.arc(centerX + 6, dragonY - 52, 6, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, dragonY - 44, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Wings (unfolding)
    if (progress > 0.3) {
      const wingProgress = (progress - 0.3) / 0.7;
      ctx.fillStyle = 'rgba(30, 27, 75, 0.8)';

      // Left wing
      ctx.beginPath();
      ctx.moveTo(centerX - 10, dragonY - 30);
      ctx.quadraticCurveTo(
        centerX - 50 * wingProgress, dragonY - 60 - wingProgress * 20,
        centerX - 60 * wingProgress, dragonY - 20,
      );
      ctx.lineTo(centerX - 10, dragonY - 10);
      ctx.closePath();
      ctx.fill();

      // Right wing
      ctx.beginPath();
      ctx.moveTo(centerX + 10, dragonY - 30);
      ctx.quadraticCurveTo(
        centerX + 50 * wingProgress, dragonY - 60 - wingProgress * 20,
        centerX + 60 * wingProgress, dragonY - 20,
      );
      ctx.lineTo(centerX + 10, dragonY - 10);
      ctx.closePath();
      ctx.fill();
    }

    // Dark aura
    const auraGrad = ctx.createRadialGradient(centerX, dragonY - 30, 0, centerX, dragonY - 30, 80);
    auraGrad.addColorStop(0, `rgba(124, 58, 237, ${0.15 * progress})`);
    auraGrad.addColorStop(1, 'rgba(124, 58, 237, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(centerX, dragonY - 30, 80, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Screen shake during rise
    if (progress > 0.1 && progress < 0.9) {
      triggerShake(3, 0.15);
    }
  }

  // Phase 3: Full reveal + text (0.7-1.0)
  if (elapsed > 0.7) {
    const progress = (elapsed - 0.7) / 0.3;

    ctx.save();
    ctx.globalAlpha = Math.min(1, progress * 2);

    // Title text
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐉 O GUARDIÃO DAS TREVAS SURGIU! 🐉', centerX, centerY - 160);

    ctx.fillStyle = '#fca5a5';
    ctx.font = '14px sans-serif';
    ctx.fillText('Fale com a Sentinela do Abismo...', centerX, centerY - 140);

    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════
//  BOSS ENTRANCE ANIMATION
// ═══════════════════════════════════════════════════

function drawBossEntranceAnimation(
  ctx: CanvasRenderingContext2D,
  anim: { active: boolean; startTime: number },
  time: number,
) {
  const elapsed = (Date.now() - anim.startTime) / 4000; // 4 second animation
  if (elapsed > 1) return;

  const centerX = 0;
  const centerY = 0;

  // Phase 1: Dark energy gathering (0-0.4)
  if (elapsed < 0.4) {
    const progress = elapsed / 0.4;
    ctx.save();
    ctx.globalAlpha = progress * 0.8;

    // Converging dark energy lines
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + time * 2;
      const startR = 150 * (1 - progress * 0.6);
      const endR = 20;
      ctx.strokeStyle = `rgba(124, 58, 237, ${0.5 * progress})`;
      ctx.lineWidth = 2 + progress * 2;
      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(angle) * startR, centerY + Math.sin(angle) * startR * 0.5);
      ctx.lineTo(centerX + Math.cos(angle) * endR, centerY + Math.sin(angle) * endR * 0.5);
      ctx.stroke();
    }

    // Dark vortex
    const vortexGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60 * progress);
    vortexGrad.addColorStop(0, `rgba(30, 27, 75, ${0.5 * progress})`);
    vortexGrad.addColorStop(1, 'rgba(30, 27, 75, 0)');
    ctx.fillStyle = vortexGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 60 * progress, 0, Math.PI * 2);
    ctx.fill();

    if (progress > 0.3) {
      triggerShake(5 * progress, 0.15);
    }

    ctx.restore();
  }

  // Phase 2: Boss materializing (0.3-0.7)
  if (elapsed > 0.3 && elapsed < 0.7) {
    const progress = (elapsed - 0.3) / 0.4;
    ctx.save();
    ctx.globalAlpha = progress;

    // Dark silhouette rising
    const riseY = -progress * 30;
    ctx.fillStyle = `rgba(30, 27, 75, ${0.8 * progress})`;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + riseY - 15, 18, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = `rgba(124, 58, 237, ${0.6 * progress})`;
    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY + riseY - 35);
    ctx.lineTo(centerX - 14, centerY + riseY - 50);
    ctx.lineTo(centerX - 2, centerY + riseY - 37);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(centerX + 8, centerY + riseY - 35);
    ctx.lineTo(centerX + 14, centerY + riseY - 50);
    ctx.lineTo(centerX + 2, centerY + riseY - 37);
    ctx.closePath();
    ctx.fill();

    // Glowing eyes
    const eyeGlow = 0.5 + 0.5 * Math.sin(time * 10);
    ctx.fillStyle = `rgba(220, 38, 38, ${eyeGlow * progress})`;
    ctx.beginPath();
    ctx.arc(centerX - 4, centerY + riseY - 18, 2, 0, Math.PI * 2);
    ctx.arc(centerX + 4, centerY + riseY - 18, 2, 0, Math.PI * 2);
    ctx.fill();

    // Dark aura expanding
    const auraGrad = ctx.createRadialGradient(centerX, centerY + riseY - 15, 0, centerX, centerY + riseY - 15, 50 * progress);
    auraGrad.addColorStop(0, `rgba(124, 58, 237, ${0.2 * progress})`);
    auraGrad.addColorStop(1, 'rgba(124, 58, 237, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY + riseY - 15, 50 * progress, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (progress > 0.1 && progress < 0.9) {
      triggerShake(4, 0.1);
    }
  }

  // Phase 3: Title reveal (0.6-1.0)
  if (elapsed > 0.6) {
    const progress = (elapsed - 0.6) / 0.4;
    ctx.save();
    ctx.globalAlpha = Math.min(1, progress * 2.5);

    // Title text
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚔️ GUARDIÃO DAS TREVAS ⚔️', centerX, centerY - 130);

    ctx.fillStyle = '#fca5a5';
    ctx.font = '13px sans-serif';
    ctx.fillText('Prepare-se para a batalha!', centerX, centerY - 110);

    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════
//  STATUS EFFECT INDICATORS on enemies
// ═══════════════════════════════════════════════════

function drawStatusEffectsOnEnemy(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  statusEffects: any[] | undefined,
  time: number,
) {
  if (!statusEffects || statusEffects.length === 0) return;

  const effectSize = 6;
  const startX = sx - (statusEffects.length * effectSize) / 2;

  for (let i = 0; i < statusEffects.length; i++) {
    const effect = statusEffects[i];
    const ex = startX + i * effectSize;
    const ey = sy - 42;

    switch (effect.type) {
      case 'burn':
        ctx.fillStyle = '#f97316';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔥', ex + effectSize / 2, ey);
        break;
      case 'slow':
        ctx.fillStyle = '#60a5fa';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('❄', ex + effectSize / 2, ey);
        break;
      case 'stun':
        ctx.fillStyle = '#fbbf24';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💫', ex + effectSize / 2, ey);
        break;
      case 'poison':
        ctx.fillStyle = '#a3e635';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('☠', ex + effectSize / 2, ey);
        break;
    }
  }
}

// ═══════════════════════════════════════════════════
//  ENHANCED SWORD ATTACK EFFECT
// ═══════════════════════════════════════════════════

function drawEnhancedSwordSwing(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  attackFlash: number,
  time: number,
  player: PlayerState,
) {
  if (attackFlash <= 0) return;

  const alpha = attackFlash / 0.15;
  const swingAngle = time * 30;

  ctx.save();
  ctx.translate(sx + 14, sy - 16);
  ctx.rotate(-1.5 + swingAngle * 0.3);

  // Sword trail (arc)
  ctx.globalAlpha = alpha * 0.6;
  ctx.strokeStyle = player.hasAOE ? '#f59e0b' : '#e2e8f0';
  ctx.lineWidth = 3 * alpha;
  ctx.beginPath();
  ctx.arc(0, 0, 25, -1.5, 0.5);
  ctx.stroke();

  // Inner trail
  ctx.globalAlpha = alpha * 0.3;
  ctx.strokeStyle = player.hasAOE ? '#fbbf24' : '#cbd5e1';
  ctx.lineWidth = 6 * alpha;
  ctx.beginPath();
  ctx.arc(0, 0, 20, -1.5, 0.5);
  ctx.stroke();

  // Spark particles at tip
  if (alpha > 0.3) {
    ctx.globalAlpha = alpha;
    const tipX = Math.cos(-1.5 + swingAngle * 0.3) * 25;
    const tipY = Math.sin(-1.5 + swingAngle * 0.3) * 25;
    spawnParticles(sx + 14 + tipX, sy - 16 + tipY, 2, player.hasAOE ? '#f59e0b' : '#e2e8f0', 'spark', 0.8);
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

// ─── Utility ───────────────────────────────────────

function distance(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// End of renderer module


}
