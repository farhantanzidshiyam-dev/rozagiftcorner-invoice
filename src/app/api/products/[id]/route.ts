import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, products } from "@/db/schema";
import { requireUser } from "@/lib/auth";

function productValues(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const sku = String(body.sku ?? "").trim().toUpperCase();
  const category = String(body.category ?? "").trim();
  const price = Number(body.price);
  const stock = Number(body.stock);
  const lowStockAt = Number(body.lowStockAt);
  if (!name || !sku || !category || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || !Number.isInteger(lowStockAt) || lowStockAt < 0) {
    throw new Error("Please provide a valid name, SKU, category, price and stock level.");
  }
  return {
    name,
    sku,
    category,
    unit: String(body.unit ?? "pcs").trim() || "pcs",
    price: price.toFixed(2),
    stock,
    lowStockAt,
    description: String(body.description ?? "").trim(),
    active: body.active !== false,
    updatedAt: new Date(),
  };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const id = Number((await params).id);
    const values = productValues((await request.json()) as Record<string, unknown>);
    const [product] = await db.update(products).set(values).where(eq(products.id, id)).returning();
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    await db.insert(activityLogs).values({ action: "Inventory updated", detail: `${product.name} stock was updated`, kind: "inventory" });
    return NextResponse.json(product);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update product.";
    return NextResponse.json({ error: message }, { status: message.includes("valid") ? 400 : 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const id = Number((await params).id);
    const [product] = await db.delete(products).where(eq(products.id, id)).returning();
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    await db.insert(activityLogs).values({ action: "Inventory removed", detail: `${product.name} was removed from inventory`, kind: "inventory" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove product.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
