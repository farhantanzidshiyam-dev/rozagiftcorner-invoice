import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, invoiceItems, invoices } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { nextInvoiceNumber } from "@/lib/seed";

const validStatuses = ["draft", "sent", "paid", "overdue", "cancelled"] as const;
type InvoiceStatus = (typeof validStatuses)[number];

type ParsedItem = {
  productId: number | null;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
};

function parseInvoice(body: Record<string, unknown>) {
  const customerId = Number(body.customerId);
  const status = String(body.status ?? "draft") as InvoiceStatus;
  const issueDate = new Date(String(body.issueDate ?? new Date().toISOString()));
  const dueDate = new Date(String(body.dueDate ?? new Date().toISOString()));
  const incomingItems = Array.isArray(body.items) ? body.items : [];
  if (!Number.isInteger(customerId) || customerId <= 0 || !validStatuses.includes(status) || Number.isNaN(issueDate.getTime()) || Number.isNaN(dueDate.getTime())) {
    throw new Error("Please complete the invoice details.");
  }
  if (!incomingItems.length) throw new Error("Add at least one line item to the invoice.");

  const items: ParsedItem[] = incomingItems.map((value) => {
    const item = value as Record<string, unknown>;
    const description = String(item.description ?? "").trim();
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const productId = item.productId ? Number(item.productId) : null;
    if (!description || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error("Every line item needs a description, quantity and price.");
    }
    return {
      productId: Number.isInteger(productId) && (productId ?? 0) > 0 ? productId : null,
      description,
      quantity,
      unitPrice: unitPrice.toFixed(2),
      total: (quantity * unitPrice).toFixed(2),
    };
  });

  const subtotal = items.reduce((sum, item) => sum + Number(item.total), 0);
  const tax = subtotal * 0.18;
  return {
    customerId,
    status,
    issueDate,
    dueDate,
    notes: String(body.notes ?? "").trim(),
    items,
    subtotal: subtotal.toFixed(2),
    tax: tax.toFixed(2),
    total: (subtotal + tax).toFixed(2),
  };
}

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await db.select().from(invoices).orderBy(desc(invoices.issueDate)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load invoices." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const values = parseInvoice((await request.json()) as Record<string, unknown>);
    const invoiceNumber = await nextInvoiceNumber();
    const invoice = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(invoices)
        .values({
          invoiceNumber,
          customerId: values.customerId,
          status: values.status,
          issueDate: values.issueDate,
          dueDate: values.dueDate,
          subtotal: values.subtotal,
          tax: values.tax,
          total: values.total,
          notes: values.notes,
        })
        .returning();
      await tx.insert(invoiceItems).values(values.items.map((item) => ({ ...item, invoiceId: created.id })));
      await tx.insert(activityLogs).values({ action: "Invoice created", detail: `${created.invoiceNumber} was created`, kind: "invoice" });
      return created;
    });
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create invoice.";
    return NextResponse.json({ error: message }, { status: message.includes("invoice") || message.includes("line") ? 400 : 500 });
  }
}
