"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type CompanyAdminRow = {
  id: string;
  name: string | null;
  slug: string | null;
  business_type: string | null;
  access_status: string | null;
  created_at: string | null;
  approved_at: string | null;
  email: string | null;
  phone: string | null;
};

type AccessStatus = "pending" | "active" | "suspended" | "rejected";

export default function AdminCompaniesPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [companies, setCompanies] = useState<CompanyAdminRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("fr-CH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const loadCompanies = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    const { data: me, error: meError } = await supabase
      .from("profiles")
      .select("is_platform_admin")
      .eq("auth_user_id", user.id)
      .single();

    if (meError || !me?.is_platform_admin) {
      console.error(meError);
      setAuthorized(false);
      setLoading(false);
      return;
    }

    setAuthorized(true);

    const { data, error } = await supabase
      .from("companies")
      .select(`
        id,
        name,
        slug,
        business_type,
        access_status,
        created_at,
        approved_at,
        email,
        phone
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Erreur chargement entreprises");
      setLoading(false);
      return;
    }

    setCompanies((data as CompanyAdminRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const filteredCompanies = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return companies.filter((company) => {
      const matchesSearch =
        !q ||
        [
          company.name,
          company.slug,
          company.email,
          company.phone,
          company.business_type,
          company.access_status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" || company.access_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [companies, searchTerm, statusFilter]);

  const updateCompanyStatus = async (
    companyId: string,
    nextStatus: AccessStatus
  ) => {
    setSavingId(companyId);

    const payload: {
      access_status: AccessStatus;
      approved_at: string | null;
    } = {
      access_status: nextStatus,
      approved_at: nextStatus === "active" ? new Date().toISOString() : null,
    };

    const targetCompany = companies.find((company) => company.id === companyId);

    const { error } = await supabase
      .from("companies")
      .update(payload)
      .eq("id", companyId);

    if (error) {
      console.error(error);
      setSavingId(null);
      alert("Erreur mise à jour du statut");
      return;
    }

    setCompanies((prev) =>
      prev.map((company) =>
        company.id === companyId
          ? {
              ...company,
              access_status: nextStatus,
              approved_at: payload.approved_at,
            }
          : company
      )
    );

    if (nextStatus === "active" && targetCompany?.email) {
      try {
        const response = await fetch("/api/admin/send-company-approved-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            companyName: targetCompany.name || "Votre entreprise",
            recipientEmail: targetCompany.email,
            loginUrl: `${window.location.origin}/login`,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error(data);
          alert(
            `${targetCompany.name || "Entreprise"} a été validée, mais l'email n'a pas pu être envoyé.`
          );
          setSavingId(null);
          return;
        }

        alert(
          `${targetCompany.name || "Entreprise"} a été validée et l’email a été envoyé.`
        );
      } catch (emailError) {
        console.error(emailError);
        alert(
          `${targetCompany.name || "Entreprise"} a été validée, mais l'email n'a pas pu être envoyé.`
        );
      }
    } else {
      const companyName = targetCompany?.name || "Entreprise";

      if (nextStatus === "pending") {
        alert(`${companyName} a été repassée en attente.`);
      }

      if (nextStatus === "suspended") {
        alert(`${companyName} a été suspendue.`);
      }

      if (nextStatus === "rejected") {
        alert(`${companyName} a été refusée.`);
      }

      if (nextStatus === "active") {
        alert(`${companyName} a été validée.`);
      }
    }

    setSavingId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">Chargement...</div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <h1 className="text-3xl font-black">Accès refusé</h1>
          <p className="mt-3 text-white/55">
            Cette page est réservée aux administrateurs plateforme.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-[0.18em] text-white/35">
              Back office
            </div>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Validation des entreprises
            </h1>
            <p className="mt-2 text-white/50">
              Gérez l’accès des entreprises à l’application.
            </p>
          </div>

          <button
            type="button"
            onClick={loadCompanies}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium hover:bg-white/[0.08]"
          >
            Rafraîchir
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold">Filtrer</h2>

            <div className="flex w-full flex-col gap-3 md:max-w-3xl md:flex-row">
              <input
                type="text"
                placeholder="Rechercher une entreprise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl bg-white p-3 text-black"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl bg-white p-3 text-black md:max-w-xs"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="active">Active</option>
                <option value="suspended">Suspendue</option>
                <option value="rejected">Refusée</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
          {filteredCompanies.length === 0 ? (
            <div className="p-6 text-white/55">
              Aucune entreprise trouvée.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredCompanies.map((company) => (
                <div
                  key={company.id}
                  className="flex flex-col gap-5 p-6 xl:flex-row xl:items-center xl:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-xl font-bold">
                        {company.name || "Entreprise sans nom"}
                      </div>
                      <StatusPill status={company.access_status || "pending"} />
                    </div>

                    <div className="text-sm text-white/60">
                      Slug : {company.slug || "-"}
                    </div>

                    <div className="text-sm text-white/60">
                      Métier : {company.business_type || "Non défini"}
                    </div>

                    <div className="text-sm text-white/60">
                      Email : {company.email || "-"}
                    </div>

                    <div className="text-sm text-white/60">
                      Téléphone : {company.phone || "-"}
                    </div>

                    <div className="text-sm text-white/45">
                      Créée le : {formatDate(company.created_at)}
                    </div>

                    <div className="text-sm text-white/45">
                      Validée le : {formatDate(company.approved_at)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      label="Valider"
                      onClick={() => updateCompanyStatus(company.id, "active")}
                      disabled={savingId === company.id}
                      variant="success"
                    />
                    <ActionButton
                      label="En attente"
                      onClick={() => updateCompanyStatus(company.id, "pending")}
                      disabled={savingId === company.id}
                      variant="neutral"
                    />
                    <ActionButton
                      label="Suspendre"
                      onClick={() =>
                        updateCompanyStatus(company.id, "suspended")
                      }
                      disabled={savingId === company.id}
                      variant="warning"
                    />
                    <ActionButton
                      label="Refuser"
                      onClick={() => updateCompanyStatus(company.id, "rejected")}
                      disabled={savingId === company.id}
                      variant="danger"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
    active: "border-green-500/20 bg-green-500/10 text-green-300",
    suspended: "border-orange-500/20 bg-orange-500/10 text-orange-300",
    rejected: "border-red-500/20 bg-red-500/10 text-red-300",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
        styles[status] || "border-white/10 bg-white/5 text-white/70"
      }`}
    >
      {status}
    </span>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant: "success" | "neutral" | "warning" | "danger";
}) {
  const styles: Record<string, string> = {
    success: "bg-green-600 hover:bg-green-500",
    neutral: "bg-white/10 hover:bg-white/15",
    warning: "bg-orange-600 hover:bg-orange-500",
    danger: "bg-red-600 hover:bg-red-500",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${styles[variant]}`}
    >
      {label}
    </button>
  );
}