import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"
import pool from "@/lib/db"

async function requireParticipant(id: string, email: string) {
  const result = await pool.query(
    `SELECT * FROM conversations WHERE id = $1 AND (user_one_email = $2 OR user_two_email = $2)`,
    [id, email]
  )
  return result.rows[0] ?? null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession()

  if (!session?.user?.email) {
    return Response.json({ error: "Not logged in" }, { status: 401 })
  }

  const conversation = await requireParticipant(id, session.user.email)
  if (!conversation) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const result = await pool.query(
    `SELECT messages.*, users.name as sender_name
     FROM messages
     JOIN users ON users.email = messages.sender_email
     WHERE conversation_id = $1
     ORDER BY created_at ASC`,
    [id]
  )

  await pool.query(
    `UPDATE messages SET read_at = now() WHERE conversation_id = $1 AND sender_email != $2 AND read_at IS NULL`,
    [id, session.user.email]
  )

  return Response.json(result.rows)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession()

  if (!session?.user?.email) {
    return Response.json({ error: "Not logged in" }, { status: 401 })
  }

  const { body } = await req.json()
  if (!body || !body.trim()) {
    return Response.json({ error: "Missing body" }, { status: 400 })
  }

  const conversation = await requireParticipant(id, session.user.email)
  if (!conversation) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const result = await pool.query(
    `INSERT INTO messages (conversation_id, sender_email, body)
    VALUES ($1, $2, $3)
    RETURNING messages.*, (SELECT name FROM users WHERE email = $2) as sender_name`,
    [id, session.user.email, body]
  )

  return Response.json(result.rows[0], { status: 201 })
}
