import { getServerSession } from "next-auth"
import pool from "@/lib/db"

export async function POST(req: Request) {
  const session = await getServerSession()

  if (!session?.user?.email) {
    return Response.json({ error: "Not logged in" }, { status: 401 })
  }

  const { post_id } = await req.json()

  if (!post_id) {
    return Response.json({ error: "Missing post_id" }, { status: 400 })
  }

  const post = await pool.query(`SELECT id, author_email FROM posts WHERE id = $1`, [post_id])
  if (post.rows.length === 0) {
    return Response.json({ error: "Post not found" }, { status: 404 })
  }
  if (post.rows[0].author_email === session.user.email) {
    return Response.json({ error: "Cannot message yourself" }, { status: 400 })
  }

  const [userOne, userTwo] = [session.user.email, post.rows[0].author_email].sort()

  const existing = await pool.query(
    `SELECT * FROM conversations WHERE post_id = $1 AND user_one_email = $2 AND user_two_email = $3`,
    [post_id, userOne, userTwo]
  )
  if (existing.rows.length > 0) {
    return Response.json(existing.rows[0])
  }

  const result = await pool.query(
    `INSERT INTO conversations (post_id, user_one_email, user_two_email)
    VALUES ($1, $2, $3)
    RETURNING *`,
    [post_id, userOne, userTwo]
  )

  return Response.json(result.rows[0], { status: 201 })
}

export async function GET() {
  const session = await getServerSession()

  if (!session?.user?.email) {
    return Response.json({ error: "Not logged in" }, { status: 401 })
  }

  const result = await pool.query(
    `SELECT
      c.id,
      c.post_id,
      CASE WHEN c.user_one_email = $1 THEN c.user_two_email ELSE c.user_one_email END AS other_email,
      ou.name AS other_name,
      p.type AS post_type,
      p.message AS post_message,
      p.dining_hall AS post_dining_hall,
      lm.body AS last_message,
      lm.created_at AS last_message_at,
      lm.sender_email AS last_message_sender,
      COALESCE(uc.count, 0) AS unread_count
    FROM conversations c
    JOIN users ou ON ou.email = CASE WHEN c.user_one_email = $1 THEN c.user_two_email ELSE c.user_one_email END
    LEFT JOIN posts p ON p.id = c.post_id
    LEFT JOIN LATERAL (
      SELECT body, created_at, sender_email FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1
    ) lm ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS count FROM messages m WHERE m.conversation_id = c.id AND m.sender_email != $1 AND m.read_at IS NULL
    ) uc ON true
    WHERE c.user_one_email = $1 OR c.user_two_email = $1
    ORDER BY COALESCE(lm.created_at, c.created_at) DESC`,
    [session.user.email]
  )

  return Response.json(result.rows)
}
