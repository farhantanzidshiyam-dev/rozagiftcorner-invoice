import { desc } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  customers,
  invoiceItems,
  invoices,
  products,
  users,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

export async function ensureSeeded() {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length) return;

  const passwordHash = await hashPassword("roza2026");

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      name: "Rohan Verma",
      email: "owner@rozagift.in",
      passwordHash,
      role: "Business Owner",
    });

    const seededCustomers = await tx
      .insert(customers)
      .values([
        {
          name: "Asha Sharma",
          email: "asha.sharma@gmail.com",
          phone: "+91 98765 43210",
          company: "Sharma Events",
          address: "18 Civil Lines, Jaipur, Rajasthan",
          notes: "Corporate gifting orders each quarter.",
        },
        {
          name: "Vikram Mehta",
          email: "vikram@mehtaenterprises.in",
          phone: "+91 98290 11223",
          company: "Mehta Enterprises",
          address: "Plot 8, Mansarovar Industrial Area, Jaipur",
          notes: "Prefers bank transfer billing.",
        },
        {
          name: "Nisha Gupta",
          email: "nisha.gupta@outlook.com",
          phone: "+91 99820 76431",
          company: "Gupta Residence",
          address: "42 Vaishali Nagar, Jaipur, Rajasthan",
          notes: "Festival season decoration customer.",
        },
        {
          name: "Rajeev Khanna",
          email: "rajeev@khannafashion.com",
          phone: "+91 94140 55678",
          company: "Khanna Fashion House",
          address: "22 Bapu Bazaar, Jaipur, Rajasthan",
          notes: "Monthly electrical supplies.",
        },
        {
          name: "Pooja Sethi",
          email: "pooja@sethirealty.in",
          phone: "+91 90010 44220",
          company: "Sethi Realty",
          address: "Tower B, Tonk Road, Jaipur",
          notes: "New office handover hampers.",
        },
        {
          name: "Hotel Marigold",
          email: "procurement@hotelmarigold.in",
          phone: "+91 87641 23000",
          company: "Hotel Marigold",
          address: "Amer Road, Jaipur, Rajasthan",
          notes: "Bulk Diwali gift cartons.",
        },
      ])
      .returning();

    const seededProducts = await tx
      .insert(products)
      .values([
        {
          name: "Crystal LED Table Lamp",
          sku: "ELEC-CL-100",
          category: "Electrical",
          unit: "pcs",
          price: "1299.00",
          stock: 18,
          lowStockAt: 6,
          description: "Warm white crystal-finish bedside lamp.",
        },
        {
          name: "Premium Gift Hamper",
          sku: "GIFT-PH-204",
          category: "Gifts",
          unit: "box",
          price: "1899.00",
          stock: 32,
          lowStockAt: 8,
          description: "Curated dry fruit, candle and keepsake hamper.",
        },
        {
          name: "Designer Wall Clock",
          sku: "DECO-WC-330",
          category: "Home Decor",
          unit: "pcs",
          price: "1499.00",
          stock: 5,
          lowStockAt: 7,
          description: "Silent sweep contemporary wall clock.",
        },
        {
          name: "Copper Bottle Set",
          sku: "GIFT-CB-118",
          category: "Gifts",
          unit: "set",
          price: "999.00",
          stock: 9,
          lowStockAt: 10,
          description: "Set of 2 pure copper bottles in gift packaging.",
        },
        {
          name: "Extension Board 4 Socket",
          sku: "ELEC-EB-402",
          category: "Electrical",
          unit: "pcs",
          price: "649.00",
          stock: 42,
          lowStockAt: 10,
          description: "4 socket surge-protected power board.",
        },
        {
          name: "Festive Lantern Pair",
          sku: "DECO-FL-216",
          category: "Home Decor",
          unit: "pair",
          price: "799.00",
          stock: 3,
          lowStockAt: 6,
          description: "Gold-finish metal lanterns with LED tea lights.",
        },
        {
          name: "Wireless Doorbell",
          sku: "ELEC-WD-822",
          category: "Electrical",
          unit: "pcs",
          price: "899.00",
          stock: 14,
          lowStockAt: 5,
          description: "Battery-powered wireless doorbell kit.",
        },
      ])
      .returning();

    const byName = (name: string) => seededProducts.find((product) => product.name === name)!;
    const makeInvoice = async (input: {
      number: string;
      customerIndex: number;
      status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
      issueOffset: number;
      dueOffset: number;
      items: Array<{ product: string; quantity: number }>;
      notes?: string;
    }) => {
      const itemRows = input.items.map(({ product, quantity }) => {
        const selected = byName(product);
        const unitPrice = Number(selected.price);
        return {
          productId: selected.id,
          description: selected.name,
          quantity,
          unitPrice: unitPrice.toFixed(2),
          total: (unitPrice * quantity).toFixed(2),
        };
      });
      const subtotal = itemRows.reduce((sum, item) => sum + Number(item.total), 0);
      const tax = subtotal * 0.18;
      const [invoice] = await tx
        .insert(invoices)
        .values({
          invoiceNumber: input.number,
          customerId: seededCustomers[input.customerIndex].id,
          status: input.status,
          issueDate: daysFromNow(input.issueOffset),
          dueDate: daysFromNow(input.dueOffset),
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: (subtotal + tax).toFixed(2),
          notes: input.notes ?? "Thank you for choosing Roza Gift Corner & Electric.",
        })
        .returning();
      await tx.insert(invoiceItems).values(itemRows.map((item) => ({ ...item, invoiceId: invoice.id })));
    };

    await makeInvoice({
      number: "RG-2026-0148",
      customerIndex: 0,
      status: "paid",
      issueOffset: -12,
      dueOffset: -2,
      items: [
        { product: "Premium Gift Hamper", quantity: 8 },
        { product: "Crystal LED Table Lamp", quantity: 4 },
      ],
    });
    await makeInvoice({
      number: "RG-2026-0149",
      customerIndex: 1,
      status: "sent",
      issueOffset: -5,
      dueOffset: 9,
      items: [
        { product: "Extension Board 4 Socket", quantity: 12 },
        { product: "Wireless Doorbell", quantity: 6 },
      ],
    });
    await makeInvoice({
      number: "RG-2026-0150",
      customerIndex: 3,
      status: "overdue",
      issueOffset: -18,
      dueOffset: -4,
      items: [
        { product: "Crystal LED Table Lamp", quantity: 3 },
        { product: "Designer Wall Clock", quantity: 2 },
      ],
      notes: "Reminder sent on 11 March.",
    });
    await makeInvoice({
      number: "RG-2026-0151",
      customerIndex: 5,
      status: "sent",
      issueOffset: -2,
      dueOffset: 14,
      items: [
        { product: "Premium Gift Hamper", quantity: 15 },
        { product: "Festive Lantern Pair", quantity: 5 },
      ],
    });
    await makeInvoice({
      number: "RG-2026-0152",
      customerIndex: 4,
      status: "draft",
      issueOffset: 0,
      dueOffset: 15,
      items: [
        { product: "Copper Bottle Set", quantity: 10 },
        { product: "Designer Wall Clock", quantity: 3 },
      ],
    });

    await tx.insert(activityLogs).values([
      { action: "Payment received", detail: "₹24,650 received for RG-2026-0148", kind: "payment", createdAt: daysFromNow(-1) },
      { action: "Invoice sent", detail: "RG-2026-0151 sent to Hotel Marigold", kind: "invoice", createdAt: daysFromNow(-2) },
      { action: "Inventory alert", detail: "Festive Lantern Pair reached low stock", kind: "inventory", createdAt: daysFromNow(-3) },
      { action: "New customer", detail: "Sethi Realty was added to customers", kind: "customer", createdAt: daysFromNow(-5) },
    ]);
  });
}

export async function nextInvoiceNumber() {
  const latest = await db.select({ invoiceNumber: invoices.invoiceNumber }).from(invoices).orderBy(desc(invoices.id)).limit(1);
  const last = latest[0]?.invoiceNumber?.match(/(\d+)$/)?.[1];
  const number = last ? Number(last) + 1 : 1500;
  return `RG-${new Date().getFullYear()}-${String(number).padStart(4, "0")}`;
}
