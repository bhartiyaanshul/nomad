import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="space-y-2">
        <CardTitle className="font-display text-2xl tracking-tight">
          Welcome back
        </CardTitle>
        <CardDescription>
          Sign in to continue planning. Email and password authentication is
          configured in Phase 1.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Form fields, validation, and Google OAuth land in the next commit.
        </p>
      </CardContent>
      <CardFooter className="text-muted-foreground text-sm">
        <span>
          New to Traveloop?{" "}
          <Link href="/signup" className="text-foreground hover:underline">
            Create an account
          </Link>
          .
        </span>
      </CardFooter>
    </Card>
  );
}
