"use client";

import { useEffect, useState } from "react";

// Per-user, per-browser display preference — deliberately just localStorage,
// not synced anywhere server-side. This is "declutter my own view", not
// shared configuration — that's the separate per-nation admin column setup
// for Databas/Lediga lägenheter (lib/table-columns.ts). The underlying data
// and export are never affected, only what's rendered on screen.
export function useColumnVisibility(storageKey: string) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`column-visibility:${storageKey}`);
      if (raw) setHidden(new Set(JSON.parse(raw) as string[]));
    } catch {
      // Malformed or inaccessible storage — fall back to everything visible.
    }
  }, [storageKey]);

  function toggle(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(`column-visibility:${storageKey}`, JSON.stringify([...next]));
      } catch {
        // Storage full/blocked — the toggle still works for this session.
      }
      return next;
    });
  }

  function isVisible(key: string): boolean {
    return !hidden.has(key);
  }

  return { isVisible, toggle };
}
