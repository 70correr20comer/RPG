// ─── Core Game Types ───────────────────────────────

export type MapID = 'CidadeCentral' | 'TerrasCinzas' | 'TerrasCinzaEscuro' | 'TerrasForte' | 'NovaCidade';

export type AttributeType = 'Esgrima' | 'Afinidade' | 'Vitalidade';

export type ElementalType = 'None' | 'Fire' | 'Water' | 'Earth' | 'Air';

// ─── Status Effects (Tier 3 spell properties) ──────

export type StatusEffectType = 'burn' | 'slow' | 'stun' | 'poison';

export interface StatusEffect {
  type: StatusEffectType;
  duration: number; // seconds remaining
  damage?: number; // damage per tick (for burn/poison)
  slowFactor?: number; // 0-1, multiplier for movement speed (for slow)
}

export type ItemType = 'Potion' | 'Armor' | 'Sword' | 'Spell' | 'Shield';

export type QuestStatus = 'available' | 'active' | 'completed';

export interface Vec2 {
  x: number;
  y: number;
}

// ─── Player State ──────────────────────────────────

export interface PlayerState {
  // Level & XP
  level: number;
  currentXP: number;
  requiredXP: number;
  attributePoints: number;

  // Coins
  coins: number;

  // Attributes
  esgrima: number;
  afinidade: number;
  vitalidade: number;

  // Equipment
  flatDefense: number;
  flatPhysicalDamage: number;
  equippedSpell: ElementalType;
  purchasedSpells: Partial<Record<ElementalType, number>>; // element → highest tier purchased
  spellTier: number; // legacy, kept for save compatibility
  hasAOE: boolean;

  // Inventory
  healthPotions: number;

  // Armor Inventory
  armorInventory: ArmorPiece[];
  equippedArmors: ArmorPiece[]; // max 4, auto-selected by highest defense

  // Shield
  hasShadowShield: boolean;
  shadowShieldActive: boolean; // true while Shift held
  shadowShieldCooldown: number; // remaining cooldown
  shieldBlockReady: boolean; // can block next hit

  // Runtime
  currentHealth: number;
  maxHealth: number;
  position: Vec2;
  facing: Vec2;
  isMoving: boolean;
  attackCooldown: number;
  lastAttackTime: number;
}

// ─── Enemy ─────────────────────────────────────────

export interface Enemy {
  id: string;
  name: string;
  position: Vec2;
  health: number;
  maxHealth: number;
  attackPower: number;
  xpReward: number;
  coinReward: number;
  speed: number;
  type: 'skeleton' | 'zombie' | 'ghost' | 'slime' | 'boss';
  hitFlash: number;
  // Boss-specific
  isBoss?: boolean;
  bossPhase?: number;
  meteorCooldown?: number;
  nextMeteorTime?: number;
  // Status effects
  statusEffects?: StatusEffect[];
  // Dragon transformation
  isDragonForm?: boolean;
}

// ─── Tombstone (Enemy Spawner) ─────────────────────

export interface Tombstone {
  position: Vec2;
  respawnTime: number;
  lastSpawnTime: number;
  enemyType: Enemy['type'];
}

// ─── NPC ───────────────────────────────────────────

export type NPCType = 'shopkeeper' | 'questgiver' | 'questgiver2' | 'bossQuestgiver';

export interface NPC {
  id: string;
  name: string;
  position: Vec2;
  type: NPCType;
}

// ─── Portal ────────────────────────────────────────

export interface Portal {
  position: Vec2;
  size: Vec2;
  destination: MapID;
  requiresQuest?: string; // quest ID required to unlock
  variant?: 'default' | 'dragon'; // dragon = red, bigger
  elderQuestsComplete?: boolean; // true when all 3 elder quests done
}

// ─── Quest ─────────────────────────────────────────

export interface Quest {
  id: string;
  name: string;
  description: string;
  type: 'kill' | 'collect' | 'attribute' | 'multikill';
  targetCount: number;
  currentCount: number;
  enemyType?: Enemy['type'];
  rewardCoins: number;
  rewardXP: number;
  status: QuestStatus;
  unlocksPortal?: MapID;
  giverNPCId: string;
  mapId?: MapID; // map where quest must be completed
}

// ─── Boss State ────────────────────────────────────

export interface BossState {
  active: boolean;
  enemy: Enemy | null;
  meteors: MeteorAttack[];
}

export interface MeteorAttack {
  id: string;
  position: Vec2;
  warningTime: number; // time when warning appeared
  impactTime: number;  // time when it will hit
  damage: number;
  phase: 'warning' | 'falling' | 'impact';
}

// ─── Shop Item ─────────────────────────────────────

export interface ShopItemDef {
  id: string;
  name: string;
  description: string;
  price: number;
  type: ItemType;
  stat?: string;
  value?: number;
}

// ─── Map Definition ────────────────────────────────

export interface MapDefinition {
  id: MapID;
  name: string;
  bgColor: string;
  gridColor: string;
  gridSize: { w: number; h: number };
  tileColor: string;
  tombstones: Tombstone[];
  npcs: NPC[];
  portals: Portal[];
}

// ─── Spell Projectile ──────────────────────────────

export interface SpellProjectile {
  id: string;
  position: Vec2;
  targetPosition: Vec2;
  element: ElementalType;
  tier: number;
  speed: number;
  damage: number;
  life: number;
  trail: Vec2[];
  isAOE?: boolean;
  aoeRadius?: number;
}

// ─── Spell Explosion Effect ────────────────────────

export interface SpellExplosion {
  id: string;
  position: Vec2;
  element: ElementalType;
  tier: number;
  radius: number;
  life: number;
  maxLife: number;
}

// ─── Game Screen ───────────────────────────────────

export type GameScreen = 'title' | 'playing' | 'shop' | 'attributes' | 'darkShop' | 'questlog';

// ─── Armor Piece ───────────────────────────────────

export interface ArmorPiece {
  id: string;
  name: string;
  defense: number;
  tier: number;
}

// ─── Multi-kill tracking (for quest) ───────────────

export interface MultiKillEvent {
  time: number;
  count: number;
}
