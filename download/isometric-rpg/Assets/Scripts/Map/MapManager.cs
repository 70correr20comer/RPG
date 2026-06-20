using UnityEngine;
using RPG.Core;
using RPG.Player;
using System.Collections;

namespace RPG.Map
{
    /// <summary>
    /// GERENCIADOR DE MAPAS
    /// ────────────────────
    /// Controla a transição entre CidadeCentral e TerrasCinzas.
    /// Escuta eventos de portal e de morte (teleporte de volta).
    ///
    /// Uso: Criar um GameObject vazio "MapManager" na cena inicial.
    /// Carregar as duas cenas (CidadeCentral e TerrasCinzas) como additivas.
    /// </summary>
    public class MapManager : MonoBehaviour
    {
        [Header("REFERÊNCIAS DE CENAS")]
        [Tooltip("Nome da cena da CidadeCentral (Build Settings)")]
        [SerializeField] private string cidadeCentralScene = "CidadeCentral";

        [Tooltip("Nome da cena das TerrasCinzas (Build Settings)")]
        [SerializeField] private string terrasCinzasScene = "TerrasCinzas";

        [Header("REFERÊNCIAS")]
        [SerializeField] private PlayerStatsManager statsManager;
        [SerializeField] private Player.IsometricController playerController;

        [Header("PONTOS DE SPAWN")]
        [SerializeField] private Transform cidadeCentralSpawn;
        [SerializeField] private Transform terrasCinzasSpawn;

        [Header("TRANSIÇÃO")]
        [SerializeField] private float transitionDuration = 0.5f;

        // ─── ESTADO ────────────────────────────────────

        private MapID currentMap;
        private bool isTransitioning = false;
        private GameObject currentMapInstance;

        // ─── INICIALIZAÇÃO ──────────────────────────────

        private void Awake()
        {
            currentMap = statsManager != null ? statsManager.CurrentMap : MapID.CidadeCentral;
        }

        private void OnEnable()
        {
            GameEvents.OnMapChanged += HandleMapChangeRequest;
            GameEvents.OnPlayerDied += HandlePlayerDeath;
        }

        private void OnDisable()
        {
            GameEvents.OnMapChanged -= HandleMapChangeRequest;
            GameEvents.OnPlayerDied -= HandlePlayerDeath;
        }

        private void Start()
        {
            // Carrega o mapa inicial
            StartCoroutine(LoadMap(currentMap, false));
        }

        // ═══════════════════════════════════════════════════
        //  FLUXO DE TRANSIÇÃO
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Handler principal para mudança de mapa.
        /// </summary>
        private void HandleMapChangeRequest(MapID newMap)
        {
            if (isTransitioning || newMap == currentMap) return;
            StartCoroutine(TransitionToMap(newMap));
        }

        /// <summary>
        /// Fluxo completo de transição:
        /// 1. Dispara evento de início
        /// 2. Fade out (screen)
        /// 3. Descarrega mapa atual
        /// 4. Carrega novo mapa
        /// 5. Reposiciona jogador
        /// 6. Fade in
        /// 7. Dispara evento de conclusão
        /// </summary>
        private IEnumerator TransitionToMap(MapID targetMap)
        {
            isTransitioning = true;

            Debug.Log($"[MapManager] Iniciando transição: {currentMap} → {targetMap}");

            // 1. Dispara início da transição
            GameEvents.TriggerMapTransitionStart(targetMap);

            // 2. Desativa movimento do jogador
            if (playerController != null)
                playerController.SetMovementEnabled(false);

            // 3. Fade out (pode ser integrado com um CanvasGroup de fade)
            yield return StartCoroutine(FadeScreen(1f, transitionDuration / 2f));

            // 4. Descarrega mapa atual
            if (currentMapInstance != null)
            {
                // Em produção: SceneManager.UnloadSceneAsync()
                Destroy(currentMapInstance);
                Debug.Log($"[MapManager] Mapa {currentMap} descarregado");
            }

            // 5. Carrega novo mapa
            yield return StartCoroutine(LoadMap(targetMap, true));

            // 6. Reposiciona jogador no spawn point
            Transform spawnPoint = targetMap == MapID.CidadeCentral ? cidadeCentralSpawn : terrasCinzasSpawn;
            if (spawnPoint != null && playerController != null)
            {
                playerController.TeleportTo(spawnPoint.position);
            }

            // 7. Atualiza estado
            currentMap = targetMap;
            if (statsManager != null)
                statsManager.SetCurrentMap(targetMap);

            // 8. Fade in
            yield return StartCoroutine(FadeScreen(0f, transitionDuration / 2f));

            // 9. Reativa movimento
            if (playerController != null)
                playerController.SetMovementEnabled(true);

            // 10. Dispara conclusão
            GameEvents.TriggerMapTransitionComplete(targetMap);
            GameEvents.TriggerMapChanged(targetMap);

            isTransitioning = false;

            Debug.Log($"[MapManager] ✓ Transição completa — Mapa atual: {currentMap}");
        }

        /// <summary>
        /// Carrega um mapa (em produção usaria SceneManager, aqui usa instanciação simples).
        /// </summary>
        private IEnumerator LoadMap(MapID mapID, bool destroyPrevious)
        {
            string sceneName = mapID switch
            {
                MapID.CidadeCentral => cidadeCentralScene,
                MapID.TerrasCinzas => terrasCinzasScene,
                _ => cidadeCentralScene
            };

            Debug.Log($"[MapManager] Carregando mapa: {sceneName}");

            // Em produção com Unity Scene Management:
            // yield return SceneManager.LoadSceneAsync(sceneName, LoadSceneMode.Additive);

            // Para protótipo: instancia um prefab do mapa
            // (substitua por SceneManager na versão final)
            GameObject prefab = Resources.Load<GameObject>($"Maps/{sceneName}");
            if (prefab != null)
            {
                currentMapInstance = Instantiate(prefab);
                currentMapInstance.name = sceneName;
            }
            else
            {
                Debug.LogWarning($"[MapManager] Prefab de mapa não encontrado: Maps/{sceneName}");
            }

            yield return null;
        }

        /// <summary>
        /// Efeito de fade na tela (pode ser conectado a um CanvasGroup).
        /// </summary>
        private IEnumerator FadeScreen(float targetAlpha, float duration)
        {
            // Placeholder — integrar com CanvasGroup de fade screen
            // No protótipo, apenas aguarda
            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float alpha = Mathf.Lerp(1f - targetAlpha, targetAlpha, elapsed / duration);
                // canvasGroup.alpha = alpha; // ← Integrar com UI
                yield return null;
            }
        }

        /// <summary>
        /// Handler de morte — teleporta para CidadeCentral.
        /// </summary>
        private void HandlePlayerDeath()
        {
            // A morte já é tratada pelo DeathPunishmentSystem
            // Aqui apenas garantimos que a transição seja feita
            if (currentMap == MapID.TerrasCinzas && !isTransitioning)
            {
                // Delay para permitir que a punição seja calculada primeiro
                StartCoroutine(DelayedTransition(MapID.CidadeCentral, 0.5f));
            }
        }

        private IEnumerator DelayedTransition(MapID target, float delay)
        {
            yield return new WaitForSeconds(delay);
            HandleMapChangeRequest(target);
        }

        // ═══════════════════════════════════════════════════
        //  MÉTODOS PÚBLICOS
        // ═══════════════════════════════════════════════════

        public MapID CurrentMap => currentMap;
        public bool IsTransitioning => isTransitioning;

        public void ForceTransition(MapID targetMap)
        {
            if (!isTransitioning)
                StartCoroutine(TransitionToMap(targetMap));
        }
    }
}
