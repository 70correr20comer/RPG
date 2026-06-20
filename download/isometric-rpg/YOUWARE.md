# RPG de Ação 3D Isométrico — Guia de Desenvolvimento

## Motor do Projeto
- **Engine**: Unity
- **Linguagem**: C#
- **Perspectiva**: Isométrica fixa (45°)

## Estrutura de Pastas

```
Assets/
├── Scripts/
│   ├── Core/                  # Enums e eventos globais
│   │   ├── GameEnums.cs       # Todos os enums do jogo
│   │   └── GameEvents.cs      # Central de eventos (Observer pattern)
│   ├── Player/                # Sistemas do jogador
│   │   ├── PlayerStatsManager.cs    # ★ Gerenciador central de estado
│   │   ├── DeathPunishmentSystem.cs # ★ Punição de morte
│   │   └── IsometricController.cs   # Movimentação isométrica
│   ├── Combat/                # Sistema de combate
│   │   └── CombatSystem.cs    # Cálculo de dano físico/mágico
│   ├── Enemy/                 # Inimigos
│   │   ├── EnemyBase.cs       # Base class para inimigos
│   │   └── EnemySpawner.cs    # Gerador nas lápides
│   ├── Map/                   # Gerenciamento de mapas
│   │   ├── MapManager.cs      # Transição entre mapas
│   │   └── PortalZone.cs      # Trigger de portal
│   ├── Camera/                # Câmera isométrica
│   │   └── IsometricCamera.cs # Câmera ortográfica que segue
│   ├── Shop/                  # Loja
│   │   └── ShopSystem.cs      # Loja da Cidade Central
│   ├── UI/                    # Interface
│   │   └── GameUIManager.cs   # HUD, atributos, loja, feedback
│   └── Events/                # Extensões de eventos
├── ScriptableObjects/
│   └── PlayerDataSO.cs        # ScriptableObject de dados do jogador
└── Scenes/
    └── (CidadeCentral, TerrasCinzas)
```

## Arquitetura de Sistemas

### 1. PlayerStatsManager (Pilar Central)
- **Dados persistentes**: PlayerDataSO (ScriptableObject)
- **Atributos**: Esgrima, Afinidade (começa em 0), Vitalidade
- **XP/Level**: XP sobe → Level up → cura total + 3 pontos de atributo
- **XP necessário**: ×1.5 a cada level up
- **Vida Máxima**: 100 * (1 + Vitalidade * 0.15)
- **Defesa**: Redução = Def / (Def + 100) → assintota
- **Save/Load**: PlayerPrefs com JSON

### 2. DeathPunishmentSystem
- **Trigger**: Quando morre nas TerrasCinzas
- **Nível 2+**: -1 Level, XP = 0, XP necessário ÷ 1.5
- **Nível 1**: -50% Moedas
- **Pós-punição**: Teleporta para CidadeCentral, cura total
- **Preview**: `PreviewPunishment()` para UI

### 3. Event-Driven Architecture
- GameEvents: Central de eventos C# (Action delegates)
- Todo sistema comunica via eventos (desacoplado total)
- UI, Mapas, Combate, Loja — todos se conectam via eventos

### 4. IsometricController
- Input WASD/Setas → conversão para eixo isométrico (45°)
- CharacterController para colisão
- Sprint com Shift
- TeleportTo() para portais

### 5. MapManager + PortalZone
- Dois mapas: CidadeCentral (lobby seguro) e TerrasCinzas (caça)
- Transição via colisão com PortalZone
- Fade in/out, reposicionamento do jogador

### 6. ShopSystem
- Acessível por tecla L na CidadeCentral
- Poções (25 moedas), Armaduras (100-2000), Espadas (80-1600), Feitiços (300)
- Requer Afinidade > 0 para feitiços

### 7. CombatSystem
- Dano Físico: (Esgrima + Espada) × Variance(±10%)
- Dano Mágico: Afinidade × 2.5 × 1.2^(AF/5) × Variance
- Inimigos: EnemyBase (herdável) com Chase, Attack, Idle

## Convenções de Código
- Namespace: `RPG.{Modulo}` (RPG.Player, RPG.Core, etc.)
- ScriptableObjects: `*SO.cs` ou `*DataSO.cs`
- Eventos: Via `GameEvents` estático
- Cores no Inspector: tooltips detalhados
- ContextMenu para debug em todos os managers
