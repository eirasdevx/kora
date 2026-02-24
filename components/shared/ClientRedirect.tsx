"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ClientRedirectProps = {
  to: string;
  label?: string;
};

export default function ClientRedirect({
  to,
  label = "Redirigiendo...",
}: ClientRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
      {label}
    </div>
  );
}
