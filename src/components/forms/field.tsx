import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  errors?: string[];
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({
  id,
  label,
  hint,
  errors,
  required,
  className,
  children,
}: FieldProps) {
  const error = errors?.[0];
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-sm">
        {label}
        {required ? (
          <span aria-hidden className="text-muted-foreground ml-1">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

interface FormErrorProps {
  message?: string;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
    >
      {message}
    </div>
  );
}

export function FormSuccess({ message }: FormErrorProps) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="border-primary/30 bg-primary/5 text-primary rounded-md border px-3 py-2 text-sm"
    >
      {message}
    </div>
  );
}
