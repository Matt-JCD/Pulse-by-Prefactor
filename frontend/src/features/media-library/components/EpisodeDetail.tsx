'use client';

import type { Episode, MediaAsset, AssetType } from '@/lib/api';
import { AssetTile } from './AssetTile';
import { AssetUploadForm } from './AssetUploadForm';

interface Props {
  episode: Episode;
  assets: MediaAsset[];
  showAssetForm: boolean;
  isLoading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAssetForm: () => void;
  onUploadAsset: (fd: FormData) => void;
  onAddExternalAsset: (body: { asset_type: AssetType; title?: string; external_url: string }) => void;
  onDeleteAsset: (assetId: string) => void;
}

export function EpisodeDetail({
  episode,
  assets,
  showAssetForm,
  isLoading,
  onEdit,
  onDelete,
  onToggleAssetForm,
  onUploadAsset,
  onAddExternalAsset,
  onDeleteAsset,
}: Props) {
  return (
    <div className="rounded-lg border border-zinc-800/60 bg-[#111113] p-5 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">{episode.title}</h2>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-500">
            {episode.episode_number != null && <span>Ep {episode.episode_number}</span>}
            {episode.guest_name && <span>with {episode.guest_name}</span>}
            {episode.publish_date && (
              <span>
                {new Date(episode.publish_date + 'T00:00:00').toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
            <span
              className={`px-1.5 py-0.5 rounded font-medium ${
                episode.status === 'published'
                  ? 'bg-aqua/10 text-aqua'
                  : 'bg-amber-900/20 text-amber-400'
              }`}
            >
              {episode.status === 'published' ? 'Published' : 'Upcoming'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onEdit}
            className="rounded-md border border-zinc-700 px-3 py-1 text-[10px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="rounded-md border border-zinc-700 px-3 py-1 text-[10px] font-medium text-zinc-400 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-800/60 mb-4" />

      {/* Assets header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-zinc-300">
          Assets{assets.length > 0 && ` (${assets.length})`}
        </p>
        <button
          onClick={onToggleAssetForm}
          className="rounded-md bg-aqua/10 text-aqua px-3 py-1 text-[10px] font-medium hover:bg-aqua/20 transition-colors"
        >
          {showAssetForm ? 'Cancel' : 'Add Asset'}
        </button>
      </div>

      {/* Asset upload form */}
      {showAssetForm && (
        <AssetUploadForm
          isLoading={isLoading}
          onUpload={onUploadAsset}
          onAddExternal={onAddExternalAsset}
          onCancel={onToggleAssetForm}
        />
      )}

      {/* Asset grid */}
      {assets.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {assets.map((a) => (
            <AssetTile key={a.id} asset={a} onDelete={onDeleteAsset} />
          ))}
        </div>
      ) : (
        !showAssetForm && (
          <p className="text-xs text-zinc-600 py-6 text-center">
            No assets yet. Click &quot;Add Asset&quot; to attach files or links.
          </p>
        )
      )}
    </div>
  );
}
