import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignupForm } from "@/components/auth/signup-form";
import { GoogleButton } from "@/components/auth/google-button";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Create an account" };

interface SignupPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/dashboard";

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="font-display text-2xl tracking-tight">
          Create your account
        </CardTitle>
        <CardDescription>
          A short profile is all we need to start planning. You&apos;ll set
          your travel personality right after.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <SignupForm />
        <GoogleSection callbackUrl={callbackUrl} />
      </CardContent>
      <CardFooter className="text-muted-foreground text-sm">
        <span>
          Already have an account?{" "}
          <Link
            href={`/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
            className="text-foreground hover:underline"
          >
            Sign in
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
      <GoogleButton callbackUrl={callbackUrl} label="Sign up with Google" />
    </div>
  );
}
