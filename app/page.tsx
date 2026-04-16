"use client"

import { useState, useEffect } from "react"
import type { Session } from "next-auth"
import { useSession, signIn, signOut } from "next-auth/react"

type Post = {
  id: number
  type: "DONATE" | "REQUEST"
  message: string
  dining_hall: string
  available_time: string
  author_name: string
  author_email: string
  created_at: string
}

type Comment = {
  id: number
  author_name: string
  message: string
}

type PostsResponse = {
  error?: string
  posts?: Post[]
}

type CommentsResponse = {
  error?: string
}

export default function Home() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [postsError, setPostsError] = useState<string | null>(null)
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [expandedPost, setExpandedPost] = useState<number | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadPosts = async () => {
      try {
        const res = await fetch("/api/posts")
        const data: Post[] | PostsResponse = await res.json()

        if (!isMounted) {
          return
        }

        if (!res.ok) {
          const errorMessage = !Array.isArray(data) && data.error
            ? data.error
            : "Couldn't load posts right now."

          setPosts([])
          setPostsError(errorMessage)
          return
        }

        setPosts(Array.isArray(data) ? data : data.posts ?? [])
        setPostsError(null)
      } catch {
        if (!isMounted) {
          return
        }

        setPosts([])
        setPostsError("Couldn't load posts right now.")
      } finally {
        if (isMounted) {
          setIsLoadingPosts(false)
        }
      }
    }

    void loadPosts()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main className="max-w-xl mx-auto px-4 py-8 text-left">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">SwipeShare</h1>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <span className="text-sm text-gray-500">{session.user?.email}</span>
              <button type="button" onClick={() => signOut()} className="text-sm text-red-500">Sign out</button>
            </>
          ) : (
            <button type="button" onClick={() => signIn("google", { callbackUrl: "/" }, { prompt: "select_account" })} className="bg-black text-white px-4 py-2 rounded-full text-sm">
              Sign in
            </button>
          )}
        </div>
      </div>

      {/* New Post Button */}
      {session && (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="w-full bg-black text-white py-2 rounded-full mb-6 font-medium"
        >
          + New Post
        </button>
      )}

      {/* Feed */}
      <div className="space-y-4">
        {isLoadingPosts && (
          <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            Loading posts...
          </p>
        )}

        {postsError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {postsError}
          </p>
        )}

        {!isLoadingPosts && !postsError && posts.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            No posts yet. Sign in to share an available swipe or request one.
          </p>
        )}

        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            expanded={expandedPost === post.id}
            onExpand={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
            onDelete={(id) => setPosts(posts.filter(p => p.id !== id))}
            session={session}
          />
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <NewPostModal
          onClose={() => setShowModal(false)}
          onPost={(newPost) => {
            setPosts([newPost, ...posts])
            setShowModal(false)
          }}
        />
      )}
    </main>
  )
}

function PostCard({ post, expanded, onExpand, onDelete, session }: {
  post: Post
  expanded: boolean
  onExpand: () => void
  onDelete: (id: number) => void
  session: Session | null
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")

  useEffect(() => {
    if (!expanded) {
      return
    }

    const loadComments = async () => {
      try {
        const res = await fetch(`/api/posts/${post.id}/comments`)
        const data: Comment[] | CommentsResponse = await res.json()

        if (!res.ok || !Array.isArray(data)) {
          setComments([])
          return
        }

        setComments(data)
      } catch {
        setComments([])
      }
    }

    void loadComments()
  }, [expanded, post.id])

  const submitComment = async () => {
    if (!newComment.trim()) return

    const response = await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: newComment })
    })

    if (!response.ok) {
      return
    }

    setNewComment("")

    try {
      const res = await fetch(`/api/posts/${post.id}/comments`)
      const data: Comment[] | CommentsResponse = await res.json()
      setComments(Array.isArray(data) ? data : [])
    } catch {
      setComments([])
    }
  }

  return (
    <div className="border rounded-xl p-4">
      {/* Post Header */}
      <div className="flex justify-between items-center mb-2">
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          post.type === "DONATE" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
        }`}>
          {post.type}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(post.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Post Body */}
      <p className="text-sm mb-1">{post.message}</p>
      {post.dining_hall && <p className="text-xs text-gray-500"> Location: {post.dining_hall}</p>}
      {post.available_time && (
        <p className="text-xs text-gray-500">
          {new Date(post.available_time).toLocaleString()}
        </p>
      )}
      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-gray-400">Name: {post.author_name}</p>
        {session?.user?.email === post.author_email && (
            <button
            type="button"
            onClick={async () => {
                await fetch(`/api/posts/${post.id}`, { method: "DELETE" })
                onDelete(post.id)
            }}
            className="text-xs text-gray-300 hover:text-red-400"
            >
            Delete
            </button>
        )}
      </div>

      {/* Comments Toggle */}
      <button
        type="button"
        onClick={onExpand}
        className="text-xs text-gray-400 mt-3 hover:text-gray-600 hover:underline"
      >
        {expanded ? "Hide comments" : "View comments"}
      </button>

      {/* Comments Section */}
      {expanded && (
        <div className="mt-3 space-y-2">
          {comments.length === 0 && (
            <p className="text-xs text-gray-400">No comments yet</p>
          )}
          {comments.map(comment => (
            <div key={comment.id} className="text-sm border-l-2 pl-3">
              <span className="font-medium text-xs">{comment.author_name}</span>
              <p>{comment.message}</p>
            </div>
          ))}

          {session && (
            <div className="flex gap-2 mt-2">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 border rounded-full px-3 py-1 text-sm text-black bg-white"
              />
              <button
                type="button"
                onClick={submitComment}
                className="bg-black text-white px-3 py-1 rounded-full text-sm"
              >
                Post
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NewPostModal({ onClose, onPost }: {
  onClose: () => void
  onPost: (post: Post) => void
}) {
  const [type, setType] = useState<"DONATE" | "REQUEST">("DONATE")
  const [message, setMessage] = useState("")
  const [diningHall, setDiningHall] = useState("")
  const [availableDate, setAvailableDate] = useState("")
  const [availableHour, setAvailableHour] = useState("")
  const [availableMinute, setAvailableMinute] = useState("")
  const [availablePeriod, setAvailablePeriod] = useState<"AM" | "PM">("AM")

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

  const submit = async () => {
    // Validate time if provided
    if (availableHour || availableMinute) {
      const hour = parseInt(availableHour, 10)
      const minute = parseInt(availableMinute, 10)
      
      if (isNaN(hour) || hour < 1 || hour > 12) {
        alert("Please enter a valid hour (1-12)")
        return
      }
      if (isNaN(minute) || minute < 0 || minute > 59) {
        alert("Please enter a valid minute (0-59)")
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
    const post = await res.json()
    onPost(post)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg text-black">New Post</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-black">✕</button>
        </div>

        {/* Type Toggle */}
        <div className="flex gap-2 mb-4">
          {["DONATE", "REQUEST"].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t as "DONATE" | "REQUEST")}
              className={`flex-1 py-2 rounded-full text-sm font-medium ${
                type === t ? "bg-black text-white" : "border text-gray-500"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Message */}
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Add a short message (optional)"
          className="w-full border rounded-xl p-3 text-sm mb-3 resize-none text-black"
          rows={3}
        />

        {/* Dining Hall */}
        <select
          value={diningHall}
          onChange={e => setDiningHall(e.target.value)}
          className="w-full border rounded-xl p-3 text-sm mb-3 text-black h-12"
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
          className="w-full border rounded-xl p-3 text-sm mb-3 text-black h-12"
        />

        {/* Time Inputs */}
        <div className="flex gap-1 mb-4 justify-center">
          <input
            type="text"
            value={availableHour}
            onChange={e => setAvailableHour(e.target.value)}
            placeholder="HH"
            maxLength={2}
            className="w-16 border rounded-xl p-3 text-sm text-black h-12 text-center"
          />
          <div className="flex items-center text-black px-1 text-lg font-bold">:</div>
          <input
            type="text"
            value={availableMinute}
            onChange={e => setAvailableMinute(e.target.value)}
            placeholder="MM"
            maxLength={2}
            className="w-16 border rounded-xl p-3 text-sm text-black h-12 text-center"
          />
          <select
            value={availablePeriod}
            onChange={e => setAvailablePeriod(e.target.value as "AM" | "PM")}
            className="w-16 border rounded-xl p-3 text-sm text-black h-12 text-center"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>

        <button
          type="button"
          onClick={submit}
          className="w-full bg-black text-white py-2 rounded-full font-medium"
        >
          Post
        </button>
      </div>
    </div>
  )
}
