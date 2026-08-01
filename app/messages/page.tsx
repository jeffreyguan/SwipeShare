"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useSession, signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Send, Loader2, Gift, HandHeart, UtensilsCrossed } from "lucide-react"

type Conversation = {
  id: number
  post_id: number | null
  other_email: string
  other_name: string
  post_type: "DONATE" | "REQUEST" | null
  post_message: string | null
  post_dining_hall: string | null
  last_message: string | null
  last_message_at: string | null
  last_message_sender: string | null
  unread_count: number
}

type Message = {
  id: number
  conversation_id: number
  sender_email: string
  sender_name: string
  body: string
  created_at: string
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" })
}

function MessagesInner() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get("c") ? Number(searchParams.get("c")) : null

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadedConversationId, setLoadedConversationId] = useState<number | null>(null)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(() => {
    fetch("/api/conversations")
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
      .then(setConversations)
      .catch(() => {})
      .finally(() => setConversationsLoading(false))
  }, [])

  const loadMessages = useCallback((id: number) => {
    fetch(`/api/conversations/${id}/messages`)
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: Message[]) => {
        setMessages(data)
        setLoadedConversationId(id)
        setConversations(cs => cs.map(c => (c.id === id ? { ...c, unread_count: 0 } : c)))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return
    loadConversations()
    const interval = setInterval(loadConversations, 4000)
    return () => clearInterval(interval)
  }, [status, loadConversations])

  useEffect(() => {
    if (!selectedId || status !== "authenticated") return
    loadMessages(selectedId)
    const interval = setInterval(() => loadMessages(selectedId), 3000)
    return () => clearInterval(interval)
  }, [selectedId, status, loadMessages])

  const messagesLoading = selectedId !== null && loadedConversationId !== selectedId

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const selected = conversations.find(c => c.id === selectedId) ?? null

  const sendMessage = async () => {
    if (!selectedId || !draft.trim() || sending) return
    setSending(true)
    const res = await fetch(`/api/conversations/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft })
    })
    setSending(false)
    if (!res.ok) return
    const message = await res.json()
    setMessages(m => [...m, message])
    setDraft("")
    loadConversations()
  }

  if (status === "loading") {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center text-muted">
        <Loader2 size={20} className="animate-spin mx-auto" />
      </main>
    )
  }

  if (status === "unauthenticated") {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-muted mb-4">Sign in to view your messages.</p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/messages" }, { prompt: "select_account" })}
          className="bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
        >
          Sign in
        </button>
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.push("/")} className="text-muted hover:text-foreground transition-colors" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Messages</h1>
      </div>

      <div className="flex border border-border rounded-xl overflow-hidden bg-card" style={{ minHeight: "60vh" }}>
        {/* Conversation list */}
        <div className={`w-full sm:w-64 sm:shrink-0 border-r border-border overflow-y-auto ${selectedId ? "hidden sm:block" : ""}`}>
          {conversationsLoading ? (
            <p className="text-sm text-muted p-4">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-muted p-4">No conversations yet.</p>
          ) : (
            conversations.map(c => (
              <button
                key={c.id}
                onClick={() => router.push(`/messages?c=${c.id}`)}
                className={`w-full text-left px-4 py-3 border-b border-border hover:bg-background transition-colors ${
                  selectedId === c.id ? "bg-background" : ""
                }`}
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="font-medium text-sm truncate">{c.other_name}</span>
                  {c.unread_count > 0 && (
                    <span className="bg-brand text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {c.unread_count}
                    </span>
                  )}
                </div>
                {c.post_type && (
                  <p className="flex items-center gap-1 text-[11px] text-muted mt-0.5">
                    {c.post_type === "DONATE" ? <Gift size={10} /> : <HandHeart size={10} />}
                    {c.post_dining_hall || c.post_type}
                  </p>
                )}
                {c.last_message && (
                  <p className="text-xs text-muted truncate mt-0.5">{c.last_message}</p>
                )}
              </button>
            ))
          )}
        </div>

        {/* Thread */}
        <div className={`flex-1 flex flex-col ${selectedId ? "" : "hidden sm:flex"}`}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted text-sm">
              <div className="text-center">
                <UtensilsCrossed size={24} className="mx-auto mb-2 opacity-50" />
                Select a conversation
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <button onClick={() => router.push("/messages")} className="sm:hidden text-muted hover:text-foreground transition-colors" aria-label="Back to list">
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <p className="font-medium text-sm">{selected.other_name}</p>
                  {selected.post_type && (
                    <p className="text-[11px] text-muted">Re: {selected.post_type === "DONATE" ? "donation" : "request"} at {selected.post_dining_hall || "dining hall"}</p>
                  )}
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {messagesLoading ? (
                  <p className="text-xs text-muted">Loading...</p>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-muted">No messages yet. Say hello.</p>
                ) : (
                  messages.map(m => {
                    const mine = m.sender_email === session?.user?.email
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-brand text-white" : "bg-background border border-border"}`}>
                          <p>{m.body}</p>
                          <p className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-muted"}`}>{timeAgo(m.created_at)}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="flex gap-2 border-t border-border p-3">
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 border border-border rounded-full px-3 py-2 text-sm bg-card"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !draft.trim()}
                  className="bg-brand hover:bg-brand-hover text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
                  aria-label="Send"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesInner />
    </Suspense>
  )
}
