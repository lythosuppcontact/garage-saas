"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!companyName.trim() || !email.trim() || !password.trim()) {
      showToast({
        type: "info",
        title: "Informations manquantes",
        message:
          "Merci de remplir le nom de l’entreprise, l’email et le mot de passe.",
      });
      return;
    }

    if (password.length < 6) {
      showToast({
        type: "info",
        title: "Mot de passe trop court",
        message: "Le mot de passe doit contenir au moins 6 caractères.",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        showToast({
          type: "error",
          title: "Erreur inscription",
          message: error.message,
        });
        return;
      }

      const user = data.user;

      if (!user?.id) {
        showToast({
          type: "error",
          title: "Utilisateur non créé",
        });
        return;
      }

      const response = await fetch("/api/register-company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          email: email.trim(),
          companyName: companyName.trim(),
          fullName: fullName.trim(),
        }),
      });

      const rawText = await response.text();
      console.log("API RAW RESPONSE:", rawText);

      let result: any = null;

      try {
        result = JSON.parse(rawText);
      } catch (e) {
        console.error("Réponse non JSON:", rawText);
        showToast({
          type: "error",
          title: "Erreur serveur",
          message: "La route /api/register-company plante côté serveur.",
        });
        return;
      }

      if (!response.ok) {
        showToast({
          type: "error",
          title: "Erreur création entreprise",
          message: result?.error || "Erreur création entreprise",
        });
        return;
      }

      showToast({
        type: "success",
        title: "Compte créé",
        message:
          "Votre entreprise est en attente de validation. Vous pouvez maintenant vous connecter.",
      });

      setCompanyName("");
      setFullName("");
      setEmail("");
      setPassword("");

      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast({
        type: "error",
        title: "Erreur inattendue",
        message: "Une erreur inattendue est survenue.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div className="space-y-2 text-center">
          <div className="text-sm uppercase tracking-[0.18em] text-white/35">
            Lytho Devis
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            Créer un compte
          </h1>
          <p className="text-sm text-white/50">
            Votre accès sera activé après validation manuelle de votre
            entreprise.
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nom de l’entreprise"
            className="w-full rounded-xl bg-white p-3 text-black outline-none"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />

          <input
            type="text"
            placeholder="Votre nom (optionnel)"
            className="w-full rounded-xl bg-white p-3 text-black outline-none"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-xl bg-white p-3 text-black outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Mot de passe"
            className="w-full rounded-xl bg-white p-3 text-black outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full rounded-xl bg-red-500 p-3 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/55">
          Après inscription :
          <div className="mt-2 space-y-1 text-white/45">
            <div>• votre entreprise est créée en attente</div>
            <div>• vous devez être validé manuellement</div>
            <div>
              • ensuite vous aurez accès à l’onboarding et à l’application
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}