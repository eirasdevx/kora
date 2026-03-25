"use client";

import { useEffect, useId } from "react";
import Icon from "@/components/shared/Icon";

type ModalSize = "sm" | "md" | "lg" | "xl";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  children: React.ReactNode;
}

const MODAL_SIZE_STYLES: Record<ModalSize, string> = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  size = "md",
  children,
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999]">
      <div
        className="fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.22),_transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.18),rgba(15,23,42,0.46))] backdrop-blur-[6px]"
        onClick={onClose}
      />
      <div className="relative z-[1000] h-full overflow-y-auto">
        <div className="flex min-h-dvh items-center justify-center px-4 py-4 sm:px-6 sm:py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className={`relative w-full ${MODAL_SIZE_STYLES[size]} overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_30px_90px_-28px_rgba(15,23,42,0.42)] ring-1 ring-slate-200/70 backdrop-blur-xl`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
            {title ? (
              <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.92))] px-6 py-5 sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 pr-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">
                      Kora
                    </p>
                    <h2
                      id={titleId}
                      className="mt-1 text-xl font-semibold tracking-tight text-slate-950"
                    >
                      {title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/85 text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                    aria-label="Cerrar"
                  >
                    <Icon name="close" className="text-[18px]" />
                  </button>
                </div>
              </div>
            ) : null}
            <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto px-6 py-6 sm:px-7 sm:py-7">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
