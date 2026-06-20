import { create } from 'zustand';
import {
  PlayerState, Enemy, MapID, GameScreen, Vec2, Tombstone, SpellProjectile,
  Quest, BossState, MeteorAttack, SpellExplosion, NPCType, ArmorPiece, MultiKillEvent,
  StatusEffect,
} from './types';
import {
  BASE_HEALTH, HEALTH_PER_VITALITY, XP_MULTIPLIER, INITIAL_REQUIRED_XP,
  ATTR_POINTS_PER_LEVEL, PLAYER_SPEED, PLAYER_ATTACK_RANGE, PLAYER_ATTACK_COOLDOWN,
  PLAYER_BASE_DAMAGE, SPELL_MULTIPLIER, DAMAGE_VARIANCE, DEFENSE_REDUCTION,
  POTION_HEAL, ENEMY_TYPES, ENEMY_AGGRO_RANGE, ENEMY_ATTACK_RANGE,
  ENEMY_ATTACK_COOLDOWN, ENEMY_RESPAWN_TIME, MAPS, distance, nextId, clamp,
  getSpellAOERadius, BOSS_STRENGTH_MULTIPLIER, BOSS_SPEED,
  BOSS_METEOR_COOLDOWN, BOSS_METEOR_WARNING_TIME, BOSS_METEOR_RADIUS, BOSS_METEOR_DAMAGE_MULT,
  BOSS_DRAGON_PHASE_THRESHOLD, BOSS_DRAGON_SPEED_MULT, BOSS_DRAGON_DAMAGE_MULT,
  createQuest1, createQuest1b, createQuest1c, createQuest2, createQuest3, DARK_SHOP_ITEMS,
  checkAllElderQuests, QUEST_ALL_ELDER_ID, QUEST_SLAY67_ID, QUEST_BOSS_ID,
} from './constants';

// ─── Derived Stats ─────────────────────────────────

function calcMaxHealth(vitalidade: number): number {
  return Math.round(BASE_HEALTH * (1 + vitalidade * HEALTH_PER_VITALITY));
}

function calcPhysDamage(esgrima: number, flatBonus: number): number {
  return esgrima + flatBonus;
}

function calcMagDamage(afinidade: number): number {
  return afinidade;
}

function applyVariance(dmg: number): number {
  const v = 1 + (Math.random() * 2 - 1) * DAMAGE_VARIANCE;
  return Math.max(1, Math.round(dmg * v));
}

// ─── Quest Auto-Complete Helper ─────────────────────

function checkQuestAutoComplete(get: () => GameStore, setState: (partial: any) => void) {
  const state = get();
  for (const q of state.quests) {
    if (q.status === 'active' && q.currentCount >= q.targetCount) {
      // Auto-complete the quest
      setState(s => {
        const updatedQuests = s.quests.map(qq =>
          qq.id === q.id ? { ...qq, status: 'completed' as const, currentCount: qq.targetCount } : qq
        );

        const updates: any = {
          quests: updatedQuests,
          player: {
            ...s.player,
            coins: s.player.coins + q.rewardCoins,
            currentXP: s.player.currentXP + q.rewardXP,
          },
        };

        // Special handling for quest_slay67
        if (q.id === QUEST_SLAY67_ID) {
          updates.showBossQuestGiver = true;
          updates.levelUpMessage = `✅ Missão Completa: ${q.name}!\n+${q.rewardCoins} moedas, +${q.rewardXP} XP\n🐉 O Mensageiro do Dragão apareceu!`;
          // Trigger dragon animation
          setTimeout(() => {
            get().triggerDragonAnimation();
          }, 500);
        } else {
          updates.levelUpMessage = `✅ Missão Completa: ${q.name}!\n+${q.rewardCoins} moedas, +${q.rewardXP} XP\nPortal desbloqueado!`;
        }

        return updates;
      });
    }
  }
}

// ─── SAVE/LOAD ────────────────────────────────────

const SAVE_KEY = 'rpg_isometric_save';

interface SaveData {
  player: {
    level: number;
    currentXP: number;
    requiredXP: number;
    attributePoints: number;
    coins: number;
    esgrima: number;
    afinidade: number;
    vitalidade: number;
    flatDefense: number;
    flatPhysicalDamage: number;
    equippedSpell: string;
    purchasedSpells?: Partial<Record<string, number>>;
    spellTier: number;
    hasAOE: boolean;
    healthPotions: number;
  };
  currentMap: string;
  quests: Quest[];
  timestamp: number;
}

function saveToDisk(player: PlayerState, currentMap: MapID, quests: Quest[]) {
  const data: SaveData = {
    player: {
      level: player.level,
      currentXP: player.currentXP,
      requiredXP: player.requiredXP,
      attributePoints: player.attributePoints,
      coins: player.coins,
      esgrima: player.esgrima,
      afinidade: player.afinidade,
      vitalidade: player.vitalidade,
      flatDefense: player.flatDefense,
      flatPhysicalDamage: player.flatPhysicalDamage,
      equippedSpell: player.equippedSpell,
      purchasedSpells: player.purchasedSpells,
      spellTier: player.spellTier,
      hasAOE: player.hasAOE,
      healthPotions: player.healthPotions,
      armorInventory: player.armorInventory,
      equippedArmors: player.equippedArmors,
      hasShadowShield: player.hasShadowShield,
    },
    currentMap,
    quests,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[Save] Failed to save:', e);
  }
}

function loadFromDisk(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch (e) {
    console.warn('[Save] Failed to load:', e);
    return null;
  }
}

// ─── Game Store ────────────────────────────────────

interface GameStore {
  // Screen
  screen: GameScreen;
  setScreen: (s: GameScreen) => void;

  // Player
  player: PlayerState;
  initPlayer: () => void;

  // Map
  currentMap: MapID;
  changeMap: (map: MapID) => void;

  // Enemies
  enemies: Enemy[];
  spawnEnemy: (tombstone: Tombstone) => void;
  updateEnemies: (dt: number) => void;

  // Tombstones
  tombstones: Tombstone[];
  updateTombstones: (dt: number) => void;

  // Combat
  playerAttack: () => void;
  lastDamageDealt: number;
  enemyAttackPlayer: (enemy: Enemy) => void;

  // Spells
  spellProjectiles: SpellProjectile[];
  spellExplosions: SpellExplosion[];
  castSpell: (element: ElementalType) => void;
  updateProjectiles: (dt: number) => void;
  updateExplosions: (dt: number) => void;

  // Movement
  movePlayer: (dx: number, dy: number, dt: number) => void;

  // Stats
  allocateAttribute: (attr: 'Esgrima' | 'Afinidade' | 'Vitalidade') => void;
  usePotion: () => void;
  buyItem: (itemId: string) => void;

  // Death
  handleDeath: () => void;
  deathMessage: string | null;
  clearDeathMessage: () => void;

  // Level Up
  levelUpMessage: string | null;
  clearLevelUpMessage: () => void;

  // Quests
  quests: Quest[];
  acceptQuest: (questId: string) => void;
  updateQuestProgress: (enemyType?: Enemy['type']) => void;
  getActiveQuest: () => Quest | null;

  // Boss
  bossState: BossState;
  spawnBoss: () => void;
  updateBoss: (dt: number, gameTime: number) => void;

  // Dragon Animation
  dragonAnimation: { active: boolean; startTime: number; duration: number } | null;
  triggerDragonAnimation: () => void;

  // Boss Entrance Animation
  bossEntranceAnimation: { active: boolean; startTime: number } | null;
  triggerBossEntrance: () => void;

  // Tutorial
  tutorialVisible: boolean;
  tutorialTimer: number;
  hideTutorial: () => void;
  updateMeteors: (dt: number, gameTime: number) => void;

  // Multi-kill tracking (for quest_multikill3)
  recentKills: MultiKillEvent[];
  addMultiKill: () => void;

  // Boss quest giver visibility
  showBossQuestGiver: boolean;

  // Shadow Shield
  setShieldActive: (active: boolean) => void;
  updateShieldCooldown: (dt: number) => void;

  // Armor
  autoEquipArmors: () => void;

  // Controls Hint
  showControls: boolean;
  toggleControls: () => void;

  // Game State
  isPlaying: boolean;
  startGame: () => void;
  continueGame: () => void;
  hasSave: () => boolean;
  deleteSave: () => void;
  gameTime: number;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // ─── Screen ──────────────────────────────
  screen: 'title',
  setScreen: (s) => set({ screen: s }),

  // ─── Player ──────────────────────────────
  player: {
    level: 1,
    currentXP: 0,
    requiredXP: INITIAL_REQUIRED_XP,
    attributePoints: 0,
    coins: 50,
    esgrima: 1,
    afinidade: 0,
    vitalidade: 1,
    flatDefense: 0,
    flatPhysicalDamage: 0,
    equippedSpell: 'None',
    purchasedSpells: {},
    spellTier: 0,
    hasAOE: false,
    healthPotions: 2,
    armorInventory: [],
    equippedArmors: [],
    hasShadowShield: false,
    shadowShieldActive: false,
    shadowShieldCooldown: 0,
    shieldBlockReady: true,
    currentHealth: calcMaxHealth(1),
    maxHealth: calcMaxHealth(1),
    position: { x: 5, y: 10 },
    facing: { x: 0, y: -1 },
    isMoving: false,
    attackCooldown: 0,
    lastAttackTime: 0,
  },

  initPlayer: () => {
    const maxHP = calcMaxHealth(1);
    set({
      player: {
        level: 1, currentXP: 0, requiredXP: INITIAL_REQUIRED_XP,
        attributePoints: 0, coins: 50, esgrima: 1, afinidade: 0, vitalidade: 1,
        flatDefense: 0, flatPhysicalDamage: 0, equippedSpell: 'None', purchasedSpells: {}, spellTier: 0, hasAOE: false,
        healthPotions: 2, armorInventory: [], equippedArmors: [], hasShadowShield: false,
        shadowShieldActive: false, shadowShieldCooldown: 0, shieldBlockReady: true,
        currentHealth: maxHP, maxHealth: maxHP,
        position: { x: 5, y: 10 }, facing: { x: 0, y: -1 },
        isMoving: false, attackCooldown: 0, lastAttackTime: 0,
      },
      currentMap: 'CidadeCentral',
      enemies: [],
      tombstones: MAPS.TerrasCinzas.tombstones.map(t => ({ ...t, lastSpawnTime: -ENEMY_RESPAWN_TIME })),
      gameTime: 0,
      deathMessage: null,
      levelUpMessage: null,
      screen: 'playing',
      isPlaying: true,
      quests: [createQuest1(), createQuest1b(), createQuest1c(), createQuest2(), createQuest3()],
      bossState: { active: false, enemy: null, meteors: [] },
      spellExplosions: [],
      dragonAnimation: null,
      bossEntranceAnimation: null,
      recentKills: [],
      showBossQuestGiver: false,
      tutorialVisible: true,
      tutorialTimer: 0,
    });
    // Auto-hide tutorial after 40 seconds
    setTimeout(() => { get().hideTutorial(); }, 40000);
  },

  // ─── Map ──────────────────────────────────
  currentMap: 'CidadeCentral',
  changeMap: (map) => {
    const state = get();
    // Check if portal requires quest
    const mapDef = MAPS[state.currentMap];
    for (const portal of mapDef.portals) {
      if (portal.destination === map && portal.requiresQuest) {
        // Handle combined "all elder" quest check
        if (portal.requiresQuest === QUEST_ALL_ELDER_ID) {
          if (!checkAllElderQuests(state.quests)) {
            set({ levelUpMessage: '🔒 Portal bloqueado! Complete todas as 3 missões do Ancião Sábio.' });
            return;
          }
        } else {
          const quest = state.quests.find(q => q.id === portal.requiresQuest);
          if (!quest || quest.status !== 'completed') {
            set({ levelUpMessage: '🔒 Portal bloqueado! Complete a missão necessária.' });
            return;
          }
        }
      }
    }

    const spawnPos = map === 'CidadeCentral'
      ? { x: 3, y: 10 }
      : map === 'NovaCidade'
        ? { x: 3, y: 13 }
        : map === 'TerrasCinzaEscuro'
          ? { x: 3, y: 15 }
          : map === 'TerrasForte'
            ? { x: 3, y: 10 }
            : { x: 3, y: 10 };

    // Spawn boss when entering TerrasForte
    if (map === 'TerrasForte') {
      const s = get();
      set({
        currentMap: map,
        player: { ...s.player, position: spawnPos },
        enemies: [],
        tombstones: [],
      });
      // Spawn boss after a short delay
      setTimeout(() => get().spawnBoss(), 500);
    } else {
      // Check if boss quest giver should be visible (quest_slay67 completed, quest_boss not completed)
      const slay67Completed = state.quests.some(q => q.id === QUEST_SLAY67_ID && q.status === 'completed');
      const bossQuestCompleted = state.quests.some(q => q.id === QUEST_BOSS_ID && q.status === 'completed');

      set(s => ({
        currentMap: map,
        player: { ...s.player, position: spawnPos },
        enemies: (map === 'CidadeCentral' || map === 'NovaCidade' || map === 'TerrasForte') ? [] : s.enemies,
        tombstones: map === 'NovaCidade'
          ? MAPS.NovaCidade.tombstones.map(t => ({ ...t, lastSpawnTime: -ENEMY_RESPAWN_TIME }))
          : map === 'TerrasCinzaEscuro'
            ? MAPS.TerrasCinzaEscuro.tombstones.map(t => ({ ...t, lastSpawnTime: -ENEMY_RESPAWN_TIME }))
            : map === 'TerrasCinzas'
              ? MAPS.TerrasCinzas.tombstones.map(t => ({ ...t, lastSpawnTime: -ENEMY_RESPAWN_TIME }))
              : [],
        bossState: { active: false, enemy: null, meteors: [] },
        showBossQuestGiver: slay67Completed && !bossQuestCompleted,
      }));
    }
    // Auto-save on map change
    const s = get();
    saveToDisk(s.player, s.currentMap, s.quests);
  },

  // ─── Enemies ──────────────────────────────
  enemies: [],

  spawnEnemy: (tombstone) => {
    const typeData = ENEMY_TYPES[tombstone.enemyType as keyof typeof ENEMY_TYPES];
    if (!typeData) return;
    const { player, currentMap } = get();
    const scaleFactor = 1 + (player.level - 1) * 0.15;
    const mapScale = currentMap === 'TerrasCinzaEscuro' ? 1.8 : 1.0;
    const newEnemy: Enemy = {
      id: nextId(),
      name: typeData.name,
      position: { ...tombstone.position },
      health: Math.round(typeData.maxHealth * scaleFactor * mapScale),
      maxHealth: Math.round(typeData.maxHealth * scaleFactor * mapScale),
      attackPower: Math.round(typeData.attack * scaleFactor * mapScale),
      xpReward: Math.round(typeData.xp * scaleFactor * mapScale),
      coinReward: Math.round(typeData.coins * scaleFactor * mapScale),
      speed: typeData.speed,
      type: tombstone.enemyType,
      hitFlash: 0,
    };
    set(state => ({ enemies: [...state.enemies, newEnemy] }));
  },

  updateEnemies: (dt) => {
    const { player, currentMap } = get();
    if (currentMap !== 'TerrasCinzas' && currentMap !== 'TerrasCinzaEscuro') return;

    set(state => ({
      enemies: state.enemies
        .map(e => {
          if (e.health <= 0) return e;

          const dist = distance(e.position, player.position);
          const newFlash = Math.max(0, e.hitFlash - dt);

          // Process status effects
          let newHealth = e.health;
          let newEffects = [...(e.statusEffects || [])];
          let speedMult = 1;
          let isStunned = false;
          for (const effect of newEffects) {
            effect.duration -= dt;
            if (effect.type === 'burn' && effect.damage) {
              // Burn damage every 0.5s (approximate)
              if (Math.random() < dt * 2) {
                newHealth -= effect.damage;
              }
            }
            if (effect.type === 'poison' && effect.damage) {
              if (Math.random() < dt * 1.5) {
                newHealth -= effect.damage;
              }
            }
            if (effect.type === 'slow' && effect.slowFactor) {
              speedMult = effect.slowFactor;
            }
            if (effect.type === 'stun') {
              isStunned = true;
            }
          }
          newEffects = newEffects.filter(ef => ef.duration > 0);

          // Don't move if stunned
          if (isStunned) {
            return { ...e, health: newHealth, hitFlash: newFlash, statusEffects: newEffects };
          }

          if (dist < ENEMY_AGGRO_RANGE) {
            // Chase player
            if (dist > ENEMY_ATTACK_RANGE) {
              const dx = (player.position.x - e.position.x) / dist;
              const dy = (player.position.y - e.position.y) / dist;
              return {
                ...e,
                position: {
                  x: e.position.x + dx * e.speed * speedMult * dt,
                  y: e.position.y + dy * e.speed * speedMult * dt,
                },
                hitFlash: newFlash,
                health: newHealth,
                statusEffects: newEffects,
              };
            }
          }
          return { ...e, hitFlash: newFlash, health: newHealth, statusEffects: newEffects };
        })
        .filter(e => e.health > 0),
    }));
  },

  // ─── Tombstones ───────────────────────────
  tombstones: [],

  updateTombstones: (dt) => {
    const { currentMap, gameTime } = get();
    if (currentMap !== 'TerrasCinzas' && currentMap !== 'TerrasCinzaEscuro') return;

    const store = get();
    store.tombstones.forEach(ts => {
      const aliveEnemies = store.enemies.filter(
        e => distance(e.position, ts.position) < 3
      );
      if (aliveEnemies.length === 0 && gameTime - ts.lastSpawnTime > ts.respawnTime) {
        ts.lastSpawnTime = gameTime;
        store.spawnEnemy(ts);
      }
    });
  },

  // ─── Combat ───────────────────────────────
  lastDamageDealt: 0,
  spellProjectiles: [],
  spellExplosions: [],

  // ─── Spells ───────────────────────────────
  castSpell: (element) => {
    const { player, enemies, currentMap } = get();
    if (currentMap !== 'TerrasCinzas' && currentMap !== 'TerrasCinzaEscuro' && currentMap !== 'TerrasForte') return;
    if (player.attackCooldown > 0) return;
    // Check if this element's spell is purchased
    const purchasedTier = player.purchasedSpells[element];
    if (!purchasedTier || purchasedTier <= 0) return;

    // Find nearest enemy
    let nearest: Enemy | null = null;
    let nearestDist = Infinity;
    for (const e of enemies) {
      const d = distance(player.position, e.position);
      if (d < 12 && d < nearestDist) {
        nearest = e;
        nearestDist = d;
      }
    }

    if (!nearest) return;

    // Calculate spell damage based on tier and afinidade
    const elementTier = player.purchasedSpells[element] || 1;
    const baseSpellDamage = Math.max(3, player.afinidade * SPELL_MULTIPLIER);
    const tierMultiplier = 1 + (elementTier - 1) * 0.5;
    const spellDamage = Math.round(baseSpellDamage * tierMultiplier);

    const aoeRadius = getSpellAOERadius(elementTier);
    const isAOE = aoeRadius > 0;

    // Create projectile
    const projectile: SpellProjectile = {
      id: nextId(),
      position: { ...player.position },
      targetPosition: { ...nearest.position },
      element,
      tier: elementTier,
      speed: 8,
      damage: spellDamage,
      life: 2,
      trail: [],
      isAOE,
      aoeRadius,
    };

    set(state => ({
      spellProjectiles: [...state.spellProjectiles, projectile],
      player: { ...state.player, attackCooldown: PLAYER_ATTACK_COOLDOWN * 1.5, equippedSpell: element },
    }));
  },

  updateProjectiles: (dt) => {
    const { enemies, currentMap } = get();
    if (currentMap !== 'TerrasCinzas' && currentMap !== 'TerrasCinzaEscuro' && currentMap !== 'TerrasForte') return;

    set(state => {
      const updated: SpellProjectile[] = [];
      let newEnemies = [...enemies];
      let damageDealt = 0;
      let killedEnemyTypes: Enemy['type'][] = [];
      const newExplosions = [...state.spellExplosions];

      for (const proj of state.spellProjectiles) {
        const newLife = proj.life - dt;
        if (newLife <= 0) continue;

        // Move toward target
        const dx = proj.targetPosition.x - proj.position.x;
        const dy = proj.targetPosition.y - proj.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.5) {
          // Hit! Apply damage based on AOE radius
          const hitRadius = proj.aoeRadius || 2;
          for (let i = 0; i < newEnemies.length; i++) {
            const e = newEnemies[i];
            const eDist = distance(e.position, proj.targetPosition);
            if (eDist < hitRadius) {
              // Damage falls off with distance for AOE
              const falloff = proj.aoeRadius ? 1 - (eDist / hitRadius) * 0.3 : 1;
              const finalDmg = Math.round(proj.damage * falloff);
              const newHP = Math.max(0, e.health - finalDmg);
              newEnemies[i] = { ...e, health: newHP, hitFlash: 0.3 };
              damageDealt += finalDmg;
              if (newHP <= 0) killedEnemyTypes.push(e.type);
            }
          }

          // Apply status effects for tier 3 (advanced) spells
          if (proj.tier >= 3) {
            for (let i = 0; i < newEnemies.length; i++) {
              const e = newEnemies[i];
              const eDist = distance(e.position, proj.targetPosition);
              if (eDist < (proj.aoeRadius || 2)) {
                const existingEffects = e.statusEffects || [];
                let newEffect: StatusEffect | null = null;
                switch (proj.element) {
                  case 'Fire':
                    // Burn: damage over time
                    newEffect = { type: 'burn', duration: 4, damage: Math.round(proj.damage * 0.15) };
                    break;
                  case 'Water':
                    // Slow: reduce movement speed
                    newEffect = { type: 'slow', duration: 3, slowFactor: 0.4 };
                    break;
                  case 'Earth':
                    // Stun: brief stun
                    newEffect = { type: 'stun', duration: 1.5 };
                    break;
                  case 'Air':
                    // Poison: damage over time (weaker but longer)
                    newEffect = { type: 'poison', duration: 5, damage: Math.round(proj.damage * 0.08) };
                    break;
                }
                if (newEffect) {
                  // Don't stack same type, refresh duration
                  const filtered = existingEffects.filter(ef => ef.type !== newEffect!.type);
                  newEnemies[i] = { ...e, statusEffects: [...filtered, newEffect] };
                }
              }
            }
          }

          // Create explosion effect
          if (proj.aoeRadius && proj.aoeRadius > 0) {
            newExplosions.push({
              id: nextId(),
              position: { ...proj.targetPosition },
              element: proj.element,
              tier: proj.tier,
              radius: proj.aoeRadius,
              life: 0.5,
              maxLife: 0.5,
            });
          }

          // Remove dead enemies
          newEnemies = newEnemies.filter(e => e.health > 0);
          continue; // Don't add this projectile (it exploded)
        }

        const nx = dx / dist;
        const ny = dy / dist;

        // Save trail
        const newTrail = [...proj.trail, { ...proj.position }].slice(-8);

        updated.push({
          ...proj,
          position: {
            x: proj.position.x + nx * proj.speed * dt,
            y: proj.position.y + ny * proj.speed * dt,
          },
          life: newLife,
          trail: newTrail,
        });
      }

      // Handle kills (XP, coins)
      const killedEnemies = enemies.filter(e => !newEnemies.some(ne => ne.id === e.id));
      let { currentXP, level, requiredXP, attributePoints, coins } = state.player;
      let leveledUp = false;

      for (const killed of killedEnemies) {
        currentXP += killed.xpReward;
        coins += killed.coinReward;
        // Track multi-kill for quest
        get().addMultiKill();
      }

      while (currentXP >= requiredXP) {
        currentXP -= requiredXP;
        level++;
        requiredXP = Math.round(requiredXP * XP_MULTIPLIER);
        attributePoints += ATTR_POINTS_PER_LEVEL;
        leveledUp = true;
      }

      // Update quest progress
      const newQuests = [...state.quests];
      for (const killed of killedEnemies) {
        for (let qi = 0; qi < newQuests.length; qi++) {
          const q = newQuests[qi];
          if (q.status === 'active') {
            if (q.type === 'kill' && (!q.enemyType || q.enemyType === killed.type)) {
              newQuests[qi] = { ...q, currentCount: q.currentCount + 1 };
            }
          }
        }
      }

      return {
        spellProjectiles: updated,
        spellExplosions: newExplosions,
        enemies: newEnemies,
        lastDamageDealt: damageDealt > 0 ? damageDealt : state.lastDamageDealt,
        quests: newQuests,
        player: {
          ...state.player,
          currentXP,
          level,
          requiredXP,
          attributePoints,
          coins,
          currentHealth: leveledUp ? calcMaxHealth(state.player.vitalidade) : state.player.currentHealth,
          maxHealth: calcMaxHealth(state.player.vitalidade),
        },
        levelUpMessage: leveledUp ? `★ LEVEL UP! → Nível ${level}! +${ATTR_POINTS_PER_LEVEL} Pontos de Atributo` : null,
      };
    });
    // Auto-complete quests that reached target
    checkQuestAutoComplete(get, set);
  },

  updateExplosions: (dt) => {
    set(state => ({
      spellExplosions: state.spellExplosions
        .map(e => ({ ...e, life: e.life - dt }))
        .filter(e => e.life > 0),
    }));
  },

  playerAttack: () => {
    const { player, enemies, currentMap } = get();
    if (currentMap !== 'TerrasCinzas' && currentMap !== 'TerrasCinzaEscuro' && currentMap !== 'TerrasForte') return;
    if (player.attackCooldown > 0) return;

    // Calculate damage
    const physDmg = calcPhysDamage(player.esgrima, player.flatPhysicalDamage);
    const magDmg = player.equippedSpell !== 'None' ? calcMagDamage(player.afinidade) : 0;
    const totalRaw = physDmg + magDmg;

    if (player.hasAOE) {
      // AOE: hit ALL enemies in range
      const inRange = enemies.filter(e => distance(player.position, e.position) < PLAYER_ATTACK_RANGE * 1.8);
      if (inRange.length === 0) return;

      const damage = applyVariance(totalRaw);
      let totalXP = 0;
      let totalCoins = 0;
      let killedIds: string[] = [];

      const updatedEnemies = enemies.map(e => {
        if (inRange.some(r => r.id === e.id)) {
          const newHP = Math.max(0, e.health - damage);
          if (newHP <= 0) {
            totalXP += e.xpReward;
            totalCoins += e.coinReward;
            killedIds.push(e.id);
          }
          return { ...e, health: newHP, hitFlash: 0.3 };
        }
        return e;
      });

      // Apply XP and level up
      let { currentXP, level, requiredXP, attributePoints, coins } = player;
      currentXP += totalXP;
      let leveledUp = false;
      while (currentXP >= requiredXP) {
        currentXP -= requiredXP;
        level++;
        requiredXP = Math.round(requiredXP * XP_MULTIPLIER);
        attributePoints += ATTR_POINTS_PER_LEVEL;
        leveledUp = true;
      }

      // Track multi-kill for quest
      if (killedIds.length > 0) {
        for (let i = 0; i < killedIds.length; i++) {
          get().addMultiKill();
        }
      }

      // Update quest progress
      const killedEnemies = enemies.filter(e => killedIds.includes(e.id));
      const newQuests = [...get().quests];
      for (const killed of killedEnemies) {
        for (let qi = 0; qi < newQuests.length; qi++) {
          const q = newQuests[qi];
          if (q.status === 'active' && q.type === 'kill' && (!q.enemyType || q.enemyType === killed.type)) {
            newQuests[qi] = { ...q, currentCount: q.currentCount + 1 };
          }
        }
      }

      set(state => ({
        player: {
          ...state.player,
          attackCooldown: PLAYER_ATTACK_COOLDOWN,
          lastAttackTime: state.gameTime,
          coins: coins + totalCoins,
          currentXP,
          level,
          requiredXP,
          attributePoints,
          currentHealth: leveledUp ? calcMaxHealth(state.player.vitalidade) : state.player.currentHealth,
          maxHealth: calcMaxHealth(state.player.vitalidade),
        },
        enemies: updatedEnemies.filter(e => e.health > 0),
        lastDamageDealt: damage,
        quests: newQuests,
        levelUpMessage: leveledUp ? `★ LEVEL UP! → Nível ${level}! +${ATTR_POINTS_PER_LEVEL} Pontos de Atributo` : null,
      }));
      // Auto-complete quests that reached target
      checkQuestAutoComplete(get, set);
    } else {
      // Single target: find nearest enemy in range
      let nearest: Enemy | null = null;
      let nearestDist = Infinity;
      for (const e of enemies) {
        const d = distance(player.position, e.position);
        if (d < PLAYER_ATTACK_RANGE && d < nearestDist) {
          nearest = e;
          nearestDist = d;
        }
      }

      if (!nearest) return;

      const damage = applyVariance(totalRaw);
      const newHP = Math.max(0, nearest.health - damage);

      set(state => ({
        player: { ...state.player, attackCooldown: PLAYER_ATTACK_COOLDOWN, lastAttackTime: state.gameTime },
        enemies: state.enemies.map(e =>
          e.id === nearest!.id ? { ...e, health: newHP, hitFlash: 0.2 } : e
        ),
        lastDamageDealt: damage,
      }));

      // Check if enemy died
      if (newHP <= 0) {
        const { player: p } = get();
        let xpGained = nearest.xpReward;
        let coinsGained = nearest.coinReward;
        let newXP = p.currentXP + xpGained;
        let newLevel = p.level;
        let newReqXP = p.requiredXP;
        let newAttrPoints = p.attributePoints;
        let leveledUp = false;

        while (newXP >= newReqXP) {
          newXP -= newReqXP;
          newLevel++;
          newReqXP = Math.round(newReqXP * XP_MULTIPLIER);
          newAttrPoints += ATTR_POINTS_PER_LEVEL;
          leveledUp = true;
        }

        // Update quest progress
        const newQuests = [...get().quests];
        for (let qi = 0; qi < newQuests.length; qi++) {
          const q = newQuests[qi];
          if (q.status === 'active' && q.type === 'kill' && (!q.enemyType || q.enemyType === nearest!.type)) {
            newQuests[qi] = { ...q, currentCount: q.currentCount + 1 };
          }
        }

        // Track multi-kill for quest
        get().addMultiKill();

        set(state => ({
          player: {
            ...state.player,
            coins: p.coins + coinsGained,
            currentXP: newXP,
            level: newLevel,
            requiredXP: newReqXP,
            attributePoints: newAttrPoints,
            currentHealth: leveledUp ? calcMaxHealth(p.vitalidade) : p.currentHealth,
            maxHealth: calcMaxHealth(p.vitalidade),
          },
          enemies: state.enemies.filter(e => e.id !== nearest!.id),
          quests: newQuests,
          levelUpMessage: leveledUp ? `★ LEVEL UP! → Nível ${newLevel}! +${ATTR_POINTS_PER_LEVEL} Pontos de Atributo` : null,
        }));
        // Auto-complete quests that reached target
        checkQuestAutoComplete(get, set);
      }
    }
  },

  enemyAttackPlayer: (enemy) => {
    const { player } = get();
    if (player.currentHealth <= 0) return;

    // Shadow Shield block check
    if (player.hasShadowShield && player.shadowShieldActive && player.shieldBlockReady) {
      // Block the attack! Activate cooldown
      set(state => ({
        player: {
          ...state.player,
          shadowShieldActive: false,
          shieldBlockReady: false,
          shadowShieldCooldown: 8, // 8 second cooldown
        },
        levelUpMessage: '🛡️ Escudo Sombrio bloqueou o ataque!',
      }));
      setTimeout(() => set({ levelUpMessage: null }), 1500);
      return;
    }

    const reduction = DEFENSE_REDUCTION(player.flatDefense);
    const effectiveDmg = Math.max(1, Math.round(enemy.attackPower * (1 - reduction)));

    set(state => ({
      player: { ...state.player, currentHealth: Math.max(0, state.player.currentHealth - effectiveDmg) },
    }));

    if (get().player.currentHealth <= 0) {
      get().handleDeath();
    }
  },

  // ─── Movement ─────────────────────────────
  movePlayer: (dx, dy, dt) => {
    const { player, currentMap, enemies } = get();
    const mapDef = MAPS[currentMap];

    // Isometric conversion
    const isoDX = (dx + dy) * 0.5;
    const isoDY = (dy - dx) * 0.5;

    const newX = clamp(player.position.x + isoDX * PLAYER_SPEED * dt, 0.5, mapDef.gridSize.w - 0.5);
    const newY = clamp(player.position.y + isoDY * PLAYER_SPEED * dt, 0.5, mapDef.gridSize.h - 0.5);

    // Check portal collision
    for (const portal of mapDef.portals) {
      if (
        newX >= portal.position.x - portal.size.x / 2 &&
        newX <= portal.position.x + portal.size.x / 2 &&
        newY >= portal.position.y - portal.size.y / 2 &&
        newY <= portal.position.y + portal.size.y / 2
      ) {
        get().changeMap(portal.destination);
        return;
      }
    }

    // Check enemy collision (stop movement)
    for (const e of enemies) {
      if (distance({ x: newX, y: newY }, e.position) < 0.8) {
        return;
      }
    }

    const facing = (dx !== 0 || dy !== 0) ? { x: dx, y: dy } : player.facing;

    set(state => ({
      player: {
        ...state.player,
        position: { x: newX, y: newY },
        facing,
        isMoving: dx !== 0 || dy !== 0,
      },
    }));
  },

  // ─── Attributes ───────────────────────────
  allocateAttribute: (attr) => {
    const { player } = get();
    if (player.attributePoints <= 0) return;

    const newPlayer = { ...player, attributePoints: player.attributePoints - 1 };

    switch (attr) {
      case 'Esgrima': newPlayer.esgrima++; break;
      case 'Afinidade':
        newPlayer.afinidade++;
        // Track quest_afinidade1
        set(state => ({
          quests: state.quests.map(q =>
            q.id === 'quest_afinidade1' && q.status === 'active'
              ? { ...q, currentCount: Math.min(q.currentCount + 1, q.targetCount) }
              : q
          ),
        }));
        break;
      case 'Vitalidade':
        newPlayer.vitalidade++;
        const oldMax = newPlayer.maxHealth;
        newPlayer.maxHealth = calcMaxHealth(newPlayer.vitalidade);
        newPlayer.currentHealth = Math.min(newPlayer.currentHealth + (newPlayer.maxHealth - oldMax), newPlayer.maxHealth);
        break;
    }

    set({ player: newPlayer });
    saveToDisk(newPlayer, get().currentMap, get().quests);
  },

  usePotion: () => {
    const { player } = get();
    if (player.healthPotions <= 0 || player.currentHealth >= player.maxHealth) return;

    set({
      player: {
        ...player,
        healthPotions: player.healthPotions - 1,
        currentHealth: Math.min(player.currentHealth + POTION_HEAL, player.maxHealth),
      },
    });
  },

  buyItem: (itemId) => {
    const { player } = get();
    const allItems = [...SHOP_ITEMS, ...DARK_SHOP_ITEMS];
    const item = allItems.find(i => i.id === itemId);
    if (!item || player.coins < item.price) return;

    const newPlayer = { ...player, coins: player.coins - item.price };

    switch (item.type) {
      case 'Potion':
        if (item.value) {
          // Super/great/supreme potion - heals directly
          newPlayer.currentHealth = Math.min(newPlayer.currentHealth + item.value, newPlayer.maxHealth);
        } else {
          newPlayer.healthPotions++;
        }
        break;
      case 'Armor': {
        // Add armor piece to inventory
        const armorPiece: ArmorPiece = {
          id: nextId(),
          name: item.name,
          defense: item.value!,
          tier: item.value! >= 25 ? 4 : item.value! >= 15 ? 3 : item.value! >= 10 ? 2 : 1,
        };
        newPlayer.armorInventory = [...newPlayer.armorInventory, armorPiece];
        // Recalculate flatDefense from equipped armors
        // Auto-equip will be called after
        break;
      }
      case 'Sword':
        newPlayer.flatPhysicalDamage += item.value!;
        if (itemId === 'fury_sword') newPlayer.hasAOE = true;
        break;
      case 'Spell': {
        const element = item.stat as ElementalType;
        const tier = item.value || 1;
        // Add/upgrade spell for this element independently
        const currentTier = newPlayer.purchasedSpells[element] || 0;
        newPlayer.purchasedSpells = {
          ...newPlayer.purchasedSpells,
          [element]: Math.max(currentTier, tier),
        };
        // Set as equipped (active element)
        newPlayer.equippedSpell = element;
        // Update spellTier to highest purchased tier (for backward compat)
        newPlayer.spellTier = Math.max(...Object.values(newPlayer.purchasedSpells) as number[]);
        break;
      }
      case 'Shield':
        newPlayer.hasShadowShield = true;
        newPlayer.shieldBlockReady = true;
        newPlayer.shadowShieldCooldown = 0;
        break;
    }

    set({ player: newPlayer });
    // Auto-equip armors after buying
    get().autoEquipArmors();
    saveToDisk(get().player, get().currentMap, get().quests);
  },

  // ─── Death ────────────────────────────────
  deathMessage: null,

  handleDeath: () => {
    const { player, currentMap } = get();
    if (currentMap === 'CidadeCentral') return;

    let msg: string;

    if (player.level >= 2) {
      const newLevel = player.level - 1;
      const newReqXP = Math.max(100, Math.round(player.requiredXP / XP_MULTIPLIER));
      msg = `☠ PERDA DE NÍVEL: ${player.level} → ${newLevel}\nXP resetado para 0/${newReqXP}\nAtributos preservados`;

      set(state => ({
        player: {
          ...state.player,
          level: newLevel,
          currentXP: 0,
          requiredXP: newReqXP,
          currentHealth: calcMaxHealth(state.player.vitalidade),
          position: { x: 3, y: 10 },
        },
        currentMap: 'CidadeCentral',
        enemies: [],
        deathMessage: msg,
        bossState: { active: false, enemy: null, meteors: [] },
      }));
    } else {
      const coinsLost = Math.ceil(player.coins * 0.5);
      const newCoins = Math.max(0, player.coins - coinsLost);
      msg = `☠ PERDA DE MOEDAS: -${coinsLost} (${player.coins} → ${newCoins})\nNível preservado`;

      set(state => ({
        player: {
          ...state.player,
          coins: newCoins,
          currentHealth: calcMaxHealth(state.player.vitalidade),
          position: { x: 3, y: 10 },
        },
        currentMap: 'CidadeCentral',
        enemies: [],
        deathMessage: msg,
        bossState: { active: false, enemy: null, meteors: [] },
      }));
    }
    saveToDisk(get().player, get().currentMap, get().quests);
  },

  clearDeathMessage: () => set({ deathMessage: null }),

  // ─── Level Up ─────────────────────────────
  levelUpMessage: null,
  clearLevelUpMessage: () => set({ levelUpMessage: null }),

  // ─── Quests ───────────────────────────────
  quests: [createQuest1(), createQuest1b(), createQuest1c(), createQuest2(), createQuest3()],
  dragonAnimation: null,

  triggerDragonAnimation: () => {
    set({ dragonAnimation: { active: true, startTime: Date.now(), duration: 5000 } });
    // Auto-clear after duration
    setTimeout(() => {
      set({ dragonAnimation: null });
    }, 5000);
  },

  acceptQuest: (questId) => {
    set(state => ({
      quests: state.quests.map(q =>
        q.id === questId ? { ...q, status: 'active' as const } : q
      ),
    }));
    saveToDisk(get().player, get().currentMap, get().quests);
  },

  updateQuestProgress: (enemyType) => {
    // This is handled inline in attack/spell code above
  },

  getActiveQuest: () => {
    return get().quests.find(q => q.status === 'active') || null;
  },

  // ─── Multi-Kill Tracking ──────────────────
  recentKills: [],
  showBossQuestGiver: false,

  addMultiKill: () => {
    const now = Date.now();
    set(state => {
      const recentKills = [...state.recentKills, { time: now, count: 1 }]
        .filter(k => now - k.time < 2000); // 2 second window
      const totalKills = recentKills.length;
      if (totalKills >= 3) {
        const newQuests = state.quests.map(q =>
          q.id === 'quest_multikill3' && q.status === 'active'
            ? { ...q, currentCount: Math.min(q.currentCount + 1, q.targetCount) }
            : q
        );
        return { recentKills: [], quests: newQuests };
      }
      return { recentKills };
    });
  },

  // ─── Shadow Shield ────────────────────────
  setShieldActive: (active) => {
    const { player } = get();
    if (!player.hasShadowShield) return;
    if (active && player.shadowShieldCooldown > 0) return;
    set(state => ({
      player: {
        ...state.player,
        shadowShieldActive: active,
        shieldBlockReady: active && state.player.shadowShieldCooldown <= 0,
      },
    }));
  },

  updateShieldCooldown: (dt) => {
    set(state => ({
      player: {
        ...state.player,
        shadowShieldCooldown: Math.max(0, state.player.shadowShieldCooldown - dt),
      },
    }));
  },

  // ─── Auto-Equip Armors ───────────────────
  autoEquipArmors: () => {
    set(state => {
      const sorted = [...state.player.armorInventory].sort((a, b) => b.defense - a.defense);
      const equipped = sorted.slice(0, 4);
      const totalDef = equipped.reduce((sum, a) => sum + a.defense, 0);
      return {
        player: {
          ...state.player,
          equippedArmors: equipped,
          flatDefense: totalDef,
        },
      };
    });
  },

  // ─── Boss ─────────────────────────────────
  bossState: { active: false, enemy: null, meteors: [] },

  spawnBoss: () => {
    const { player } = get();
    const bossHP = calcMaxHealth(player.vitalidade) * BOSS_STRENGTH_MULTIPLIER;
    const bossAtk = Math.round((player.esgrima + player.flatPhysicalDamage) * BOSS_STRENGTH_MULTIPLIER);

    const boss: Enemy = {
      id: nextId(),
      name: 'Guardião das Trevas',
      position: { x: 15, y: 15 },
      health: bossHP,
      maxHealth: bossHP,
      attackPower: bossAtk,
      xpReward: 5000,
      coinReward: 2000,
      speed: BOSS_SPEED,
      type: 'boss',
      hitFlash: 0,
      isBoss: true,
      bossPhase: 1,
      meteorCooldown: BOSS_METEOR_COOLDOWN,
      nextMeteorTime: 3,
      isDragonForm: false,
    };

    set(state => ({
      bossState: { active: true, enemy: boss, meteors: [] },
      enemies: [boss],
    }));
    // Trigger boss entrance animation
    get().triggerBossEntrance();
  },

  updateBoss: (dt, gameTime) => {
    const { bossState, player, currentMap } = get();
    if (!bossState.active || !bossState.enemy || currentMap !== 'TerrasForte') return;

    const boss = bossState.enemy;
    if (boss.health <= 0) {
      // Boss defeated!
      set(state => ({
        bossState: { active: false, enemy: null, meteors: [] },
        enemies: [],
        quests: state.quests.map(q =>
          q.id === 'quest_boss' ? { ...q, status: 'completed' as const, currentCount: 1 } : q
        ),
        levelUpMessage: '🏆 BOSS DERROTADO! Parabéns, herói! Você salvou o reino!',
        player: {
          ...state.player,
          coins: state.player.coins + 2000,
          currentXP: state.player.currentXP + 5000,
        },
      }));
      saveToDisk(get().player, get().currentMap, get().quests);
      return;
    }

    // Boss chases player slowly
    const dist = distance(boss.position, player.position);
    if (dist > 2) {
      const dx = (player.position.x - boss.position.x) / dist;
      const dy = (player.position.y - boss.position.y) / dist;
      const newBoss = {
        ...boss,
        position: {
          x: boss.position.x + dx * boss.speed * dt,
          y: boss.position.y + dy * boss.speed * dt,
        },
      };
      set(state => ({
        bossState: { ...state.bossState, enemy: newBoss },
        enemies: state.enemies.map(e => e.id === boss.id ? newBoss : e),
      }));
    }

    // Boss phase transitions + Dragon transformation
    const hpRatio = boss.health / boss.maxHealth;
    if (hpRatio <= BOSS_DRAGON_PHASE_THRESHOLD && !boss.isDragonForm) {
      // DRAGON TRANSFORMATION!
      const dragonHP = boss.maxHealth; // Full heal for dragon phase!
      const dragonBoss: Enemy = {
        ...boss,
        health: dragonHP,
        maxHealth: dragonHP,
        attackPower: Math.round(boss.attackPower * BOSS_DRAGON_DAMAGE_MULT),
        speed: boss.speed * BOSS_DRAGON_SPEED_MULT,
        bossPhase: 2,
        isDragonForm: true,
        name: '🐉 Guardião Dragão',
      };
      set(state => ({
        bossState: { ...state.bossState, enemy: dragonBoss },
        enemies: state.enemies.map(e => e.id === boss.id ? dragonBoss : e),
        levelUpMessage: '🐉 O GUARDIÃO SE TRANSFORMOU EM DRAGÃO! CUIDADO!',
        bossEntranceAnimation: { active: true, startTime: Date.now() },
      }));
      // Clear entrance animation after 3s
      setTimeout(() => { set({ bossEntranceAnimation: null }); }, 3000);
    } else if (hpRatio < 0.3 && boss.bossPhase === 2 && !boss.isDragonForm) {
      set(state => ({
        bossState: {
          ...state.bossState,
          enemy: state.bossState.enemy ? { ...state.bossState.enemy, bossPhase: 3 } : null,
        },
        levelUpMessage: '⚠️ Guardião entra em FÚRIA! Meteores mais frequentes!',
      }));
    } else if (hpRatio < 0.7 && boss.bossPhase === 1 && !boss.isDragonForm) {
      set(state => ({
        bossState: {
          ...state.bossState,
          enemy: state.bossState.enemy ? { ...state.bossState.enemy, bossPhase: 2 } : null,
        },
        levelUpMessage: '⚠️ Guardião se fortalece! Cuidado!',
      }));
    }

    // Update meteors
    get().updateMeteors(dt, gameTime);
  },

  updateMeteors: (dt, gameTime) => {
    const { bossState, player } = get();
    if (!bossState.active || !bossState.enemy) return;

    const boss = bossState.enemy;
    const phase = boss.bossPhase || 1;
    const meteorCooldown = BOSS_METEOR_COOLDOWN / (phase === 3 ? 2 : phase === 2 ? 1.5 : 1);

    // Check if it's time to spawn a new meteor
    if (gameTime >= (boss.nextMeteorTime || 0)) {
      // Spawn a meteor near the player
      const offset = { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 };
      const meteorTarget = {
        x: clamp(player.position.x + offset.x, 1, MAPS.TerrasForte.gridSize.w - 1),
        y: clamp(player.position.y + offset.y, 1, MAPS.TerrasForte.gridSize.h - 1),
      };

      const newMeteor: MeteorAttack = {
        id: nextId(),
        position: meteorTarget,
        warningTime: gameTime,
        impactTime: gameTime + BOSS_METEOR_WARNING_TIME,
        damage: Math.round(boss.attackPower * BOSS_METEOR_DAMAGE_MULT),
        phase: 'warning',
      };

      set(state => ({
        bossState: {
          ...state.bossState,
          enemy: state.bossState.enemy
            ? { ...state.bossState.enemy, nextMeteorTime: gameTime + meteorCooldown }
            : null,
          meteors: [...state.bossState.meteors, newMeteor],
        },
      }));
    }

    // Update existing meteors
    const updatedMeteors: MeteorAttack[] = [];
    let playerDamage = 0;

    for (const meteor of bossState.meteors) {
      if (meteor.phase === 'warning' && gameTime >= meteor.impactTime - 0.5) {
        // Switch to falling phase
        updatedMeteors.push({ ...meteor, phase: 'falling' });
      } else if (gameTime >= meteor.impactTime) {
        // Impact! Check if player is in range
        const dist = distance(player.position, meteor.position);
        if (dist < BOSS_METEOR_RADIUS) {
          playerDamage += meteor.damage;
        }
      } else {
        updatedMeteors.push(meteor);
      }
    }

    set(state => ({
      bossState: { ...state.bossState, meteors: updatedMeteors },
    }));

    // Apply meteor damage to player
    if (playerDamage > 0) {
      const reduction = DEFENSE_REDUCTION(player.flatDefense);
      const effectiveDmg = Math.max(1, Math.round(playerDamage * (1 - reduction)));
      set(state => ({
        player: { ...state.player, currentHealth: Math.max(0, state.player.currentHealth - effectiveDmg) },
      }));
      if (get().player.currentHealth <= 0) {
        get().handleDeath();
      }
    }
  },

  // ─── Tutorial Auto-Hide ───────────────────
  tutorialVisible: true,
  tutorialTimer: 0,
  hideTutorial: () => set({ tutorialVisible: false }),

  // ─── Boss Entrance Animation ──────────────
  bossEntranceAnimation: null,
  triggerBossEntrance: () => {
    set({ bossEntranceAnimation: { active: true, startTime: Date.now() } });
    setTimeout(() => {
      set({ bossEntranceAnimation: null });
    }, 4000);
  },

  // ─── Game State ───────────────────────────
  isPlaying: false,
  showControls: true,
  toggleControls: () => set(state => ({ showControls: !state.showControls })),
  gameTime: 0,

  startGame: () => {
    get().initPlayer();
    // Auto-save every 30 seconds
    setInterval(() => {
      const s = get();
      if (s.isPlaying) saveToDisk(s.player, s.currentMap, s.quests);
    }, 30000);
  },

  continueGame: () => {
    const saved = loadFromDisk();
    if (!saved) {
      get().startGame();
      return;
    }

    const maxHP = calcMaxHealth(saved.player.vitalidade);
    set({
      player: {
        ...saved.player,
        purchasedSpells: saved.player.purchasedSpells || {},
        currentHealth: maxHP,
        maxHealth: maxHP,
        position: { x: 5, y: 10 },
        facing: { x: 0, y: -1 },
        isMoving: false,
        attackCooldown: 0,
        lastAttackTime: 0,
      },
      currentMap: saved.currentMap as MapID,
      enemies: [],
      tombstones: MAPS.TerrasCinzas.tombstones.map(t => ({ ...t, lastSpawnTime: -ENEMY_RESPAWN_TIME })),
      gameTime: 0,
      deathMessage: null,
      levelUpMessage: null,
      screen: 'playing',
      isPlaying: true,
      quests: saved.quests || [createQuest1(), createQuest1b(), createQuest1c(), createQuest2(), createQuest3()],
      bossState: { active: false, enemy: null, meteors: [] },
      spellExplosions: [],
      dragonAnimation: null,
      bossEntranceAnimation: null,
      recentKills: [],
      showBossQuestGiver: (saved.quests || []).some((q: any) => q.id === QUEST_SLAY67_ID && q.status === 'completed'),
      tutorialVisible: true,
      tutorialTimer: 0,
    });
    // Auto-hide tutorial after 40 seconds
    setTimeout(() => { get().hideTutorial(); }, 40000);

    // Auto-save every 30 seconds
    setInterval(() => {
      const s = get();
      if (s.isPlaying) saveToDisk(s.player, s.currentMap, s.quests);
    }, 30000);
  },

  hasSave: () => {
    return loadFromDisk() !== null;
  },

  deleteSave: () => {
    localStorage.removeItem(SAVE_KEY);
  },
}));

// Re-export for convenience
import { SHOP_ITEMS } from './constants';
