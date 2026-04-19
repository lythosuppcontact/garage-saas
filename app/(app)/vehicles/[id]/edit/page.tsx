"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { BusinessType, getBusinessConfig } from "@/lib/business-types";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Customer = {
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
  customer_id: string | null;
  company_id: string;
};

type QuoteLink = {
  id: string;
};

type InvoiceLink = {
  id: string;
};

export default function EditVehiclePage() {
  const { showToast } = useToast();

  const params = useParams();
  const router = useRouter();
  const vehicleId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [businessType, setBusinessType] = useState<BusinessType>("garage");
  const [linkedQuotesCount, setLinkedQuotesCount] = useState(0);
  const [linkedInvoicesCount, setLinkedInvoicesCount] = useState(0);

  const businessConfig = getBusinessConfig(businessType);

  const vehicleSingular =
    businessConfig.entities.vehicleSingular.charAt(0).toUpperCase() +
    businessConfig.entities.vehicleSingular.slice(1);

  useEffect(() => {
    const init = async () => {
      if (!vehicleId) return;

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
          router.push("/vehicles");
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
          router.push("/vehicles");
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
            (companyData?.business_type as BusinessType | null) || "garage"
          );
        }

        const [
          { data: vehicleData, error: vehicleError },
          { data: customersData, error: customersError },
          { data: quotesData, error: quotesError },
          { data: invoicesData, error: invoicesError },
        ] = await Promise.all([
          supabase
            .from("vehicles")
            .select(
              "id, make, model, plate_number, mileage, customer_id, company_id"
            )
            .eq("id", vehicleId)
            .eq("company_id", profile.company_id)
            .single(),
          supabase
            .from("customers")
            .select("id, first_name, last_name, email")
            .eq("company_id", profile.company_id)
            .order("created_at", { ascending: false }),
          supabase
            .from("quotes")
            .select("id")
            .eq("vehicle_id", vehicleId)
            .eq("company_id", profile.company_id),
          supabase
            .from("invoices")
            .select("id")
            .eq("vehicle_id", vehicleId)
            .eq("company_id", profile.company_id),
        ]);

        if (vehicleError || !vehicleData) {
          console.error(vehicleError);
          showToast({
            type: "error",
            title: `${vehicleSingular} introuvable`,
          });
          router.push("/vehicles");
          return;
        }

        if (customersError) {
          console.error(customersError);
          showToast({
            type: "error",
            title: "Erreur chargement clients",
          });
        }

        if (quotesError) {
          console.error(quotesError);
          showToast({
            type: "error",
            title: "Erreur chargement devis liés",
          });
        }

        if (invoicesError) {
          console.error(invoicesError);
          showToast({
            type: "error",
            title: "Erreur chargement factures liées",
          });
        }

        setVehicle(vehicleData);
        setCustomers(customersData || []);
        setLinkedQuotesCount(((quotesData as QuoteLink[]) || []).length);
        setLinkedInvoicesCount(((invoicesData as InvoiceLink[]) || []).length);
      } catch (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Erreur réseau",
        });
        router.push("/vehicles");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [vehicleId, router, vehicleSingular, showToast]);

  const handleDeleteVehicle = async () => {
    if (!vehicle) return;

    if (linkedQuotesCount > 0 || linkedInvoicesCount > 0) {
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
        .eq("id", vehicle.id)
        .eq("company_id", vehicle.company_id);

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: `Erreur suppression ${businessConfig.entities.vehicleSingular}`,
        });
        return;
      }

      showToast({
        type: "success",
        title: `${vehicleSingular} supprimé`,
      });

      setShowDeleteDialog(false);
      router.push("/vehicles");
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
        <div className="mx-auto max-w-3xl">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) return null;

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Modifier{" "}
              {businessConfig.entities.vehicleSingular === "véhicule"
                ? "le véhicule"
                : `le ${businessConfig.entities.vehicleSingular}`}
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Mets à jour les informations du{" "}
              {businessConfig.entities.vehicleSingular}.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="rounded bg-red-900 px-4 py-2 text-sm hover:bg-red-800"
            >
              Supprimer
            </button>
          </div>
        </div>

        {(linkedQuotesCount > 0 || linkedInvoicesCount > 0) && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-white">
            <div className="font-semibold">Suppression bloquée</div>
            <div className="mt-1 text-white/75">
              Cet {businessConfig.entities.vehicleSingular} est encore lié à{" "}
              {linkedQuotesCount} devis et {linkedInvoicesCount} factures.
            </div>
          </div>
        )}

        <VehicleForm
          vehicleId={vehicle.id}
          initialData={vehicle}
          customers={customers}
        />
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        title={`Supprimer ${
          businessConfig.entities.vehicleSingular === "véhicule"
            ? "le véhicule"
            : businessConfig.entities.vehicleSingular
        }`}
        message={
          linkedQuotesCount > 0 || linkedInvoicesCount > 0
            ? `Impossible de supprimer cet ${businessConfig.entities.vehicleSingular} car il est encore lié à ${linkedQuotesCount} devis et ${linkedInvoicesCount} factures.`
            : `Tu es sur le point de supprimer définitivement cet ${businessConfig.entities.vehicleSingular}. Cette action est irréversible.`
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteVehicle}
        onCancel={() => {
          if (!deleteLoading) setShowDeleteDialog(false);
        }}
      />
    </div>
  );
}