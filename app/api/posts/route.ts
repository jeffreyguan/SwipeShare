import { getServerSession } from "next-auth"
import pool from "@/lib/db"

export async function POST(req: Request) {
  const session = await getServerSession()

  if (!session?.user?.email) {
    return Response.json({ error: "Not logged in" }, { status: 401 })
  }

  const { type, message, dining_hall, available_time } = await req.json()

  if (!type) {
    return Response.json({ error: "Missing type" }, { status: 400 })
  }

  const result = await pool.query(
    `INSERT INTO posts (type, message, dining_hall, available_time, author_email)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [type, message || null, dining_hall || null, available_time || null, session.user.email]
  )

  return Response.json(result.rows[0], { status: 201 })
}

export async function GET() {
  const result = await pool.query(
    `SELECT posts.*, users.name as author_name 
     FROM posts 
     JOIN users ON posts.author_email = users.email
     ORDER BY created_at DESC`
  )

  return Response.json(result.rows)
}