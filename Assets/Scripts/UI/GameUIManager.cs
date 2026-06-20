using UnityEngine;
using UnityEngine.UI;
using TMPro;
using RPG.Core;
using RPG.Data;
using RPG.Player;

namespace RPG.UI
{
    /// <summary>
    /// GERENCIADOR DE UI DO JOGO
    /// ─────────────────────────
    /// Controla HUD, tela de atributos, tela da loja, e feedback de punição.
    ///
    /// Uso: Anexar ao Canvas principal do jogo.
    /// </summary>
    public class GameUIManager : MonoBehaviour
    {
        [Header("REFERÊNCIAS")]
        [SerializeField] private PlayerStatsManager statsManager;

        [Header("HUD")]
        [SerializeField] private Slider healthBar;
        [SerializeField] private TextMeshProUGUI healthText;
        [SerializeField] private TextMeshProUGUI levelText;
        [SerializeField] private Slider xpBar;
        [SerializeField] private TextMeshProUGUI xpText;
        [SerializeField] private TextMeshProUGUI coinsText;
        [SerializeField] private TextMeshProUGUI mapNameText;

        [Header("PAINEL DE ATRIBUTOS")]
        [SerializeField] private GameObject attributePanel;
        [SerializeField] private TextMeshProUGUI attrPointsText;
        [SerializeField] private TextMeshProUGUI esgrimaText;
        [SerializeField] private TextMeshProUGUI afinidadeText;
        [SerializeField] private TextMeshProUGUI vitalidadeText;
        [SerializeField] private TextMeshProUGUI maxHPText;
        [SerializeField] private TextMeshProUGUI physDmgText;
        [SerializeField] private TextMeshProUGUI magicDmgText;
        [SerializeField] private TextMeshProUGUI defenseText;

        [Header("LOJA")]
        [SerializeField] private GameObject shopPanel;
        [SerializeField] private Transform shopContentParent;
        [SerializeField] private GameObject shopItemPrefab;

        [Header("FEEDBACK")]
        [SerializeField] private GameObject deathPunishmentPopup;
        [SerializeField] private TextMeshProUGUI punishmentText;
        [SerializeField] private float popupDuration = 4f;

        [Header("HUD ELEMENTS")]
        [SerializeField] private GameObject crosshair;
        [SerializeField] private GameObject minimap;

        // ─── ESTADO ────────────────────────────────────

        private Shop.ShopSystem shopSystem;

        // ─── INICIALIZAÇÃO ──────────────────────────────

        private void Start()
        {
            shopSystem = FindObjectOfType<Shop.ShopSystem>();

            if (attributePanel != null) attributePanel.SetActive(false);
            if (shopPanel != null) shopPanel.SetActive(false);
            if (deathPunishmentPopup != null) deathPunishmentPopup.SetActive(false);
        }

        private void OnEnable()
        {
            GameEvents.OnHealthChanged += UpdateHealthUI;
            GameEvents.OnMaxHealthChanged += UpdateMaxHealthUI;
            GameEvents.OnLevelUp += HandleLevelUp;
            GameEvents.OnXPGained += UpdateXPUI;
            GameEvents.OnCoinsChanged += UpdateCoinsUI;
            GameEvents.OnAttributeChanged += UpdateAttributeUI;
            GameEvents.OnDeathPunishmentApplied += ShowPunishmentPopup;
            GameEvents.OnMapChanged += UpdateMapName;
            GameEvents.OnShopOpened += ShowShop;
            GameEvents.OnShopClosed += HideShop;
        }

        private void OnDisable()
        {
            GameEvents.OnHealthChanged -= UpdateHealthUI;
            GameEvents.OnMaxHealthChanged -= UpdateMaxHealthUI;
            GameEvents.OnLevelUp -= HandleLevelUp;
            GameEvents.OnXPGained -= UpdateXPUI;
            GameEvents.OnCoinsChanged -= UpdateCoinsUI;
            GameEvents.OnAttributeChanged -= UpdateAttributeUI;
            GameEvents.OnDeathPunishmentApplied -= ShowPunishmentPopup;
            GameEvents.OnMapChanged -= UpdateMapName;
            GameEvents.OnShopOpened -= ShowShop;
            GameEvents.OnShopClosed -= HideShop;
        }

        private void Update()
        {
            HandleInput();
        }

        // ═══════════════════════════════════════════════════
        //  INPUT
        // ═══════════════════════════════════════════════════

        private void HandleInput()
        {
            // Tab: Toggle painel de atributos
            if (Input.GetKeyDown(KeyCode.Tab))
                ToggleAttributePanel();

            // L: Toggle loja (só na cidade)
            if (Input.GetKeyDown(KeyCode.L))
            {
                if (shopSystem != null && shopSystem.ShopOpen)
                    shopSystem.CloseShop();
                else
                    shopSystem?.OpenShop();
            }

            // P: Usar poção
            if (Input.GetKeyDown(KeyCode.P))
                statsManager?.UseHealthPotion();

            // Escape: Fechar qualquer painel aberto
            if (Input.GetKeyDown(KeyCode.Escape))
            {
                if (attributePanel != null && attributePanel.activeSelf)
                    ToggleAttributePanel();
                else if (shopSystem != null && shopSystem.ShopOpen)
                    shopSystem.CloseShop();
            }
        }

        // ═══════════════════════════════════════════════════
        //  ATUALIZAÇÕES DE HUD
        // ═══════════════════════════════════════════════════

        private void UpdateHealthUI(int current, int max)
        {
            if (healthBar != null)
            {
                healthBar.maxValue = max;
                healthBar.value = current;
            }

            if (healthText != null)
                healthText.text = $"{current}/{max}";
        }

        private void UpdateMaxHealthUI(int newMax)
        {
            if (healthBar != null)
                healthBar.maxValue = newMax;

            UpdateAttributePanel();
        }

        private void HandleLevelUp(int newLevel)
        {
            if (levelText != null)
                levelText.text = $"Lvl {newLevel}";

            // Efeito visual de level up (flash, particles, etc.)
            Debug.Log($"[UI] ★ Level Up! → Nível {newLevel}");
        }

        private void UpdateXPUI(float xpGained, float newTotal)
        {
            if (statsManager == null) return;

            if (xpBar != null)
            {
                xpBar.maxValue = statsManager.RequiredXP;
                xpBar.value = newTotal;
            }

            if (xpText != null)
                xpText.text = $"{newTotal:F0}/{statsManager.RequiredXP:F0}";
        }

        private void UpdateCoinsUI()
        {
            if (coinsText != null && statsManager != null)
                coinsText.text = $"{statsManager.Coins}";
        }

        private void UpdateMapName(MapID map)
        {
            if (mapNameText != null)
            {
                mapNameText.text = map switch
                {
                    MapID.CidadeCentral => "Cidade Central",
                    MapID.TerrasCinzas => "Terras Cinzas",
                    _ => map.ToString()
                };
            }
        }

        private void UpdateAttributeUI(AttributeType type, int newValue)
        {
            UpdateAttributePanel();
        }

        // ═══════════════════════════════════════════════════
        //  PAINEL DE ATRIBUTOS
        // ═══════════════════════════════════════════════════

        public void ToggleAttributePanel()
        {
            if (attributePanel == null) return;

            bool isOpen = attributePanel.activeSelf;
            attributePanel.SetActive(!isOpen);

            if (!isOpen)
                UpdateAttributePanel();
        }

        private void UpdateAttributePanel()
        {
            if (statsManager == null) return;
            PlayerDataSO data = statsManager.Data;

            if (attrPointsText != null)
                attrPointsText.text = $"{data.attributePoints}";

            if (esgrimaText != null)
                esgrimaText.text = $"{data.esgrima}";

            if (afinidadeText != null)
                afinidadeText.text = $"{data.afinidade}";

            if (vitalidadeText != null)
                vitalidadeText.text = $"{data.vitalidade}";

            if (maxHPText != null)
                maxHPText.text = $"{statsManager.MaxHealth}";

            if (physDmgText != null)
                physDmgText.text = $"{data.TotalPhysicalDamage}";

            if (magicDmgText != null)
                magicDmgText.text = $"{data.TotalMagicalDamage}";

            if (defenseText != null)
                defenseText.text = $"{data.TotalDefense}";
        }

        /// <summary>
        /// Chamado pelos botões de +1 na UI de atributos.
        /// </summary>
        public void OnAttributeButtonClick(AttributeType type)
        {
            statsManager?.AllocateAttribute(type);
        }

        // ═══════════════════════════════════════════════════
        //  LOJA UI
        // ═══════════════════════════════════════════════════

        private void ShowShop()
        {
            if (shopPanel != null)
                shopPanel.SetActive(true);
        }

        private void HideShop()
        {
            if (shopPanel != null)
                shopPanel.SetActive(false);
        }

        // ═══════════════════════════════════════════════════
        //  POPUP DE PUNIÇÃO
        // ═══════════════════════════════════════════════════

        private void ShowPunishmentPopup(string description)
        {
            if (deathPunishmentPopup == null || punishmentText == null) return;

            punishmentText.text = $"☠ PUNIÇÃO DE MORTE\n\n{description}";
            deathPunishmentPopup.SetActive(true);

            CancelInvoke(nameof(HidePunishmentPopup));
            Invoke(nameof(HidePunishmentPopup), popupDuration);
        }

        private void HidePunishmentPopup()
        {
            if (deathPunishmentPopup != null)
                deathPunishmentPopup.SetActive(false);
        }

        // ═══════════════════════════════════════════════════
        //  UTILIDADES
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Refresh completo de todos os elementos da UI.
        /// </summary>
        public void RefreshAllUI()
        {
            if (statsManager == null) return;

            PlayerDataSO data = statsManager.Data;

            UpdateHealthUI(statsManager.CurrentHealth, statsManager.MaxHealth);
            UpdateXPUI(data.currentXP, data.currentXP);
            UpdateCoinsUI();
            HandleLevelUp(data.level);
            UpdateMapName(data.currentMap);
            UpdateAttributePanel();
        }
    }
}
