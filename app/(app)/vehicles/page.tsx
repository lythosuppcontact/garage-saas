"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { BusinessType, getBusinessConfig } from "@/lib/business-types";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type CustomerOption = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type Vehicle = {
  id: string;
  make: string | null;
  model: string | null;
  plate_number: string | null;
  mileage: number | null;
  customer_id: string;
  customers?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
};

type VehicleDependencies = {
  quotesCount: number;
  invoicesCount: number;
};

export default function VehiclesPage() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingContext, setLoadingContext] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("garage");

  const [customerId, setCustomerId] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [mileage, setMileage] = useState("");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicleDependencies, setSelectedVehicleDependencies] =
    useState<VehicleDependencies>({
      quotesCount: 0,
      invoicesCount: 0,
    });

  const businessConfig = getBusinessConfig(businessType);

  const vehicleSingular =
    businessConfig.entities.vehicleSingular.charAt(0).toUpperCase() +
    businessConfig.entities.vehicleSingular.slice(1);

  const vehiclePlural =
    businessConfig.entities.vehiclePlural.charAt(0).toUpperCase() +
    businessConfig.entities.vehiclePlural.slice(1);

  const loadVehicles = async (currentCompanyId?: string) => {
    const resolvedCompanyId = currentCompanyId || companyId;

    if (!resolvedCompanyId) return;

    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select(`
          id,
          make,
          model,
          plate_number,
          mileage,
          customer_id,
          customers (
            first_name,
            last_name
          )
        `)
        .eq("company_id", resolvedCompanyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: `Erreur chargement ${businessConfig.entities.vehiclePlural}`,
        });
        return;
      }

      const normalizedVehicles: Vehicle[] = ((data || []) as any[]).map((vehicle) => ({
  ...vehicle,
  customers: Array.isArray(vehicle.customers)
    ? vehicle.customers[0] || null
    : vehicle.customers || null,
}));

setVehicles(normalizedVehicles);
    } catch (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Erreur réseau",
      });
    }
  };

  const handleCreateVehicle = async () => {
    if (!customerId) {
      showToast({
        type: "info",
        title: "Client requis",
        message: `Merci de sélectionner un ${businessConfig.entities.customerSingular}.`,
      });
      return;
    }

    if (!make && !model && !plateNumber) {
      showToast({
        type: "info",
        title: "Informations manquantes",
        message:
          businessType === "garage"
            ? "Merci de remplir au moins marque, modèle ou plaque."
            : `Merci de remplir au moins un nom, un type ou une référence pour ${businessConfig.entities.vehicleSingular}.`,
      });
      return;
    }

    if (!companyId) {
      showToast({
        type: "error",
        title: "Entreprise introuvable",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("vehicles").insert({
        company_id: companyId,
        customer_id: customerId,
        make: make || null,
        model: model || null,
        plate_number: plateNumber || null,
        mileage: mileage ? Number(mileage) : null,
      });

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: `Erreur création ${businessConfig.entities.vehicleSingular}`,
        });
        return;
      }

      setCustomerId("");
      setSearchCustomer("");
      setMake("");
      setModel("");
      setPlateNumber("");
      setMileage("");

      await loadVehicles(companyId);

      showToast({
        type: "success",
        title: `${vehicleSingular} créé`,
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

  useEffect(() => {
    const init = async () => {
      setLoadingContext(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          showToast({
            type: "error",
            title: "Utilisateur non connecté",
          });
          setLoadingContext(false);
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
          setLoadingContext(false);
          return;
        }

        setCompanyId(profile.company_id);

        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("business_type")
          .eq("id", profile.company_id)
          .single();

        if (companyError) {
          console.error(companyError);
        } else {
          setBusinessType(
            (companyData?.business_type as BusinessType | null) || "garage"
          );
        }

        const { data: customersData, error: customersError } = await supabase
          .from("customers")
          .select("id, first_name, last_name, email")
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: false });

        if (customersError) {
          console.error(customersError);
          showToast({
            type: "error",
            title: "Erreur chargement clients",
          });
          setLoadingContext(false);
          return;
        }

        setCustomers(customersData || []);
        await loadVehicles(profile.company_id);
      } catch (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Erreur réseau",
        });
      } finally {
        setLoadingContext(false);
      }
    };

    init();
  }, []);

  const filteredVehicles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    if (!q) return vehicles;

    return vehicles.filter((vehicle) => {
      const values = [
        vehicle.make,
        vehicle.model,
        vehicle.plate_number,
        vehicle.mileage?.toString(),
        vehicle.customers?.first_name,
        vehicle.customers?.last_name,
      ];

      return values
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [vehicles, searchTerm]);

  const filteredCustomers = customers.filter((customer) => {
    const q = searchCustomer.trim().toLowerCase();

    if (!q) return [];

    const fullName =
      `${customer.first_name || ""} ${customer.last_name || ""}`.toLowerCase();

    return (
      fullName.includes(q) ||
      (customer.email || "").toLowerCase().includes(q)
    );
  });

  const selectedCustomer = customers.find((customer) => customer.id === customerId);

  const clearSelectedCustomer = () => {
    setCustomerId("");
    setSearchCustomer("");
  };

  const openDeleteDialog = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setSelectedVehicleDependencies({
      quotesCount: 0,
      invoicesCount: 0,
    });
    setShowDeleteDialog(true);

    try {
      const [
        { data: quotesData, error: quotesError },
        { data: invoicesData, error: invoicesError },
      ] = await Promise.all([
        supabase.from("quotes").select("id").eq("vehicle_id", vehicle.id),
        supabase.from("invoices").select("id").eq("vehicle_id", vehicle.id),
      ]);

      if (quotesError || invoicesError) {
        console.error(quotesError || invoicesError);
        showToast({
          type: "error",
          title: "Erreur chargement dépendances",
        });
        return;
      }

      setSelectedVehicleDependencies({
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

  const handleDeleteVehicle = async () => {
    if (!selectedVehicle) return;

    const hasDependencies =
      selectedVehicleDependencies.quotesCount > 0 ||
      selectedVehicleDependencies.invoicesCount > 0;

    if (hasDependencies) {
      showToast({
        type: "error",
        title: "Suppression impossible",
        message:
          "Cet élément est encore lié à des devis ou des factures. Supprime ou détache d’abord ces documents.",
      });
      setShowDeleteDialog(false);
      return;
    }

    setDeleteLoading(true);

    try {
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", selectedVehicle.id);

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: `Erreur suppression ${businessConfig.entities.vehicleSingular}`,
        });
        return;
      }

      setVehicles((prev) =>
        prev.filter((vehicle) => vehicle.id !== selectedVehicle.id)
      );

      showToast({
        type: "success",
        title: `${vehicleSingular} supprimé`,
      });

      setShowDeleteDialog(false);
      setSelectedVehicle(null);
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

  if (loadingContext) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        Chargement...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">{vehiclePlural}</h1>
          <p className="mt-2 text-sm text-white/50">
            Mode activité : {businessConfig.label}
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">
            Ajouter un {businessConfig.entities.vehicleSingular}
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <input
                placeholder={`Rechercher un ${businessConfig.entities.customerSingular}...`}
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                className="w-full rounded bg-white p-3 text-black"
              />

              {searchCustomer.trim() && (
                <div className="max-h-40 overflow-y-auto rounded bg-white text-black">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">
                      Aucun {businessConfig.entities.customerSingular} trouvé.
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => {
                          setCustomerId(customer.id);
                          setSearchCustomer("");
                        }}
                        className="cursor-pointer p-2 hover:bg-gray-200"
                      >
                        {[customer.first_name, customer.last_name]
                          .filter(Boolean)
                          .join(" ") || customer.email || customer.id}
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70 md:flex-row md:items-center md:justify-between">
                <span>
                  {selectedCustomer
                    ? `${businessConfig.entities.customerSingular.charAt(0).toUpperCase() + businessConfig.entities.customerSingular.slice(1)} sélectionné : ${
                        [selectedCustomer.first_name, selectedCustomer.last_name]
                          .filter(Boolean)
                          .join(" ") || selectedCustomer.email || selectedCustomer.id
                      }`
                    : `Aucun ${businessConfig.entities.customerSingular} sélectionné`}
                </span>

                {selectedCustomer ? (
                  <button
                    type="button"
                    onClick={clearSelectedCustomer}
                    className="rounded border border-white/20 px-3 py-1 text-xs font-medium hover:bg-white/10"
                  >
                    Désélectionner
                  </button>
                ) : null}
              </div>
            </div>

            <input
              className="w-full rounded bg-white p-3 text-black"
              placeholder="Marque"
              value={make}
              onChange={(e) => setMake(e.target.value)}
            />

            <input
              className="w-full rounded bg-white p-3 text-black"
              placeholder="Modèle"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />

            <input
              className="w-full rounded bg-white p-3 text-black"
              placeholder={
                businessType === "garage" ? "Plaque" : "Référence / identifiant"
              }
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
            />

            <input
              className="w-full rounded bg-white p-3 text-black"
              placeholder={
                businessType === "garage" ? "Kilométrage" : "Compteur / quantité"
              }
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
            />
          </div>

          <button
            onClick={handleCreateVehicle}
            disabled={loading}
            className="rounded bg-red-500 px-4 py-3 disabled:opacity-50"
          >
            {loading
              ? "Création..."
              : `Créer ${
                  businessConfig.entities.vehicleSingular === "véhicule"
                    ? "le véhicule"
                    : `le ${businessConfig.entities.vehicleSingular}`
                }`}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold">
              Liste des {businessConfig.entities.vehiclePlural}
            </h2>

            <input
              type="text"
              placeholder={`Rechercher un ${businessConfig.entities.vehicleSingular}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded bg-white p-3 text-black md:max-w-sm"
            />
          </div>

          <div className="space-y-3">
            {filteredVehicles.length === 0 ? (
              <p className="text-white/60">
                {searchTerm
                  ? `Aucun ${businessConfig.entities.vehicleSingular} ne correspond à la recherche.`
                  : `Aucun ${businessConfig.entities.vehicleSingular} pour le moment.`}
              </p>
            ) : (
              filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="rounded-xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">
                        {[vehicle.make, vehicle.model]
                          .filter(Boolean)
                          .join(" ") || `${vehicleSingular} sans nom`}
                      </div>

                      <div className="mt-2 text-sm text-white/70">
                        {businessType === "garage" ? "Plaque" : "Référence"} :{" "}
                        {vehicle.plate_number || "-"}
                      </div>

                      <div className="text-sm text-white/70">
                        {businessType === "garage" ? "Kilométrage" : "Compteur"} :{" "}
                        {vehicle.mileage ?? "-"}
                      </div>

                      <div className="text-sm text-white/70">
                        Client :{" "}
                        {[vehicle.customers?.first_name, vehicle.customers?.last_name]
                          .filter(Boolean)
                          .join(" ") || "-"}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        href={`/vehicles/${vehicle.id}/edit`}
                        className="inline-flex items-center justify-center rounded-md border border-white/20 px-3 py-2 text-sm font-medium hover:bg-white/10"
                      >
                        Modifier
                      </Link>

                      <button
                        type="button"
                        onClick={() => openDeleteDialog(vehicle)}
                        className="inline-flex items-center justify-center rounded-md bg-red-900 px-3 py-2 text-sm font-medium hover:bg-red-800"
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
        title={`Supprimer ${
          businessConfig.entities.vehicleSingular === "véhicule"
            ? "le véhicule"
            : businessConfig.entities.vehicleSingular
        }`}
        message={
          selectedVehicleDependencies.quotesCount > 0 ||
          selectedVehicleDependencies.invoicesCount > 0
            ? `Impossible de supprimer cet ${businessConfig.entities.vehicleSingular} car il est encore lié à ${selectedVehicleDependencies.quotesCount} devis et ${selectedVehicleDependencies.invoicesCount} factures.`
            : selectedVehicle
            ? `Tu es sur le point de supprimer définitivement ${
                [selectedVehicle.make, selectedVehicle.model, selectedVehicle.plate_number]
                  .filter(Boolean)
                  .join(" - ") || businessConfig.entities.vehicleSingular
              }. Cette action est irréversible.`
            : ""
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteVehicle}
        onCancel={() => {
          if (!deleteLoading) {
            setShowDeleteDialog(false);
            setSelectedVehicle(null);
          }
        }}
      />
    </div>
  );
}