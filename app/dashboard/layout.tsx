import { Sidebar } from "@/components/sidebar";
import { createServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-0 lg:pt-0">
        {/* Mobile top spacing */}
        <div className="h-14 lg:hidden" />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
