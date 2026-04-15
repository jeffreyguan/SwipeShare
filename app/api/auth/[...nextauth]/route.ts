import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import pool from "@/lib/db"

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    error: "/api/auth/signin",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email?.endsWith("@nyu.edu")) return false
      await pool.query(
        `INSERT INTO users (email, name) 
         VALUES ($1, $2) 
         ON CONFLICT (email) DO NOTHING`,
        [user.email, user.name]
      )
      return true
    },
  },
})

export { handler as GET, handler as POST }