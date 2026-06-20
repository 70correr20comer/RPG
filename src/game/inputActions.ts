import { useGameStore } from './store';
import { MAPS, distance, QUEST_SLAY67_ID, QUEST_BOSS_ID } from './constants';

export function handleActionKeyDown(rawKey: string, e?: { preventDefault?: () => void }) {
  const key = rawKey.toLowerCase();
  const state = useGameStore.getState();

  if (state.screen !== 'playing') {
    if (key === 'escape') state.setScreen('playing');
    return;
  }

  if (key === 'shift') {
    state.setShieldActive(true);
  }

  if (key === 'tab') {
    e?.preventDefault?.();
    state.setScreen(state.screen === 'attributes' ? 'playing' : 'attributes');
  }

  if (key === 'p') state.usePotion();
  if (key === 'q') state.toggleControls();

  // E: NPC interaction / shop
  if (key === 'e') {
    const mapDef = MAPS[state.currentMap];
    for (const npc of mapDef.npcs) {
      if (distance(state.player.position, npc.position) < 3) {
        if (npc.type === 'questgiver' || npc.type === 'questgiver2') {
          let quest;
          if (npc.type === 'questgiver2') {
            const q2 = state.quests.find(q => q.id === QUEST_SLAY67_ID);
            const q3 = state.quests.find(q => q.id === QUEST_BOSS_ID);
            if (q2?.status === 'completed' && q3 && q3.status !== 'completed') {
              quest = q3;
            } else {
              quest = q2;
            }
          } else if (npc.type === 'questgiver') {
            const elderQuests = state.quests.filter(q => q.giverNPCId === npc.id);
            quest = elderQuests.find(q => q.status === 'active') || elderQuests.find(q => q.status === 'available');
          }
          if (quest) {
            if (quest.status === 'available') {
              state.acceptQuest(quest.id);
              useGameStore.setState({ levelUpMessage: `📜 Missão Aceita: ${quest.name}\n${quest.description}` });
            } else if (quest.status === 'active') {
              let isComplete = false;
              if (quest.type === 'kill' || quest.type === 'multikill' || quest.type === 'attribute') {
                isComplete = quest.currentCount >= quest.targetCount;
              }
              if (isComplete) {
                const isSlay67 = quest.id === QUEST_SLAY67_ID;
                useGameStore.setState(s => {
                  const newQuests = s.quests.map(q =>
                    q.id === quest.id ? { ...q, status: 'completed' as const } : q
                  );
                  if (isSlay67) {
                    setTimeout(() => {
                      useGameStore.getState().triggerDragonAnimation();
                    }, 500);
                  }
                  return {
                    quests: newQuests,
                    player: {
                      ...s.player,
                      coins: s.player.coins + quest.rewardCoins,
                      currentXP: s.player.currentXP + quest.rewardXP,
                    },
                    showBossQuestGiver: isSlay67 ? true : s.showBossQuestGiver,
                    levelUpMessage: isSlay67
                      ? `✅ Missão Completa: ${quest.name}!\n+${quest.rewardCoins} moedas, +${quest.rewardXP} XP\n🐉 Um dragão está surgindo...`
                      : `✅ Missão Completa: ${quest.name}!\n+${quest.rewardCoins} moedas, +${quest.rewardXP} XP\nPortal desbloqueado!`,
                  };
                });
              } else {
                useGameStore.setState({ levelUpMessage: `📜 ${quest.name}: ${quest.currentCount}/${quest.targetCount}` });
              }
            } else if (quest.status === 'completed') {
              useGameStore.setState({ levelUpMessage: `✅ Missão já concluída!` });
            }
          }
          return;
        } else {
          if (state.currentMap === 'TerrasCinzaEscuro' || state.currentMap === 'NovaCidade') {
            state.setScreen('darkShop');
          } else {
            state.setScreen('shop');
          }
          return;
        }
      }
    }
    // Check dynamic boss quest giver
    if (state.showBossQuestGiver && state.currentMap === 'NovaCidade') {
      const bossNPCPos = { x: 19, y: 13 };
      if (distance(state.player.position, bossNPCPos) < 3) {
        const bossQuest = state.quests.find(q => q.id === QUEST_BOSS_ID);
        if (bossQuest) {
          if (bossQuest.status === 'available') {
            state.acceptQuest(bossQuest.id);
            useGameStore.setState({ levelUpMessage: `📜 Missão Aceita: ${bossQuest.name}\n${bossQuest.description}` });
          } else if (bossQuest.status === 'active') {
            useGameStore.setState({ levelUpMessage: `📜 ${bossQuest.name}: Enfrente o Boss!` });
          } else if (bossQuest.status === 'completed') {
            useGameStore.setState({ levelUpMessage: `✅ Missão já concluída!` });
          }
        }
        return;
      }
    }
  }

  // Spells
  if (key === 'f') {
    const hasSpell = (state.player.purchasedSpells as Record<string, number> | undefined)?.['Fire'];
    if (hasSpell) {
      if (state.currentMap === 'TerrasCinzas' || state.currentMap === 'TerrasCinzaEscuro' || state.currentMap === 'TerrasForte') {
        state.castSpell('Fire');
      } else {
        useGameStore.setState(s => ({ player: { ...s.player, equippedSpell: 'Fire' } }));
      }
    }
  }

  if (key === 'g') {
    const hasSpell = (state.player.purchasedSpells as Record<string, number> | undefined)?.['Water'];
    if (hasSpell) {
      if (state.currentMap === 'TerrasCinzas' || state.currentMap === 'TerrasCinzaEscuro' || state.currentMap === 'TerrasForte') {
        state.castSpell('Water');
      } else {
        useGameStore.setState(s => ({ player: { ...s.player, equippedSpell: 'Water' } }));
      }
    }
  }

  if (key === 'v') {
    const hasSpell = (state.player.purchasedSpells as Record<string, number> | undefined)?.['Earth'];
    if (hasSpell) {
      if (state.currentMap === 'TerrasCinzas' || state.currentMap === 'TerrasCinzaEscuro' || state.currentMap === 'TerrasForte') {
        state.castSpell('Earth');
      } else {
        useGameStore.setState(s => ({ player: { ...s.player, equippedSpell: 'Earth' } }));
      }
    }
  }

  if (key === 'r') {
    const hasSpell = (state.player.purchasedSpells as Record<string, number> | undefined)?.['Air'];
    if (hasSpell) {
      if (state.currentMap === 'TerrasCinzas' || state.currentMap === 'TerrasCinzaEscuro' || state.currentMap === 'TerrasForte') {
        state.castSpell('Air');
      } else {
        useGameStore.setState(s => ({ player: { ...s.player, equippedSpell: 'Air' } }));
      }
    }
  }

  if (key === ' ' && (state.currentMap === 'TerrasCinzas' || state.currentMap === 'TerrasCinzaEscuro' || state.currentMap === 'TerrasForte')) {
    e?.preventDefault?.();
  }
}

export function handleActionKeyUp(rawKey: string) {
  const key = rawKey.toLowerCase();
  if (key === 'shift') {
    useGameStore.getState().setShieldActive(false);
  }
}
