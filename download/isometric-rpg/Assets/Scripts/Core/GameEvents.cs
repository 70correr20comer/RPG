using System;

namespace RPG.Core
{
    /// <summary>
    /// Central de eventos do jogo. Usa Delegate pattern para desacoplamento total entre sistemas.
    /// Qualquer script pode se inscrever ou disparar eventos sem referência direta.
    /// </summary>
    public static class GameEvents
    {
        // ─── LEVEL & XP ─────────────────────────────────
        public static event Action<int> OnLevelUp;              // Novo nível
        public static event Action<float, float> OnXPGained;   // (xpGained, newTotal)
        public static event Action OnCoinsChanged;

        // ─── ATRIBUTOS ──────────────────────────────────
        public static event Action<AttributeType, int> OnAttributeChanged; // (tipo, novoValor)
        public static event Action<int> OnMaxHealthChanged;                // novaMaxHealth
        public static event Action<int, int> OnHealthChanged;              // (currentHP, maxHP)

        // ─── MORTE & PUNIÇÃO ────────────────────────────
        public static event Action OnPlayerDied;
        public static event Action<string> OnDeathPunishmentApplied; // descrição da punição
        public static event Action OnPlayerRevived;

        // ─── MAPA ───────────────────────────────────────
        public static event Action<MapID> OnMapTransitionStart;
        public static event Action<MapID> OnMapTransitionComplete;
        public static event Action<MapID> OnMapChanged;

        // ─── COMBATE ────────────────────────────────────
        public static event Action<int> OnDamageDealt;
        public static event Action<int> OnDamageTaken;
        public static event Action<int> OnHealed;
        public static event Action<float> OnXPFromEnemy;       // XP concedido

        // ─── LOJA ───────────────────────────────────────
        public static event Action<ItemType, bool> OnItemPurchased; // (tipo, sucesso)
        public static event Action OnShopOpened;
        public static event Action OnShopClosed;

        // ─── INIMIGO ────────────────────────────────────
        public static event Action<string, int> OnEnemyKilled; // (nomeInimigo, xpReward)

        // ─── INVOCAÇÕES ─────────────────────────────────

        public static void TriggerLevelUp(int newLevel)
            => OnLevelUp?.Invoke(newLevel);

        public static void TriggerXPGained(float xpGained, float newTotal)
            => OnXPGained?.Invoke(xpGained, newTotal);

        public static void TriggerCoinsChanged()
            => OnCoinsChanged?.Invoke();

        public static void TriggerAttributeChanged(AttributeType type, int newValue)
            => OnAttributeChanged?.Invoke(type, newValue);

        public static void TriggerMaxHealthChanged(int newMax)
            => OnMaxHealthChanged?.Invoke(newMax);

        public static void TriggerHealthChanged(int current, int max)
            => OnHealthChanged?.Invoke(current, max);

        public static void TriggerPlayerDied()
            => OnPlayerDied?.Invoke();

        public static void TriggerDeathPunishment(string description)
            => OnDeathPunishmentApplied?.Invoke(description);

        public static void TriggerPlayerRevived()
            => OnPlayerRevived?.Invoke();

        public static void TriggerMapTransitionStart(MapID map)
            => OnMapTransitionStart?.Invoke(map);

        public static void TriggerMapTransitionComplete(MapID map)
            => OnMapTransitionComplete?.Invoke(map);

        public static void TriggerMapChanged(MapID map)
            => OnMapChanged?.Invoke(map);

        public static void TriggerDamageTaken(int amount)
            => OnDamageTaken?.Invoke(amount);

        public static void TriggerHealed(int amount)
            => OnHealed?.Invoke(amount);

        public static void TriggerXPFromEnemy(float xp)
            => OnXPFromEnemy?.Invoke(xp);

        public static void TriggerItemPurchased(ItemType type, bool success)
            => OnItemPurchased?.Invoke(type, success);

        public static void TriggerShopOpened()
            => OnShopOpened?.Invoke();

        public static void TriggerShopClosed()
            => OnShopClosed?.Invoke();

        public static void TriggerEnemyKilled(string name, int xpReward)
            => OnEnemyKilled?.Invoke(name, xpReward);
    }
}
