using UnityEngine;
using System.Collections.Generic;
using RPG.Core;
using RPG.Data;
using RPG.Player;

namespace RPG.Shop
{
    /// <summary>
    /// SISTEMA DE LOJA (CIDADE CENTRAL)
    /// ─────────────────────────────────
    /// Loja acessada por interface de texto/menu no lobby seguro.
    /// Itens disponíveis:
    ///   • Poções de Cura — consumíveis estocáveis
    ///   • Armaduras — aumentam defesa fixa
    ///   • Espadas — aumentam dano base da Esgrima
    ///   • Feitiços Elementais — Fogo, Água, Terra, Ar (dependem da Afinidade)
    ///
    /// Uso: Criar GameObject "ShopManager" na cena CidadeCentral.
    /// </summary>
    public class ShopSystem : MonoBehaviour
    {
        [Header("REFERÊNCIAS")]
        [SerializeField] private PlayerStatsManager statsManager;

        [Header("PREÇOS")]
        [SerializeField] private int healthPotionPrice = 25;
        [SerializeField] private int[] armorPrices = { 100, 250, 500, 1000, 2000 };
        [SerializeField] private int[] swordPrices = { 80, 200, 400, 800, 1600 };
        [SerializeField] private int spellPrice = 300;

        // ─── ESTADO ────────────────────────────────────

        private bool shopOpen = false;
        public bool ShopOpen => shopOpen;

        // ─── INICIALIZAÇÃO ──────────────────────────────

        private void OnEnable()
        {
            GameEvents.OnShopOpened += OpenShop;
            GameEvents.OnShopClosed += CloseShop;
        }

        private void OnDisable()
        {
            GameEvents.OnShopOpened -= OpenShop;
            GameEvents.OnShopClosed -= CloseShop;
        }

        // ═══════════════════════════════════════════════════
        //  CONTROLE DA LOJA
        // ═══════════════════════════════════════════════════

        public void OpenShop()
        {
            if (statsManager.CurrentMap != MapID.CidadeCentral)
            {
                Debug.LogWarning("[Shop] Loja só disponível na CidadeCentral!");
                return;
            }

            shopOpen = true;
            Debug.Log("[Shop] Loja aberta!");
            GameEvents.TriggerShopOpened();
        }

        public void CloseShop()
        {
            shopOpen = false;
            Debug.Log("[Shop] Loja fechada.");
            GameEvents.TriggerShopClosed();
        }

        // ═══════════════════════════════════════════════════
        //  COMPRA DE ITENS
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Compra uma Poção de Cura.
        /// </summary>
        public bool BuyHealthPotion()
        {
            if (!statsManager.HasEnoughCoins(healthPotionPrice))
            {
                Debug.LogWarning($"[Shop] Moedas insuficientes! Necessário: {healthPotionPrice}");
                GameEvents.TriggerItemPurchased(ItemType.Consumable_Potion, false);
                return false;
            }

            statsManager.SpendCoins(healthPotionPrice);
            statsManager.AddPotions(1);

            Debug.Log($"[Shop] ✓ Poção de Cura comprada! (-{healthPotionPrice} moedas)");
            GameEvents.TriggerItemPurchased(ItemType.Consumable_Potion, true);
            return true;
        }

        /// <summary>
        /// Compra uma armadura de nível especificado.
        /// Cada nível de armadura adiciona defesa fixa crescente.
        /// </summary>
        public bool BuyArmor(int tier)
        {
            if (tier < 0 || tier >= armorPrices.Length)
            {
                Debug.LogError($"[Shop] Tier de armadura inválido: {tier}");
                return false;
            }

            int price = armorPrices[tier];
            int defenseBonus = (tier + 1) * 5; // 5, 10, 15, 20, 25 de defesa

            if (!statsManager.HasEnoughCoins(price))
            {
                Debug.LogWarning($"[Shop] Moedas insuficientes! Necessário: {price}");
                GameEvents.TriggerItemPurchased(ItemType.Armor, false);
                return false;
            }

            statsManager.SpendCoins(price);
            statsManager.Data.flatDefense += defenseBonus;
            statsManager.Data.SaveToDisk();

            Debug.Log($"[Shop] ✓ Armadura Tier {tier + 1} comprada! (+{defenseBonus} defesa, -{price} moedas)");
            GameEvents.TriggerItemPurchased(ItemType.Armor, true);
            return true;
        }

        /// <summary>
        /// Compra uma espada de nível especificado.
        /// Cada nível adiciona dano base crescente.
        /// </summary>
        public bool BuySword(int tier)
        {
            if (tier < 0 || tier >= swordPrices.Length)
            {
                Debug.LogError($"[Shop] Tier de espada inválido: {tier}");
                return false;
            }

            int price = swordPrices[tier];
            int damageBonus = (tier + 1) * 3; // 3, 6, 9, 12, 15 de dano

            if (!statsManager.HasEnoughCoins(price))
            {
                Debug.LogWarning($"[Shop] Moedas insuficientes! Necessário: {price}");
                GameEvents.TriggerItemPurchased(ItemType.Sword, false);
                return false;
            }

            statsManager.SpendCoins(price);
            statsManager.Data.flatPhysicalDamage += damageBonus;
            statsManager.Data.SaveToDisk();

            Debug.Log($"[Shop] ✓ Espada Tier {tier + 1} comprada! (+{damageBonus} dano, -{price} moedas)");
            GameEvents.TriggerItemPurchased(ItemType.Sword, true);
            return true;
        }

        /// <summary>
        /// Compra um feitiço elemental.
        /// Requer que o jogador tenha Afinidade > 0.
        /// </summary>
        public bool BuySpell(ElementalType element)
        {
            if (statsManager.Data.afinidade <= 0)
            {
                Debug.LogWarning("[Shop] Afinidade precisa ser > 0 para usar feitiços!");
                GameEvents.TriggerItemPurchased(GetSpellItemType(element), false);
                return false;
            }

            if (!statsManager.HasEnoughCoins(spellPrice))
            {
                Debug.LogWarning($"[Shop] Moedas insuficientes! Necessário: {spellPrice}");
                GameEvents.TriggerItemPurchased(GetSpellItemType(element), false);
                return false;
            }

            statsManager.SpendCoins(spellPrice);
            statsManager.Data.equippedSpell = element;
            statsManager.Data.SaveToDisk();

            Debug.Log($"[Shop] ✓ Feitiço de {element} comprado! (-{spellPrice} moedas)");
            GameEvents.TriggerItemPurchased(GetSpellItemType(element), true);
            return true;
        }

        // ═══════════════════════════════════════════════════
        //  CATÁLOGO DA LOJA
        // ═══════════════════════════════════════════════════

        /// <summary>
        /// Retorna a lista de itens disponíveis com preços e descrições.
        /// Útil para popular a UI da loja.
        /// </summary>
        public List<ShopItem> GetCatalog()
        {
            var catalog = new List<ShopItem>();

            // Poção
            catalog.Add(new ShopItem
            {
                name = "Poção de Cura",
                description = $"Restaura {statsManager.Data.potionHealAmount} HP",
                price = healthPotionPrice,
                type = ItemType.Consumable_Potion,
                canAfford = statsManager.HasEnoughCoins(healthPotionPrice)
            });

            // Armaduras
            string[] armorNames = { "Armadura de Couro", "Armadura de Malha", "Armadura de Placas",
                                     "Armadura de Aço", "Armadura Encantada" };
            for (int i = 0; i < armorPrices.Length; i++)
            {
                int def = (i + 1) * 5;
                catalog.Add(new ShopItem
                {
                    name = armorNames[i],
                    description = $"+{def} Defesa",
                    price = armorPrices[i],
                    type = ItemType.Armor,
                    canAfford = statsManager.HasEnoughCoins(armorPrices[i])
                });
            }

            // Espadas
            string[] swordNames = { "Adaga Afiada", "Espada Curta", "Espada Longa",
                                     "Claymore", "Excalibur" };
            for (int i = 0; i < swordPrices.Length; i++)
            {
                int dmg = (i + 1) * 3;
                catalog.Add(new ShopItem
                {
                    name = swordNames[i],
                    description = $"+{dmg} Dano Físico",
                    price = swordPrices[i],
                    type = ItemType.Sword,
                    canAfford = statsManager.HasEnoughCoins(swordPrices[i])
                });
            }

            // Feitiços
            string[] spellNames = { "Bola de Fogo", "Gelo Eterno", "Terremoto", "Tornado" };
            ElementalType[] elements = { ElementalType.Fire, ElementalType.Water,
                                          ElementalType.Earth, ElementalType.Air };
            for (int i = 0; i < elements.Length; i++)
            {
                catalog.Add(new ShopItem
                {
                    name = spellNames[i],
                    description = $"Dano mágico baseado na Afinidade",
                    price = spellPrice,
                    type = GetSpellItemType(elements[i]),
                    canAfford = statsManager.HasEnoughCoins(spellPrice)
                });
            }

            return catalog;
        }

        private ItemType GetSpellItemType(ElementalType element) => element switch
        {
            ElementalType.Fire => ItemType.Spell_Fire,
            ElementalType.Water => ItemType.Spell_Water,
            ElementalType.Earth => ItemType.Spell_Earth,
            ElementalType.Air => ItemType.Spell_Air,
            _ => ItemType.Spell_Fire
        };
    }

    /// <summary>
    /// DTO para item da loja.
    /// </summary>
    [System.Serializable]
    public class ShopItem
    {
        public string name;
        public string description;
        public int price;
        public ItemType type;
        public bool canAfford;
    }
}
