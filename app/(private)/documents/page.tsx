"use client";

import PageTopbar from "@/components/PageTopbar";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageTopbar>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Documentos</h1>
            <p className="text-sm text-gray-500">
              Centraliza contratos, actas y archivos clave de tu asociación.
            </p>
          </div>
          <button className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow">
            + Nuevo documento
          </button>
        </div>
      </PageTopbar>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        Aquí aparecerán tus documentos cuando empieces a cargar archivos.
      </div>
    </div>
  );
}
