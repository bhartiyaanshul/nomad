"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Globe, Lock, Share2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { togglePublicAction } from "@/server/actions/share";

interface ShareToggleProps {
  tripId: string;
  isPublic: boolean;
  initialSlug: string | null;
  appUrl: string;
  tripName: string;
}

export function ShareToggle({
  tripId,
  isPublic,
  initialSlug,
  appUrl,
  tripName,
}: ShareToggleProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [slug, setSlug] = useState<string | null>(initialSlug);
  const [enabled, setEnabled] = useState(isPublic);
  const [copied, setCopied] = useState(false);

  const url = slug ? `${appUrl}/share/${slug}` : null;

  function toggle(next: boolean) {
    startTransition(async () => {
      const result = await togglePublicAction(tripId, next);
      if (result.ok) {
        setEnabled(next);
        setSlug(result.data.shareSlug);
        toast.success(next ? "Trip is now public" : "Trip is private again");
      } else {
        toast.error(result.error);
      }
    });
  }

  function copy() {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="size-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-tight">
            Share this trip
          </DialogTitle>
          <DialogDescription>
            A public link lets anyone view a read-only version. Logged-in
            viewers can copy it into their own account.
          </DialogDescription>
        </DialogHeader>

        <div className="border-border/70 bg-card flex items-center justify-between gap-4 rounded-md border p-4">
          <div className="flex items-start gap-3">
            <div className="bg-accent text-accent-foreground rounded-md p-2">
              {enabled ? (
                <Globe className="size-4" />
              ) : (
                <Lock className="size-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                {enabled ? "Public link is on" : "Trip is private"}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {enabled
                  ? "Anyone with the link can view a read-only itinerary."
                  : "Only you and trip members can see this."}
              </p>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={toggle}
            disabled={pending}
            aria-label="Toggle public link"
          />
        </div>

        {enabled && url ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Input readOnly value={url} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="sm" onClick={copy}>
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <p className="text-muted-foreground text-xs">Share to:</p>
              <SocialShareButtons url={url} title={tripName} />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SocialShareButtons({ url, title }: { url: string; title: string }) {
  const enc = encodeURIComponent;
  const shares = [
    {
      label: "X",
      href: `https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}`,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${enc(`${title}\n${url}`)}`,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    },
  ];
  return (
    <ul className="flex flex-wrap gap-1.5">
      {shares.map((s) => (
        <li key={s.label}>
          <a
            href={s.href}
            target="_blank"
            rel="noreferrer noopener"
            className="border-border/70 hover:bg-accent/60 inline-flex items-center rounded-md border px-3 py-1 text-xs transition"
          >
            {s.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
