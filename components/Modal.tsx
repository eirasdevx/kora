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
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-[1000] w-full max-w-4xl bg-white rounded-2xl shadow-xl p-8">
        {title && (
          <h2 className="text-2xl font-bold mb-1">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
