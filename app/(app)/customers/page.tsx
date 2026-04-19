"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Customer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
};

type CustomerDependencies = {
  vehiclesCount: number;
  quotesCount: number;
  invoicesCount: number;
};

export default function CustomersPage() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCustomerDependencies, setSelectedCustomerDependencies] =
    useState<CustomerDependencies>({
      vehiclesCount: 0,
      quotesCount: 0,
      invoicesCount: 0,
    });

  const loadCustomers = async () => {
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

      if (profileError || !profile) {
        console.error(profileError);
        showToast({
          type: "error",
          title: "Profil introuvable",
        });
        return;
      }

      const { data, error } = await supabase
        .from("customers")
        .select("id, first_name, last_name, email, phone, city")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Erreur chargement clients",
        });
        return;
      }

      setCustomers(data || []);
    } catch (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Erreur réseau",
      });
    }
  };

  const handleCreateCustomer = async () => {
    if (!firstName && !lastName && !email) {
      showToast({
        type: "info",
        title: "Information manquante",
        message: "Merci de remplir au moins un nom ou un email.",
      });
      return;
    }

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
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("auth_user_id", user.id)
        .single();

      if (profileError || !profile) {
        console.error(profileError);
        showToast({
          type: "error",
          title: "Profil introuvable",
        });
        return;
      }

      const { error } = await supabase.from("customers").insert({
        company_id: profile.company_id,
        type: "individual",
        first_name: firstName || null,
        last_name: lastName || null,
        email: email || null,
        phone: phone || null,
        city: city || null,
        country: "CH",
      });

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Erreur création client",
        });
        return;
      }

      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setCity("");

      await loadCustomers();

      showToast({
        type: "success",
        title: "Client créé",
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

  const openDeleteDialog = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedCustomerDependencies({
      vehiclesCount: 0,
      quotesCount: 0,
      invoicesCount: 0,
    });
    setShowDeleteDialog(true);

    try {
      const [
        { data: vehiclesData, error: vehiclesError },
        { data: quotesData, error: quotesError },
        { data: invoicesData, error: invoicesError },
      ] = await Promise.all([
        supabase.from("vehicles").select("id").eq("customer_id", customer.id),
        supabase.from("quotes").select("id").eq("customer_id", customer.id),
        supabase.from("invoices").select("id").eq("customer_id", customer.id),
      ]);

      if (vehiclesError || quotesError || invoicesError) {
        console.error(vehiclesError || quotesError || invoicesError);
        showToast({
          type: "error",
          title: "Erreur chargement dépendances",
        });
        return;
      }

      setSelectedCustomerDependencies({
        vehiclesCount: vehiclesData?.length || 0,
        quotesCount: quotesData?.length || 0,
        invoicesCount: invoicesData?.length || 0,
      });
    } catch (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Erreur réseau",
      });
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;

    const hasDependencies =
      selectedCustomerDependencies.vehiclesCount > 0 ||
      selectedCustomerDependencies.quotesCount > 0 ||
      selectedCustomerDependencies.invoicesCount > 0;

    if (hasDependencies) {
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
        .eq("id", selectedCustomer.id);

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Erreur suppression client",
        });
        return;
      }

      setCustomers((prev) =>
        prev.filter((customer) => customer.id !== selectedCustomer.id)
      );

      showToast({
        type: "success",
        title: "Client supprimé",
      });

      setShowDeleteDialog(false);
      setSelectedCustomer(null);
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

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    if (!q) return customers;

    return customers.filter((customer) => {
      const values = [
        customer.first_name,
        customer.last_name,
        customer.email,
        customer.phone,
        customer.city,
      ];

      return values
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [customers, searchTerm]);

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <h1 className="text-3xl font-bold">Clients</h1>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Ajouter un client</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              className="w-full rounded bg-white p-3 text-black"
              placeholder="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              className="w-full rounded bg-white p-3 text-black"
              placeholder="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <input
              className="w-full rounded bg-white p-3 text-black"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="w-full rounded bg-white p-3 text-black"
              placeholder="Téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              className="w-full rounded bg-white p-3 text-black md:col-span-2"
              placeholder="Ville"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <button
            onClick={handleCreateCustomer}
            disabled={loading}
            className="rounded bg-red-500 px-4 py-3 disabled:opacity-50"
          >
            {loading ? "Création..." : "Créer le client"}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold">Liste des clients</h2>

            <input
              type="text"
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded bg-white p-3 text-black md:max-w-sm"
            />
          </div>

          <div className="space-y-3">
            {filteredCustomers.length === 0 ? (
              <p className="text-white/60">
                {searchTerm
                  ? "Aucun client ne correspond à la recherche."
                  : "Aucun client pour le moment."}
              </p>
            ) : (
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="rounded-xl border border-white/10 bg-black/30 p-4 transition hover:bg-white/5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="block min-w-0 flex-1"
                    >
                      <div className="mb-2 font-semibold">
                        {[customer.first_name, customer.last_name]
                          .filter(Boolean)
                          .join(" ") || "Client sans nom"}
                      </div>

                      <div className="text-sm text-white/70">
                        {customer.email || "-"}
                      </div>

                      <div className="text-sm text-white/70">
                        {customer.phone || "-"}
                      </div>

                      <div className="text-sm text-white/70">
                        {customer.city || "-"}
                      </div>

                      <div className="mt-3 text-xs text-white/40">
                        Cliquer pour voir la fiche client
                      </div>
                    </Link>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
                      >
                        Voir
                      </Link>

                      <Link
                        href={`/customers/${customer.id}/edit`}
                        className="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
                      >
                        Modifier
                      </Link>

                      <button
                        type="button"
                        onClick={() => openDeleteDialog(customer)}
                        className="rounded bg-red-900 px-3 py-2 text-sm hover:bg-red-800"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        title="Supprimer le client"
        message={
          selectedCustomerDependencies.vehiclesCount > 0 ||
          selectedCustomerDependencies.quotesCount > 0 ||
          selectedCustomerDependencies.invoicesCount > 0
            ? `Ce client ne peut pas être supprimé car il possède encore ${selectedCustomerDependencies.vehiclesCount} véhicules, ${selectedCustomerDependencies.quotesCount} devis et ${selectedCustomerDependencies.invoicesCount} factures liés.`
            : selectedCustomer
            ? `Tu es sur le point de supprimer définitivement le client ${
                [selectedCustomer.first_name, selectedCustomer.last_name]
                  .filter(Boolean)
                  .join(" ") || selectedCustomer.email || "sélectionné"
              }. Cette action est irréversible.`
            : ""
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteCustomer}
        onCancel={() => {
          if (!deleteLoading) {
            setShowDeleteDialog(false);
            setSelectedCustomer(null);
          }
        }}
      />
    </div>
  );
}