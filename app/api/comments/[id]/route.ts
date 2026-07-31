import { getServerSession } from "next-auth"
import { NextRequest } from 'next/server';
import pool from "@/lib/db"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession()

  if (!session?.user?.email) {
    return Response.json({ error: "Not logged in" }, { status: 401 })
  }

  const comment = await pool.query(`SELECT * FROM comments WHERE id = $1`, [id])
  if (comment.rows[0]?.author_email !== session.user.email) {
    return Response.json({ error: "Unauthorized" }, { status: 403 })
  }

  await pool.query(`DELETE FROM comments WHERE id = $1`, [id])
  return Response.json({ success: true })
}
