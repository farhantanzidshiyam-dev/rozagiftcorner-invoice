import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, customers } from "@/db/schema";
import { requireUser } from "@/lib/auth";

function customerValues(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();
  const company = String(body.company ?? "").trim();
  if (!name || !email || !phone || !company) throw new Error("Name, email, phone and company are required.");
  return {
    name,
    email,
    phone,
    company,
    address: String(body.address ?? "").trim(),
    notes: String(body.notes ?? "").trim(),
    active: body.active !== false,
    updatedAt: new Date(),
  };
}

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await db.select().from(customers).orderBy(desc(customers.createdAt)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load customers." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const values = customerValues((await request.json()) as Record<string, unknown>);
    const [customer] = await db.insert(customers).values(values).returning();
    await db.insert(activityLogs).values({ action: "New customer", detail: `${customer.name} was added to customers`, kind: "customer" });
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create customer.";
    return NextResponse.json({ error: message }, { status: message.includes("required") ? 400 : 500 });
  }
}
