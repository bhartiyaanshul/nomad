import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="space-y-2">
        <CardTitle className="font-display text-2xl tracking-tight">
          Create your account
        </CardTitle>
        <CardDescription>
          A short profile is all we need to start planning. Personality matters
          — you&apos;ll set yours after sign up.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Sign-up form, validation, and onboarding flow ship in Phase 1.
        </p>
      </CardContent>
      <CardFooter className="text-muted-foreground text-sm">
        <span>
          Already have an account?{" "}
          <Link href="/login" className="text-foreground hover:underline">
            Sign in
          </Link>
          .
        </span>
      </CardFooter>
    </Card>
  );
}
