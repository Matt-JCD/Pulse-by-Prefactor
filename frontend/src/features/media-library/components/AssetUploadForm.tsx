'use client';

import { useState, useRef } from 'react';
import type { AssetType } from '@/lib/api';

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'clip', label: 'Clip' },
  { value: 'graphic', label: 'Graphic' },
  { value: 'headshot', label: 'Headshot' },
  { value: 'show_notes', label: 'Show Notes' },
  { value: 'questions', label: 'Questions' },
];

interface Props {
  isLoading: boolean;
  onUpload: (fd: FormData) => void;
  onAddExternal: (body: { asset_type: AssetType; title?: string; external_url: string }) => void;
  onCancel: () => void;
}

export function AssetUploadForm({ isLoading, onUpload, onAddExternal, onCancel }: Props) {
  const [mode, setMode] = useState<'upload' | 'link'>('upload');
  const [assetType, setAssetType] = useState<AssetType>('clip');
  const [title, setTitle] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === 'upload' && selectedFile) {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('asset_type', assetType);
      if (title.trim()) fd.append('title', title.trim());
      onUpload(fd);
    } else if (mode === 'link' && externalUrl.trim()) {
      onAddExternal({
        asset_type: assetType,
        ...(title.trim() && { title: title.trim() }),
        external_url: externalUrl.trim(),
      });
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setSelectedFile(file);
  }

  const inputClass =
    'w-full rounded-md border border-zinc-700 bg-[#0A0A0B] px-3 py-2 text-sm text-zinc-200 focus:border-aqua focus:outline-none';

  const canSubmit =
    mode === 'upload' ? !!selectedFile : !!externalUrl.trim();

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 rounded-lg border border-zinc-800/40 bg-[#0A0A0B] p-4"
    >
      {/* Mode toggle */}
      <div className="flex items-center gap-2 mb-4">
        {(['upload', 'link'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              mode === m
                ? 'bg-aqua/15 text-aqua'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {m === 'upload' ? 'Upload File' : 'External Link'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* Asset type */}
        <label className="block">
          <span className="text-[10px] text-zinc-500 mb-1 block">Asset Type</span>
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value as AssetType)}
            className={inputClass}
          >
            {ASSET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {/* Title */}
        <label className="block">
          <span className="text-[10px] text-zinc-500 mb-1 block">Title (optional)</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="e.g. Hero graphic v2"
          />
        </label>
      </div>

      {/* Upload mode */}
      {mode === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mb-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
            isDragging
              ? 'border-aqua/60 bg-aqua/5'
              : 'border-zinc-700 hover:border-zinc-600'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setSelectedFile(file);
            }}
          />
          {selectedFile ? (
            <p className="text-xs text-zinc-300">{selectedFile.name}</p>
          ) : (
            <>
              <p className="text-xs text-zinc-400 mb-1">
                Drop a file here or click to browse
              </p>
              <p className="text-[10px] text-zinc-600">Max 50 MB</p>
            </>
          )}
        </div>
      )}

      {/* Link mode */}
      {mode === 'link' && (
        <label className="block mb-4">
          <span className="text-[10px] text-zinc-500 mb-1 block">URL</span>
          <input
            type="url"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            className={inputClass}
            placeholder="Canva or Google Drive link"
            required
          />
        </label>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit || isLoading}
          className="rounded-md bg-aqua px-4 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save Asset'}
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
