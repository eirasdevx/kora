"use client";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-[1000] w-full max-w-4xl">
        {title ? (
          <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-100"
                aria-label="Cerrar"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-6">{children}</div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
