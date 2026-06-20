import { MapDefinition, ShopItemDef, Quest } from './types';

// ─── TILE SIZE (isometric) ─────────────────────────

export const TILE_W = 64;
export const TILE_H = 32;

// ─── PLAYER CONSTANTS ──────────────────────────────

export const BASE_HEALTH = 100;
export const HEALTH_PER_VITALITY = 0.15;
export const XP_MULTIPLIER = 1.5;
export const INITIAL_REQUIRED_XP = 100;
export const ATTR_POINTS_PER_LEVEL = 3;
export const PLAYER_SPEED = 3.5;
export const PLAYER_ATTACK_RANGE = 2.5;
export const PLAYER_ATTACK_COOLDOWN = 0.4;
export const PLAYER_BASE_DAMAGE = 5;
export const SPELL_MULTIPLIER = 2.5;
export const DAMAGE_VARIANCE = 0.15;
export const DEFENSE_REDUCTION = (def: number) => def / (def + 100);
export const POTION_HEAL = 30;

// ─── SPELL AOE CONSTANTS ───────────────────────────

// Intermediate spells (tier 2) = small area attack
export const SPELL_AOE_SMALL_RADIUS = 2.5;
// Advanced spells (tier 3) = medium area attack
export const SPELL_AOE_MEDIUM_RADIUS = 4.0;

export function getSpellAOERadius(tier: number): number {
  if (tier >= 3) return SPELL_AOE_MEDIUM_RADIUS;
  if (tier >= 2) return SPELL_AOE_SMALL_RADIUS;
  return 0; // basic spells = single target
}

// ─── ENEMY CONSTANTS ───────────────────────────────

export const ENEMY_TYPES = {
  slime: { name: 'Slime', color: '#4ade80', maxHealth: 30, attack: 5, xp: 15, coins: 8, speed: 1.2 },
  skeleton: { name: 'Esqueleto', color: '#e2e8f0', maxHealth: 50, attack: 10, xp: 25, coins: 12, speed: 1.8 },
  zombie: { name: 'Zumbi', color: '#86efac', maxHealth: 70, attack: 15, xp: 35, coins: 18, speed: 1.0 },
  ghost: { name: 'Fantasma', color: '#c4b5fd', maxHealth: 40, attack: 20, xp: 45, coins: 25, speed: 2.5 },
  // Stronger variants for TerrasForte
  darkSlime: { name: 'Slime Negro', color: '#22c55e', maxHealth: 120, attack: 25, xp: 80, coins: 40, speed: 1.5 },
  darkSkeleton: { name: 'Esqueleto Sombrio', color: '#cbd5e1', maxHealth: 180, attack: 40, xp: 120, coins: 60, speed: 2.2 },
  darkGhost: { name: 'Espectro', color: '#a78bfa', maxHealth: 150, attack: 55, xp: 150, coins: 80, speed: 3.0 },
  boss: { name: 'Guardião das Trevas', color: '#dc2626', maxHealth: 9999, attack: 999, xp: 5000, coins: 2000, speed: 0.6 },
};

export const ENEMY_AGGRO_RANGE = 6;
export const ENEMY_ATTACK_RANGE = 1.8;
export const ENEMY_ATTACK_COOLDOWN = 1.2;
export const ENEMY_RESPAWN_TIME = 8;

// ─── BOSS CONSTANTS ────────────────────────────────

export const BOSS_STRENGTH_MULTIPLIER = 15; // 15x player stats (stronger boss)
export const BOSS_DRAGON_PHASE_THRESHOLD = 0.5; // HP% to trigger dragon transformation
export const BOSS_DRAGON_SPEED_MULT = 1.8; // Dragon form speed multiplier
export const BOSS_DRAGON_DAMAGE_MULT = 1.5; // Dragon form damage multiplier
export const BOSS_SPEED = 0.6; // slow movement
export const BOSS_METEOR_COOLDOWN = 4; // seconds between meteors
export const BOSS_METEOR_WARNING_TIME = 2; // 2 seconds warning before impact
export const BOSS_METEOR_RADIUS = 3; // radius of meteor impact
export const BOSS_METEOR_DAMAGE_MULT = 2.5; // meteor damage multiplier

// ─── QUEST CONSTANTS ───────────────────────────────

export function createQuest1(): Quest {
  return {
    id: 'quest_slay13',
    name: 'Proteção das Terras',
    description: 'Elimine 13 inimigos nas Terras Cinzas',
    type: 'kill',
    targetCount: 13,
    currentCount: 0,
    enemyType: undefined, // any enemy
    rewardCoins: 150,
    rewardXP: 300,
    status: 'available',
    giverNPCId: 'quest1',
    mapId: 'TerrasCinzas',
  };
}

export function createQuest1b(): Quest {
  return {
    id: 'quest_multikill3',
    name: 'Destruição em Massa',
    description: 'Derrote 3 monstros com um único ataque',
    type: 'multikill',
    targetCount: 1,
    currentCount: 0,
    rewardCoins: 200,
    rewardXP: 400,
    status: 'available',
    giverNPCId: 'quest1',
  };
}

export function createQuest1c(): Quest {
  return {
    id: 'quest_afinidade1',
    name: 'Despertar Mágico',
    description: 'Aloque pelo menos 1 ponto em Afinidade Mágica',
    type: 'attribute',
    targetCount: 1,
    currentCount: 0,
    rewardCoins: 100,
    rewardXP: 250,
    status: 'available',
    giverNPCId: 'quest1',
  };
}

export function createQuest2(): Quest {
  return {
    id: 'quest_slay67',
    name: 'Prova de Força',
    description: 'Elimine 67 inimigos na Nova Cidade',
    type: 'kill',
    targetCount: 67,
    currentCount: 0,
    enemyType: undefined, // any enemy
    rewardCoins: 300,
    rewardXP: 500,
    status: 'available',
    giverNPCId: 'quest2',
  };
}

export function createQuest3(): Quest {
  return {
    id: 'quest_boss',
    name: 'O Desafio Final',
    description: 'Derrote o Guardião das Trevas',
    type: 'kill',
    targetCount: 1,
    currentCount: 0,
    enemyType: 'boss',
    rewardCoins: 5000,
    rewardXP: 10000,
    status: 'available',
    unlocksPortal: 'TerrasForte',
    giverNPCId: 'quest2',
  };
}

// ─── SHOP ITEMS ────────────────────────────────────

export const SHOP_ITEMS: ShopItemDef[] = [
  { id: 'fury_sword', name: 'Espada da Fúria', description: 'Grátis! Ataque em área (AOE)', price: 0, type: 'Sword', value: 2 },
  { id: 'potion', name: 'Poção de Cura', description: `Restaura ${POTION_HEAL} HP`, price: 25, type: 'Potion' },
  { id: 'armor1', name: 'Armadura de Couro', description: '+5 Defesa', price: 100, type: 'Armor', value: 5 },
  { id: 'armor2', name: 'Armadura de Malha', description: '+10 Defesa', price: 250, type: 'Armor', value: 10 },
  { id: 'armor3', name: 'Armadura de Placas', description: '+15 Defesa', price: 500, type: 'Armor', value: 15 },
  { id: 'sword1', name: 'Adaga Afiada', description: '+3 Dano', price: 80, type: 'Sword', value: 3 },
  { id: 'sword2', name: 'Espada Longa', description: '+6 Dano', price: 200, type: 'Sword', value: 6 },
  { id: 'sword3', name: 'Claymore', description: '+12 Dano', price: 800, type: 'Sword', value: 12 },
  // Fire spells (tiered)
  { id: 'fire_1', name: 'Faísca', description: 'Feitiço básico de fogo', price: 300, type: 'Spell', stat: 'Fire', value: 1 },
  { id: 'fire_2', name: 'Bola de Fogo', description: 'Feitiço intermediário de fogo (área pequena)', price: 600, type: 'Spell', stat: 'Fire', value: 2 },
  // Water/Ice spells (tiered)
  { id: 'water_1', name: 'Pingente', description: 'Feitiço básico de gelo', price: 300, type: 'Spell', stat: 'Water', value: 1 },
  { id: 'water_2', name: 'Lâmina de Gelo', description: 'Feitiço intermediário de gelo (área pequena)', price: 600, type: 'Spell', stat: 'Water', value: 2 },
  // Earth spells (tiered)
  { id: 'earth_1', name: 'Pedra', description: 'Feitiço básico de terra', price: 300, type: 'Spell', stat: 'Earth', value: 1 },
  { id: 'earth_2', name: 'Fissura', description: 'Feitiço intermediário de terra (área pequena)', price: 600, type: 'Spell', stat: 'Earth', value: 2 },
  // Air spells (tiered)
  { id: 'air_1', name: 'Brisa', description: 'Feitiço básico de ar', price: 300, type: 'Spell', stat: 'Air', value: 1 },
  { id: 'air_2', name: 'Vendaval', description: 'Feitiço intermediário de ar (área pequena)', price: 600, type: 'Spell', stat: 'Air', value: 2 },
  // Potions tier superior
  { id: 'potion_great', name: 'Poção Grande', description: 'Restaura 50 HP', price: 50, type: 'Potion', value: 50 },
];

// ─── DARK LANDS SHOP (Advanced spells only, in cabin) ──

export const DARK_SHOP_ITEMS: ShopItemDef[] = [
  { id: 'fire_3', name: 'Meteoro', description: '🔥 Avançado — AREA em CHAMAS que causam dano contínuo', price: 1200, type: 'Spell', stat: 'Fire', value: 3 },
  { id: 'water_3', name: 'Gelo Eterno', description: '❄️ Avançado — CAUSA LENTIDÃO nos inimigos', price: 1200, type: 'Spell', stat: 'Water', value: 3 },
  { id: 'earth_3', name: 'Terremoto', description: '🪨 Avançado — ATORDOA inimigos na área', price: 1200, type: 'Spell', stat: 'Earth', value: 3 },
  { id: 'air_3', name: 'Tornado', description: '💨 Avançado — EMPURRA e causa VENTO CORROSIVO', price: 1200, type: 'Spell', stat: 'Air', value: 3 },
  // Upgraded potions for dark lands
  { id: 'potion_super', name: 'Poção Superior', description: 'Restaura 60 HP', price: 80, type: 'Potion', value: 60 },
  // Better armor
  { id: 'armor4', name: 'Armadura de Obsidiana', description: '+25 Defesa', price: 2000, type: 'Armor', value: 25 },
  { id: 'sword4', name: 'Lâmina Sombria', description: '+20 Dano', price: 2000, type: 'Sword', value: 20 },
  // Shadow Shield
  { id: 'shadow_shield', name: 'Escudo Sombrio', description: 'Segure Shift para bloquear 1 ataque. Cooldown após uso.', price: 1500, type: 'Shield', value: 1 },
  // Tier superior potions
  { id: 'potion_supreme', name: 'Poção Suprema', description: 'Restaura 90 HP', price: 150, type: 'Potion', value: 90 },
];

// ─── MAPS ──────────────────────────────────────────

export const MAPS: Record<string, MapDefinition> = {
  CidadeCentral: {
    id: 'CidadeCentral',
    name: 'Cidade Central',
    bgColor: '#1a1f2e',
    gridColor: '#2a3040',
    gridSize: { w: 20, h: 20 },
    tileColor: '#2d3548',
    tombstones: [],
    npcs: [
      { id: 'shopkeeper', name: 'Mercador', position: { x: 10, y: 8 }, type: 'shopkeeper' },
      { id: 'quest1', name: 'Ancião Sábio', position: { x: 5, y: 12 }, type: 'questgiver' },
    ],
    portals: [
      { position: { x: 18, y: 10 }, size: { x: 2, y: 4 }, destination: 'TerrasCinzas' },
      { position: { x: 10, y: 18 }, size: { x: 2, y: 4 }, destination: 'NovaCidade', requiresQuest: 'quest_all_elder' },
    ],
  },
  TerrasCinzas: {
    id: 'TerrasCinzas',
    name: 'Terras Cinzas',
    bgColor: '#1a1515',
    gridColor: '#2a2525',
    gridSize: { w: 24, h: 24 },
    tileColor: '#2a2228',
    tombstones: [
      { position: { x: 5, y: 5 }, respawnTime: ENEMY_RESPAWN_TIME, lastSpawnTime: 0, enemyType: 'slime' },
      { position: { x: 10, y: 3 }, respawnTime: ENEMY_RESPAWN_TIME, lastSpawnTime: 0, enemyType: 'skeleton' },
      { position: { x: 15, y: 7 }, respawnTime: ENEMY_RESPAWN_TIME, lastSpawnTime: 0, enemyType: 'zombie' },
      { position: { x: 8, y: 12 }, respawnTime: ENEMY_RESPAWN_TIME, lastSpawnTime: 0, enemyType: 'ghost' },
      { position: { x: 18, y: 5 }, respawnTime: ENEMY_RESPAWN_TIME, lastSpawnTime: 0, enemyType: 'skeleton' },
      { position: { x: 12, y: 15 }, respawnTime: ENEMY_RESPAWN_TIME, lastSpawnTime: 0, enemyType: 'slime' },
      { position: { x: 20, y: 12 }, respawnTime: ENEMY_RESPAWN_TIME, lastSpawnTime: 0, enemyType: 'zombie' },
      { position: { x: 6, y: 18 }, respawnTime: ENEMY_RESPAWN_TIME, lastSpawnTime: 0, enemyType: 'ghost' },
      { position: { x: 16, y: 18 }, respawnTime: ENEMY_RESPAWN_TIME, lastSpawnTime: 0, enemyType: 'skeleton' },
      { position: { x: 22, y: 20 }, respawnTime: ENEMY_RESPAWN_TIME, lastSpawnTime: 0, enemyType: 'zombie' },
    ],
    npcs: [],
    portals: [
      { position: { x: 1, y: 10 }, size: { x: 2, y: 4 }, destination: 'CidadeCentral' },
    ],
  },
  TerrasCinzaEscuro: {
    id: 'TerrasCinzaEscuro',
    name: 'Terras Cinza Escuro',
    bgColor: '#0d0d12',
    gridColor: '#1a1a22',
    gridSize: { w: 30, h: 30 },
    tileColor: '#16161e',
    tombstones: [
      { position: { x: 5, y: 5 }, respawnTime: ENEMY_RESPAWN_TIME * 0.8, lastSpawnTime: 0, enemyType: 'skeleton' },
      { position: { x: 12, y: 4 }, respawnTime: ENEMY_RESPAWN_TIME * 0.8, lastSpawnTime: 0, enemyType: 'ghost' },
      { position: { x: 8, y: 10 }, respawnTime: ENEMY_RESPAWN_TIME * 0.8, lastSpawnTime: 0, enemyType: 'zombie' },
      { position: { x: 18, y: 8 }, respawnTime: ENEMY_RESPAWN_TIME * 0.8, lastSpawnTime: 0, enemyType: 'ghost' },
      { position: { x: 22, y: 5 }, respawnTime: ENEMY_RESPAWN_TIME * 0.8, lastSpawnTime: 0, enemyType: 'skeleton' },
      { position: { x: 6, y: 16 }, respawnTime: ENEMY_RESPAWN_TIME * 0.8, lastSpawnTime: 0, enemyType: 'zombie' },
      { position: { x: 15, y: 14 }, respawnTime: ENEMY_RESPAWN_TIME * 0.8, lastSpawnTime: 0, enemyType: 'ghost' },
      { position: { x: 20, y: 18 }, respawnTime: ENEMY_RESPAWN_TIME * 0.8, lastSpawnTime: 0, enemyType: 'skeleton' },
      { position: { x: 10, y: 22 }, respawnTime: ENEMY_RESPAWN_TIME * 0.8, lastSpawnTime: 0, enemyType: 'zombie' },
      { position: { x: 25, y: 15 }, respawnTime: ENEMY_RESPAWN_TIME * 0.8, lastSpawnTime: 0, enemyType: 'ghost' },
      { position: { x: 14, y: 26 }, respawnTime: ENEMY_RESPAWN_TIME * 0.8, lastSpawnTime: 0, enemyType: 'skeleton' },
      { position: { x: 26, y: 24 }, respawnTime: ENEMY_RESPAWN_TIME * 0.8, lastSpawnTime: 0, enemyType: 'zombie' },
    ],
    npcs: [],
    portals: [
      { position: { x: 1, y: 15 }, size: { x: 2, y: 4 }, destination: 'NovaCidade' },
    ],
  },
  TerrasForte: {
    id: 'TerrasForte',
    name: 'Terras Forte — Arena do Boss',
    bgColor: '#0a0508',
    gridColor: '#1a0f14',
    gridSize: { w: 20, h: 20 },
    tileColor: '#120a0e',
    tombstones: [],
    npcs: [],
    portals: [
      { position: { x: 1, y: 10 }, size: { x: 2, y: 4 }, destination: 'TerrasCinzaEscuro' },
    ],
  },
  NovaCidade: {
    id: 'NovaCidade',
    name: 'Nova Cidade',
    bgColor: '#0f1520',
    gridColor: '#1a2535',
    gridSize: { w: 26, h: 26 },
    tileColor: '#151e2d',
    tombstones: [],
    npcs: [
      { id: 'darkShopkeeper', name: 'Mercador Sombrio', position: { x: 13, y: 4 }, type: 'shopkeeper' },
      { id: 'quest2', name: 'Sentinela do Abismo', position: { x: 13, y: 13 }, type: 'questgiver2' },
    ],
    portals: [
      { position: { x: 1, y: 13 }, size: { x: 2, y: 4 }, destination: 'CidadeCentral' },
      { position: { x: 24, y: 2 }, size: { x: 2, y: 4 }, destination: 'TerrasCinzaEscuro' },
      { position: { x: 24, y: 22 }, size: { x: 3, y: 6 }, destination: 'TerrasForte', requiresQuest: 'quest_slay67', variant: 'dragon' },
    ],
  },
};

// ─── ISOMETRIC CONVERSION ──────────────────────────

export function isoToScreen(tileX: number, tileY: number): { sx: number; sy: number } {
  return {
    sx: (tileX - tileY) * (TILE_W / 2),
    sy: (tileX + tileY) * (TILE_H / 2),
  };
}

export function screenToIso(sx: number, sy: number): { tx: number; ty: number } {
  return {
    tx: (sx / (TILE_W / 2) + sy / (TILE_H / 2)) / 2,
    ty: (sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2,
  };
}

// ─── UTILITY ───────────────────────────────────────

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

let _idCounter = 0;
export function nextId(): string {
  return `e_${++_idCounter}_${Date.now()}`;
}

// ─── QUEST HELPERS ────────────────────────────────

/** Check if all 3 Elder Scholar quests are completed */
export function checkAllElderQuests(quests: { id: string; status: string }[]): boolean {
  return quests.some(q => q.id === 'quest_slay13' && q.status === 'completed') &&
         quests.some(q => q.id === 'quest_multikill3' && q.status === 'completed') &&
         quests.some(q => q.id === 'quest_afinidade1' && q.status === 'completed');
}

/** Combined virtual quest ID for portal gating */
export const QUEST_ALL_ELDER_ID = 'quest_all_elder';

/** Sentinel quest ID */
export const QUEST_SLAY67_ID = 'quest_slay67';

/** Boss quest ID */
export const QUEST_BOSS_ID = 'quest_boss';

/** Armor tier → visual tier mapping */
export function getArmorTier(defense: number): number {
  if (defense >= 25) return 4;
  if (defense >= 15) return 3;
  if (defense >= 10) return 2;
  if (defense >= 5) return 1;
  return 0;
}

/** Armor tier colors */
export const ARMOR_TIER_COLORS: Record<number, string> = {
  0: '#6b7280', // gray
  1: '#92400e', // brown
  2: '#4b5563', // dark gray
  3: '#1e3a5f', // steel blue
  4: '#3b0764', // obsidian purple
};
