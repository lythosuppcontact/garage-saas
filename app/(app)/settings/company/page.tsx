"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { CompanyLogoUpload } from "@/components/company/company-logo-upload";
import { useToast } from "@/components/ui/toast";

type PdfHeaderMode = "text" | "logo" | "logo_text";

type CompanyForm = {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  pdf_header_mode: PdfHeaderMode;
  primary_color: string;
  secondary_color: string;
  address_line_1: string;
  address_line_2: string;
  postal_code: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  vat_number: string;
  default_vat_rate: number;
  currency: string;
  timezone: string;
};

const emptyForm: CompanyForm = {
  id: "",
  name: "",
  slug: "",
  logo_url: "",
  pdf_header_mode: "text",
  primary_color: "#ff3131",
  secondary_color: "#111111",
  address_line_1: "",
  address_line_2: "",
  postal_code: "",
  city: "",
  country: "CH",
  phone: "",
  email: "",
  vat_number: "",
  default_vat_rate: 8.1,
  currency: "CHF",
  timezone: "Europe/Zurich",
};

export default function CompanySettingsPage() {
  const { showToast } = useToast();

  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const updateField = <K extends keyof CompanyForm>(
    key: K,
    value: CompanyForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const loadCompany = async () => {
      setLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          showToast({
            type: "error",
            title: "Utilisateur non connecté",
          });
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("auth_user_id", user.id)
          .single();

        if (profileError || !profile?.company_id) {
          console.error(profileError);
          showToast({
            type: "error",
            title: "Profil introuvable",
          });
          setLoading(false);
          return;
        }

        const { data: company, error: companyError } = await supabase
          .from("companies")
          .select(`
            id,
            name,
            slug,
            logo_url,
            pdf_header_mode,
            primary_color,
            secondary_color,
            address_line_1,
            address_line_2,
            postal_code,
            city,
            country,
            phone,
            email,
            vat_number,
            default_vat_rate,
            currency,
            timezone
          `)
          .eq("id", profile.company_id)
          .single();

        if (companyError || !company) {
          console.error(companyError);
          showToast({
            type: "error",
            title: "Entreprise introuvable",
          });
          setLoading(false);
          return;
        }

        setForm({
          id: company.id,
          name: company.name || "",
          slug: company.slug || "",
          logo_url: company.logo_url || "",
          pdf_header_mode:
            (company.pdf_header_mode as PdfHeaderMode) || "text",
          primary_color: company.primary_color || "#ff3131",
          secondary_color: company.secondary_color || "#111111",
          address_line_1: company.address_line_1 || "",
          address_line_2: company.address_line_2 || "",
          postal_code: company.postal_code || "",
          city: company.city || "",
          country: company.country || "CH",
          phone: company.phone || "",
          email: company.email || "",
          vat_number: company.vat_number || "",
          default_vat_rate: Number(company.default_vat_rate ?? 8.1),
          currency: company.currency || "CHF",
          timezone: company.timezone || "Europe/Zurich",
        });
      } catch (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Erreur réseau",
        });
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, [showToast]);

  const handleSave = async () => {
    if (!form.id) {
      showToast({
        type: "error",
        title: "Entreprise introuvable",
      });
      return;
    }

    if (!form.name.trim()) {
      showToast({
        type: "info",
        title: "Nom obligatoire",
        message: "Le nom de l'entreprise est obligatoire.",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("companies")
        .update({
          name: form.name,
          logo_url: form.logo_url || null,
          pdf_header_mode: form.pdf_header_mode,
          primary_color: form.primary_color || null,
          secondary_color: form.secondary_color || null,
          address_line_1: form.address_line_1 || null,
          address_line_2: form.address_line_2 || null,
          postal_code: form.postal_code || null,
          city: form.city || null,
          country: form.country || "CH",
          phone: form.phone || null,
          email: form.email || null,
          vat_number: form.vat_number || null,
          default_vat_rate: Number(form.default_vat_rate || 8.1),
          currency: form.currency || "CHF",
          timezone: form.timezone || "Europe/Zurich",
        })
        .eq("id", form.id);

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Erreur sauvegarde entreprise",
        });
        return;
      }

      showToast({
        type: "success",
        title: "Paramètres entreprise enregistrés",
      });
    } catch (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Erreur réseau",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-white">Chargement...</div>;
  }

  return (
    <div className="space-y-8 p-8 text-white">
      <div>
        <h1 className="text-3xl font-bold">Paramètres entreprise</h1>
        <p className="mt-2 text-white/60">
          Personnalise l’identité de ton activité, tes documents et ton branding.
        </p>
      </div>

      <div className="grid gap-6">
        {form.id ? (
          <CompanyLogoUpload
            companyId={form.id}
            currentLogoUrl={form.logo_url || null}
            onUploaded={(url) => updateField("logo_url", url || "")}
          />
        ) : null}

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Identité</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nom de l’entreprise">
              <input
                className="w-full rounded bg-white p-3 text-black"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
              />
            </Field>

            <Field label="Slug">
              <input
                className="w-full rounded bg-white/10 p-3 text-white"
                value={form.slug}
                disabled
              />
            </Field>

            <Field label="Mode d’affichage PDF">
              <select
                className="w-full rounded bg-white p-3 text-black"
                value={form.pdf_header_mode}
                onChange={(e) =>
                  updateField(
                    "pdf_header_mode",
                    e.target.value as PdfHeaderMode
                  )
                }
              >
                <option value="text">Nom + infos entreprise</option>
                <option value="logo">Logo seul</option>
                <option value="logo_text">Logo + infos entreprise</option>
              </select>
            </Field>

            <Field label="Email">
              <input
                className="w-full rounded bg-white p-3 text-black"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </Field>

            <Field label="Téléphone">
              <input
                className="w-full rounded bg-white p-3 text-black"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </Field>

            <Field label="N° TVA">
              <input
                className="w-full rounded bg-white p-3 text-black"
                value={form.vat_number}
                onChange={(e) => updateField("vat_number", e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Adresse</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Adresse ligne 1">
              <input
                className="w-full rounded bg-white p-3 text-black"
                value={form.address_line_1}
                onChange={(e) => updateField("address_line_1", e.target.value)}
              />
            </Field>

            <Field label="Adresse ligne 2">
              <input
                className="w-full rounded bg-white p-3 text-black"
                value={form.address_line_2}
                onChange={(e) => updateField("address_line_2", e.target.value)}
              />
            </Field>

            <Field label="Code postal">
              <input
                className="w-full rounded bg-white p-3 text-black"
                value={form.postal_code}
                onChange={(e) => updateField("postal_code", e.target.value)}
              />
            </Field>

            <Field label="Ville">
              <input
                className="w-full rounded bg-white p-3 text-black"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </Field>

            <Field label="Pays">
              <input
                className="w-full rounded bg-white p-3 text-black"
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Branding & facturation</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Couleur principale">
              <input
                type="color"
                className="h-12 w-full rounded bg-white p-2"
                value={form.primary_color}
                onChange={(e) => updateField("primary_color", e.target.value)}
              />
            </Field>

            <Field label="Couleur secondaire">
              <input
                type="color"
                className="h-12 w-full rounded bg-white p-2"
                value={form.secondary_color}
                onChange={(e) => updateField("secondary_color", e.target.value)}
              />
            </Field>

            <Field label="TVA par défaut">
              <input
                type="number"
                step="0.1"
                className="w-full rounded bg-white p-3 text-black"
                value={form.default_vat_rate}
                onChange={(e) =>
                  updateField("default_vat_rate", Number(e.target.value))
                }
              />
            </Field>

            <Field label="Devise">
              <input
                className="w-full rounded bg-white p-3 text-black"
                value={form.currency}
                onChange={(e) => updateField("currency", e.target.value)}
              />
            </Field>

            <Field label="Fuseau horaire">
              <input
                className="w-full rounded bg-white p-3 text-black"
                value={form.timezone}
                onChange={(e) => updateField("timezone", e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Aperçu rapide</h2>

          <div
            className="rounded-2xl border border-white/10 p-6"
            style={{ backgroundColor: form.secondary_color || "#111111" }}
          >
            {form.pdf_header_mode === "logo" ? (
              <div className="flex min-h-[110px] items-center justify-between gap-6">
                <div className="flex h-24 w-full max-w-[300px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/20 p-3">
                  {form.logo_url ? (
                    <Image
                      src={form.logo_url}
                      alt="Logo entreprise"
                      width={280}
                      height={90}
                      className="max-h-full w-auto max-w-full object-contain"
                      unoptimized
                    />
                  ) : (
                    <span className="text-sm text-white/40">Logo</span>
                  )}
                </div>

                <div className="text-right text-white/70">
                  Le logo sera affiché seul dans le header PDF.
                </div>
              </div>
            ) : form.pdf_header_mode === "logo_text" ? (
              <div className="flex min-h-[110px] flex-col gap-4 md:flex-row md:items-center">
                <div className="flex h-24 w-full max-w-[300px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/20 p-3">
                  {form.logo_url ? (
                    <Image
                      src={form.logo_url}
                      alt="Logo entreprise"
                      width={280}
                      height={90}
                      className="max-h-full w-auto max-w-full object-contain"
                      unoptimized
                    />
                  ) : (
                    <span className="text-sm text-white/40">Logo</span>
                  )}
                </div>

                <div>
                  <div
                    className="text-3xl font-black"
                    style={{ color: form.primary_color || "#ff3131" }}
                  >
                    {form.name || "Nom entreprise"}
                  </div>
                  <div className="mt-2 text-white/70">
                    {form.email || "email@entreprise.ch"} · {form.phone || "+41 ..."}
                  </div>
                  <div className="mt-1 text-white/50">
                    {[
                      form.address_line_1,
                      form.postal_code,
                      form.city,
                      form.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Adresse entreprise"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="min-h-[110px]">
                <div
                  className="text-3xl font-black"
                  style={{ color: form.primary_color || "#ff3131" }}
                >
                  {form.name || "Nom entreprise"}
                </div>
                <div className="mt-2 text-white/70">
                  {form.email || "email@entreprise.ch"} · {form.phone || "+41 ..."}
                </div>
                <div className="mt-1 text-white/50">
                  {[
                    form.address_line_1,
                    form.postal_code,
                    form.city,
                    form.country,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Adresse entreprise"}
                </div>
              </div>
            )}
          </div>
        </section>

        <div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-red-500 px-5 py-3 font-medium disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div className="text-sm text-white/60">{label}</div>
      {children}
    </label>
  );
}