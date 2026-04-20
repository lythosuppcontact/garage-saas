"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { BusinessType } from "@/lib/business-types";
import { getBusinessStarterSetup } from "@/lib/business-setup";

const options: {
  value: BusinessType;
  title: string;
  description: string;
}[] = [
  {
    value: "garage",
    title: "Garage / carrosserie",
    description: "Véhicules, sinistres, pièces, main-d’œuvre garage.",
  },
  {
    value: "cleaning",
    title: "Entreprise de nettoyage",
    description: "Prestations, forfaits, heures, surfaces, produits.",
  },
  {
    value: "plumbing",
    title: "Plomberie",
    description: "Dépannages, installations, matériel, temps passé.",
  },
  {
    value: "electrical",
    title: "Électricité",
    description: "Interventions, installations, forfaits, équipements.",
  },
  {
    value: "landscaping",
    title: "Paysagisme",
    description: "Entretien, aménagement, surfaces, forfaits.",
  },
  {
    value: "btp",
    title: "BTP / construction",
    description: "Chantiers, matériaux, prestations, métrés.",
  },
  {
    value: "other",
    title: "Autre activité",
    description: "Version générique, simple et adaptable.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<BusinessType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alreadyConfigured, setAlreadyConfigured] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (profileError || !profile?.company_id) {
          console.error("Erreur profile onboarding:", profileError);
          alert("Profil introuvable");
          setLoading(false);
          return;
        }

        setCompanyId(profile.company_id);

        const { data: company, error: companyError } = await supabase
          .from("companies")
          .select("business_type")
          .eq("id", profile.company_id)
          .maybeSingle();

        if (companyError) {
          console.error("Erreur company onboarding:", companyError);
          alert("Erreur chargement entreprise");
          setLoading(false);
          return;
        }

        if (company?.business_type) {
          setSelected(company.business_type as BusinessType);
          setAlreadyConfigured(true);
          window.location.href = "/dashboard";
          return;
        }
      } catch (error) {
        console.error("Erreur onboarding:", error);
        alert("Erreur inattendue");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleContinue = async () => {
    if (!companyId || !selected) {
      alert("Merci de choisir un type d’activité.");
      return;
    }

    if (alreadyConfigured) {
      alert("Le métier a déjà été configuré et ne peut plus être modifié.");
      return;
    }

    setSaving(true);

    try {
      const starterSetup = getBusinessStarterSetup(selected);

      const payload = {
  ...starterSetup,
  business_type: selected,
};

      const { data, error } = await supabase
        .from("companies")
        .update(payload)
        .eq("id", companyId)
        .is("business_type", null)
        .select("id, business_type");

      if (error) {
        console.error(error);
        alert(error.message || "Erreur lors de l’enregistrement.");
        setSaving(false);
        return;
      }

      if (!data || data.length === 0) {
        alert("Le métier est déjà défini et ne peut plus être modifié.");
        setSaving(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Erreur handleContinue:", error);
      alert("Erreur inattendue lors de l’enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        Chargement...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black">Bienvenue sur Lytho Devis</h1>
          <p className="text-white/60">
            Choisis ton activité pour adapter automatiquement l’interface de
            l’application.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {options.map((option) => {
            const active = selected === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelected(option.value)}
                className={`rounded-2xl border p-5 text-left transition ${
                  active
                    ? "border-red-500 bg-red-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="text-lg font-semibold">{option.title}</div>
                <div className="mt-2 text-sm text-white/65">
                  {option.description}
                </div>
              </button>
            );
          })}
        </div>

        {selected ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-white/50">Configuration appliquée</div>
            <div className="mt-3 space-y-2 text-sm text-white/80">
              <div>Activité : {selected}</div>
              <div>TVA par défaut : 8.1%</div>
              <div>Devise : CHF</div>
              <div>Fuseau horaire : Europe/Zurich</div>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleContinue}
            disabled={saving || !selected}
            className="rounded-xl bg-red-500 px-5 py-3 font-medium disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Continuer"}
          </button>
        </div>
      </div>
    </div>
  );
}