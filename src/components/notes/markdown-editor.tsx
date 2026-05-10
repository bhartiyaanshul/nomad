"use client";

import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

import { Skeleton } from "@/components/ui/skeleton";

const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((m) => m.default),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full rounded-md" />,
  },
);

interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  height?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  height = 240,
}: MarkdownEditorProps) {
  return (
    <div data-color-mode="auto">
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        height={height}
        preview="edit"
        textareaProps={{
          placeholder: "Write in markdown — links, lists, headings, all work.",
        }}
      />
    </div>
  );
}
