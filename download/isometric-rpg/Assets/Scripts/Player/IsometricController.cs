using UnityEngine;

namespace RPG.Player
{
    /// <summary>
    /// CONTROLADOR DE MOVIMENTAÇÃO ISOMÉTRICA
    /// ───────────────────────────────────────
    /// Converte input WASD/Setas em movimento alinhado ao eixo isométrico (45°).
    ///
    /// No mundo isométrico:
    ///   • Eixo X do mundo = diagonal ↘
    ///   • Eixo Z do mundo = diagonal ↙
    ///   • Input "frente" (W) = combina X+ e Z-
    ///   • Input "direita" (D) = combina X+ e Z+
    ///
    /// Uso: Anexar ao jogador. Requer CharacterController no mesmo GameObject.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class IsometricController : MonoBehaviour
    {
        [Header("CONFIGURAÇÕES DE MOVIMENTO")]
        [SerializeField] private float moveSpeed = 5f;
        [SerializeField] private float sprintMultiplier = 1.6f;
        [SerializeField] private float rotationSpeed = 10f;

        [Header("GRAVIDADE")]
        [SerializeField] private float gravity = -20f;
        [SerializeField] private float groundCheckDistance = 0.1f;
        [SerializeField] private LayerMask groundLayer;

        [Header("REFERÊNCIAS")]
        [SerializeField] private CharacterController controller;

        // ─── ÂNGULO ISOMÉTRICO ─────────────────────────
        // Câmera isométrica padrão: 45° no eixo Y
        // Cos(45°) = Sin(45°) ≈ 0.7071
        private const float ISO_ANGLE = 45f;
        private static readonly Vector3 FORWARD_ISO = new Vector3(
            Mathf.Cos(ISO_ANGLE * Mathf.Deg2Rad),
            0f,
            -Mathf.Sin(ISO_ANGLE * Mathf.Deg2Rad)
        ).normalized;

        private static readonly Vector3 RIGHT_ISO = new Vector3(
            Mathf.Cos((ISO_ANGLE + 90f) * Mathf.Deg2Rad),
            0f,
            -Mathf.Sin((ISO_ANGLE + 90f) * Mathf.Deg2Rad)
        ).normalized;

        // ─── ESTADO ────────────────────────────────────

        private Vector3 velocity;
        private bool isMoving;
        public bool IsMoving => isMoving;

        // ─── INICIALIZAÇÃO ──────────────────────────────

        private void Awake()
        {
            if (controller == null)
                controller = GetComponent<CharacterController>();
        }

        private void Start()
        {
            // Reseta a rotação para alinhar com a câmera isométrica
            transform.rotation = Quaternion.Euler(0f, -ISO_ANGLE, 0f);
        }

        // ─── UPDATE ────────────────────────────────────

        private void Update()
        {
            HandleGroundCheck();
            HandleMovement();
            ApplyGravity();
        }

        /// <summary>
        /// Captura input e converte para movimento isométrico.
        /// WASD ou Setas → direção no espaço isométrico.
        /// </summary>
        private void HandleMovement()
        {
            // Input raw
            float inputX = Input.GetAxisRaw("Horizontal"); // A/D ou ←/→
            float inputZ = Input.GetAxisRaw("Vertical");   // W/S ou ↑/↓

            Vector2 input = new Vector2(inputX, inputZ).normalized;

            isMoving = input.sqrMagnitude > 0.01f;

            if (!isMoving)
            {
                // Suaviza a parada
                velocity.x = Mathf.Lerp(velocity.x, 0f, Time.deltaTime * 10f);
                velocity.z = Mathf.Lerp(velocity.z, 0f, Time.deltaTime * 10f);
                return;
            }

            // Converte input para direção isométrica
            // inputX controla eixo diagonal ↘ (forward_iso)
            // inputZ controla eixo diagonal ↙ (right_iso)
            Vector3 moveDirection = (FORWARD_ISO * inputX + RIGHT_ISO * inputZ).normalized;

            // Velocidade
            float speed = moveSpeed;
            if (Input.GetKey(KeyCode.LeftShift))
                speed *= sprintMultiplier;

            velocity.x = moveDirection.x * speed;
            velocity.z = moveDirection.z * speed;

            // Rotação suave na direção do movimento
            if (moveDirection.sqrMagnitude > 0.01f)
            {
                Quaternion targetRotation = Quaternion.LookRotation(moveDirection, Vector3.up);
                transform.rotation = Quaternion.Slerp(
                    transform.rotation,
                    targetRotation,
                    Time.deltaTime * rotationSpeed
                );
            }

            // Aplica movimento
            controller.Move(new Vector3(velocity.x, 0f, velocity.z) * Time.deltaTime);
        }

        private void HandleGroundCheck()
        {
            if (Physics.Raycast(transform.position, Vector3.down, out _, groundCheckDistance + 0.05f, groundLayer))
            {
                // No chão
                if (velocity.y < 0f)
                    velocity.y = -2f; // Pequena força para manter no chão
            }
        }

        private void ApplyGravity()
        {
            velocity.y += gravity * Time.deltaTime;
            controller.Move(Vector3.up * velocity.y * Time.deltaTime);
        }

        // ═══════════════════════════════════════════════════
        //  UTILIDADES PÚBLICAS
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Força o jogador para uma posição específica (usado em teleportação de portais).
        /// </summary>
        public void TeleportTo(Vector3 position)
        {
            controller.enabled = false;
            transform.position = position;
            controller.enabled = true;
            velocity = Vector3.zero;
        }

        /// <summary>
        /// Congela o movimento do jogador (usado durante diálogos, loja, etc.)
        /// </summary>
        public void SetMovementEnabled(bool enabled)
        {
            this.enabled = enabled;
            if (!enabled)
            {
                velocity = Vector3.zero;
                isMoving = false;
            }
        }

        // ═══════════════════════════════════════════════════
        //  DEBUG
        // ═══════════════════════════════════════════════════

        private void OnDrawGizmosSelected()
        {
            // Desenha os eixos isométricos no editor
            Gizmos.color = Color.red;
            Gizmos.DrawRay(transform.position, FORWARD_ISO * 3f);

            Gizmos.color = Color.blue;
            Gizmos.DrawRay(transform.position, RIGHT_ISO * 3f);

            Gizmos.color = Color.green;
            Gizmos.DrawRay(transform.position, Vector3.up * 3f);
        }
    }
}
