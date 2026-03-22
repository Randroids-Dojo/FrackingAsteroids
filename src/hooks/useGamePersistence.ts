"use client";

import { useEffect, useRef, useCallback } from "react";
import type { GameState } from "@/lib/schemas";

const AUTOSAVE_INTERVAL = 30_000; // 30 seconds

export function useGamePersistence(gameId: string | null) {
  const lastSave = useRef<number>(0);

  const save = useCallback(
    async (state: GameState) => {
      if (!gameId) return;
      try {
        await fetch(`/api/game/${gameId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        });
        lastSave.current = Date.now();
      } catch {
        // silently ignore save failures
      }
    },
    [gameId],
  );

  const load = useCallback(async (): Promise<GameState | null> => {
    if (!gameId) return null;
    try {
      const res = await fetch(`/api/game/${gameId}`);
      if (!res.ok) return null;
      return (await res.json()) as GameState;
    } catch {
      return null;
    }
  }, [gameId]);

  useEffect(() => {
    // Auto-save timer placeholder — will be wired to game engine
    const interval = setInterval(() => {
      // Game engine will call save() with current state
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return { save, load };
}
