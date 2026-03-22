"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL = 60_000; // 1 minute

export function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [buildId, setBuildId] = useState<string | null>(null);

  useEffect(() => {
    let currentVersion: string | null = null;

    async function checkVersion() {
      try {
        const res = await fetch("/api/version");
        if (!res.ok) return;
        const data = (await res.json()) as { version: string };
        if (currentVersion === null) {
          currentVersion = data.version;
        } else if (data.version !== currentVersion) {
          setBuildId(data.version);
          setUpdateAvailable(true);
        }
      } catch {
        // silently ignore fetch failures
      }
    }

    checkVersion();
    const interval = setInterval(checkVersion, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-50 bg-hud-blue/90 text-space-900 text-center py-2 px-4 text-sm font-mono">
      New version available ({buildId?.slice(0, 7)}) —{" "}
      <button
        onClick={() => window.location.reload()}
        className="underline font-bold hover:no-underline"
      >
        tap to refresh
      </button>
    </div>
  );
}
