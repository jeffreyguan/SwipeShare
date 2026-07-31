import { getServerSession } from "next-auth"
import { NextRequest } from 'next/server';
import pool from "@/lib/db"

const VALID_STATUSES = ["OPEN", "CLAIMED"]

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession()

  if (!session?.user?.email) {
    return Response.json({ error: "Not logged in" }, { status: 401 })
  }

  const post = await pool.query(`SELECT * FROM posts WHERE id = $1`, [id])
  if (post.rows[0]?.author_email !== session.user.email) {
    return Response.json({ error: "Unauthorized" }, { status: 403 })
  }

  await pool.query(`DELETE FROM posts WHERE id = $1`, [id])
  return Response.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession()

  if (!session?.user?.email) {
    return Response.json({ error: "Not logged in" }, { status: 401 })
  }

  const { status } = await req.json()

  if (!VALID_STATUSES.includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 })
  }

  const result = await pool.query(
    `UPDATE posts SET status = $1 WHERE id = $2 AND author_email = $3 RETURNING *`,
    [status, id, session.user.email]
  )

  if (result.rows.length === 0) {
    return Response.json({ error: "Unauthorized" }, { status: 403 })
  }

  return Response.json(result.rows[0])
}