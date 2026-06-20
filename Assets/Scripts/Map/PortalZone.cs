using UnityEngine;
using RPG.Core;

namespace RPG.Map
{
    /// <summary>
    /// ZONA DE PORTAL
    /// ───────────────
    /// Detecta colisão do jogador e dispara evento de troca de mapa.
    /// Cada portal é configurado para o mapa de destino.
    ///
    /// Uso: Anexar a um GameObject com collider (isTrigger = true).
    /// Configurar o mapa de destino no Inspector.
    /// </summary>
    [RequireComponent(typeof(Collider))]
    public class PortalZone : MonoBehaviour
    {
        [Header("CONFIGURAÇÕES DO PORTAL")]
        [SerializeField] private MapID destinationMap = MapID.CidadeCentral;

        [Tooltip("Tag do jogador para detectar colisão")]
        [SerializeField] private string playerTag = "Player";

        [Header("FEEDBACK")]
        [Tooltip("Efeito visual ao entrar no portal (opcional)")]
        [SerializeField] private ParticleSystem portalEffect;

        [Tooltip("Áudio ao entrar no portal (opcional)")]
        [SerializeField] private AudioClip portalSound;

        // ─── ESTADO ────────────────────────────────────

        private bool playerInside = false;

        // ─── EVENTOS ────────────────────────────────────

        private void OnTriggerEnter(Collider other)
        {
            if (!other.CompareTag(playerTag)) return;
            if (playerInside) return;

            playerInside = true;

            Debug.Log($"[Portal] Jogador entrou no portal → Destino: {destinationMap}");

            // Efeito visual
            if (portalEffect != null)
                portalEffect.Play();

            // Áudio
            if (portalSound != null)
                AudioSource.PlayClipAtPoint(portalSound, transform.position);

            // Dispara evento de troca de mapa
            GameEvents.TriggerMapChanged(destinationMap);
        }

        private void OnTriggerExit(Collider other)
        {
            if (!other.CompareTag(playerTag)) return;
            playerInside = false;
        }

        // ═══════════════════════════════════════════════════
        //  GIZMOS
        // ═══════════════════════════════════════════════════

        private void OnDrawGizmos()
        {
            Gizmos.color = new Color(0.3f, 0.7f, 1f, 0.5f);

            Collider col = GetComponent<Collider>();
            if (col is BoxCollider box)
            {
                Gizmos.matrix = transform.localToWorldMatrix;
                Gizmos.DrawCube(box.center, box.size);
                Gizmos.DrawWireCube(box.center, box.size);
            }

            // Texto do destino
            UnityEditor.Handles.Label(
                transform.position + Vector3.up * 2f,
                $"_portal → {destinationMap}",
                new GUIStyle { normal = { textColor = Color.cyan } }
            );
        }
    }
}
