import { useRef } from 'react';
import GameCanvas from './components/game/GameCanvas';
import GameHUD from './components/game/GameHUD';
import ShopPanel from './components/game/ShopPanel';
import AttributePanel from './components/game/AttributePanel';
import DeathPopup from './components/game/DeathPopup';
import LevelUpPopup from './components/game/LevelUpPopup';
import TitleScreen from './components/game/TitleScreen';
import MobileControls from './components/game/MobileControls';

export default function App() {
  const keysRef = useRef<Set<string>>(new Set());
  const moveRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950 relative">
      {/* Title Screen */}
      <TitleScreen />

      {/* Game Canvas (renders the isometric world) */}
      <GameCanvas keysRef={keysRef} moveRef={moveRef} />

      {/* UI Overlays */}
      <GameHUD />
      <ShopPanel />
      <AttributePanel />
      <DeathPopup />
      <LevelUpPopup />

      {/* Mobile Controls */}
      <MobileControls keysRef={keysRef} moveRef={moveRef} />
    </div>
  );
}
