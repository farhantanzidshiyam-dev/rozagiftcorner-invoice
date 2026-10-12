import { desc } from "drizzle-orm";
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

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await db.select().from(products).orderBy(desc(products.createdAt)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load inventory." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const values = productValues((await request.json()) as Record<string, unknown>);
    const [product] = await db.insert(products).values(values).returning();
    await db.insert(activityLogs).values({ action: "Inventory added", detail: `${product.name} was added to inventory`, kind: "inventory" });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create product.";
    return NextResponse.json({ error: message }, { status: message.includes("valid") ? 400 : 500 });
  }
}
