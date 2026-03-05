'use client';

import type { Episode } from '@/lib/api';
import { useMediaLibrary } from './useMediaLibrary';
import { EpisodeGrid } from './components/EpisodeGrid';
import { EpisodeDetail } from './components/EpisodeDetail';
import { EpisodeForm } from './components/EpisodeForm';
import { AllAssetsGrid } from './components/AllAssetsGrid';

interface Props {
  episodes: Episode[];
}

const TABS = [
  { key: 'episodes' as const, label: 'Episodes' },
  { key: 'assets' as const, label: 'All Assets' },
];

export function MediaLibrary({ episodes: initialEpisodes }: Props) {
  const ml = useMediaLibrary(initialEpisodes);

  return (
    <div className="min-h-screen bg-[#0A0A0B] px-6 py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Media Library</h1>
        {ml.activeTab === 'episodes' && (
          <button
            onClick={() => { ml.setShowNewForm(!ml.showNewForm); ml.setEditingEpisode(null); }}
            className="rounded-md bg-aqua px-4 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90"
          >
            {ml.showNewForm ? 'Cancel' : 'New Episode'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => ml.handleTabChange(tab.key)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              ml.activeTab === tab.key
                ? 'bg-aqua/15 text-aqua'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {ml.actionError && (
        <div className="mb-4 rounded-md border border-red-900/40 bg-red-900/10 px-4 py-2 text-sm text-red-400">
          {ml.actionError}
        </div>
      )}

      {/* Episodes tab */}
      {ml.activeTab === 'episodes' && (
        <>
          {ml.showNewForm && (
            <EpisodeForm
              onSave={ml.handleCreateEpisode}
              onCancel={() => ml.setShowNewForm(false)}
              isLoading={ml.isLoading}
            />
          )}

          {ml.editingEpisode && !ml.showNewForm && (
            <EpisodeForm
              episode={ml.editingEpisode}
              onSave={(data) => ml.handleUpdateEpisode(ml.editingEpisode!.id, data)}
              onCancel={() => ml.setEditingEpisode(null)}
              isLoading={ml.isLoading}
            />
          )}

          <EpisodeGrid
            episodes={ml.episodes}
            selectedId={ml.selectedEpisodeId}
            assetCounts={Object.fromEntries(
              Object.entries(ml.episodeAssets).map(([id, assets]) => [id, assets.length]),
            )}
            onSelect={ml.handleSelectEpisode}
          />

          {ml.selectedEpisode && (
            <EpisodeDetail
              episode={ml.selectedEpisode}
              assets={ml.episodeAssets[ml.selectedEpisode.id] || []}
              showAssetForm={ml.showAssetForm}
              isLoading={ml.isLoading}
              onEdit={() => { ml.setEditingEpisode(ml.selectedEpisode); ml.setShowNewForm(false); }}
              onDelete={() => ml.handleDeleteEpisode(ml.selectedEpisode!.id)}
              onToggleAssetForm={() => ml.setShowAssetForm(!ml.showAssetForm)}
              onUploadAsset={(fd) => ml.handleUploadAsset(ml.selectedEpisode!.id, fd)}
              onAddExternalAsset={(body) => ml.handleAddExternalAsset(ml.selectedEpisode!.id, body)}
              onDeleteAsset={(assetId) => ml.handleDeleteAsset(assetId, ml.selectedEpisode!.id)}
            />
          )}

          {ml.episodes.length === 0 && !ml.showNewForm && (
            <div className="text-center py-16 text-zinc-500 text-sm">
              No episodes yet. Click &quot;New Episode&quot; to get started.
            </div>
          )}
        </>
      )}

      {/* All Assets tab */}
      {ml.activeTab === 'assets' && (
        <AllAssetsGrid
          allAssets={ml.allAssets}
          isLoading={ml.isLoading}
          assetTypeFilter={ml.assetTypeFilter}
          onFilterChange={ml.setAssetTypeFilter}
        />
      )}
    </div>
  );
}
