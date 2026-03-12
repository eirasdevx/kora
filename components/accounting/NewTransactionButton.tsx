"use client";

import Link from "next/link";
import {
  moduleTopbarButtonIconStyles,
  moduleTopbarButtonStyles,
} from "@/components/shared/ModuleTopbar";

export default function NewTransactionButton() {
  return (
    <Link href="/accounting/new" className={moduleTopbarButtonStyles.primary}>
      <span className={moduleTopbarButtonIconStyles.add}>
        <span className="material-symbols-outlined text-[16px]">
          add
        </span>
      </span>
      Nueva transacción
    </Link>
  );
}
