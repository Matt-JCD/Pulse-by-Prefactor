'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const POLL_INTERVAL_MS = 12_000;  // check every 12 seconds
const MAX_POLLS = 30;              // give up after ~6 minutes

interface RunLogEntry {
  id: number;
  created_at: string;
  function_name: string;
  status: string;
}

// Returns the most recent synthesizer run_log id (null if none yet).
// We wait for this specifically because synthesizer is always the LAST step —
// detecting it means the full pipeline (collectors + synthesis) has completed.
async function fetchLatestSynthesizerId(): Promise<number | null> {
  try {
    const res = await fetch(`${API_URL}/api/intelligence/run-log`);
    if (!res.ok) return null;
    const data: RunLogEntry[] = await res.json();
    return data.find((r) => r.function_name === 'synthesizer')?.id ?? null;
  } catch {
    return null;
  }
}

export function useIntelligence() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  async function handleRunNow() {
    setIsRunning(true);
    setRunError(null);

    try {
      // Snapshot the current synthesizer run id so we know when a NEW one appears
      const baselineSynthId = await fetchLatestSynthesizerId();

      // Trigger — send NO platform value so backend runs everything (!platform = true)
      const res = await fetch(`${API_URL}/api/intelligence/trigger-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Trigger failed: ${res.status}`);

      // Poll until a new synthesizer entry appears — that means the full
      // pipeline (collectors → synthesizer) has finished (success or error).
      let polls = 0;
      const poll = async (): Promise<void> => {
        polls++;
        setPollCount(polls);
        const latestSynthId = await fetchLatestSynthesizerId();

        if (latestSynthId !== null && latestSynthId !== baselineSynthId) {
          // Synthesizer completed — refresh page with fresh data
          router.refresh();
          setIsRunning(false);
          setPollCount(0);
          return;
        }

        if (polls >= MAX_POLLS) {
          setRunError('Run timed out — check the backend logs.');
          setIsRunning(false);
          setPollCount(0);
          return;
        }

        setTimeout(poll, POLL_INTERVAL_MS);
      };

      setTimeout(poll, POLL_INTERVAL_MS);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Run failed');
      setIsRunning(false);
    }
  }

  return { isRunning, runError, pollCount, handleRunNow };
}
