"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

type CustomerForm = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  postal_code: string;
  city: string;
  country: string;
};

const emptyForm: CustomerForm = {
  id: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address_line_1: "",
  address_line_2: "",
  postal_code: "",
  city: "",
  country: "CH",
};

export default function EditCustomerPage() {
  const { showToast } = useToast();

  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;

  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const updateField = <K extends keyof CustomerForm>(
    key: K,
    value: CustomerForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const loadCustomer = async () => {
      if (!customerId) return;

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
          router.push("/customers");
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
          router.push("/customers");
          return;
        }

        const { data: customer, error: customerError } = await supabase
          .from("customers")
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            address_line_1,
            address_line_2,
            postal_code,
            city,
            country
          `)
          .eq("id", customerId)
          .eq("company_id", profile.company_id)
          .single();

        if (customerError || !customer) {
          console.error(customerError);
          showToast({
            type: "error",
            title: "Client introuvable",
          });
          router.push("/customers");
          return;
        }

        setForm({
          id: customer.id,
          first_name: customer.first_name || "",
          last_name: customer.last_name || "",
          email: customer.email || "",
          phone: customer.phone || "",
          address_line_1: customer.address_line_1 || "",
          address_line_2: customer.address_line_2 || "",
          postal_code: customer.postal_code || "",
          city: customer.city || "",
          country: customer.country || "CH",
        });
      } catch (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Erreur réseau",
        });
        router.push("/customers");
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
  }, [customerId, router, showToast]);

  const handleSave = async () => {
    if (!form.id) {
      showToast({
        type: "error",
        title: "Client introuvable",
      });
      return;
    }

    if (!form.first_name.trim() && !form.last_name.trim() && !form.email.trim()) {
      showToast({
        type: "info",
        title: "Informations manquantes",
        message: "Merci de renseigner au moins un prénom, un nom ou un email.",
      });
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showToast({
          type: "error",
          title: "Utilisateur non connecté",
        });
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
        return;
      }

      const { error } = await supabase
        .from("customers")
        .update({
          first_name: form.first_name || null,
          last_name: form.last_name || null,
          email: form.email || null,
          phone: form.phone || null,
          address_line_1: form.address_line_1 || null,
          address_line_2: form.address_line_2 || null,
          postal_code: form.postal_code || null,
          city: form.city || null,
          country: form.country || "CH",
        })
        .eq("id", form.id)
        .eq("company_id", profile.company_id);

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Erreur mise à jour client",
        });
        return;
      }

      showToast({
        type: "success",
        title: "Client mis à jour",
      });

      router.push(`/customers/${form.id}`);
      router.refresh();
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
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        Chargement...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Modifier le client</h1>
            <p className="mt-2 text-white/60">
              Mets à jour les informations du client.
            </p>
          </div>

          <Link
            href={`/customers/${form.id}`}
            className="rounded border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
          >
            Retour fiche client
          </Link>
        </div>

        <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Prénom">
              <input
                className="w-full rounded bg-white p-3 text-black"
                value={form.first_name}
                onChange={(e) => updateField("first_name", e.target.value)}
              />
            </Field>

            <Field label="Nom">
              <input
                className="w-full rounded bg-white p-3 text-black"
                value={form.last_name}
                onChange={(e) => updateField("last_name", e.target.value)}
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
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

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded bg-red-500 px-5 py-3 font-medium disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>

            <Link
              href={`/customers/${form.id}`}
              className="rounded border border-white/20 px-5 py-3 font-medium hover:bg-white/10"
            >
              Annuler
            </Link>
          </div>
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