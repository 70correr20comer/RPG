using UnityEngine;
using RPG.Core;
using RPG.Data;

namespace RPG.Player
{
    /// <summary>
    /// GERENCIADOR CENTRAL DE ESTADO DO JOGADOR
    /// ──────────────────────────────────────────
    /// Responsável por:
    ///   • Gerenciar Level, XP, Moedas e Pontos de Atributo
    ///   • Validar e aplicar distribuição de atributos
    ///   • Calcular atributos derivados (MaxHP, Dano, Defesa)
    ///   • Coordenar com DeathPunishmentSystem
    ///   • Disparar eventos para UI e outros sistemas
    ///
    /// Uso: Anexar ao GameObject do jogador. Atribuir o ScriptableObject no Inspector.
    /// </summary>
    public class PlayerStatsManager : MonoBehaviour
    {
        [Header("REFERÊNCIAS")]
        [SerializeField] private PlayerDataSO playerData;

        // ─── PROPRIEDADES PÚBLICAS ──────────────────────

        public PlayerDataSO Data => playerData;
        public int Level => playerData.level;
        public float CurrentXP => playerData.currentXP;
        public float RequiredXP => playerData.requiredXP;
        public int Coins => playerData.coins;
        public int AttributePoints => playerData.attributePoints;
        public int MaxHealth => playerData.MaxHealth;
        public MapID CurrentMap => playerData.currentMap;

        // ─── VIDA ATUAL (runtime only, não no SO) ───────

        private int currentHealth;

        public int CurrentHealth
        {
            get => currentHealth;
            private set
            {
                currentHealth = Mathf.Clamp(value, 0, MaxHealth);
                GameEvents.TriggerHealthChanged(currentHealth, MaxHealth);
            }
        }

        public bool IsAlive => currentHealth > 0;
        public float HealthPercent => MaxHealth > 0 ? (float)currentHealth / MaxHealth : 0f;

        // ─── INICIALIZAÇÃO ──────────────────────────────

        private void Awake()
        {
            if (playerData == null)
            {
                Debug.LogError("[PlayerStatsManager] PlayerDataSO não atribuído!");
                enabled = false;
                return;
            }

            // Tenta carregar save salvo
            playerData.LoadFromDisk();

            // Inicializa vida
            RecalculateMaxHealth();
            currentHealth = MaxHealth;

            // Escuta eventos relevantes
            GameEvents.OnMapChanged += HandleMapChanged;
            GameEvents.OnLevelUp += HandleLevelUp;

            Debug.Log($"[PlayerStatsManager] Inicializado — Lvl {Level} | HP {CurrentHealth}/{MaxHealth} | " +
                      $"Esgrima {playerData.esgrima} | Afinidade {playerData.afinidade} | " +
                      $"Vitalidade {playerData.vitalidade} | Moedas {Coins}");
        }

        private void OnDestroy()
        {
            GameEvents.OnMapChanged -= HandleMapChanged;
            GameEvents.OnLevelUp -= HandleLevelUp;

            // Salva ao destruir
            if (playerData != null)
                playerData.SaveToDisk();
        }

        // ═══════════════════════════════════════════════════
        //  SISTEMA DE XP & LEVEL
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Concede XP ao jogador. Verifica automaticamente se deve subir de nível.
        /// </summary>
        public void GrantXP(float amount)
        {
            if (amount <= 0) return;

            playerData.currentXP += amount;
            GameEvents.TriggerXPGained(amount, playerData.currentXP);

            // Verifica se tem XP suficiente para subir (pode subir vários níveis de uma vez)
            while (playerData.currentXP >= playerData.requiredXP)
            {
                LevelUp();
            }

            playerData.SaveToDisk();
        }

        /// <summary>
        /// Executa a subida de nível completa:
        /// 1. Incrementa Level
        /// 2. Curou toda a vida
        /// 3. Aumenta XP necessário (×1.5)
        /// 4. Concede 3 Pontos de Atributo
        /// </summary>
        private void LevelUp()
        {
            // 1. Subtrai o XP gasto e incrementa o nível
            playerData.currentXP -= playerData.requiredXP;
            playerData.level++;

            // 2. Curou toda a vida
            RecalculateMaxHealth();
            currentHealth = MaxHealth;

            // 3. XP necessário aumenta (multiplicador 1.5x)
            playerData.requiredXP = Mathf.RoundToInt(playerData.requiredXP * playerData.xpMultiplier);

            // 4. Concede 3 Pontos de Atributo
            playerData.attributePoints += 3;

            Debug.Log($"[PlayerStatsManager] ★ LEVEL UP! → Nível {playerData.level} | " +
                      $"Novo XP necessário: {playerData.requiredXP} | " +
                      $"Pontos de Atributo: {playerData.attributePoints}");

            // Dispara evento
            GameEvents.TriggerLevelUp(playerData.level);

            // Salva
            playerData.SaveToDisk();
        }

        // ═══════════════════════════════════════════════════
        //  SISTEMA DE MOEDAS
        // ═══════════════════════════════════════════════════

        public void AddCoins(int amount)
        {
            if (amount <= 0) return;
            playerData.coins += amount;
            GameEvents.TriggerCoinsChanged();
            playerData.SaveToDisk();
        }

        /// <summary>
        /// Remove moedas. Retorna false se não tem o suficiente.
        /// </summary>
        public bool SpendCoins(int amount)
        {
            if (amount <= 0 || playerData.coins < amount)
                return false;

            playerData.coins -= amount;
            GameEvents.TriggerCoinsChanged();
            playerData.SaveToDisk();
            return true;
        }

        public bool HasEnoughCoins(int amount) => playerData.coins >= amount;

        // ═══════════════════════════════════════════════════
        //  SISTEMA DE ATRIBUTOS
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Aloca 1 ponto de atributo no tipo especificado.
        /// Retorna true se bem-sucedido, false se não tem pontos disponíveis.
        /// </summary>
        public bool AllocateAttribute(AttributeType attribute)
        {
            if (playerData.attributePoints <= 0)
            {
                Debug.LogWarning("[PlayerStatsManager] Sem pontos de atributo disponíveis!");
                return false;
            }

            playerData.attributePoints--;

            switch (attribute)
            {
                case AttributeType.Esgrima:
                    playerData.esgrima++;
                    break;

                case AttributeType.Afinidade:
                    playerData.afinidade++;
                    break;

                case AttributeType.Vitalidade:
                    playerData.vitalidade++;
                    // ATUALIZA INSTANTANEAMENTE a Vida Máxima
                    RecalculateMaxHealth();
                    // Curou a diferença proporcional
                    int oldMax = currentHealth;
                    currentHealth = Mathf.Min(currentHealth + (MaxHealth - oldMax), MaxHealth);
                    GameEvents.TriggerMaxHealthChanged(MaxHealth);
                    break;
            }

            GameEvents.TriggerAttributeChanged(attribute, GetAttributeValue(attribute));

            Debug.Log($"[PlayerStatsManager] +1 {attribute} → Novo valor: {GetAttributeValue(attribute)} | " +
                      $"Pontos restantes: {playerData.attributePoints}");

            playerData.SaveToDisk();
            return true;
        }

        /// <summary>
        /// Retorna o valor atual de um atributo.
        /// </summary>
        public int GetAttributeValue(AttributeType attribute)
        {
            return attribute switch
            {
                AttributeType.Esgrima => playerData.esgrima,
                AttributeType.Afinidade => playerData.afinidade,
                AttributeType.Vitalidade => playerData.vitalidade,
                _ => 0
            };
        }

        /// <summary>
        /// Recalcula a Vida Máxima baseado no Vitalidade atual.
        /// Deve ser chamado sempre que Vitalidade mudar.
        /// </summary>
        public void RecalculateMaxHealth()
        {
            GameEvents.TriggerMaxHealthChanged(MaxHealth);
        }

        // ═══════════════════════════════════════════════════
        //  SISTEMA DE VIDA
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Aplica dano ao jogador, considerando defesa.
        /// Retorna o dano efetivamente aplicado.
        /// </summary>
        public int TakeDamage(int rawDamage)
        {
            if (!IsAlive) return 0;

            // Aplica redução de defesa: raw * (1 - DamageReduction)
            float reduction = playerData.DamageReduction;
            int effectiveDamage = Mathf.Max(1, Mathf.RoundToInt(rawDamage * (1f - reduction)));

            CurrentHealth -= effectiveDamage;

            Debug.Log($"[PlayerStatsManager] Recebeu {effectiveDamage} de dano " +
                      $"({rawDamage} raw - {reduction * 100f:F1}% defesa) | HP: {currentHealth}/{MaxHealth}");

            GameEvents.TriggerDamageTaken(effectiveDamage);

            if (!IsAlive)
            {
                Debug.Log("[PlayerStatsManager] ☠ JOGADOR MORREU!");
                GameEvents.TriggerPlayerDied();
            }

            return effectiveDamage;
        }

        /// <summary>
        /// Cura o jogador.
        /// </summary>
        public int Heal(int amount)
        {
            if (!IsAlive || amount <= 0) return 0;

            int oldHP = currentHealth;
            CurrentHealth = Mathf.Min(currentHealth + amount, MaxHealth);
            int healed = currentHealth - oldHP;

            if (healed > 0)
            {
                Debug.Log($"[PlayerStatsManager] Curou {healed} HP | HP: {currentHealth}/{MaxHealth}");
                GameEvents.TriggerHealed(healed);
            }

            return healed;
        }

        /// <summary>
        /// Restaura toda a vida (usado em reviver, level up, etc.)
        /// </summary>
        public void FullHeal()
        {
            CurrentHealth = MaxHealth;
        }

        /// <summary>
        /// Usa uma poção do inventário.
        /// </summary>
        public bool UseHealthPotion()
        {
            if (playerData.healthPotions <= 0)
            {
                Debug.LogWarning("[PlayerStatsManager] Sem poções!");
                return false;
            }

            playerData.healthPotions--;
            Heal(playerData.potionHealAmount);
            playerData.SaveToDisk();
            return true;
        }

        public void AddPotions(int amount)
        {
            playerData.healthPotions += amount;
            playerData.SaveToDisk();
        }

        // ═══════════════════════════════════════════════════
        //  MAPA
        // ═══════════════════════════════════════════════════

        public void SetCurrentMap(MapID map)
        {
            playerData.currentMap = map;
            playerData.SaveToDisk();
        }

        // ═══════════════════════════════════════════════════
        //  HANDLERS DE EVENTOS
        // ═══════════════════════════════════════════════════

        private void HandleMapChanged(MapID newMap)
        {
            SetCurrentMap(newMap);
        }

        private void HandleLevelUp(int newLevel)
        {
            // Level up já cuida de curar e recalcular HP
            // Este handler é para extensões futuras (desbloqueios, etc.)
        }

        // ═══════════════════════════════════════════════════
        //  DEBUG
        // ═══════════════════════════════════════════════════

        [ContextMenu("Debug: Print Status")]
        private void DebugPrintStatus()
        {
            Debug.Log($"=== STATUS DO JOGADOR ===\n" +
                      $"Nível: {Level}\n" +
                      $"XP: {CurrentXP}/{RequiredXP}\n" +
                      $"Moedas: {Coins}\n" +
                      $"Pontos de Atributo: {AttributePoints}\n" +
                      $"HP: {CurrentHealth}/{MaxHealth}\n" +
                      $"Esgrima: {playerData.esgrima} (Dano Físico Total: {playerData.TotalPhysicalDamage})\n" +
                      $"Afinidade: {playerData.afinidade} (Dano Mágico: {playerData.TotalMagicalDamage})\n" +
                      $"Vitalidade: {playerData.vitalidade} (HP Máx: {MaxHealth})\n" +
                      $"Defesa: {playerData.TotalDefense} (Redução: {playerData.DamageReduction * 100f:F1}%)\n" +
                      $"Poções: {playerData.healthPotions}\n" +
                      $"Mapa: {CurrentMap}");
        }

        [ContextMenu("Debug: +100 XP")]
        private void DebugGrantXP() => GrantXP(100f);

        [ContextMenu("Debug: +500 Moedas")]
        private void DebugAddCoins() => AddCoins(500);

        [ContextMenu("Debug: Matar Jogador")]
        private void DebugKillPlayer()
        {
            currentHealth = 0;
            GameEvents.TriggerPlayerDied();
        }

        [ContextMenu("Debug: Resetar Dados")]
        private void DebugReset()
        {
            playerData.ResetToDefaults();
            currentHealth = MaxHealth;
            playerData.SaveToDisk();
            Debug.Log("[PlayerStatsManager] Dados resetados!");
        }
    }
}
