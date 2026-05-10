import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { GoogleButton } from "@/components/auth/google-button";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Sign in" };

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; reset?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/dashboard";
  const resetSuccess = params.reset === "1";

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="font-display text-2xl tracking-tight">
          Welcome back
        </CardTitle>
        <CardDescription>
          Sign in to continue planning. Your trips, drafts, and group invites
          are waiting.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <LoginForm callbackUrl={callbackUrl} resetSuccess={resetSuccess} />
        <GoogleSection callbackUrl={callbackUrl} />
      </CardContent>
      <CardFooter className="text-muted-foreground text-sm">
        <span>
          New to Traveloop?{" "}
          <Link
            href={`/signup${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
            className="text-foreground hover:underline"
          >
            Create an account
          </Link>
          .
        </span>
      </CardFooter>
    </Card>
  );
}

function GoogleSection({ callbackUrl }: { callbackUrl: string }) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return null;
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs tracking-wide uppercase">
          or
        </span>
        <Separator className="flex-1" />
      </div>
      <GoogleButton callbackUrl={callbackUrl} />
    </div>
  );
}
