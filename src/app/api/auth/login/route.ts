import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, sessionCookie, verifyPassword } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    await ensureSeeded();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "We couldn't verify those credentials." }, { status: 401 });
    }

    const session = await createSession(user.id);
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
    response.cookies.set(sessionCookie(session.token, session.expiresAt));
    return response;
  } catch (error) {
    console.error("Login error", error);
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
  }
}
