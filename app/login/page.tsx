"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="space-y-4 w-[300px] text-center">
  <h1 className="text-3xl font-black tracking-wide">LYTHO</h1>

  <p className="text-white/50 text-sm">
    Gestion de devis et factures pour entreprises
  </p>

  <h2 className="text-xl font-semibold mt-4">Connexion</h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 rounded bg-white text-black"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Mot de passe"
          className="w-full p-2 rounded bg-white text-black"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-red-500 p-2 rounded hover:bg-red-600 transition"
        >
          Se connecter
        </button>
      </div>
    </div>
  );
}