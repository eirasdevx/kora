"use client";

import Link from "next/link";

export default function NewTransactionButton() {
  return (
    <Link
      href="/accounting/new"
      className="bg-primary text-white px-6 py-3 rounded-lg font-bold shadow inline-flex items-center"
    >
      + Nueva Transacción
    </Link>
  );
}
