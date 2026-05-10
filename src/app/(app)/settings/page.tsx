import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logoutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "@/components/settings/profile-tab";
import { PreferencesTab } from "@/components/settings/preferences-tab";
import { SavedDestinationsTab } from "@/components/settings/saved-destinations-tab";
import { SecurityTab } from "@/components/settings/security-tab";
import { DangerZoneTab } from "@/components/settings/danger-zone-tab";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      avatarUrl: true,
      language: true,
      currency: true,
      personality: true,
      savedDestinations: {
        orderBy: { createdAt: "desc" },
        select: { id: true, city: true, country: true, notes: true },
      },
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm tracking-wide uppercase">
            Account
          </p>
          <h1 className="font-display mt-2 text-3xl tracking-tight">
            Settings
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Manage your profile, preferences, saved destinations, and security.
          </p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      <Tabs defaultValue="profile" className="mt-10">
        <TabsList className="border-border/60 mb-8 h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="profile"
            className="data-[state=active]:border-primary text-muted-foreground data-[state=active]:text-foreground rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="preferences"
            className="data-[state=active]:border-primary text-muted-foreground data-[state=active]:text-foreground rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Preferences
          </TabsTrigger>
          <TabsTrigger
            value="saved"
            className="data-[state=active]:border-primary text-muted-foreground data-[state=active]:text-foreground rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Saved destinations
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="data-[state=active]:border-primary text-muted-foreground data-[state=active]:text-foreground rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Security
          </TabsTrigger>
          <TabsTrigger
            value="danger"
            className="data-[state=active]:border-destructive data-[state=active]:text-destructive text-muted-foreground rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Danger zone
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          <ProfileTab
            user={{
              name: user.name,
              email: user.email,
              bio: user.bio,
              avatarUrl: user.avatarUrl,
            }}
          />
        </TabsContent>

        <TabsContent value="preferences" className="mt-0">
          <PreferencesTab
            preferences={{
              language: user.language,
              currency: user.currency,
              personality: user.personality,
            }}
          />
        </TabsContent>

        <TabsContent value="saved" className="mt-0">
          <SavedDestinationsTab destinations={user.savedDestinations} />
        </TabsContent>

        <TabsContent value="security" className="mt-0">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="danger" className="mt-0">
          <DangerZoneTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
