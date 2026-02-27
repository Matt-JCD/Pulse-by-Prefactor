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

async function fetchLatestRunId(): Promise<number | null> {
  try {
    const res = await fetch(`${API_URL}/api/intelligence/run-log`);
    if (!res.ok) return null;
    const data: RunLogEntry[] = await res.json();
    return data[0]?.id ?? null;
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
      // Snapshot the current latest run ID so we know when a new one appears
      const baselineId = await fetchLatestRunId();

      // Trigger — send NO platform value so backend runs everything (!platform = true)
      const res = await fetch(`${API_URL}/api/intelligence/trigger-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Trigger failed: ${res.status}`);

      // Poll until a new run_log entry appears (meaning at least one agent finished)
      let polls = 0;
      const poll = async (): Promise<void> => {
        polls++;
        setPollCount(polls);
        const latestId = await fetchLatestRunId();

        if (latestId !== null && latestId !== baselineId) {
          // New entry — data has changed, refresh server-rendered page
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
