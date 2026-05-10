import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsDropdown } from "@/components/shared/notifications-dropdown";

interface AppTopbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function AppTopbar({ user }: AppTopbarProps) {
  const initials = (user.name ?? user.email ?? "T")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-10 flex h-16 items-center justify-between border-b px-6 backdrop-blur">
      <div className="text-muted-foreground text-sm">
        {/* Breadcrumbs slot — populated by individual routes in later phases */}
      </div>
      <div className="flex items-center gap-2">
        <NotificationsDropdown />
        <ThemeToggle />
        <Avatar className="size-8">
          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
