import { getServerSession } from "next-auth"
import pool from "@/lib/db"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession()

  if (!session?.user?.email) {
    return Response.json({ error: "Not logged in" }, { status: 401 })
  }

  const { message } = await req.json()

  if (!message) {
    return Response.json({ error: "Missing message" }, { status: 400 })
  }

  const result = await pool.query(
    `INSERT INTO comments (post_id, author_email, message)
    VALUES ($1, $2, $3)
    RETURNING comments.*, (SELECT name FROM users WHERE email = $2) as author_name`,
    [id, session.user.email, message]
  )

  return Response.json(result.rows[0], { status: 201 })
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const result = await pool.query(
    `SELECT comments.*, users.name as author_name
     FROM comments
     JOIN users ON comments.author_email = users.email
     WHERE post_id = $1
     ORDER BY created_at ASC`,
    [id]
  )

  return Response.json(result.rows)
}