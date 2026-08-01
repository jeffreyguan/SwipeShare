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

  const body = await req.json()
  const { status, message, dining_hall, available_time } = body

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 })
  }

  const fields: string[] = []
  const values: unknown[] = []

  if (status !== undefined) {
    values.push(status)
    fields.push(`status = $${values.length}`)
  }
  if (message !== undefined) {
    values.push(message || null)
    fields.push(`message = $${values.length}`)
  }
  if (dining_hall !== undefined) {
    values.push(dining_hall || null)
    fields.push(`dining_hall = $${values.length}`)
  }
  if (available_time !== undefined) {
    values.push(available_time || null)
    fields.push(`available_time = $${values.length}`)
  }

  if (fields.length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 })
  }

  values.push(id)
  const idParam = values.length
  values.push(session.user.email)
  const emailParam = values.length

  const result = await pool.query(
    `UPDATE posts SET ${fields.join(", ")} WHERE id = $${idParam} AND author_email = $${emailParam} RETURNING *`,
    values
  )

  if (result.rows.length === 0) {
    return Response.json({ error: "Unauthorized" }, { status: 403 })
  }

  return Response.json(result.rows[0])
}