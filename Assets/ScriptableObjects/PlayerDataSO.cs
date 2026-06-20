using UnityEngine;

namespace RPG.Data
{
    /// <summary>
    /// ScriptableObject que armazena os dados persistentes do jogador.
    /// Criar via: Assets > Create > RPG > Player Data
    /// </summary>
    [CreateAssetMenu(fileName = "NewPlayerData", menuName = "RPG/Player Data")]
    public class PlayerDataSO : ScriptableObject
    {
        [Header("=== LEVEL & XP ===")]
        public int level = 1;
        public float currentXP = 0f;
        public float requiredXP = 100f;
        public float xpMultiplier = 1.5f;
        public int attributePoints = 0;

        [Header("=== MOEDAS ===")]
        public int coins = 0;

        [Header("=== ATRIBUTOS BASE ===")]
        public int esgrima = 1;     // Escala dano físico
        public int afinidade = 0;    // Escala dano mágico (começa em 0)
        public int vitalidade = 1;   // Multiplicador de Vida Máxima

        [Header("=== STATUS DERIVADOS ===")]
        public int baseHealth = 100;
        public float healthMultiplierPerVitalidade = 0.15f; // +15% por ponto

        [Header("=== EQUIPAMENTO ===")]
        public int flatDefense = 0;      // Soma de todas as armaduras equipadas
        public int flatPhysicalDamage = 0; // Soma de todas as espadas equipadas
        public ElementalType equippedSpell = ElementalType.None;

        [Header("=== INVENTÁRIO ===")]
        public int healthPotions = 0;
        public int potionHealAmount = 30;

        [Header("=== MAPA ATUAL ===")]
        public MapID currentMap = MapID.CidadeCentral;

        // ─── COMPUTED PROPERTIES ────────────────────────

        /// <summary>
        /// Calcula a Vida Máxima baseado no Vitalidade.
        /// Chamar sempre que Vitalidade for alterado.
        /// Fórmula: BaseHealth * (1 + Vitalidade * HealthMultiplier)
        /// </summary>
        public int MaxHealth => Mathf.RoundToInt(baseHealth * (1f + vitalidade * healthMultiplierPerVitalidade));

        /// <summary>
        /// XP necessário para o próximo nível.
        /// Fórmula: requiredXP * xpMultiplier ao subir de nível.
        /// </summary>
        public float XPForNextLevel => requiredXP;

        /// <summary>
        /// Calcula o dano físico total: Base do atributo Esgrima + bônus de espadas.
        /// </summary>
        public int TotalPhysicalDamage => esgrima + flatPhysicalDamage;

        /// <summary>
        /// Calcula o dano mágico baseado na Afinidade.
        /// Retorna 0 se Afinidade for 0.
        /// </summary>
        public int TotalMagicalDamage => afinidade;

        /// <summary>
        /// Defesa total do jogador.
        /// </summary>
        public int TotalDefense => flatDefense;

        /// <summary>
        /// Percentual de redução de dano pela defesa.
        /// Fórmula: defense / (defense + 100) → assintota em 100%
        /// </summary>
        public float DamageReduction => (float)TotalDefense / (TotalDefense + 100f);

        // ─── PERSISTÊNCIA (JSON SIMPLES) ────────────────

        [System.Serializable]
        public class SaveData
        {
            public int level;
            public float currentXP;
            public float requiredXP;
            public int attributePoints;
            public int coins;
            public int esgrima;
            public int afinidade;
            public int vitalidade;
            public int flatDefense;
            public int flatPhysicalDamage;
            public int equippedSpell;
            public int healthPotions;
            public MapID currentMap;
        }

        public SaveData ToSaveData()
        {
            return new SaveData
            {
                level = level,
                currentXP = currentXP,
                requiredXP = (int)requiredXP,
                attributePoints = attributePoints,
                coins = coins,
                esgrima = esgrima,
                afinidade = afinidade,
                vitalidade = vitalidade,
                flatDefense = flatDefense,
                flatPhysicalDamage = flatPhysicalDamage,
                equippedSpell = (int)equippedSpell,
                healthPotions = healthPotions,
                currentMap = currentMap
            };
        }

        public void LoadFromSaveData(SaveData data)
        {
            level = data.level;
            currentXP = data.currentXP;
            requiredXP = data.requiredXP;
            attributePoints = data.attributePoints;
            coins = data.coins;
            esgrima = data.esgrima;
            afinidade = data.afinidade;
            vitalidade = data.vitalidade;
            flatDefense = data.flatDefense;
            flatPhysicalDamage = data.flatPhysicalDamage;
            equippedSpell = (ElementalType)data.equippedSpell;
            healthPotions = data.healthPotions;
            currentMap = data.currentMap;
        }

        public void ResetToDefaults()
        {
            level = 1;
            currentXP = 0f;
            requiredXP = 100f;
            attributePoints = 0;
            coins = 0;
            esgrima = 1;
            afinidade = 0;
            vitalidade = 1;
            flatDefense = 0;
            flatPhysicalDamage = 0;
            equippedSpell = ElementalType.None;
            healthPotions = 0;
            currentMap = MapID.CidadeCentral;
        }

        // ─── SAVE/LOAD TO DISK ──────────────────────────

        private const string SAVE_KEY = "RPG_PlayerData";

        public void SaveToDisk()
        {
            string json = JsonUtility.ToJson(ToSaveData(), true);
            PlayerPrefs.SetString(SAVE_KEY, json);
            PlayerPrefs.Save();
        }

        public bool LoadFromDisk()
        {
            if (!PlayerPrefs.HasKey(SAVE_KEY)) return false;
            string json = PlayerPrefs.GetString(SAVE_KEY);
            SaveData data = JsonUtility.FromJson<SaveData>(json);
            LoadFromSaveData(data);
            return true;
        }

        public void DeleteSave()
        {
            PlayerPrefs.DeleteKey(SAVE_KEY);
        }
    }
}
