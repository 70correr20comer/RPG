using UnityEngine;
using RPG.Core;
using RPG.Data;
using RPG.Player;

namespace RPG.Combat
{
    /// <summary>
    /// SISTEMA DE COMBATE
    /// ──────────────────
    /// Calcula dano (físico/mágico) com base nos atributos do jogador.
    ///
    /// FÓRMULAS:
    ///   Dano Físico = Esgrima + Espada + variance(-10%..+10%)
    ///   Dano Mágico = Afinidade * SpellMultiplier + variance(-10%..+10%)
    ///   Redução = Defesa / (Defesa + 100)
    ///   Dano Final = Raw * (1 - Redução)
    ///
    /// Uso: ScriptableObject ou MonoBehaviour estático.
    /// </summary>
    public class CombatSystem : MonoBehaviour
    {
        [Header("REFERÊNCIAS")]
        [SerializeField] private PlayerStatsManager playerStats;

        [Header("BALANCEAMENTO")]
        [Tooltip("Multiplicador base para dano mágico")]
        [SerializeField] private float spellBaseMultiplier = 2.5f;

        [Tooltip("Multiplicador de dano por nível de Afinidade")]
        [SerializeField] private float affinityScaling = 1.2f;

        [Tooltip("Variance de dano (±%)")]
        [SerializeField] private float damageVariance = 0.10f;

        [Header("CUSTOS")]
        [Tooltip("Custo de stamina/magia por ataque mágico")]
        [SerializeField] private int magicCost = 15;

        // ─── STATS DO JOGADOR EM RUNTIME ────────────────

        private PlayerDataSO Data => playerStats?.Data;

        // ═══════════════════════════════════════════════════
        //  CÁLCULO DE DANO DO JOGADOR → INIMIGO
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Calcula o dano físico que o jogador causa.
        /// Fórmula: (Esgrima + BonusEspada) * Variance
        /// </summary>
        public int CalculatePlayerPhysicalDamage()
        {
            int baseDamage = Data.TotalPhysicalDamage;
            float variance = 1f + Random.Range(-damageVariance, damageVariance);
            int finalDamage = Mathf.RoundToInt(baseDamage * variance);

            Debug.Log($"[Combat] Dano Físico: {finalDamage} " +
                      $"(Base: {baseDamage}, Variance: {variance:F2})");

            return Mathf.Max(1, finalDamage);
        }

        /// <summary>
        /// Calcula o dano mágico que o jogador causa com o feitiço equipado.
        /// Requer Afinidade > 0 e feitiço equipado.
        /// </summary>
        public int CalculatePlayerMagicalDamage()
        {
            if (Data.afinidade <= 0 || Data.equippedSpell == ElementalType.None)
            {
                Debug.Log("[Combat] Sem capacidade mágica (Afinidade = 0 ou sem feitiço)");
                return 0;
            }

            // Fórmula: Afinidade * Multiplicador * Scaling^nívelAFinidade
            float baseDamage = Data.afinidade * spellBaseMultiplier * Mathf.Pow(affinityScaling, Data.afinidade / 5f);
            float variance = 1f + Random.Range(-damageVariance, damageVariance);
            int finalDamage = Mathf.RoundToInt(baseDamage * variance);

            Debug.Log($"[Combat] Dano Mágico ({Data.equippedSpell}): {finalDamage} " +
                      $"(Afinidade: {Data.afinidade}, Base: {baseDamage:F1}, Variance: {variance:F2})");

            return Mathf.Max(1, finalDamage);
        }

        /// <summary>
        /// Retorna o dano total do jogador (físico + mágico) para um ataque.
        /// </summary>
        public int CalculateTotalPlayerDamage(bool useMagic)
        {
            int physical = CalculatePlayerPhysicalDamage();
            int magical = useMagic ? CalculatePlayerMagicalDamage() : 0;
            int total = physical + magical;

            Debug.Log($"[Combat] Dano Total: {total} (Físico: {physical} + Mágico: {magical})");

            return total;
        }

        // ═══════════════════════════════════════════════════
        //  CÁLCULO DE DANO DO INIMIGO → JOGADOR
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Calcula o dano que um inimigo causa ao jogador,
        /// considerando a defesa do jogador.
        /// </summary>
        public int CalculateEnemyDamage(int enemyAttackPower)
        {
            float reduction = Data.DamageReduction;
            int effectiveDamage = Mathf.Max(1, Mathf.RoundToInt(enemyAttackPower * (1f - reduction)));

            Debug.Log($"[Combat] Dano recebido: {effectiveDamage} " +
                      $"(Inimigo: {enemyAttackPower}, Defesa: {Data.TotalDefense}, " +
                      $"Redução: {reduction * 100f:F1}%)");

            return effectiveDamage;
        }

        // ═══════════════════════════════════════════════════
        //  APLICAR ATAQUE DO JOGADOR
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Executa um ataque do jogador contra um inimigo.
        /// Retorna o dano causado.
        /// </summary>
        public int ExecutePlayerAttack(Enemy.EnemyBase enemy, bool useMagic = false)
        {
            if (enemy == null || !playerStats.IsAlive) return 0;

            int damage = CalculateTotalPlayerDamage(useMagic);

            // Aplica o dano ao inimigo
            bool killed = enemy.TakeDamage(damage);

            GameEvents.TriggerDamageDealt(damage);

            if (killed)
            {
                int xpReward = enemy.XPReward;
                string enemyName = enemy.EnemyName;
                playerStats.GrantXP(xpReward);
                GameEvents.TriggerEnemyKilled(enemyName, xpReward);
            }

            return damage;
        }

        /// <summary>
        /// Executa um ataque do inimigo contra o jogador.
        /// Retorna o dano recebido.
        /// </summary>
        public int ExecuteEnemyAttack(Enemy.EnemyBase enemy)
        {
            if (enemy == null || !playerStats.IsAlive) return 0;

            int damage = CalculateEnemyDamage(enemy.AttackPower);
            playerStats.TakeDamage(damage);

            return damage;
        }

        // ═══════════════════════════════════════════════════
        //  UTILIDADES DE BALANCEAMENTO
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Calcula o DPS teórico do jogador (para balancemento).
        /// </summary>
        public float CalculateTheoreticalDPS(float attacksPerSecond, bool useMagic)
        {
            float avgDamage = (CalculatePlayerPhysicalDamage() +
                               (useMagic ? CalculatePlayerMagicalDamage() : 0f)) / 2f;
            return avgDamage * attacksPerSecond;
        }

        /// <summary>
        /// Preview do dano sem executar (para UI de tooltip).
        /// </summary>
        public (int physical, int magical, int total) PreviewDamage(bool useMagic)
        {
            int phys = Data.TotalPhysicalDamage;
            int mag = useMagic ? CalculatePlayerMagicalDamage() : 0;
            return (phys, mag, phys + mag);
        }
    }
}
