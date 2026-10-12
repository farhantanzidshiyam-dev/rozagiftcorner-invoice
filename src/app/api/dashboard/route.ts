import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, customers, invoiceItems, invoices, products } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser();
    const [customerRows, productRows, invoiceRows, itemRows, activityRows] = await Promise.all([
      db.select().from(customers).orderBy(desc(customers.createdAt)),
      db.select().from(products).orderBy(desc(products.createdAt)),
      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          customerId: invoices.customerId,
          status: invoices.status,
          issueDate: invoices.issueDate,
          dueDate: invoices.dueDate,
          subtotal: invoices.subtotal,
          tax: invoices.tax,
          total: invoices.total,
          notes: invoices.notes,
          createdAt: invoices.createdAt,
          updatedAt: invoices.updatedAt,
          customerName: customers.name,
          customerCompany: customers.company,
          customerEmail: customers.email,
        })
        .from(invoices)
        .innerJoin(customers, eq(invoices.customerId, customers.id))
        .orderBy(desc(invoices.issueDate)),
      db
        .select({
          id: invoiceItems.id,
          invoiceId: invoiceItems.invoiceId,
          productId: invoiceItems.productId,
          description: invoiceItems.description,
          quantity: invoiceItems.quantity,
          unitPrice: invoiceItems.unitPrice,
          total: invoiceItems.total,
        })
        .from(invoiceItems),
      db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(8),
    ]);

    const itemsByInvoice = new Map<number, typeof itemRows>();
    for (const item of itemRows) {
      const existing = itemsByInvoice.get(item.invoiceId) ?? [];
      existing.push(item);
      itemsByInvoice.set(item.invoiceId, existing);
    }

    const hydratedInvoices = invoiceRows.map((invoice) => ({
      ...invoice,
      items: itemsByInvoice.get(invoice.id) ?? [],
    }));
    const totals = hydratedInvoices.reduce(
      (summary, invoice) => {
        const total = Number(invoice.total);
        if (invoice.status === "paid") summary.received += total;
        if (invoice.status === "sent" || invoice.status === "overdue") summary.outstanding += total;
        if (invoice.status === "overdue") summary.overdue += total;
        return summary;
      },
      { received: 0, outstanding: 0, overdue: 0 },
    );

    return NextResponse.json({
      customers: customerRows,
      products: productRows,
      invoices: hydratedInvoices,
      activities: activityRows,
      stats: {
        ...totals,
        customerCount: customerRows.length,
        lowStockCount: productRows.filter((product) => product.stock <= product.lowStockAt).length,
        openInvoiceCount: hydratedInvoices.filter((invoice) => invoice.status === "sent" || invoice.status === "overdue").length,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Dashboard error", error);
    return NextResponse.json({ error: "Unable to load dashboard data." }, { status: 500 });
  }
}
