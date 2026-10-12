import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { getSessionToken } from "@/lib/auth";

export async function POST() {
  const token = await getSessionToken();
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: "roza_session", value: "", path: "/", maxAge: 0 });
  return response;
}
