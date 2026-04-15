import { getServerSession } from "next-auth"
import pool from "@/lib/db"

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
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