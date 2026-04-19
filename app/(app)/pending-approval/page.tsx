"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type CompanyStatus = "pending" | "active" | "rejected" | "suspended";

export default function PendingApprovalPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [status, setStatus] = useState<CompanyStatus>("pending");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const loadStatus = async () => {
      setLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("auth_user_id", user.id)
          .single();

        if (profileError || !profile?.company_id) {
          console.error(profileError);
          setLoading(false);
          return;
        }

        const { data: company, error: companyError } = await supabase
          .from("companies")
          .select("name, access_status, business_type")
          .eq("id", profile.company_id)
          .single();

        if (companyError || !company) {
          console.error(companyError);
          setLoading(false);
          return;
        }

        const nextStatus = (company.access_status || "pending") as CompanyStatus;

        setCompanyName(company.name || "");
        setStatus(nextStatus);

        if (nextStatus === "active") {
          if (company.business_type) {
            router.replace("/dashboard");
          } else {
            router.replace("/onboarding");
          }
          return;
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();

    const interval = setInterval(() => {
      loadStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const content = {
    pending: {
      badge: "En attente",
      title: "Votre compte est en attente de validation",
      description:
        "Votre entreprise a bien été créée. Nous devons maintenant valider manuellement votre accès avant activation complète.",
      details: [
        "votre inscription a bien été enregistrée",
        "votre entreprise est en cours de vérification",
        "vous pourrez accéder à l’application dès validation",
      ],
    },
    rejected: {
      badge: "Refusé",
      title: "Votre demande d’accès a été refusée",
      description:
        "Votre entreprise n’a pas été approuvée pour le moment. Si vous pensez qu’il s’agit d’une erreur, contactez le support.",
      details: [
        "l’accès à l’application est actuellement bloqué",
        "votre compte ne peut pas utiliser l’espace de gestion",
        "vous pouvez nous contacter pour plus d’informations",
      ],
    },
    suspended: {
      badge: "Suspendu",
      title: "Votre accès a été suspendu",
      description:
        "Votre entreprise n’a temporairement plus accès à l’application. Contactez le support pour réactiver votre compte.",
      details: [
        "l’accès à l’application est suspendu",
        "vos données ne sont pas supprimées",
        "une réactivation peut être effectuée manuellement",
      ],
    },
    active: {
      badge: "Validé",
      title: "Votre accès a été validé",
      description:
        "Votre entreprise a été approuvée. Redirection vers votre espace…",
      details: [
        "votre accès est maintenant actif",
        "vous allez être redirigé automatiquement",
        "vous pouvez commencer la configuration",
      ],
    },
  }[status];

  const badgeClass =
    status === "pending"
      ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-300"
      : status === "rejected"
      ? "border-red-500/20 bg-red-500/10 text-red-300"
      : status === "suspended"
      ? "border-orange-500/20 bg-orange-500/10 text-orange-300"
      : "border-green-500/20 bg-green-500/10 text-green-300";

  if (loading) {
    return (
      <div className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          Chargement...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-xl space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <div className="space-y-3 text-center">
          <div className="text-sm uppercase tracking-[0.18em] text-white/35">
            Lytho Devis
          </div>

          <div className="flex justify-center">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}
            >
              {content.badge}
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight">
            {content.title}
          </h1>

          <p className="text-white/55">{content.description}</p>

          {companyName ? (
            <div className="text-sm text-white/35">
              Entreprise : {companyName}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-white/65">
          <div className="space-y-2">
            {content.details.map((item) => (
              <div key={item}>• {item}</div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 font-medium hover:bg-white/[0.08]"
          >
            Vérifier à nouveau
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutLoading}
            className="rounded-xl bg-red-500 px-5 py-3 font-medium disabled:opacity-50"
          >
            {logoutLoading ? "Déconnexion..." : "Se déconnecter"}
          </button>
        </div>
      </div>
    </div>
  );
}