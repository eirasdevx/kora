"use client";

import ComposerForm from "./components/ComposerForm";
import PostPreview from "./components/PostPreview";
import PageTopbar from "@/components/PageTopbar";

export default function SocialComposerPage() {
  return (
    <div className="space-y-6">
      <PageTopbar>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50"
              aria-label="Volver"
            >
              &lt;
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Crear Publicación
              </h1>
              <p className="text-sm text-gray-500">
                Ajusta el contenido y revisa el formato en cada red social.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm">
              Guardar Borrador
            </button>
            <button className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90">
              Publicar ahora
            </button>
          </div>
        </div>
      </PageTopbar>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <ComposerForm />
        <div className="lg:sticky lg:top-24 lg:self-start">
          <PostPreview />
        </div>
      </div>
    </div>
  );
}
