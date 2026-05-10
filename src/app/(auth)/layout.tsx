import Link from "next/link";
import { WordMark } from "@/components/word-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <header className="px-6 py-6 sm:px-10">
        <WordMark />
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="text-muted-foreground px-6 py-6 text-sm sm:px-10">
        <div className="flex items-center justify-between">
          <span>Traveloop</span>
          <Link href="/" className="hover:text-foreground transition">
            Back home
          </Link>
        </div>
      </footer>
    </div>
  );
}
