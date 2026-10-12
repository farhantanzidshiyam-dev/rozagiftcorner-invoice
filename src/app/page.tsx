import { redirect } from "next/navigation";
import BusinessDashboard from "@/components/business-dashboard";
import { getCurrentUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSeeded();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <BusinessDashboard user={user} />;
}
