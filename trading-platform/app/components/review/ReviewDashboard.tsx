'use client';

import { useState, useEffect } from 'react';

interface ReviewComment {
  id: number;
  prNumber: number;
  prTitle: string;
  author: string;
  comment: string;
  createdAt: string;
  resolved: boolean;
}

interface Props {
  initialComments?: ReviewComment[];
}

export function ReviewDashboard({ initialComments = [] }: Props) {
  const [comments, setComments] = useState<ReviewComment[]>(initialComments);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchComments() {
      try {
        const res = await fetch('/api/reviews');
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        }
      } catch (error) {
        console.error('Failed to fetch review comments:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchComments();
  }, []);

  const unresolvedCount = comments.filter(c => !c.resolved).length;
  const resolvedCount = comments.filter(c => c.resolved).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#141e27] p-4 rounded-lg border border-[#233648]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white font-bold text-lg">Review Dashboard</h2>
        <div className="flex gap-4 text-sm">
          <span className="text-yellow-400">{unresolvedCount} unresolved</span>
          <span className="text-green-400">{resolvedCount} resolved</span>
        </div>
      </div>

      {comments.length === 0 ? (
        <p className="text-gray-400 text-sm">No review comments found.</p>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 rounded border ${
                comment.resolved
                  ? 'bg-green-900/20 border-green-800'
                  : 'bg-yellow-900/20 border-yellow-800'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <a
                    href={`/pr/${comment.prNumber}`}
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    #{comment.prNumber}: {comment.prTitle}
                  </a>
                  <p className="text-gray-300 text-sm mt-1">{comment.comment}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    by @{comment.author} • {comment.createdAt}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setComments(prev =>
                      prev.map(c =>
                        c.id === comment.id ? { ...c, resolved: !c.resolved } : c
                      )
                    );
                  }}
                  className={`px-2 py-1 text-xs rounded ${
                    comment.resolved
                      ? 'bg-gray-600 hover:bg-gray-500'
                      : 'bg-green-600 hover:bg-green-500'
                  } text-white`}
                >
                  {comment.resolved ? 'Reopen' : 'Resolve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
