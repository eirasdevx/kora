"use client";

import { useMemo } from "react";

import {
  buildGeneratedDocumentHtml,
  type GeneratedDocumentTokenContext,
} from "@/modules/documents/generated-document-layout";
import type { DocumentLayout } from "@/modules/documents/document.types";

type GeneratedDocumentPreviewProps = {
  title: string;
  body: string;
  layout?: DocumentLayout;
  associationLogoUrl?: string;
  tokenContext?: GeneratedDocumentTokenContext;
  className?: string;
  heightClassName?: string;
  ariaLabel?: string;
};

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export default function GeneratedDocumentPreview({
  title,
  body,
  layout,
  associationLogoUrl,
  tokenContext,
  className,
  heightClassName,
  ariaLabel,
}: GeneratedDocumentPreviewProps) {
  const previewHtml = useMemo(
    () =>
      buildGeneratedDocumentHtml({
        name: title,
        body,
        layout,
        associationLogoUrl,
        tokenContext,
      }),
    [associationLogoUrl, body, layout, title, tokenContext]
  );

  return (
    <div
      className={cx(
        "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.28)]",
        className
      )}
    >
      <iframe
        title={ariaLabel ?? "Vista previa del documento generado"}
        srcDoc={previewHtml}
        className={cx(
          "block w-full border-0 bg-white",
          heightClassName ?? "h-[960px]"
        )}
      />
    </div>
  );
}
