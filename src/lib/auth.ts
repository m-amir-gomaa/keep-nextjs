import NextAuth, { CredentialsSignin } from "next-auth";
import { consumeRate, clientIdentity } from "@/lib/rate-limit";
import { ApiError } from "@/lib/api";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { parseCredentials } from "@/lib/auth-input";

class LimitedSignIn extends CredentialsSignin {
  code = "rate_limited";
}
class UnavailableSignIn extends CredentialsSignin {
  code = "service_unavailable";
}
const configured = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 7 * 86400 },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const input = parseCredentials(credentials);
        if (!input) return null;

        try {
          await consumeRate("login-global", "all", 200, 3600);
          await consumeRate("login-email", input.email, 10);
          await consumeRate(
            "login-ip",
            request ? clientIdentity(request) : "local-unknown",
            30,
          );
          const [userRecord] = await db
            .select()
            .from(users)
            .where(eq(sql`lower(${users.email})`, input.email))
            .limit(1);
          // A real bcrypt operation also runs for missing accounts.
          const hash =
            userRecord?.password ??
            "$2b$10$yBiDCE33w4GjfPIgn8LRze3knNscYiOF1iRt1xZ3hbHG3tG8WUxzu";
          const valid = await bcrypt.compare(input.password, hash);
          if (!userRecord || !valid) return null;
          return {
            id: userRecord.id,
            email: userRecord.email,
            name: userRecord.name,
            sessionVersion: userRecord.sessionVersion ?? 0,
          };
        } catch (e) {
          if (e instanceof ApiError && e.status === 429)
            throw new LimitedSignIn();
          throw new UnavailableSignIn();
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.sessionVersion = user.sessionVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
        session.user.sessionVersion = Number(token.sessionVersion ?? 0);
      }
      return session;
    },
  },
});

export const { handlers, signIn, signOut } = configured;
export async function auth() {
  const session = await configured.auth();
  if (!session?.user?.id) return null;
  const [owner] = await db
    .select({ version: users.sessionVersion })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  return owner && owner.version === session.user.sessionVersion
    ? session
    : null;
}
