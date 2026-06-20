import GameCanvas from './components/game/GameCanvas';
import GameHUD from './components/game/GameHUD';
import ShopPanel from './components/game/ShopPanel';
import AttributePanel from './components/game/AttributePanel';
import DeathPopup from './components/game/DeathPopup';
import LevelUpPopup from './components/game/LevelUpPopup';
import TitleScreen from './components/game/TitleScreen';

export default function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950 relative">
      {/* Title Screen */}
      <TitleScreen />

      {/* Game Canvas (renders the isometric world) */}
      <GameCanvas />

      {/* UI Overlays */}
      <GameHUD />
      <ShopPanel />
      <AttributePanel />
      <DeathPopup />
      <LevelUpPopup />
    </div>
  );
}
