namespace RPG.Core
{
    public enum AttributeType
    {
        Esgrima,    // Escala dano físico
        Afinidade,  // Escala dano mágico (começa em 0)
        Vitalidade  // Multiplicador de Vida Máxima
    }

    public enum DamageType
    {
        Physical,
        Magical_Fire,
        Magical_Water,
        Magical_Earth,
        Magical_Air
    }

    public enum ItemType
    {
        Consumable_Potion,
        Armor,
        Sword,
        Spell_Fire,
        Spell_Water,
        Spell_Earth,
        Spell_Air
    }

    public enum MapID
    {
        CidadeCentral,
        TerrasCinzas
    }

    public enum GameState
    {
        Playing,
        Paused,
        InShop,
        InDialogue,
        GameOver
    }

    public enum ElementalType
    {
        None,
        Fire,
        Water,
        Earth,
        Air
    }
}
