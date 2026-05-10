"use client";

import dynamic from "next/dynamic";
import "@uiw/react-markdown-preview/markdown.css";

import { Skeleton } from "@/components/ui/skeleton";

const MarkdownPreview = dynamic(
  () => import("@uiw/react-markdown-preview").then((m) => m.default),
  {
    ssr: false,
    loading: () => <Skeleton className="h-16 w-full rounded-md" />,
  },
);

export function MarkdownRender({ source }: { source: string }) {
  return (
    <div data-color-mode="auto" className="prose-sm">
      <MarkdownPreview
        source={source}
        style={{ background: "transparent", color: "inherit", fontSize: 14 }}
        wrapperElement={{ "data-color-mode": "auto" } as React.HTMLAttributes<HTMLDivElement>}
      />
    </div>
  );
}
