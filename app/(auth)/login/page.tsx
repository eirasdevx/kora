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
    <div className="bg-white p-8 rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-6">Iniciar sesión</h1>

      <form className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="w-full border rounded-lg px-4 py-2"
        />
        <input
          type="password"
          placeholder="Contraseña"
          className="w-full border rounded-lg px-4 py-2"
        />

        <button
          type="submit"
          className="w-full bg-primary text-white py-2 rounded-lg font-bold"
        >
          Entrar
        </button>

        <button
          type="button"
          onClick={handleGuestLogin}
          className="w-full text-sm text-gray-500 underline"
        >
          Continuar como invitado
        </button>
      </form>
    </div>
  );
}
