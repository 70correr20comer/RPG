using UnityEngine;

namespace RPG.Camera
{
    /// <summary>
    /// CÂMERA ISOMÉTRICA
    /// ─────────────────
    /// Perspectiva ortográfica com ângulo de 45° que segue o jogador suavemente.
    /// Configuração padrão isométrica:
    ///   • Rotação X = 52.5° (ângulo padrão de isometric)
    ///   • Rotação Y = 45°
    ///   • Projection = Ortográfica
    ///
    /// Uso: Anexar à Main Camera. Atribuir o target (jogador) no Inspector.
    /// </summary>
    [RequireComponent(typeof(UnityEngine.Camera))]
    public class IsometricCamera : MonoBehaviour
    {
        [Header("ALVO")]
        [SerializeField] private Transform target;

        [Header("CONFIGURAÇÕES ISOMÉTRICAS")]
        [Tooltip("Altura da câmera acima do jogador")]
        [SerializeField] private float height = 15f;

        [Tooltip("Distância horizontal da câmera ao jogador")]
        [SerializeField] private float distance = 10f;

        [Tooltip("Suavização do follow (menor = mais rápido)")]
        [SerializeField] private float smoothSpeed = 8f;

        [Header("ÂNGULO")]
        [Tooltip("Rotação Y (ângulo horizontal)")]
        [SerializeField] private float rotationY = 45f;

        [Tooltip("Rotação X (ângulo de inclinação — 52.5° é padrão isométrico)")]
        [SerializeField] private float rotationX = 52.5f;

        [Header("ZOOM ORTOGRÁFICO")]
        [SerializeField] private float orthographicSize = 10f;
        [SerializeField] private float zoomSpeed = 2f;
        [SerializeField] private float minZoom = 5f;
        [SerializeField] private float maxZoom = 20f;

        [Header("LIMITES DA CÂMERA (Opcional)")]
        [SerializeField] private bool useBounds = false;
        [SerializeField] private Vector2 boundsMin = new Vector2(-20f, -20f);
        [SerializeField] private Vector2 boundsMax = new Vector2(20f, 20f);

        // ─── REFERÊNCIAS ────────────────────────────────

        private UnityEngine.Camera cam;

        // ─── ESTADO ────────────────────────────────────

        private Vector3 smoothVelocity;

        // ─── INICIALIZAÇÃO ──────────────────────────────

        private void Awake()
        {
            cam = GetComponent<UnityEngine.Camera>();
            cam.orthographic = true;
            cam.orthographicSize = orthographicSize;

            // Configura rotação isométrica
            transform.rotation = Quaternion.Euler(rotationX, rotationY, 0f);
        }

        private void LateUpdate()
        {
            if (target == null) return;

            FollowTarget();
            HandleZoom();
        }

        /// <summary>
        /// Calcula a posição da câmera baseada no offset isométrico e segue o alvo.
        /// </summary>
        private void FollowTarget()
        {
            // Calcula a posição desejada
            // A câmera fica atrás e acima do jogador, olhando para ele
            Vector3 offset = new Vector3(0f, height, -distance);

            // Rotaciona o offset pelo ângulo Y da câmera
            Quaternion rotation = Quaternion.Euler(0f, rotationY, 0f);
            Vector3 rotatedOffset = rotation * offset;

            Vector3 desiredPosition = target.position + rotatedOffset;

            // Suavização
            Vector3 smoothedPosition = Vector3.Lerp(
                transform.position,
                desiredPosition,
                smoothSpeed * Time.deltaTime
            );

            // Aplica limites se habilitado
            if (useBounds)
            {
                smoothedPosition.x = Mathf.Clamp(smoothedPosition.x, boundsMin.x, boundsMax.x);
                smoothedPosition.z = Mathf.Clamp(smoothedPosition.z, boundsMin.y, boundsMax.y);
            }

            transform.position = smoothedPosition;
        }

        /// <summary>
        /// Zoom com scroll do mouse.
        /// </summary>
        private void HandleZoom()
        {
            float scroll = Input.GetAxis("Mouse ScrollWheel");
            if (Mathf.Abs(scroll) > 0.01f)
            {
                orthographicSize -= scroll * zoomSpeed;
                orthographicSize = Mathf.Clamp(orthographicSize, minZoom, maxZoom);
                cam.orthographicSize = Mathf.Lerp(
                    cam.orthographicSize,
                    orthographicSize,
                    Time.deltaTime * 10f
                );
            }
        }

        // ═══════════════════════════════════════════════════
        //  UTILIDADES PÚBLICAS
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Define o alvo da câmera (jogador).
        /// </summary>
        public void SetTarget(Transform newTarget)
        {
            target = newTarget;
        }

        /// <summary>
        /// Muda instantaneamente a posição da câmera (usado em transições de mapa).
        /// </summary>
        public void SnapToTarget()
        {
            if (target == null) return;

            Vector3 offset = new Vector3(0f, height, -distance);
            Quaternion rotation = Quaternion.Euler(0f, rotationY, 0f);
            transform.position = target.position + rotation * offset;
        }

        /// <summary>
        /// Transição suave para uma nova posição (usado em portais).
        /// </summary>
        public void TransitionToPosition(Vector3 targetPosition, float duration = 1f)
        {
            StartCoroutine(TransitionCoroutine(targetPosition, duration));
        }

        private System.Collections.IEnumerator TransitionCoroutine(Vector3 targetPos, float duration)
        {
            Vector3 startPos = transform.position;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.SmoothStep(0f, 1f, elapsed / duration);

                Vector3 offset = new Vector3(0f, height, -distance);
                Quaternion rotation = Quaternion.Euler(0f, rotationY, 0f);
                Vector3 desiredPos = targetPos + rotation * offset;

                transform.position = Vector3.Lerp(startPos, desiredPos, t);
                yield return null;
            }

            SnapToTarget();
        }

        // ═══════════════════════════════════════════════════
        //  GIZMOS
        // ═══════════════════════════════════════════════════

        private void OnDrawGizmosSelected()
        {
            if (target == null) return;

            // Desenha a linha da câmera ao alvo
            Gizmos.color = Color.yellow;
            Gizmos.DrawLine(transform.position, target.position);

            // Desenha o ponto desejado
            Gizmos.color = Color.cyan;
            Gizmos.DrawWireSphere(
                target.position + Quaternion.Euler(0f, rotationY, 0f) * new Vector3(0f, height, -distance),
                0.5f
            );
        }
    }
}
