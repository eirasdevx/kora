"use client";

import { useRouter } from "next/navigation";
import { useSessionStore } from "@/core/session/session.store";

export default function LoginPage() {
  const router = useRouter();
  const setGuest = useSessionStore((s) => s.setGuest);

  const handleGuestLogin = () => {
    setGuest();
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gray-50 px-6 py-5">
        <h1 className="text-2xl font-semibold text-gray-900">
          Iniciar sesión
        </h1>
        <p className="text-sm text-gray-500">
          Accede a tu cuenta de Kora.
        </p>
      </div>

      <form className="flex flex-col">
        <div className="space-y-4 px-6 py-6">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>

        <div className="space-y-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
          >
            Entrar
          </button>

          <button
            type="button"
            onClick={handleGuestLogin}
            className="w-full text-sm font-medium text-gray-500 transition hover:text-gray-700"
          >
            Continuar como invitado
          </button>
        </div>
      </form>
    </div>
  );
}
