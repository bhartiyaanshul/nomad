import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="font-display text-2xl tracking-tight">
          Reset your password
        </CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send a one-time link to set a new
          password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
      <CardFooter className="text-muted-foreground text-sm">
        <span>
          Remembered it?{" "}
          <Link href="/login" className="text-foreground hover:underline">
            Sign in instead
          </Link>
          .
        </span>
      </CardFooter>
    </Card>
  );
}
