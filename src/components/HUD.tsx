"use client";

import type { Cargo, Upgrades } from "@/lib/schemas";

interface HUDProps {
  scrap: number;
  cargo: Cargo;
  upgrades: Upgrades;
  onPause: () => void;
}

export function HUD({ scrap, cargo, upgrades, onPause }: HUDProps) {
  const cargoPercent =
    cargo.capacity > 0
      ? Math.round((cargo.fragments / cargo.capacity) * 100)
      : 0;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top-left: Resources */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 text-sm md:text-base">
        <div className="text-hud-amber font-mono font-bold">SCRAP: {scrap}</div>
        <div className="text-hud-blue font-mono">
          CARGO: {cargo.fragments}/{cargo.capacity} ({cargoPercent}%)
        </div>
      </div>

      {/* Top-right: Upgrades + Pause */}
      <div className="absolute top-4 right-4 flex items-start gap-4">
        <div className="flex flex-col gap-1 text-xs md:text-sm font-mono text-right">
          <div className="text-hud-red">BLASTER Mk{upgrades.blaster}</div>
          <div className="text-hud-green">COLLECTOR Mk{upgrades.collector}</div>
          <div className="text-hud-blue">STORAGE Mk{upgrades.storage}</div>
        </div>
        <button
          onClick={onPause}
          className="pointer-events-auto px-3 py-2 bg-space-800/80 border border-hud-green/30 rounded text-hud-green text-sm hover:bg-space-700/80 active:scale-95 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Pause game"
        >
          II
        </button>
      </div>
    </div>
  );
}
