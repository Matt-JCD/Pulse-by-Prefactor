'use client';

import { useState } from 'react';
import type { ComposerPost } from '@/lib/api';
import { useComposer } from '../useComposer';
import { ACCOUNTS } from '../types';
import { PostCard } from './PostCard';

interface Props {
  posts: ComposerPost[];
}

export function PostQueue({ posts }: Props) {
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const {
    editingPostId,
    setEditingPostId,
    rejectingPostId,
    setRejectingPostId,
    isLoading,
    actionError,
    handleSubmit,
    handleApprove,
    handleReject,
    handleRevise,
    handlePublishNow,
    handleEdit,
    handleEditSchedule,
    handleDelete,
  } = useComposer();

  const filtered = accountFilter
    ? posts.filter((p) => p.account === accountFilter)
    : posts;

  const drafts = filtered.filter((p) => p.status === 'draft');
  const pendingApproval = filtered.filter((p) => p.status === 'pending_approval');
  const approved = filtered.filter((p) => p.status === 'approved');

  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800/60 bg-[#111113] p-8 text-center">
        <p className="text-sm text-zinc-500">
          No posts in the queue. Drafts appear here after the 6:30am auto-draft
          or when created manually from the topics below.
        </p>
      </div>
    );
  }

  return (
    <div>
      {actionError && (
        <div className="mb-4 rounded-md border border-red-900/40 bg-red-900/10 px-4 py-2 text-sm text-red-400">
          {actionError}
        </div>
      )}

      {/* Account filter */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setAccountFilter(null)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            accountFilter === null
              ? 'bg-aqua/15 text-aqua'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          All
        </button>
        {ACCOUNTS.map((acc) => (
          <button
            key={acc.slug}
            onClick={() => setAccountFilter(acc.slug)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              accountFilter === acc.slug
                ? ''
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            style={
              accountFilter === acc.slug
                ? { backgroundColor: `${acc.badgeColor}30`, color: acc.badgeColor }
                : undefined
            }
          >
            {acc.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-zinc-500 py-4">No posts for this account.</p>
      )}

      {/* Drafts — need review */}
      {drafts.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
            Drafts — awaiting review ({drafts.length})
          </h2>
          <p className="mb-3 text-[11px] text-zinc-600">
            Auto-drafted from today&apos;s intelligence · Approve, revise, or replace
          </p>
          <div className="flex flex-col gap-3">
            {drafts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                editingPostId={editingPostId}
                rejectingPostId={rejectingPostId}
                isLoading={isLoading}
                onSubmit={handleSubmit}
                onApprove={handleApprove}
                onReject={handleReject}
                onRevise={handleRevise}
                onPublishNow={handlePublishNow}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onEditSchedule={handleEditSchedule}
                onStartEdit={setEditingPostId}
                onCancelEdit={() => setEditingPostId(null)}
                onStartReject={setRejectingPostId}
                onCancelReject={() => setRejectingPostId(null)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pending approval */}
      {pendingApproval.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
            Pending approval ({pendingApproval.length})
          </h2>
          <div className="flex flex-col gap-3">
            {pendingApproval.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                editingPostId={editingPostId}
                rejectingPostId={rejectingPostId}
                isLoading={isLoading}
                onSubmit={handleSubmit}
                onApprove={handleApprove}
                onReject={handleReject}
                onRevise={handleRevise}
                onPublishNow={handlePublishNow}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onEditSchedule={handleEditSchedule}
                onStartEdit={setEditingPostId}
                onCancelEdit={() => setEditingPostId(null)}
                onStartReject={setRejectingPostId}
                onCancelReject={() => setRejectingPostId(null)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Approved — waiting to publish */}
      {approved.length > 0 && (
        <section className={pendingApproval.length > 0 ? 'mt-8' : ''}>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
            Approved ({approved.length})
          </h2>
          <div className="flex flex-col gap-3">
            {approved.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                editingPostId={editingPostId}
                rejectingPostId={rejectingPostId}
                isLoading={isLoading}
                onSubmit={handleSubmit}
                onApprove={handleApprove}
                onReject={handleReject}
                onRevise={handleRevise}
                onPublishNow={handlePublishNow}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onEditSchedule={handleEditSchedule}
                onStartEdit={setEditingPostId}
                onCancelEdit={() => setEditingPostId(null)}
                onStartReject={setRejectingPostId}
                onCancelReject={() => setRejectingPostId(null)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
