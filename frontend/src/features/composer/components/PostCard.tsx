'use client';

import { useState } from 'react';
import type { ComposerPost } from '@/lib/api';

interface Props {
  post: ComposerPost;
  editingPostId: number | null;
  rejectingPostId: number | null;
  isLoading: boolean;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onRevise: (id: number, feedback: string) => void;
  onPublishNow: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number, content: string) => void;
  onStartEdit: (id: number) => void;
  onCancelEdit: () => void;
  onStartReject: (id: number) => void;
  onCancelReject: () => void;
}

function formatAESTTime(isoString: string | null): string {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' AEST';
  } catch {
    return isoString;
  }
}

function formatAESTFull(isoString: string | null): string {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' AEST';
  } catch {
    return isoString;
  }
}

export function PostCard({
  post,
  editingPostId,
  rejectingPostId,
  isLoading,
  onApprove,
  onReject,
  onRevise,
  onPublishNow,
  onDelete,
  onEdit,
  onStartEdit,
  onCancelEdit,
  onStartReject,
  onCancelReject,
}: Props) {
  const [editContent, setEditContent] = useState(post.content);
  const [feedback, setFeedback] = useState('');
  const isEditing = editingPostId === post.id;
  const isRejecting = rejectingPostId === post.id;
  const charCount = isEditing ? editContent.length : post.content.length;
  const isOverLimit = post.platform === 'twitter' && charCount > 280;

  return (
    <div className="rounded-lg border border-zinc-800/60 bg-[#111113] p-5">
      {/* Top row: platform + topic + time */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Platform badge */}
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
            {post.platform === 'twitter' ? 'X' : 'LinkedIn'}
          </span>
          {/* Status badge */}
          {post.status === 'draft' && (
            <span className="rounded px-2 py-0.5 text-[10px] font-medium bg-amber-900/20 text-amber-400">
              Draft
            </span>
          )}
          {post.status === 'scheduled' && (
            <span className="rounded px-2 py-0.5 text-[10px] font-medium bg-aqua/10 text-aqua">
              Scheduled
            </span>
          )}
          {/* Source topic */}
          {post.source_topic && (
            <span className="text-xs text-zinc-500 truncate max-w-[300px]">
              {post.source_topic}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Char count */}
          <span className={`text-xs tabular-nums ${isOverLimit ? 'text-red-400' : 'text-zinc-600'}`}>
            {charCount}
            {post.platform === 'twitter' && ' / 280'}
          </span>
          {/* Scheduled time */}
          {post.scheduled_at && (
            <span className="text-xs text-zinc-500">
              {formatAESTTime(post.scheduled_at)}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="mb-3 w-full resize-none rounded-md border border-zinc-700 bg-[#0A0A0B] px-3 py-2 text-sm text-zinc-200 focus:border-aqua focus:outline-none"
          rows={4}
        />
      ) : (
        <p className="mb-4 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {/* Feedback panel — shown when "Reject" is clicked */}
      {isRejecting && (
        <div className="mb-4 rounded-md border border-zinc-700 bg-[#0A0A0B] p-4">
          <p className="mb-2 text-xs font-medium text-zinc-400">
            What should change?
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g. 'More specific about compliance risk' or 'Add our angle on agent governance'"
            className="mb-3 w-full resize-none rounded-md border border-zinc-700 bg-[#111113] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-aqua focus:outline-none"
            rows={3}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRevise(post.id, feedback)}
              disabled={isLoading || feedback.trim().length === 0}
              className="rounded-md bg-aqua px-3 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isLoading ? 'Revising...' : 'Revise'}
            </button>
            <button
              onClick={() => onReject(post.id)}
              disabled={isLoading}
              className="rounded-md border border-red-900/40 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/20 disabled:opacity-40"
            >
              Replace topic
            </button>
            <button
              onClick={() => {
                setFeedback('');
                onCancelReject();
              }}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {post.status === 'draft' && !isRejecting && (
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => onEdit(post.id, editContent)}
                disabled={isLoading || editContent.trim().length === 0}
                className="rounded-md bg-aqua px-3 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditContent(post.content);
                  onCancelEdit();
                }}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onApprove(post.id)}
                disabled={isLoading}
                className="rounded-md bg-aqua px-3 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  setEditContent(post.content);
                  onStartEdit(post.id);
                }}
                disabled={isLoading}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200 disabled:opacity-40"
              >
                Edit
              </button>
              <button
                onClick={() => onStartReject(post.id)}
                disabled={isLoading}
                className="rounded-md border border-red-900/40 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/20 disabled:opacity-40"
              >
                Reject
              </button>
              <button
                onClick={() => onDelete(post.id)}
                disabled={isLoading}
                className="ml-auto rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:text-red-400 disabled:opacity-40"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {post.status === 'scheduled' && (
        <div className="flex items-center gap-3">
          {post.scheduled_at ? (
            <span className="text-xs text-aqua">
              Scheduled for {formatAESTFull(post.scheduled_at)}
            </span>
          ) : (
            <span className="text-xs text-aqua">
              Approved — ready to publish
            </span>
          )}
          <button
            onClick={() => onPublishNow(post.id)}
            disabled={isLoading}
            className="rounded-md bg-aqua px-3 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isLoading ? 'Publishing...' : 'Publish Now'}
          </button>
          <button
            onClick={() => onDelete(post.id)}
            disabled={isLoading}
            className="ml-auto rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:text-red-400 disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
