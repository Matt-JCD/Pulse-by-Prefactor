'use client';

import type { ComposerPost } from '@/lib/api';
import { useComposer } from '../useComposer';
import { PostCard } from './PostCard';

interface Props {
  posts: ComposerPost[];
}

export function PostQueue({ posts }: Props) {
  const {
    editingPostId,
    setEditingPostId,
    rejectingPostId,
    setRejectingPostId,
    isLoading,
    actionError,
    handleApprove,
    handleReject,
    handleRevise,
    handlePublishNow,
    handleEdit,
    handleDelete,
  } = useComposer();

  const drafts = posts.filter((p) => p.status === 'draft');
  const scheduled = posts.filter((p) => p.status === 'scheduled');

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
                onApprove={handleApprove}
                onReject={handleReject}
                onRevise={handleRevise}
                onPublishNow={handlePublishNow}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onStartEdit={setEditingPostId}
                onCancelEdit={() => setEditingPostId(null)}
                onStartReject={setRejectingPostId}
                onCancelReject={() => setRejectingPostId(null)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Scheduled — approved, waiting to publish */}
      {scheduled.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
            Scheduled ({scheduled.length})
          </h2>
          <div className="flex flex-col gap-3">
            {scheduled.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                editingPostId={editingPostId}
                rejectingPostId={rejectingPostId}
                isLoading={isLoading}
                onApprove={handleApprove}
                onReject={handleReject}
                onRevise={handleRevise}
                onPublishNow={handlePublishNow}
                onDelete={handleDelete}
                onEdit={handleEdit}
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
