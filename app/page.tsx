"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import type { Session } from "next-auth"
import {
  Gift,
  HandHeart,
  MapPin,
  Clock,
  MessageCircle,
  Trash2,
  X,
  Plus,
  Check,
  RotateCcw,
  LogOut,
  Loader2,
  UtensilsCrossed,
} from "lucide-react"

type PostType = "DONATE" | "REQUEST"
type PostStatus = "OPEN" | "CLAIMED"

type Post = {
  id: number
  type: PostType
  message: string | null
  dining_hall: string | null
  available_time: string | null
  status: PostStatus
  author_name: string
  author_email: string
  created_at: string
}

type Comment = {
  id: number
  post_id: number
  message: string
  author_name: string
  author_email: string
  created_at: string
}

type Toast = { id: number; message: string; kind: "error" | "success" }

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" })
}

function formatAvailableTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

  if (d.toDateString() === now.toDateString()) return `Today, ${time}`
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`
}

export default function Home() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [expandedPost, setExpandedPost] = useState<number | null>(null)
  const [filter, setFilter] = useState<"ALL" | PostType>("ALL")
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, kind: Toast["kind"] = "error") => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message, kind }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  useEffect(() => {
    fetch("/api/posts")
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
      .then(setPosts)
      .catch(() => showToast("Couldn't load posts. Try refreshing."))
      .finally(() => setLoading(false))
  }, [showToast])

  const visiblePosts = posts.filter(p => filter === "ALL" || p.type === filter)
  const openPosts = visiblePosts.filter(p => p.status === "OPEN")
  const claimedPosts = visiblePosts.filter(p => p.status === "CLAIMED")

  return (
    <main className="max-w-xl mx-auto px-4 py-8 text-left">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-brand text-white rounded-lg p-1.5">
            <UtensilsCrossed size={18} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">SwipeShare</h1>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <span className="hidden sm:block text-sm text-muted">{session.user?.email}</span>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1 text-sm text-muted hover:text-red-500 transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn("google", { callbackUrl: "/" }, { prompt: "select_account" })}
              className="bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 bg-card border border-border rounded-full p-1">
        {(["ALL", "DONATE", "REQUEST"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f ? "bg-brand text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {f === "ALL" ? "All" : f === "DONATE" ? "Donate" : "Request"}
          </button>
        ))}
      </div>

      {/* New Post Button */}
      {session && (
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-hover text-white py-2.5 rounded-full mb-6 font-medium transition-colors"
        >
          <Plus size={16} />
          New Post
        </button>
      )}

      {/* Feed */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="border border-border bg-card rounded-xl p-4 animate-pulse">
              <div className="h-4 w-20 bg-border rounded-full mb-3" />
              <div className="h-3 w-full bg-border rounded mb-2" />
              <div className="h-3 w-2/3 bg-border rounded" />
            </div>
          ))}
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <UtensilsCrossed size={28} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No posts yet. Be the first to share a swipe.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {openPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              expanded={expandedPost === post.id}
              onExpand={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
              onDelete={id => setPosts(posts.filter(p => p.id !== id))}
              onStatusChange={updated => setPosts(posts.map(p => (p.id === updated.id ? updated : p)))}
              session={session}
              showToast={showToast}
            />
          ))}

          {claimedPosts.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted uppercase tracking-wide pt-2">Claimed</p>
              {claimedPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  expanded={expandedPost === post.id}
                  onExpand={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                  onDelete={id => setPosts(posts.filter(p => p.id !== id))}
                  onStatusChange={updated => setPosts(posts.map(p => (p.id === updated.id ? updated : p)))}
                  session={session}
                  showToast={showToast}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <NewPostModal
          onClose={() => setShowModal(false)}
          onPost={newPost => {
            setPosts([newPost, ...posts])
            setShowModal(false)
          }}
          showToast={showToast}
        />
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 items-end">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`animate-toast-in text-sm text-white px-4 py-2 rounded-lg shadow-lg ${
              t.kind === "error" ? "bg-red-500" : "bg-green-600"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </main>
  )
}

function PostCard({ post, expanded, onExpand, onDelete, onStatusChange, session, showToast }: {
  post: Post
  expanded: boolean
  onExpand: () => void
  onDelete: (id: number) => void
  onStatusChange: (post: Post) => void
  session: Session | null
  showToast: (message: string, kind?: Toast["kind"]) => void
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const isOwner = session?.user?.email === post.author_email
  const isClaimed = post.status === "CLAIMED"

  useEffect(() => {
    if (!expanded) return
    fetch(`/api/posts/${post.id}/comments`)
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
      .then(setComments)
      .catch(() => showToast("Couldn't load comments."))
      .finally(() => setCommentsLoading(false))
  }, [expanded, post.id, showToast])

  const submitComment = async () => {
    if (!newComment.trim() || submittingComment) return
    setSubmittingComment(true)
    const res = await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: newComment })
    })
    if (!res.ok) {
      showToast("Failed to post comment")
      setSubmittingComment(false)
      return
    }
    setNewComment("")
    const listRes = await fetch(`/api/posts/${post.id}/comments`)
    if (listRes.ok) setComments(await listRes.json())
    setSubmittingComment(false)
  }

  const deleteComment = async (commentId: number) => {
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" })
    if (!res.ok) {
      showToast("Failed to delete comment")
      return
    }
    setComments(comments.filter(c => c.id !== commentId))
  }

  const deletePost = async () => {
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" })
    if (!res.ok) {
      showToast("Failed to delete post")
      return
    }
    onDelete(post.id)
  }

  const toggleStatus = async () => {
    setUpdatingStatus(true)
    const nextStatus: PostStatus = isClaimed ? "OPEN" : "CLAIMED"
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    })
    setUpdatingStatus(false)
    if (!res.ok) {
      showToast("Failed to update post")
      return
    }
    onStatusChange(await res.json())
  }

  return (
    <div className={`border border-border bg-card rounded-xl p-4 transition-opacity ${isClaimed ? "opacity-60" : ""}`}>
      {/* Post Header */}
      <div className="flex justify-between items-center mb-2">
        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
          post.type === "DONATE" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
        }`}>
          {post.type === "DONATE" ? <Gift size={12} /> : <HandHeart size={12} />}
          {post.type}
        </span>
        {isClaimed ? (
          <span className="flex items-center gap-1 text-xs font-medium text-muted">
            <Check size={12} /> Claimed
          </span>
        ) : (
          <span className="text-xs text-muted">{timeAgo(post.created_at)}</span>
        )}
      </div>

      {/* Post Body */}
      {post.message && <p className="text-sm mb-1">{post.message}</p>}
      {post.dining_hall && (
        <p className="flex items-center gap-1 text-xs text-muted">
          <MapPin size={12} /> {post.dining_hall}
        </p>
      )}
      {post.available_time && (
        <p className="flex items-center gap-1 text-xs text-muted">
          <Clock size={12} /> {formatAvailableTime(post.available_time)}
        </p>
      )}

      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-muted">{post.author_name}</p>
        {isOwner && (
          <div className="flex items-center gap-3">
            <button
              onClick={toggleStatus}
              disabled={updatingStatus}
              className="flex items-center gap-1 text-xs text-muted hover:text-brand transition-colors disabled:opacity-50"
            >
              {updatingStatus ? (
                <Loader2 size={12} className="animate-spin" />
              ) : isClaimed ? (
                <RotateCcw size={12} />
              ) : (
                <Check size={12} />
              )}
              {isClaimed ? "Reopen" : "Mark claimed"}
            </button>
            <button
              onClick={deletePost}
              className="flex items-center gap-1 text-xs text-muted hover:text-red-500 transition-colors"
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Comments Toggle */}
      <button
        onClick={onExpand}
        className="flex items-center gap-1 text-xs text-muted mt-3 hover:text-foreground transition-colors"
      >
        <MessageCircle size={12} />
        {expanded ? "Hide comments" : "View comments"}
      </button>

      {/* Comments Section */}
      {expanded && (
        <div className="mt-3 space-y-2">
          {commentsLoading ? (
            <p className="text-xs text-muted">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted">No comments yet</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="text-sm border-l-2 border-border pl-3 flex justify-between items-start gap-2">
                <div>
                  <span className="font-medium text-xs">{comment.author_name}</span>
                  <p>{comment.message}</p>
                </div>
                {session?.user?.email === comment.author_email && (
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="text-muted hover:text-red-500 transition-colors shrink-0"
                    aria-label="Delete comment"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))
          )}

          {session && (
            <div className="flex gap-2 mt-2">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitComment()}
                placeholder="Add a comment..."
                className="flex-1 border border-border rounded-full px-3 py-1 text-sm text-foreground bg-card"
              />
              <button
                onClick={submitComment}
                disabled={submittingComment}
                className="bg-brand hover:bg-brand-hover text-white px-3 py-1 rounded-full text-sm transition-colors disabled:opacity-50"
              >
                {submittingComment ? <Loader2 size={14} className="animate-spin" /> : "Post"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NewPostModal({ onClose, onPost, showToast }: {
  onClose: () => void
  onPost: (post: Post) => void
  showToast: (message: string, kind?: Toast["kind"]) => void
}) {
  const [type, setType] = useState<PostType>("DONATE")
  const [message, setMessage] = useState("")
  const [diningHall, setDiningHall] = useState("")
  const [availableDate, setAvailableDate] = useState("")
  const [availableHour, setAvailableHour] = useState("")
  const [availableMinute, setAvailableMinute] = useState("")
  const [availablePeriod, setAvailablePeriod] = useState<"AM" | "PM">("AM")
  const [submitting, setSubmitting] = useState(false)

  const DINING_HALLS = [
    'Downstein',
    'Third North',
    'Lipton',
    'Kimmel',
    'Jasper Kane',
    'Palladium',
    'Upstein',
    'Crave'
  ]

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  const submit = async () => {
    if (submitting) return

    // Validate time if provided
    if (availableHour || availableMinute) {
      const hour = parseInt(availableHour, 10)
      const minute = parseInt(availableMinute, 10)

      if (isNaN(hour) || hour < 1 || hour > 12) {
        showToast("Please enter a valid hour (1-12)")
        return
      }
      if (isNaN(minute) || minute < 0 || minute > 59) {
        showToast("Please enter a valid minute (0-59)")
        return
      }
    }

    let availableTime = ""
    if (availableDate) {
      availableTime = availableDate
      if (availableHour && availableMinute) {
        // Convert 12-hour to 24-hour format
        let hour24 = parseInt(availableHour, 10)
        if (availablePeriod === "PM" && hour24 !== 12) {
          hour24 += 12
        } else if (availablePeriod === "AM" && hour24 === 12) {
          hour24 = 0
        }
        availableTime += `T${hour24.toString().padStart(2, '0')}:${availableMinute.padStart(2, '0')}`
      }
    }

    setSubmitting(true)
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        message,
        dining_hall: diningHall,
        available_time: availableTime
      })
    })
    setSubmitting(false)
    if (!res.ok) {
      showToast("Failed to create post")
      return
    }
    const post = await res.json()
    onPost(post)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">New Post</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Type Toggle */}
        <div className="flex gap-2 mb-4">
          {(["DONATE", "REQUEST"] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-medium transition-colors ${
                type === t ? "bg-brand text-white" : "border border-border text-muted"
              }`}
            >
              {t === "DONATE" ? <Gift size={14} /> : <HandHeart size={14} />}
              {t}
            </button>
          ))}
        </div>

        {/* Message */}
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Add a short message (optional)"
          className="w-full border border-border rounded-xl p-3 text-sm mb-3 resize-none bg-card"
          rows={3}
        />

        {/* Dining Hall */}
        <select
          value={diningHall}
          onChange={e => setDiningHall(e.target.value)}
          className="w-full border border-border rounded-xl p-3 text-sm mb-3 bg-card h-12"
        >
          <option value="">Select dining hall (optional)</option>
          {DINING_HALLS.map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>

        {/* Date */}
        <input
          type="date"
          value={availableDate}
          onChange={e => setAvailableDate(e.target.value)}
          className="w-full border border-border rounded-xl p-3 text-sm mb-3 bg-card h-12"
        />

        {/* Time Inputs */}
        <div className="flex gap-1 mb-4 justify-center">
          <input
            type="text"
            value={availableHour}
            onChange={e => setAvailableHour(e.target.value)}
            placeholder="HH"
            maxLength={2}
            className="w-16 border border-border rounded-xl p-3 text-sm bg-card h-12 text-center"
          />
          <div className="flex items-center px-1 text-lg font-bold">:</div>
          <input
            type="text"
            value={availableMinute}
            onChange={e => setAvailableMinute(e.target.value)}
            placeholder="MM"
            maxLength={2}
            className="w-16 border border-border rounded-xl p-3 text-sm bg-card h-12 text-center"
          />
          <select
            value={availablePeriod}
            onChange={e => setAvailablePeriod(e.target.value as "AM" | "PM")}
            className="w-16 border border-border rounded-xl p-3 text-sm bg-card h-12 text-center"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white py-2 rounded-full font-medium transition-colors disabled:opacity-50"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Post
        </button>
      </div>
    </div>
  )
}
