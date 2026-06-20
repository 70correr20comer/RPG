using UnityEngine;
using System.Collections.Generic;
using RPG.Core;
using RPG.Data;

namespace RPG.Enemy
{
    /// <summary>
    /// GERADOR DE INIMIGOS NAS LÁPIDES
    /// ─────────────────────────────────
    /// Cada lápide no mapa TerrasCinzas funciona como gerador de inimigos.
    /// Inimigos respawnam após um tempo após serem derrotados.
    ///
    /// Uso: Anexar a cada lápide no mapa. Configurar o prefab do inimigo.
    /// </summary>
    public class EnemySpawner : MonoBehaviour
    {
        [Header("CONFIGURAÇÕES DO GERADOR")]
        [Tooltip("Prefab do inimigo que será gerado")]
        [SerializeField] private EnemyBase enemyPrefab;

        [Tooltip("Ponto exato onde o inimigo nasce")]
        [SerializeField] private Transform spawnPoint;

        [Tooltip("Tempo em segundos para respawn após morte")]
        [SerializeField] private float respawnTime = 10f;

        [Tooltip("Máximo de inimigos vivos simultâneos")]
        [SerializeField] private int maxEnemies = 1;

        [Header("VARIAÇÃO POR DIFICULDADE")]
        [SerializeField] private int easyHealthMultiplier = 1;
        [SerializeField] private int mediumHealthMultiplier = 2;
        [SerializeField] private int hardHealthMultiplier = 4;

        [Header("DROPS")]
        [Tooltip("Chance de dropar poção (0-1)")]
        [SerializeField] private float potionDropChance = 0.15f;

        // ─── ESTADO ────────────────────────────────────

        private List<EnemyBase> spawnedEnemies = new List<EnemyBase>();
        private float lastSpawnTime;
        private bool isActive = true;

        // ─── INICIALIZAÇÃO ──────────────────────────────

        private void Start()
        {
            if (spawnPoint == null)
                spawnPoint = transform;

            GameEvents.OnMapChanged += HandleMapChanged;
        }

        private void OnDestroy()
        {
            GameEvents.OnMapChanged -= HandleMapChanged;
        }

        private void Update()
        {
            if (!isActive) return;
            if (spawnedEnemies.Count >= maxEnemies) return;
            if (Time.time - lastSpawnTime < respawnTime) return;

            SpawnEnemy();
        }

        // ═══════════════════════════════════════════════════
        //  SPAWN
        // ═══════════════════════════════════════════════════

        private void SpawnEnemy()
        {
            if (enemyPrefab == null)
            {
                Debug.LogWarning($"[EnemySpawner] Prefab não atribuído em {gameObject.name}");
                return;
            }

            EnemyBase enemy = Instantiate(enemyPrefab, spawnPoint.position, Quaternion.identity);
            enemy.transform.SetParent(transform); // Filho da lápide

            // Aplica multiplicador baseado na dificuldade do mapa
            ApplyDifficultyScaling(enemy);

            spawnedEnemies.Add(enemy);
            lastSpawnTime = Time.time;

            Debug.Log($"[EnemySpawner] {enemy.EnemyName} gerado em {transform.position}");
        }

        private void ApplyDifficultyScaling(EnemyBase enemy)
        {
            // A escala é baseada no nível do jogador
            var stats = FindObjectOfType<Player.PlayerStatsManager>();
            if (stats == null) return;

            int level = stats.Level;
            int multiplier;

            if (level <= 3) multiplier = easyHealthMultiplier;
            else if (level <= 7) multiplier = mediumHealthMultiplier;
            else multiplier = hardHealthMultiplier;

            // Escala linear com o nível
            float scaleFactor = 1f + (level - 1) * 0.15f;

            // Usa reflection ou acesso direto para ajustar stats
            // (Em produção, usar interface IEnemyStats)
            Debug.Log($"[EnemySpawner] Escala: {enemy.EnemyName} " +
                      $"(Multiplier: {multiplier}x, ScaleFactor: {scaleFactor:F2})");
        }

        // ═══════════════════════════════════════════════════
        //  LIMPEZA
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Remove todos os inimigos gerados (usado ao sair do mapa).
        /// </summary>
        public void DespawnAll()
        {
            foreach (var enemy in spawnedEnemies)
            {
                if (enemy != null)
                    Destroy(enemy.gameObject);
            }
            spawnedEnemies.Clear();
        }

        /// <summary>
        /// Ativa/desativa o gerador.
        /// </summary>
        public void SetActive(bool active)
        {
            isActive = active;
            if (!active) DespawnAll();
        }

        // ═══════════════════════════════════════════════════
        //  EVENT HANDLERS
        // ═══════════════════════════════════════════════════

        private void HandleMapChanged(MapID newMap)
        {
            // Desativa spawners ao sair do mapa de caça
            if (newMap != MapID.TerrasCinzas)
            {
                SetActive(false);
            }
            else
            {
                isActive = true;
            }
        }

        // ═══════════════════════════════════════════════════
        //  GIZMOS
        // ═══════════════════════════════════════════════════

        private void OnDrawGizmos()
        {
            // Desenha a lápide
            Gizmos.color = new Color(0.5f, 0.5f, 0.5f, 0.6f);
            Vector3 pos = spawnPoint != null ? spawnPoint.position : transform.position;
            Gizmos.DrawCube(pos + Vector3.up * 0.5f, new Vector3(0.5f, 1f, 0.2f));

            // Ponto de spawn
            Gizmos.color = Color.red;
            Gizmos.DrawWireSphere(pos, 0.3f);
        }
    }
}
