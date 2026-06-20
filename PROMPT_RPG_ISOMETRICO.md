# PROMPT COMPLETO — RPG de Ação 3D Isométrico: Terras Cinzas

Use este prompt em qualquer IA de código (Cursor, Claude, GPT, etc.) para recriar o jogo **inteiro** do zero.

---

## VISÃO GERAL

Crie um **RPG de ação isométrico** 2D/Canvas jogado num navegador web, com a estética de um jogo retro-isométrico. O jogo roda em um `<canvas>` HTML5 com renderização procedural (sem assets de imagem — tudo desenhado via código via Canvas 2D API). O jogo é inteiramente **em português do Brasil**.

**Stack tecnológica:**
- React 18 + TypeScript
- Vite como bundler
- Tailwind CSS para a UI overlay
- Zustand para gerenciamento de estado global
- Canvas 2D API para renderizar o mundo isométrico
- Framer Motion para animações de UI (popups, painéis)
- Lucide React para ícones

---

## MAPAS DO JOGO

O jogo possui **5 mapas** interconectados via portais:

### 1. Cidade Central (Mapa Inicial / Lobby Seguro)
- Tamanho: 20×20 tiles
- Cor de fundo: `#1a1f2e`, cor do grid: `#2a3040`, cor dos tiles: `#2d3548`
- **NPCs:**
  - **Mercador** (posição tile 10,8) — abre loja ao interagir
  - **Ancião Sábio** (posição tile 5,12) — dá missões
- **Portais:**
  - Saída para **Terras Cinzas** (tile 18,10, tamanho 2×4) — sempre aberto
  - Saída para **Nova Cidade** (tile 10,18, tamanho 2×4) — bloqueado até completar **todas as 3** missões do Ancião Sábio
- Sem inimigos, sem lápides. Zona segura.

### 2. Terras Cinzas (Mapa de Combate Inicial)
- Tamanho: 24×24 tiles
- Cor de fundo: `#1a1515`, cor do grid: `#2a2525`, cor dos tiles: `#2a2228`
- **10 Lápides** que geram inimigos (Slime, Esqueleto, Zumbi, Fantasma):
  - Tile (5,5): Slime
  - Tile (10,3): Esqueleto
  - Tile (15,7): Zumbi
  - Tile (8,12): Fantasma
  - Tile (18,5): Esqueleto
  - Tile (12,15): Slime
  - Tile (20,12): Zumbi
  - Tile (6,18): Fantasma
  - Tile (16,18): Esqueleto
  - Tile (22,20): Zumbi
- **Portal de volta:** tile (1,10) → Cidade Central
- Respawn de inimigos a cada 8 segundos

### 3. Nova Cidade (Mapa Avançado)
- Tamanho: 26×26 tiles
- Cor de fundo: `#0f1520`, cor do grid: `#1a2535`, cor dos tiles: `#151e2d`
- **NPCs:**
  - **Mercador Sombrio** (tile 13,4) — loja com itens avançados
  - **Sentinela do Abismo** (tile 13,13) — dá missões avançadas
- **Portais:**
  - Volta para Cidade Central (tile 1,13)
  - Para **Terras Cinza Escuro** (tile 24,2) — requer missão "Prova de Força" completa
  - Para **Arena do Boss** (tile 24,22, tamanho 3×6, variante "dragon" vermelho) — requer missão "O Desafio Final" completa

### 4. Terras Cinza Escuro (Mapa Hard)
- Tamanho: 30×30 tiles
- Cor de fundo: `#0d0d12`, cor do grid: `#1a1a22`, cor dos tiles: `#16161e`
- **12 Lápides** com inimigos mais fortes (Escalador 1.8×):
  - Tipos: skeleton, ghost, zombie em posições espalhadas
- Inimigos: Esqueleto Sombrio, Espectro, Zumbi (variantes fortes)
- Tempo de respawn: 6.4 segundos (80% do normal)
- Portal de volta: tile (1,15) → Nova Cidade

### 5. Arena do Boss (Mapa Final)
- Tamanho: 20×20 tiles
- Cor de fundo: `#0a0508`, cor do grid: `#1a0f14`, cor dos tiles: `#120a0e`
- Sem lápides, sem NPCs
- **Boss: Guardião das Trevas** (spawn automático ao entrar)
- Portal de volta: tile (1,10) → Terras Cinza Escuro

---

## CONVERSÃO ISOMÉTRICA

O mundo usa coordenadas isométricas 2D:
- **Tamanho de tile:** Largura=64px, Altura=32px
- **Conversão tile→tela:**
  - `sx = (tileX - tileY) * (TILE_W / 2)`
  - `sy = (tileX + tileY) * (TILE_H / 2)`
- **Conversão tela→tile (inversa)** disponível para input
- Grid desenhado como diamantes (losangos)

---

## JOGADOR

### Atributos Iniciais
- **Nível:** 1
- **XP atual:** 0 | **XP necessário:** 100
- **Moedas:** 50
- **Esgrima:** 1 (dano físico)
- **Afinidade:** 0 (dano mágico — começa em ZERO)
- **Vitalidade:** 1 ( vida máxima )
- **Poções:** 2
- **Defesa:** 0 | **Dano extra:** 0
- **Posição inicial:** tile (5, 10) na Cidade Central

### Fórmulas
- **Vida Máxima** = 100 × (1 + Vitalidade × 0.15)
- **Dano Físico** = Esgrima + Dano Extra da Espada
- **Dano Mágico** = Afinidade (quando feitiço equipado)
- **Defesa** = Redução = Def / (Def + 100) → curva assintótica (nunca chega a 100%)
- **XP necessário por level** = 100 × 1.5^(level-1)
- **Pontos de atributo por level up:** 3
- **Level up cura vida total**

### Level Up
- XP excede o necessário → subtrai, ganha +1 level, ganha 3 pontos de atributo
- XP necessário aumenta em ×1.5
- Vida cura 100%

### Sistema de Morte (DeathPunishment)
- **Nível 2+:** -1 Level, XP resetado para 0, XP necessário ÷ 1.5, teleporta para Cidade Central, cura total
- **Nível 1:** -50% Moedas, teleporta para Cidade Central, cura total
- **Exceção:** Não morre na Cidade Central (impossível)

---

## CONTROLES

- **WASD ou Setas:** Movimento isométrico
- **Espaço ou Clique:** Ataque corpo a corpo
- **Q:** Usar poção de cura
- **E:** Ativar Escudo Sombrio (segurar Shift quando tiver o escudo)
- **L:** Abrir Loja (só na Cidade Central)
- **I:** Abrir Painel de Atributos
- **M:** Abrir Log de Missões
- **Shift (segurar):** Ativar Escudo Sombrio

---

## MOVIMENTO

- Conversão de input WASD para eixo isométrico (45°)
- Velocidade: 3.5 tiles/segundo
- Colisão com bordas do mapa (clamp)
- Colisão com inimigos (para de andar ao tocar)
- Colisão com portais (teleporta automaticamente)

---

## COMBATE

### Ataque Corpo a Corpo
- Alcance: 2.5 tiles
- Cooldown: 0.4 segundos
- Dano: Esgrima + Dano Extra × Variância (±15%)
- **Com Espada da Fúria (AOE):** atinge TODOS os inimigos num raio de 4.5 tiles
- Sem AOE: atinge apenas o inimigo mais próximo no alcance

### Feitiços (Ranged)
- Atiram projéteis na direção do inimigo mais próximo
- Velocidade do projétil: 8 tiles/seg
- Dano: max(3, Afinidade × 2.5) × multiplicador de tier
  - Tier 1: ×1.0 (single target)
  - Tier 2: ×1.5 (área pequena, raio 2.5)
  - Tier 3: ×2.0 (área média, raio 4.0)
- Feitiços têm cooldown ligeiramente maior que ataque físico
- Cada elemento tem visual diferente (Fogo=vermelho, Gelo=azul, Terra=marrom, Ar=branco)

### Elementos dos Feitiços
- **Fogo** (Faísca tier1 → Bola de Fogo tier2 → Meteoro tier3)
- **Gelo** (Pingente tier1 → Lâmina de Gelo tier2 → Gelo Eterno tier3)
- **Terra** (Pedra tier1 → Fissura tier2 → Terremoto tier3)
- **Ar** (Brisa tier1 → Vendaval tier2 → Tornado tier3)

### Escudo Sombrio
- Comprado na Loja Sombria por 1500 moedas
- Segurar Shift para ativar
- Bloqueia 1 ataque
- Cooldown de 8 segundos após uso
- Indicador visual no HUD

---

## INIMIGOS

### Tipos (Terras Cinzas)
| Tipo | Nome | HP | ATK | XP | Moedas | Velocidade |
|------|------|-----|------|------|---------|------------|
| slime | Slime | 30 | 5 | 15 | 8 | 1.2 |
| skeleton | Esqueleto | 50 | 10 | 25 | 12 | 1.8 |
| zombie | Zumbi | 70 | 15 | 35 | 18 | 1.0 |
| ghost | Fantasma | 40 | 20 | 45 | 25 | 2.5 |

### Tipos Fortes (Terras Cinza Escuro) — Escala 1.8×
| Tipo | Nome | HP | ATK | XP | Moedas | Velocidade |
|------|------|------|------|------|---------|------------|
| skeleton | Esqueleto Sombrio | 180 | 40 | 120 | 60 | 2.2 |
| ghost | Espectro | 150 | 55 | 150 | 80 | 3.0 |
| zombie | Zumbi Negro | 120 | 25 | 80 | 40 | 1.5 |

### Comportamento de IA
- **Idle:** Quando jogador fora do alcance (6 tiles)
- **Chase:** Quando jogador entra no alcance → segue o jogador
- **Attack:** Quando está a 1.8 tiles → ataca com cooldown de 1.2s
- Inimigos são desenhados como **losangos coloridos** com barra de vida
- **Flash branco** ao tomar dano
- Desaparecem ao morrer (filtrados do array)
- Escalam com o nível do jogador: HP/ATK/XP/Moedas × (1 + (level-1) × 0.15)

### Lápides (Spawners)
- Desenhadas como pequenos retângulos cinza escuros
- Geram inimigos quando nenhuma unidade viva está perto (raio 3 tiles)
- Respawn time definido por lápide

---

## BOSS — Guardião das Trevas

### Stats
- HP: Vida Máxima do Jogador × 10
- ATK: (Esgrima + Dano Extra) × 10
- XP: 5000 | Moedas: 2000
- Velocidade: 0.6 (lento)
- Posição inicial: tile (15, 15)

### Fases (baseado no HP restante)
- **Fase 1** (100%-60%): Normal, meteoros a cada 4 segundos
- **Fase 2** (60%-30%): Meteores a cada 2.67 segundos (×1.5 mais rápido)
- **Fase 3** (30%-0%): Meteores a cada 2 segundos (×2 mais rápido) — "FÚRIA"

### Ataque de Meteoro
- Avisa 2 segundos antes (círculo de aviso no chão)
- Dano: ATK do Boss × 2.5
- Raio de impacto: 3 tiles
- Dano escala com a defesa do jogador

### Visual do Boss
- Losango grande **vermelho escuro** (#dc2626)
- Barra de HP massive no topo da tela (gradiente roxo→vermelho)
- Indicador de fase ("Fase 1/2/3")
- Aura pulsante

### Derrota do Boss
- Parabéns! +5000 XP, +2000 moedas
- Missão "O Desafio Final" completada
- Mensagem de vitória

---

## LOJAS

### Loja do Mercador (Cidade Central) — Pressione L
**Categorias e Itens:**

**Presente Grátis:**
- Espada da Fúria (grátis) — Ataque em área (AOE)

**Consumíveis:**
- Poção de Cura (25 moedas) — +30 HP
- Poção Grande (50 moedas) — +50 HP

**Armaduras:**
- Armadura de Couro (100) — +5 Defesa
- Armadura de Malha (250) — +10 Defesa
- Armadura de Placas (500) — +15 Defesa

**Espadas:**
- Adaga Afiada (80) — +3 Dano
- Espada Longa (200) — +6 Dano
- Claymore (800) — +12 Dano

**Feitiços (requer Afinidade > 0 para funcionar):**
- Faísca / Pingente / Pedra / Brisa (300 cada) — Tier 1
- Bola de Fogo / Lâmina de Gelo / Fissura / Vendaval (600 cada) — Tier 2

### Loja Sombria (Nova Cidade, Mercador Sombrio)
**Feitiços Avançados:**
- Meteoro / Gelo Eterno / Terremoto / Tornado (1200 cada) — Tier 3

**Equipamento Sombrio:**
- Armadura de Obsidiana (2000) — +25 Defesa
- Lâmina Sombria (2000) — +20 Dano
- Escudo Sombrio (1500) — Bloqueia 1 ataque

**Consumíveis:**
- Poção Superior (80) — +60 HP
- Poção Suprema (150) — +90 HP

### Auto-Equip de Armaduras
- Ao comprar armadura, ela vai para o inventário
- Top 4 armaduras com mais defesa são equipadas automaticamente
- Defesa total = soma das 4 equipadas

### Visual da Loja
- Painel modal escuro com blur
- Itens organizados por categoria
- Preço em amarelo, botão de compra
- Botão X para fechar
- Moedas do jogador visíveis no header

---

## SISTEMA DE ATRIBUTOS (Pressione I)

3 atributos para distribuir:
- **Esgrima** 🗡 — Escala dano físico
- **Afinidade** ✨ — Escala dano mágico (começa em 0)
- **Vitalidade** ❤ — +15% Vida Máxima por ponto

- Pontos disponíveis mostrados em destaque
- Cada botão "+" aloca 1 ponto
- Visual: painel escuro com cards coloridos por atributo
- Vitalidade imediatamente recalcula HP máximo (e cura a diferença)

---

## SISTEMA DE MISSÕES

### Missões do Ancião Sábio (Cidade Central)
1. **Proteção das Terras** — Elimine 13 inimigos nas Terras Cinzas → 150 moedas, 300 XP
2. **Destruição em Massa** — Derrote 3 monstros com um único ataque → 200 moedas, 400 XP
3. **Despertar Mágico** — Aloque pelo menos 1 ponto em Afinidade → 100 moedas, 250 XP

**Recompensa por completar as 3:** Desbloqueia portal para Nova Cidade

### Missões da Sentinela do Abismo (Nova Cidade)
4. **Prova de Força** — Elimine 67 inimigos na Nova Cidade → 300 moedas, 500 XP
5. **O Desafio Final** — Derrote o Guardião das Trevas → 5000 moedas, 10000 XP

**Recompensas de desbloqueio:**
- "Prova de Força" completa → Portal para Terras Cinza Escuro
- "O Desafio Final" completa → Portal para Arena do Boss

### Multi-Kill Quest
- A missão "Destruição em Massa" requer matar 3 inimigos em 2 segundos
- Contador de kills recentes (janela de 2s)
- AOE e feitiços contam para multi-kill

### Quest Tracker no HUD
- Mostra missões ativas com progresso (ex: "7/13 inimigos")

---

## RENDERIZAÇÃO (Canvas 2D)

### Grid Isométrico
- Cada tile é um **losango** (diamond)
- Cores variam levemente com noise baseado na posição
- Bordas do mapa são mais escuras
- Linhas de separação sutis (rgba branco 3% alpha)

### Portais
- Losango animado com **dois anéis girando** (sentidos opostos)
- Aura radial pulsante
- Portais bloqueados são cinza
- Portal do boss (variante "dragon") é **vermelho e 1.6× maior**
- Portal tem 2 anéis: um maior externo e um menor interno

### Lápides
- Retângulo cinza escuro (#4b5563) com borda mais escura
- Desenhadas em perspectiva isométrica

### NPCs
- **Mercador:** Losango amarelo com aura dourada pulsante + ícone de sacola
- **Quest Givers:** Losango ciano com aura ciano pulsante + ícone "!"
- **Boss Quest Giver:** Losango laranja com aura laranja + ícone "!!"

### Jogador
- Losango roxo (#6366f1) com borda roxo claro
- Brilho amarelo quando atacando
- Pernas animadas quando se move (offset oscilante)
- Orientação visual baseada na direção facing
- Escudo Sombrio: escudo visual quando ativo
- Armadura visual: anéis coloridos ao redor baseado no tier (marrom, cinza, azul aço, roxo obsidiana)

### Inimigos
- Losangos coloridos por tipo
- Barra de HP acima (vermelha)
- Flash branco ao tomar dano
- Boss: Losango grande vermelho (#dc2626) com aura pulsante vermelha

### Projéteis de Feitiço
- Esfera colorida por elemento
- Rastro (trail) de partículas ao longo do caminho
- Explosão ao atingir alvo (para AOE)
- Feitiço de Fogo: esfera vermelha-laranja
- Feitiço de Gelo: esfera azul-ciano
- Feitiço de Terra: esfera marrom-dourada
- Feitiço de Ar: esfera branca-prateada

### Meteores (Boss)
- Fase "warning": Círculo vermelho pulsante no chão
- Fase "falling": Meteoro caindo com rastro
- Fase "impact": Explosão de partículas laranja/vermelha

### Sistema de Partículas
- **Dust:** Ao andar (cinza leve, subindo)
- **Spark:** Ao atacar (amarelo, explosão radial)
- **Hit:** Ao acertar inimigo (vermelho)
- **Level Up:** Estrelas douradas subindo
- **Meteor:** Laranja/vermelho caindo
- **Explosion:** Expansão radial colorida

### Screen Shake
- Tremor de tela ao atacar
- Intensidade e duração configuráveis

### Barras de Vida e XP no HUD
- HP: Barra vermelha com gradiente
- XP: Barra roxa com gradiente
- Fundo escuro com bordas arredondadas

### Minimap
- Canto inferior direito
- Mostra mapa reduzido com pontos para jogador (roxo), inimigos (vermelho), portais (roxo)

### Números de Dano
- Float up com fade-out
- Cor: vermelho para inimigos, amarelo para player
- Fonte maior para críticos

---

## TELA INICIAL (Title Screen)

- Fundo gradiente escuro (slate-950 → indigo-950)
- Partículas flutuantes animadas (30 pontos indigo)
- Título: "ISOMETRIC RPG" com gradiente (indigo → purple → amber)
- Subtítulo: "Terras Cinzas"
- Ícone: ⚔️
- Features: Combate 🗡 / Atributos 🛡 / Feitiços ✨ / Mapas 🗺
- Botões: "Novo Jogo" / "Continuar" (se save existe) / "Excluir Save"
- Animação de entrada com spring e fade

---

## HUD (Heads-Up Display)

- **Canto superior esquerdo:** Painel com nível, HP bar, XP bar, moedas, poções (atalho Q)
- **Centro superior:** Barra de HP do Boss (quando ativo) — full width
- **Canto superior direito:** Botões de loja (L), atributos (I), controles
- **Centro inferior:** Log de missões ativas com progresso
- **Canto inferior direito:** Minimap
- Tudo com `bg-black/70 backdrop-blur-sm` e bordas arredondadas
- **Painel de controles:** Toggle com F1, mostra todos os atalhos

---

## POPUPS

### DeathPopup (Morte)
- Aparece no topo中央
- Gradiente vermelho escuro
- Ícone de caveira
- Mensagem detalhada com perdas (nível/moedas)
- Desaparece após 5 segundos
- Animação spring

### LevelUpPopup (Level Up)
- Aparece no topo中央
- Gradiente âmbar escuro
- Ícone de estrela
- Mensagem com level e pontos ganhos
- Desaparece após 3 segundos

---

## SAVE/LOAD

- Salva em `localStorage` com chave `rpg_isometric_save`
- Salva: atributos, nível, XP, moedas, inventário, mapa atual, missões
- Auto-save a cada 30 segundos + ao trocar de mapa
- Load restaura HP para máximo
- Botão "Excluir Save" na tela inicial

---

## ARQUITETURA DE CÓDIGO

```
src/
├── game/
│   ├── types.ts          # Todas as interfaces e tipos
│   ├── constants.ts      # Constantes, fórmulas, definições de mapas e itens
│   ├── store.ts          # Zustand store (1300+ linhas) — toda a lógica de jogo
│   └── renderer.ts       # Canvas 2D renderer (2200+ linhas) — toda a renderização
├── components/
│   └── game/
│       ├── GameCanvas.tsx      # Loop principal + input + game loop
│       ├── GameHUD.tsx         # HUD overlay
│       ├── ShopPanel.tsx       # Painel da loja
│       ├── AttributePanel.tsx  # Painel de atributos
│       ├── DeathPopup.tsx      # Popup de morte
│       ├── LevelUpPopup.tsx    # Popup de level up
│       └── TitleScreen.tsx     # Tela inicial
├── App.tsx
├── main.tsx
└── index.css              # Tailwind + estilos globais
```

### Convenções
- Namespace TypeScript implícito via organização
- Event-driven via Zustand store (todas as ações são methods do store)
- UI reativa: componentes React se inscrevem no store via seletores
- Game loop: `requestAnimationFrame` no GameCanvas com delta time
- Renderização: Função `renderGame()` recebe estado snapshot e desenha no canvas

---

## DETALHES VISUAIS IMPORTANTES

1. **Transições de mapa:** Fade suave ao trocar
2. **Portais bloqueados:** Cinza, sem animação de giro
3. **NPCs:** Tooltip com nome ao passar perto
4. **Distância de interação NPC:** 2.5 tiles
5. **Espada da Fúria:** Arma que o jogador começa grátis — dá AOE no ataque
6. **Tier de armadura visual:** Cores diferentes por nível (marrom→cinza→azul→roxo)
7. **Animação de dragão:** Possível trigger ao entrar no portal para boss
8. **Scroll do canvas:** Câmera segue o jogador centralizado
9. **Fading das bordas do mapa:** Gradiente escuro nas bordas do canvas

---

## INSTRUÇÕES FINAIS

- **Toda a UI deve ser em português do Brasil**
- **Não use assets de imagem** — tudo é Canvas 2D procedural
- **O jogo deve ser jogável no browser** com React + Vite + Tailwind
- **Salvamento automático** em localStorage
- **Balanceamento:** Inimigos escalam com nível, boss é desafiador mas não impossível
- **O prompt deve gerar todos os arquivos** listados na estrutura acima
- **Build deve compilar sem erros** com `pnpm run build`

---

*Este prompt descreve o jogo completo: "RPG de Ação 3D Isométrico — Terras Cinzas"*
