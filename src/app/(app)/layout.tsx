import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="bg-background flex min-h-screen">
      <AppSidebar isAdmin={Boolean(session.user.isAdmin)} />
      <div className="flex flex-1 flex-col">
        <AppTopbar user={session.user} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
