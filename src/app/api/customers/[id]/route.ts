import { eq } from "drizzle-orm";
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const id = Number((await params).id);
    const values = customerValues((await request.json()) as Record<string, unknown>);
    const [customer] = await db.update(customers).set(values).where(eq(customers.id, id)).returning();
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    await db.insert(activityLogs).values({ action: "Customer updated", detail: `${customer.name}'s details were updated`, kind: "customer" });
    return NextResponse.json(customer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update customer.";
    return NextResponse.json({ error: message }, { status: message.includes("required") ? 400 : 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const id = Number((await params).id);
    const [customer] = await db.delete(customers).where(eq(customers.id, id)).returning();
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    await db.insert(activityLogs).values({ action: "Customer removed", detail: `${customer.name} was removed from customers`, kind: "customer" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove customer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
