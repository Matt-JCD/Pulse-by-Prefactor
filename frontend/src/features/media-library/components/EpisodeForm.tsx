'use client';

import { useState } from 'react';
import type { Episode } from '@/lib/api';

interface Props {
  episode?: Episode;
  onSave: (data: {
    title: string;
    guest_name?: string;
    episode_number?: number;
    publish_date?: string;
    status?: string;
  }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function EpisodeForm({ episode, onSave, onCancel, isLoading }: Props) {
  const [title, setTitle] = useState(episode?.title || '');
  const [guestName, setGuestName] = useState(episode?.guest_name || '');
  const [episodeNumber, setEpisodeNumber] = useState(
    episode?.episode_number != null ? String(episode.episode_number) : '',
  );
  const [publishDate, setPublishDate] = useState(episode?.publish_date || '');
  const [status, setStatus] = useState<'upcoming' | 'published'>(episode?.status || 'upcoming');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      ...(guestName.trim() && { guest_name: guestName.trim() }),
      ...(episodeNumber && { episode_number: Number(episodeNumber) }),
      ...(publishDate && { publish_date: publishDate }),
      status,
    });
  }

  const inputClass =
    'w-full rounded-md border border-zinc-700 bg-[#0A0A0B] px-3 py-2 text-sm text-zinc-200 focus:border-aqua focus:outline-none';

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-lg border border-zinc-800/60 bg-[#111113] p-5"
    >
      <h3 className="text-sm font-medium text-zinc-100 mb-4">
        {episode ? 'Edit Episode' : 'New Episode'}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <label className="block">
          <span className="text-[10px] text-zinc-500 mb-1 block">Title *</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            required
          />
        </label>

        <label className="block">
          <span className="text-[10px] text-zinc-500 mb-1 block">Guest Name</span>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-[10px] text-zinc-500 mb-1 block">Episode Number</span>
          <input
            type="number"
            value={episodeNumber}
            onChange={(e) => setEpisodeNumber(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-[10px] text-zinc-500 mb-1 block">Publish Date</span>
          <input
            type="date"
            value={publishDate}
            onChange={(e) => setPublishDate(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-[10px] text-zinc-500 mb-1 block">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'upcoming' | 'published')}
            className={inputClass}
          >
            <option value="upcoming">Upcoming</option>
            <option value="published">Published</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!title.trim() || isLoading}
          className="rounded-md bg-aqua px-4 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-700 px-4 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
