using UnityEngine;
using RPG.Core;

namespace RPG.Enemy
{
    /// <summary>
    /// BASE CLASS PARA TODOS OS INIMIGOS
    /// ──────────────────────────────────
    /// Fornece: vida, dano, XP reward, morte.
    /// Filhos implementam comportamento específico (IA, ataque, etc.)
    ///
    /// Uso: Herdar desta classe para cada tipo de inimigo.
    /// </summary>
    public abstract class EnemyBase : MonoBehaviour
    {
        [Header("CONFIGURAÇÕES BASE")]
        [SerializeField] protected string enemyName = "Inimigo";
        [SerializeField] protected int maxHealth = 50;
        [SerializeField] protected int attackPower = 10;
        [SerializeField] protected int xpReward = 25;
        [SerializeField] protected int coinReward = 10;

        [Header("MOVIMENTAÇÃO")]
        [SerializeField] protected float moveSpeed = 3f;
        [SerializeField] protected float aggroRange = 8f;
        [SerializeField] protected float attackRange = 1.5f;
        [SerializeField] protected float attackCooldown = 1.5f;

        // ─── PROPRIEDADES PÚBLICAS ──────────────────────

        public string EnemyName => enemyName;
        public int MaxHealth => maxHealth;
        public int AttackPower => attackPower;
        public int XPReward => xpReward;
        public int CoinReward => coinReward;
        public bool IsAlive => currentHealth > 0;
        public float HealthPercent => maxHealth > 0 ? (float)currentHealth / maxHealth : 0f;

        // ─── ESTADO ────────────────────────────────────

        protected int currentHealth;
        protected Transform playerTransform;
        protected float lastAttackTime;
        protected bool isChasing;

        // ─── INICIALIZAÇÃO ──────────────────────────────

        protected virtual void Awake()
        {
            currentHealth = maxHealth;
        }

        protected virtual void Start()
        {
            playerTransform = GameObject.FindGameObjectWithTag("Player")?.transform;
        }

        // ─── UPDATE ────────────────────────────────────

        protected virtual void Update()
        {
            if (!IsAlive || playerTransform == null) return;

            float distToPlayer = Vector3.Distance(transform.position, playerTransform.position);

            if (distToPlayer <= aggroRange)
            {
                isChasing = true;

                if (distToPlayer <= attackRange)
                {
                    TryAttack();
                }
                else
                {
                    ChasePlayer();
                }
            }
            else
            {
                isChasing = false;
                IdleBehavior();
            }
        }

        // ═══════════════════════════════════════════════════
        //  COMPORTAMENTOS (override em subclasses)
        // ═══════════════════════════════════════════════════

        protected virtual void ChasePlayer()
        {
            Vector3 direction = (playerTransform.position - transform.position).normalized;
            direction.y = 0;
            transform.position += direction * moveSpeed * Time.deltaTime;
            transform.LookAt(new Vector3(playerTransform.position.x, transform.position.y, playerTransform.position.z));
        }

        protected virtual void TryAttack()
        {
            if (Time.time - lastAttackTime < attackCooldown) return;
            lastAttackTime = Time.time;

            // Chamado quando está no range de ataque
            OnAttack();
        }

        protected virtual void OnAttack()
        {
            Debug.Log($"[Enemy] {enemyName} ataca!");
            // Filhos implementam o ataque específico
        }

        protected virtual void IdleBehavior()
        {
            // Pode ser sobrescrito para patrulha, etc.
        }

        // ═══════════════════════════════════════════════════
        //  SISTEMA DE DANO
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Recebe dano. Retorna true se morreu.
        /// </summary>
        public virtual bool TakeDamage(int damage)
        {
            if (!IsAlive) return false;

            currentHealth -= damage;
            currentHealth = Mathf.Max(0, currentHealth);

            Debug.Log($"[Enemy] {enemyName} recebeu {damage} de dano | HP: {currentHealth}/{maxHealth}");

            OnDamageReceived(damage);

            if (!IsAlive)
            {
                OnDeath();
                return true;
            }

            return false;
        }

        protected virtual void OnDamageReceived(int damage)
        {
            // Efeito visual de dano, flash, etc.
        }

        /// <summary>
        /// Chamado quando a vida chega a 0.
        /// </summary>
        protected virtual void OnDeath()
        {
            Debug.Log($"[Enemy] {enemyName} foi derrotado! +{xpReward} XP, +{coinReward} moedas");

            // Concede moedas
            var statsManager = FindObjectOfType<Player.PlayerStatsManager>();
            if (statsManager != null)
                statsManager.AddCoins(coinReward);

            // Animação de morte, depois destrói
            // Pode ser sobrescrito para drops especiais
            Destroy(gameObject, 1f);
        }

        // ═══════════════════════════════════════════════════
        //  GIZMOS
        // ═══════════════════════════════════════════════════

        protected virtual void OnDrawGizmosSelected()
        {
            // Aggro range
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(transform.position, aggroRange);

            // Attack range
            Gizmos.color = Color.red;
            Gizmos.DrawWireSphere(transform.position, attackRange);
        }
    }
}
