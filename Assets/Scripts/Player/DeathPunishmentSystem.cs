using UnityEngine;
using RPG.Core;
using RPG.Data;

namespace RPG.Player
{
    /// <summary>
    /// SISTEMA DE PUNIÇÃO DE MORTE
    /// ────────────────────────────
    /// Implementa as regras de risco definidas no design do jogo:
    ///
    /// TRIGGER: Ativado quando o jogador morre nas TerrasCinzas.
    ///
    /// REGRA — Nível 2+:
    ///   • Perde 1 Level inteiro
    ///   • XP atual → zero
    ///   • XP necessário → recalculado para baixo (÷ multiplicador)
    ///   • Pontos de Atributo NÃO são removidos (já distribuídos ficam)
    ///
    /// REGRA — Nível 1:
    ///   • Perde 50% das Moedas atuais
    ///   • Sem punição de nível (já está no mínimo)
    ///
    /// PÓS-PUNIÇÃO:
    ///   • Teleporta o jogador para CidadeCentral
    ///   • Cura total da vida
    ///   • Salva dados
    ///
    /// Uso: Anexar ao mesmo GameObject do PlayerStatsManager.
    /// </summary>
    public class DeathPunishmentSystem : MonoBehaviour
    {
        [Header("CONFIGURAÇÕES")]
        [Tooltip("Multiplicador reverso para recalcular o XP necessário ao perder nível")]
        [SerializeField] private float xpRecalculationDivisor = 1.5f;

        [Tooltip("Se true, log detalhado de cada punição")]
        [SerializeField] private bool verboseLogging = true;

        [Header("REFERÊNCIAS")]
        [SerializeField] private PlayerStatsManager statsManager;

        // ─── ESTADO INTERNO ─────────────────────────────

        private bool isProcessingDeath = false;

        // ─── INICIALIZAÇÃO ──────────────────────────────

        private void Awake()
        {
            if (statsManager == null)
                statsManager = GetComponent<PlayerStatsManager>();
        }

        private void OnEnable()
        {
            GameEvents.OnPlayerDied += HandlePlayerDeath;
        }

        private void OnDisable()
        {
            GameEvents.OnPlayerDied -= HandlePlayerDeath;
        }

        // ═══════════════════════════════════════════════════
        //  FLUXO PRINCIPAL DE MORTE
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Handler principal do evento de morte.
        /// Verifica se está nas TerrasCinzas antes de aplicar punição.
        /// </summary>
        private void HandlePlayerDeath()
        {
            // Evita processamento duplo
            if (isProcessingDeath) return;
            isProcessingDeath = true;

            Debug.Log("═══════════════════════════════════════════");
            Debug.Log("  ☠  MORTE DO JOGADOR DETECTADA  ☠");
            Debug.Log("═══════════════════════════════════════════");

            MapID currentMap = statsManager.CurrentMap;

            // Só aplica punição se morreu nas TerrasCinzas
            if (currentMap != MapID.TerrasCinzas)
            {
                Debug.Log($"[DeathPunishment] Morto em {currentMap} — sem punição aplicada.");
                RevivePlayer();
                isProcessingDeath = false;
                return;
            }

            Debug.Log($"[DeathPunishment] Morto nas TerrasCinzas! Aplicando punição...");

            // Aplica punição baseada no nível
            string punishmentDescription = ApplyPunishment();

            // Dispara evento com a descrição da punição (para UI)
            GameEvents.TriggerDeathPunishment(punishmentDescription);

            // Revive e teleporta para Cidade Central
            ReviveAndTeleport();

            isProcessingDeath = false;
        }

        /// <summary>
        /// Aplica a punição correta baseada no nível do jogador.
        /// Retorna uma descrição legível da punição aplicada.
        /// </summary>
        private string ApplyPunishment()
        {
            PlayerDataSO data = statsManager.Data;
            int currentLevel = data.level;

            if (currentLevel >= 2)
            {
                return ApplyLevelLossPunishment(data, currentLevel);
            }
            else // Level 1
            {
                return ApplyCoinLossPunishment(data);
            }
        }

        // ═══════════════════════════════════════════════════
        //  PUNIÇÃO NÍVEL 2+: PERDA DE NÍVEL
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// REGRA DE PUNIÇÃO NÍVEL 2+:
        ///   • Perde 1 Level inteiro
        ///   • XP atual → 0
        ///   • XP necessário → recalculado para baixo (÷ 1.5)
        /// </summary>
        private string ApplyLevelLossPunishment(PlayerDataSO data, int currentLevel)
        {
            int newLevel = currentLevel - 1;
            float oldRequiredXP = data.requiredXP;
            float newRequiredXP;

            // Calcula o XP necessário para o nível anterior
            // Se o XP necessário subiu de 1.5x ao subir, dividimos para voltar
            newRequiredXP = Mathf.RoundToInt(oldRequiredXP / xpRecalculationDivisor);

            // Garante mínimo absoluto de XP necessário
            newRequiredXP = Mathf.Max(100f, newRequiredXP);

            // Aplica as mudanças
            data.level = newLevel;
            data.currentXP = 0f;
            data.requiredXP = newRequiredXP;

            // NÃO remove pontos de atributo já distribuídos (regra do design)
            // Os atributos permanecem como estão

            string description = $"PERDA DE NÍVEL: {currentLevel} → {newLevel} | " +
                                 $"XP resetado para 0/{(int)newRequiredXP} | " +
                                 $"Moedas preservadas: {data.coins}";

            if (verboseLogging)
            {
                Debug.LogWarning($"[DeathPunishment] ⚠ {description}");
                Debug.LogWarning($"[DeathPunishment] Atributos preservados — " +
                                 $"Esgrima:{data.esgrima} Afinidade:{data.afinidade} Vitalidade:{data.vitalidade}");
            }

            return description;
        }

        // ═══════════════════════════════════════════════════
        //  PUNIÇÃO NÍVEL 1: PERDA DE MOEDAS
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// REGRA DE PUNIÇÃO NÍVEL 1:
        ///   • Perde 50% das Moedas atuais
        ///   • Sem punição de nível
        /// </summary>
        private string ApplyCoinLossPunishment(PlayerDataSO data)
        {
            int oldCoins = data.coins;
            int coinsLost = Mathf.CeilToInt(oldCoins * 0.5f); // Arredonda para cima
            int newCoins = Mathf.Max(0, oldCoins - coinsLost);

            data.coins = newCoins;

            string description = $"PERDA DE MOEDAS: -{coinsLost} moedas ({oldCoins} → {newCoins}) | " +
                                 $"Nível preservado: {data.level}";

            if (verboseLogging)
            {
                Debug.LogWarning($"[DeathPunishment] ⚠ {description}");
            }

            return description;
        }

        // ═══════════════════════════════════════════════════
        //  REVIVER & TELEPORTAR
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Revive o jogador com vida total e teleporta para CidadeCentral.
        /// </summary>
        private void ReviveAndTeleport()
        {
            // 1. Curou toda a vida
            statsManager.FullHeal();

            // 2. Teleporta para CidadeCentral
            MapID targetMap = MapID.CidadeCentral;

            Debug.Log($"[DeathPunishment] Teleportando para {targetMap}...");

            // 3. Dispara eventos de transição
            GameEvents.TriggerMapTransitionStart(targetMap);

            // 4. Muda o mapa atual no dados do jogador
            statsManager.SetCurrentMap(targetMap);

            // 5. Notifica conclusão (o MapManager deve escutar e carregar a cena)
            GameEvents.TriggerMapChanged(targetMap);
            GameEvents.TriggerMapTransitionComplete(targetMap);
            GameEvents.TriggerPlayerRevived();

            // 6. Salva
            statsManager.Data.SaveToDisk();

            Debug.Log($"[DeathPunishment] ✓ Jogador revivido e teleportado para {targetMap} | " +
                      $"HP: {statsManager.CurrentHealth}/{statsManager.MaxHealth}");
        }

        private void RevivePlayer()
        {
            statsManager.FullHeal();
            statsManager.Data.SaveToDisk();
            GameEvents.TriggerPlayerRevived();
        }

        // ═══════════════════════════════════════════════════
        //  MÉTODOS PÚBLICOS DE UTILIDADE
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Calcula o impacto da punição SEM aplicá-la.
        /// Útil para mostrar preview na UI antes de confirmar.
        /// </summary>
        public (string description, bool losesLevel) PreviewPunishment()
        {
            PlayerDataSO data = statsManager.Data;
            int currentLevel = data.level;

            if (currentLevel >= 2)
            {
                int newLevel = currentLevel - 1;
                float newRequiredXP = Mathf.RoundToInt(data.requiredXP / xpRecalculationDivisor);
                newRequiredXP = Mathf.Max(100f, newRequiredXP);

                return (
                    $"Perderá 1 nível ({currentLevel} → {newLevel})\n" +
                    $"XP será resetado para 0/{(int)newRequiredXP}\n" +
                    $"Atributos serão preservados",
                    true
                );
            }
            else
            {
                int coinsLost = Mathf.CeilToInt(data.coins * 0.5f);
                int newCoins = Mathf.Max(0, data.coins - coinsLost);

                return (
                    $"Perderá 50% das moedas (-{coinsLost})\n" +
                    $"Moedas: {data.coins} → {newCoins}\n" +
                    $"Nível será preservado",
                    false
                );
            }
        }

        /// <summary>
        /// Força um revive sem punição (usado em debug ou checkpoints).
        /// </summary>
        public void ForceReviveNoPunishment()
        {
            Debug.Log("[DeathPunishment] Revive forçado sem punição!");
            ReviveAndTeleport();
        }

        // ═══════════════════════════════════════════════════
        //  DEBUG
        // ═══════════════════════════════════════════════════

        [ContextMenu("Debug: Simular Morte (TerrasCinzas)")]
        private void DebugSimulateDeath()
        {
            statsManager.Data.currentMap = MapID.TerrasCinzas;
            statsManager.Data.SaveToDisk();
            HandlePlayerDeath();
        }

        [ContextMenu("Debug: Preview de Punição")]
        private void DebugPreviewPunishment()
        {
            var (desc, losesLevel) = PreviewPunishment();
            Debug.Log($"=== PREVIEW DE PUNIÇÃO ===\n{desc}\nPerde nível: {losesLevel}");
        }
    }
}
