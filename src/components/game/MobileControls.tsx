import { useRef, useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../../game/store';
import { useIsMobileControls } from '../../hooks/useIsMobileControls';
import { handleActionKeyDown, handleActionKeyUp } from '../../game/inputActions';

// ─── Virtual Joystick ───────────────────────────────

function VirtualJoystick({ moveRef }: { moveRef: React.MutableRefObject<{ x: number; y: number }> }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);
  const baseSize = 100;
  const knobSize = 44;
  const maxDist = (baseSize - knobSize) / 2;

  const handleStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
  }, []);

  const handleMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (touchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier !== touchIdRef.current) continue;

      const rect = baseRef.current?.getBoundingClientRect();
      if (!rect) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let dx = touch.clientX - centerX;
      let dy = touch.clientY - centerY;

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
      }

      setKnobPos({ x: dx, y: dy });
      moveRef.current = {
        x: dx / maxDist,
        y: dy / maxDist,
      };
    }
  }, [moveRef]);

  const handleEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setKnobPos({ x: 0, y: 0 });
        moveRef.current = { x: 0, y: 0 };
        break;
      }
    }
  }, [moveRef]);

  return (
    <div
      ref={baseRef}
      className="relative rounded-full bg-black/30 border-2 border-white/10 backdrop-blur-sm"
      style={{ width: baseSize, height: baseSize, touchAction: 'none' }}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
    >
      {/* Direction indicators */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30">
        <div className="text-white text-[10px]">WASD</div>
      </div>
      {/* Knob */}
      <div
        className="absolute rounded-full bg-white/20 border border-white/30 shadow-lg active:bg-white/30"
        style={{
          width: knobSize,
          height: knobSize,
          left: baseSize / 2 - knobSize / 2 + knobPos.x,
          top: baseSize / 2 - knobSize / 2 + knobPos.y,
          transition: touchIdRef.current === null ? 'all 0.15s ease-out' : 'none',
        }}
      />
    </div>
  );
}

// ─── Touch Button ───────────────────────────────────

function TouchButton({
  label,
  sub,
  variant = 'default',
  onTap,
  onHoldStart,
  onHoldEnd,
  mode = 'tap',
  size = 'md',
}: {
  label: string;
  sub?: string;
  variant?: 'default' | 'primary' | 'spell-fire' | 'spell-water' | 'spell-earth' | 'spell-air';
  onTap?: () => void;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
  mode?: 'tap' | 'hold';
  size?: 'sm' | 'md' | 'lg';
}) {
  const isHolding = useRef(false);

  const sizeClasses = {
    sm: 'w-[44px] h-[44px] text-lg',
    md: 'w-[52px] h-[52px] text-xl',
    lg: 'w-[64px] h-[64px] text-2xl',
  };

  const variantClasses: Record<string, string> = {
    default: 'bg-black/30 border-white/10 hover:bg-white/10',
    primary: 'bg-red-600/40 border-red-400/30 hover:bg-red-500/40 active:bg-red-500/60',
    'spell-fire': 'bg-red-600/30 border-red-400/20',
    'spell-water': 'bg-blue-600/30 border-blue-400/20',
    'spell-earth': 'bg-green-600/30 border-green-400/20',
    'spell-air': 'bg-slate-500/30 border-slate-300/20',
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === 'hold') {
      isHolding.current = true;
      onHoldStart?.();
    } else {
      onTap?.();
    }
  }, [mode, onTap, onHoldStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === 'hold' && isHolding.current) {
      isHolding.current = false;
      onHoldEnd?.();
    }
  }, [mode, onHoldEnd]);

  return (
    <div
      className={`${sizeClasses[size]} rounded-full border backdrop-blur-sm flex flex-col items-center justify-center select-none active:scale-90 transition-transform ${variantClasses[variant]}`}
      style={{ touchAction: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <span className="leading-none">{label}</span>
      {sub && <span className="text-[8px] text-white/50 mt-0.5">{sub}</span>}
    </div>
  );
}

// ─── Main Mobile Controls ───────────────────────────

type MobileControlsProps = {
  moveRef: React.MutableRefObject<{ x: number; y: number }>;
  keysRef: React.MutableRefObject<Set<string>>;
};

export default function MobileControls({ moveRef, keysRef }: MobileControlsProps) {
  const isMobile = useIsMobileControls();
  const screen = useGameStore(s => s.screen);

  const onAttackHoldStart = useCallback(() => {
    keysRef.current.add(' ');
  }, [keysRef]);

  const onAttackHoldEnd = useCallback(() => {
    keysRef.current.delete(' ');
  }, [keysRef]);

  if (!isMobile || screen !== 'playing') return null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none">
      {/* Joystick (bottom-left) */}
      <div
        className="fixed pointer-events-auto"
        style={{
          left: '16px',
          bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <VirtualJoystick moveRef={moveRef} />
      </div>

      {/* Actions (bottom-right) */}
      <div
        className="fixed pointer-events-auto flex items-end gap-2"
        style={{
          right: '16px',
          bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Spell buttons (2x2 grid) */}
        <div className="grid grid-cols-2 gap-1.5">
          <TouchButton label="🔥" sub="F" variant="spell-fire" size="sm" onTap={() => handleActionKeyDown('f')} />
          <TouchButton label="❄️" sub="G" variant="spell-water" size="sm" onTap={() => handleActionKeyDown('g')} />
          <TouchButton label="🪨" sub="V" variant="spell-earth" size="sm" onTap={() => handleActionKeyDown('v')} />
          <TouchButton label="💨" sub="R" variant="spell-air" size="sm" onTap={() => handleActionKeyDown('r')} />
        </div>

        {/* Utility + Attack buttons */}
        <div className="flex flex-col gap-1.5 items-center">
          <TouchButton label="💊" sub="P" size="sm" onTap={() => handleActionKeyDown('p')} />
          <TouchButton label="⚔️" sub="ATK" variant="primary" size="lg" mode="hold" onHoldStart={onAttackHoldStart} onHoldEnd={onAttackHoldEnd} />
          <TouchButton label="E" sub="NPC" size="sm" onTap={() => handleActionKeyDown('e')} />
        </div>

        {/* Tab + Shift */}
        <div className="flex flex-col gap-1.5 items-center">
          <TouchButton label="📜" sub="TAB" size="sm" onTap={() => handleActionKeyDown('tab')} />
          <TouchButton label="🛡️" sub="SHIFT" size="sm" mode="hold" onHoldStart={() => handleActionKeyDown('shift')} onHoldEnd={() => handleActionKeyUp('shift')} />
        </div>
      </div>
    </div>
  );
}
