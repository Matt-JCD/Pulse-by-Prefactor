'use client';

import type { MediaAsset } from '@/lib/api';

const TYPE_ICONS: Record<string, string> = {
  clip: '\uD83C\uDFAC',
  graphic: '\uD83D\uDDBC',
  headshot: '\uD83D\uDC64',
  show_notes: '\uD83D\uDCDD',
  questions: '\u2753',
};

interface Props {
  asset: MediaAsset;
  episodeName?: string;
  onDelete?: (id: string) => void;
}

export function AssetTile({ asset, episodeName, onDelete }: Props) {
  const icon = TYPE_ICONS[asset.asset_type] || '\uD83D\uDCC1';
  const label = asset.title || asset.file_name || 'Untitled';
  const isImage =
    asset.storage_url && asset.mime_type?.startsWith('image/');
  const linkUrl = asset.external_url || asset.storage_url;

  return (
    <div className="group rounded-lg border border-zinc-800/60 bg-[#111113] p-3 flex flex-col gap-2 relative">
      {/* Thumbnail or icon */}
      {isImage ? (
        <a
          href={asset.storage_url!}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full aspect-video rounded-md overflow-hidden bg-zinc-900"
        >
          <img
            src={asset.storage_url!}
            alt={label}
            className="w-full h-full object-cover"
          />
        </a>
      ) : (
        <div className="w-full aspect-video rounded-md bg-zinc-900 flex items-center justify-center text-3xl">
          {icon}
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-sm shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-200 truncate">{label}</p>
          <p className="text-[10px] text-zinc-500 capitalize">
            {asset.asset_type.replace('_', ' ')}
          </p>
          {episodeName && (
            <p className="text-[10px] text-zinc-600 truncate mt-0.5">{episodeName}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto">
        {linkUrl && (
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-aqua hover:underline"
          >
            {asset.external_url ? 'Open link' : 'View file'}
          </a>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(asset.id)}
            className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors ml-auto opacity-0 group-hover:opacity-100"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
