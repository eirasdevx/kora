"use client";

type PageTopbarProps = {
  children: React.ReactNode;
  className?: string;
};

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export default function PageTopbar({
  children,
  className,
}: PageTopbarProps) {
  return (
    <header
      className={cx(
        "mb-6 rounded-3xl border border-gray-200 bg-white px-6 py-4 shadow-sm",
        className
      )}
    >
      {children}
    </header>
  );
}
