"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import { BusinessType, getBusinessConfig } from "@/lib/business-types";

type InvoiceRow = {
  id: string;
  number: string;
  status: string;
  issue_date: string;
  claim_number: string | null;
  total_amount: number;
  balance_due: number;
  customers: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  vehicles: {
    make: string | null;
    model: string | null;
    plate_number: string | null;
  } | null;
};

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [businessType, setBusinessType] = useState<BusinessType>("garage");

  const businessConfig = getBusinessConfig(businessType);

  const formatCHF = (value: number) =>
    new Intl.NumberFormat("fr-CH", {
      style: "currency",
      currency: "CHF",
    }).format(value || 0);

  const loadInvoices = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Utilisateur non connecté");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("auth_user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(profileError);
      alert("Profil introuvable");
      setLoading(false);
      return;
    }

    const { data: companyData } = await supabase
      .from("companies")
      .select("business_type")
      .eq("id", profile.company_id)
      .single();

    setBusinessType(
      (companyData?.business_type as BusinessType) || "garage"
    );

    const { data, error } = await supabase
      .from("invoices")
      .select(`
        id,
        number,
        status,
        issue_date,
        claim_number,
        total_amount,
        balance_due,
        customers (
          first_name,
          last_name,
          email
        ),
        vehicles (
          make,
          model,
          plate_number
        )
      `)
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Erreur chargement factures");
      setLoading(false);
      return;
    }

    setInvoices((data as InvoiceRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const customerName = [
        invoice.customers?.first_name,
        invoice.customers?.last_name,
      ]
        .filter(Boolean)
        .join(" ");

      const vehicleName = [
        invoice.vehicles?.make,
        invoice.vehicles?.model,
        invoice.vehicles?.plate_number,
      ]
        .filter(Boolean)
        .join(" - ");

      const searchValues = [
        invoice.number,
        invoice.status,
        invoice.issue_date,
        customerName,
        invoice.customers?.email,
        invoice.total_amount?.toString(),
        invoice.balance_due?.toString(),
      ];

      if (businessConfig.features.showClaimNumber) {
        searchValues.push(invoice.claim_number || "");
      }

      if (businessConfig.sidebar.showVehicles) {
        searchValues.push(vehicleName);
      }

      const matchesSearch =
        !q ||
        searchValues
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" || invoice.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter, businessConfig]);

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {businessConfig.sidebar.invoicesListLabel}
            </h1>
            <p className="mt-1 text-sm text-white/50">
              Mode : {businessConfig.label}
            </p>
          </div>

          <Link
            href="/invoices"
            className="rounded bg-red-500 px-4 py-3 font-medium"
          >
            {businessConfig.sidebar.invoicesNewLabel}
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold">Rechercher</h2>

            <div className="flex w-full flex-col gap-3 md:max-w-2xl md:flex-row">
              <input
                type="text"
                placeholder={
                  businessConfig.features.showClaimNumber
                    ? "Rechercher facture, client, véhicule ou sinistre..."
                    : "Rechercher facture ou client..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded bg-white p-3 text-black"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded bg-white p-3 text-black md:max-w-xs"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="sent">Envoyée</option>
                <option value="paid">Payée</option>
                <option value="partially_paid">Partiellement payée</option>
                <option value="overdue">En retard</option>
                <option value="cancelled">Annulée</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          {loading ? (
            <div className="p-6 text-white/70">Chargement...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-6 text-white/70">
              {searchTerm || statusFilter !== "all"
                ? "Aucune facture ne correspond aux filtres."
                : "Aucune facture pour le moment."}
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredInvoices.map((invoice) => {
                const customerName =
                  [invoice.customers?.first_name, invoice.customers?.last_name]
                    .filter(Boolean)
                    .join(" ") || invoice.customers?.email || "-";

                const vehicleName =
                  [
                    invoice.vehicles?.make,
                    invoice.vehicles?.model,
                    invoice.vehicles?.plate_number,
                  ]
                    .filter(Boolean)
                    .join(" - ") || "-";

                return (
                  <div
                    key={invoice.id}
                    className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="text-lg font-semibold">
                        {invoice.number}
                      </div>

                      <div className="text-sm text-white/70">
                        Client : {customerName}
                      </div>

                      {businessConfig.sidebar.showVehicles && (
                        <div className="text-sm text-white/70">
                          Véhicule : {vehicleName}
                        </div>
                      )}

                      <div className="text-sm text-white/50">
                        Date : {invoice.issue_date}
                      </div>

                      {businessConfig.features.showClaimNumber &&
                      invoice.claim_number ? (
                        <div className="text-sm text-white/50">
                          Sinistre : {invoice.claim_number}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2 md:items-end">
                      <StatusBadge status={invoice.status} />

                      <div className="text-2xl font-bold">
                        {formatCHF(invoice.total_amount)}
                      </div>

                      <div className="text-sm text-white/60">
                        Solde : {formatCHF(invoice.balance_due)}
                      </div>

                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
                      >
                        Voir
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}