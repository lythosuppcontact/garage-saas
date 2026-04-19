"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { BusinessType, getBusinessConfig } from "@/lib/business-types";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Customer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  postal_code: string | null;
};

type Vehicle = {
  id: string;
  make: string | null;
  model: string | null;
  plate_number: string | null;
  mileage: number | null;
};

type QuoteRow = {
  id: string;
  number: string;
  status: string;
  issue_date: string | null;
  total_amount: number | null;
};

type InvoiceRow = {
  id: string;
  number: string;
  status: string;
  issue_date: string | null;
  total_amount: number | null;
  balance_due: number | null;
};

export default function CustomerDetailPage() {
  const { showToast } = useToast();

  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [businessType, setBusinessType] = useState<BusinessType>("other");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  const businessConfig = getBusinessConfig(businessType);

  const formatCHF = (value: number | null | undefined) =>
    new Intl.NumberFormat("fr-CH", {
      style: "currency",
      currency: "CHF",
    }).format(value || 0);

  const customerName = useMemo(() => {
    return (
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      customer?.email ||
      "Client"
    );
  }, [customer]);

  useEffect(() => {
    const loadCustomerData = async () => {
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

        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("business_type")
          .eq("id", profile.company_id)
          .single();

        if (companyError) {
          console.error(companyError);
        } else {
          setBusinessType(
            (companyData?.business_type as BusinessType | null) || "other"
          );
        }

        const [
          { data: customerData, error: customerError },
          { data: vehiclesData, error: vehiclesError },
          { data: quotesData, error: quotesError },
          { data: invoicesData, error: invoicesError },
        ] = await Promise.all([
          supabase
            .from("customers")
            .select(`
              id,
              first_name,
              last_name,
              email,
              phone,
              city,
              country,
              address_line_1,
              address_line_2,
              postal_code
            `)
            .eq("id", customerId)
            .eq("company_id", profile.company_id)
            .single(),

          supabase
            .from("vehicles")
            .select(`
              id,
              make,
              model,
              plate_number,
              mileage
            `)
            .eq("customer_id", customerId)
            .eq("company_id", profile.company_id)
            .order("created_at", { ascending: false }),

          supabase
            .from("quotes")
            .select(`
              id,
              number,
              status,
              issue_date,
              total_amount
            `)
            .eq("customer_id", customerId)
            .eq("company_id", profile.company_id)
            .order("created_at", { ascending: false }),

          supabase
            .from("invoices")
            .select(`
              id,
              number,
              status,
              issue_date,
              total_amount,
              balance_due
            `)
            .eq("customer_id", customerId)
            .eq("company_id", profile.company_id)
            .order("created_at", { ascending: false }),
        ]);

        if (customerError || !customerData) {
          console.error(customerError);
          showToast({
            type: "error",
            title: "Client introuvable",
          });
          router.push("/customers");
          return;
        }

        if (vehiclesError) {
          console.error(vehiclesError);
          showToast({
            type: "error",
            title: `Erreur chargement ${businessConfig.entities.vehiclePlural}`,
          });
          router.push("/customers");
          return;
        }

        if (quotesError) {
          console.error(quotesError);
          showToast({
            type: "error",
            title: "Erreur chargement devis",
          });
          router.push("/customers");
          return;
        }

        if (invoicesError) {
          console.error(invoicesError);
          showToast({
            type: "error",
            title: "Erreur chargement factures",
          });
          router.push("/customers");
          return;
        }

        setCustomer(customerData);
        setVehicles((vehiclesData as Vehicle[]) || []);
        setQuotes((quotesData as QuoteRow[]) || []);
        setInvoices((invoicesData as InvoiceRow[]) || []);
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

    loadCustomerData();
  }, [customerId, router, businessConfig.entities.vehiclePlural, showToast]);

  const handleDeleteCustomer = async () => {
    if (!customer) return;

    if (vehicles.length > 0 || quotes.length > 0 || invoices.length > 0) {
      showToast({
        type: "error",
        title: "Suppression impossible",
        message:
          "Ce client possède encore des éléments liés. Supprime d’abord ses véhicules, devis et factures.",
      });
      setShowDeleteDialog(false);
      return;
    }

    setDeleteLoading(true);

    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customer.id);

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Erreur suppression client",
        });
        return;
      }

      showToast({
        type: "success",
        title: "Client supprimé",
      });

      setShowDeleteDialog(false);
      router.push("/customers");
      router.refresh();
    } catch (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Erreur réseau",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        Chargement...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        Client introuvable
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{customerName}</h1>
            <div className="text-white/70">{customer.email || "-"}</div>
            <div className="text-white/70">{customer.phone || "-"}</div>
            <div className="text-white/70">{customer.city || "-"}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/customers/${customer.id}/edit`}
              className="rounded border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
            >
              Modifier
            </Link>

            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="rounded bg-red-900 px-4 py-2 text-sm hover:bg-red-800"
            >
              Supprimer
            </button>

            <Link
              href="/customers"
              className="rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              Retour liste
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold">Informations client</h2>

            <div className="space-y-2 text-white/80">
              <div>
                <span className="text-white/50">Prénom :</span>{" "}
                {customer.first_name || "-"}
              </div>
              <div>
                <span className="text-white/50">Nom :</span>{" "}
                {customer.last_name || "-"}
              </div>
              <div>
                <span className="text-white/50">Email :</span>{" "}
                {customer.email || "-"}
              </div>
              <div>
                <span className="text-white/50">Téléphone :</span>{" "}
                {customer.phone || "-"}
              </div>
              <div>
                <span className="text-white/50">Adresse 1 :</span>{" "}
                {customer.address_line_1 || "-"}
              </div>
              <div>
                <span className="text-white/50">Adresse 2 :</span>{" "}
                {customer.address_line_2 || "-"}
              </div>
              <div>
                <span className="text-white/50">Code postal :</span>{" "}
                {customer.postal_code || "-"}
              </div>
              <div>
                <span className="text-white/50">Ville :</span>{" "}
                {customer.city || "-"}
              </div>
              <div>
                <span className="text-white/50">Pays :</span>{" "}
                {customer.country || "-"}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold">Résumé</h2>

            <div className="space-y-2 text-white/80">
              {businessConfig.sidebar.showVehicles ? (
                <div>
                  <span className="text-white/50">
                    {businessConfig.entities.vehiclePlural.charAt(0).toUpperCase() +
                      businessConfig.entities.vehiclePlural.slice(1)}{" "}
                    :
                  </span>{" "}
                  {vehicles.length}
                </div>
              ) : null}

              <div>
                <span className="text-white/50">Devis :</span> {quotes.length}
              </div>
              <div>
                <span className="text-white/50">Factures :</span>{" "}
                {invoices.length}
              </div>
            </div>
          </div>
        </div>

        {businessConfig.sidebar.showVehicles ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold">
              {businessConfig.entities.vehiclePlural.charAt(0).toUpperCase() +
                businessConfig.entities.vehiclePlural.slice(1)}
            </h2>

            <div className="space-y-3">
              {vehicles.length === 0 ? (
                <p className="text-white/60">
                  Aucun {businessConfig.entities.vehicleSingular} lié à ce client.
                </p>
              ) : (
                vehicles.map((vehicle) => (
                  <Link
                    key={vehicle.id}
                    href={`/vehicles/${vehicle.id}/edit`}
                    className="block rounded-xl border border-white/10 bg-black/30 p-4 hover:bg-white/10"
                  >
                    <div className="font-semibold">
                      {[vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
                        `${businessConfig.entities.vehicleSingular.charAt(0).toUpperCase() +
                          businessConfig.entities.vehicleSingular.slice(1)} sans nom`}
                    </div>
                    <div className="text-sm text-white/70">
                      {businessType === "garage" ? "Plaque" : "Référence"} :{" "}
                      {vehicle.plate_number || "-"}
                    </div>
                    <div className="text-sm text-white/70">
                      {businessType === "garage" ? "Kilométrage" : "Compteur"} :{" "}
                      {vehicle.mileage ?? "-"}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold">Devis</h2>

            <div className="space-y-3">
              {quotes.length === 0 ? (
                <p className="text-white/60">Aucun devis lié à ce client.</p>
              ) : (
                quotes.map((quote) => (
                  <Link
                    key={quote.id}
                    href={`/quotes/${quote.id}`}
                    className="block rounded-xl border border-white/10 bg-black/30 p-4 hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{quote.number}</div>
                      <div className="text-sm text-white/60">
                        {quote.issue_date || "-"}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-white/70">
                      Statut : {quote.status}
                    </div>
                    <div className="text-sm text-white/70">
                      Total : {formatCHF(quote.total_amount)}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold">Factures</h2>

            <div className="space-y-3">
              {invoices.length === 0 ? (
                <p className="text-white/60">Aucune facture liée à ce client.</p>
              ) : (
                invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    className="block rounded-xl border border-white/10 bg-black/30 p-4 hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{invoice.number}</div>
                      <div className="text-sm text-white/60">
                        {invoice.issue_date || "-"}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-white/70">
                      Statut : {invoice.status}
                    </div>
                    <div className="text-sm text-white/70">
                      Total : {formatCHF(invoice.total_amount)}
                    </div>
                    <div className="text-sm text-white/70">
                      Solde restant : {formatCHF(invoice.balance_due)}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        title="Supprimer le client"
        message={
          vehicles.length > 0 || quotes.length > 0 || invoices.length > 0
            ? "Ce client ne peut pas être supprimé car il possède encore des véhicules, devis ou factures liés."
            : customer
            ? `Tu es sur le point de supprimer définitivement le client ${customerName}. Cette action est irréversible.`
            : ""
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteCustomer}
        onCancel={() => {
          if (!deleteLoading) setShowDeleteDialog(false);
        }}
      />
    </div>
  );
}