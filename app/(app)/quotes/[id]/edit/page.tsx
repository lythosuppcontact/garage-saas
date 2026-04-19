"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { QuoteForm } from "@/components/quotes/quote-form";
import { BusinessType, getBusinessConfig } from "@/lib/business-types";
import { useToast } from "@/components/ui/toast";

type Customer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type Vehicle = {
  id: string;
  customer_id: string;
  make: string | null;
  model: string | null;
  plate_number: string | null;
};

type QuoteLine = {
  id?: string;
  label: string;
  quantity: number;
  unit: string;
  unit_price: number;
};

type LaborType = "mecanique" | "carrosserie" | "peinture";

type LaborLine = {
  labor_type: LaborType;
  hours: number;
  hourly_rate: number;
};

type QuoteData = {
  id: string;
  customer_id: string;
  vehicle_id: string | null;
  claim_number: string | null;
  vat_rate: number | null;
  status: string;
  issue_date: string;
  customer_notes: string | null;
  internal_notes: string | null;
};

type QuoteItemRow = {
  id: string;
  label: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  category: string | null;
  labor_type: string | null;
  sort_order: number | null;
};

export default function EditQuotePage() {
  const { showToast } = useToast();

  const params = useParams();
  const router = useRouter();
  const quoteId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [businessType, setBusinessType] = useState<BusinessType>("other");
  const [defaultVatRate, setDefaultVatRate] = useState(8.1);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [manualLines, setManualLines] = useState<QuoteLine[]>([]);
  const [laborLines, setLaborLines] = useState<LaborLine[]>([
    { labor_type: "mecanique", hours: 0, hourly_rate: 0 },
    { labor_type: "carrosserie", hours: 0, hourly_rate: 0 },
    { labor_type: "peinture", hours: 0, hourly_rate: 0 },
  ]);

  const businessConfig = getBusinessConfig(businessType);

  const labels = {
    quote:
      businessConfig.entities.quoteSingular === "devis"
        ? "devis"
        : businessConfig.entities.quoteSingular,
    customer: businessConfig.entities.customerSingular,
    vehicle: businessConfig.entities.vehicleSingular,
    vehicleLabel:
      businessType === "garage"
        ? "véhicule"
        : businessConfig.entities.vehicleSingular,
    claimLabel:
      businessType === "garage" ? "sinistre" : "référence",
    pageDescription:
      businessType === "garage"
        ? "Mets à jour le client, le véhicule, le sinistre, les lignes et la main-d’œuvre."
        : "Mets à jour le client, les lignes et les informations du devis.",
  };

  useEffect(() => {
    const init = async () => {
      if (!quoteId) return;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          showToast({
            type: "error",
            title: "Utilisateur non connecté",
          });
          router.push("/quotes/list");
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
          router.push("/quotes/list");
          return;
        }

        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("business_type, default_vat_rate")
          .eq("id", profile.company_id)
          .single();

        if (companyError) {
          console.error("Erreur chargement entreprise:", companyError);
        } else {
          setBusinessType(
            (companyData?.business_type as BusinessType | null) || "other"
          );
          setDefaultVatRate(Number(companyData?.default_vat_rate ?? 8.1));
        }

        const [
          { data: quoteData, error: quoteError },
          { data: itemsData, error: itemsError },
          { data: customersData, error: customersError },
          { data: vehiclesData, error: vehiclesError },
        ] = await Promise.all([
          supabase
            .from("quotes")
            .select(`
              id,
              customer_id,
              vehicle_id,
              claim_number,
              vat_rate,
              status,
              issue_date,
              customer_notes,
              internal_notes
            `)
            .eq("id", quoteId)
            .eq("company_id", profile.company_id)
            .single(),

          supabase
            .from("quote_items")
            .select(`
              id,
              label,
              quantity,
              unit,
              unit_price,
              category,
              labor_type,
              sort_order
            `)
            .eq("quote_id", quoteId)
            .eq("company_id", profile.company_id)
            .order("sort_order", { ascending: true }),

          supabase
            .from("customers")
            .select("id, first_name, last_name, email")
            .eq("company_id", profile.company_id)
            .order("created_at", { ascending: false }),

          supabase
            .from("vehicles")
            .select("id, customer_id, make, model, plate_number")
            .eq("company_id", profile.company_id)
            .order("created_at", { ascending: false }),
        ]);

        if (quoteError || !quoteData) {
          console.error("Erreur chargement devis:", quoteError);
          showToast({
            type: "error",
            title: "Devis introuvable",
          });
          router.push("/quotes/list");
          return;
        }

        if (itemsError) {
          console.error("Erreur chargement lignes devis:", itemsError);
          showToast({
            type: "error",
            title: "Erreur chargement lignes devis",
          });
          router.push("/quotes/list");
          return;
        }

        if (customersError) {
          console.error("Erreur chargement clients:", customersError);
          showToast({
            type: "error",
            title: "Erreur chargement clients",
          });
          router.push("/quotes/list");
          return;
        }

        if (vehiclesError) {
          console.error("Erreur chargement véhicules:", vehiclesError);
          showToast({
            type: "error",
            title: "Erreur chargement véhicules",
          });
          router.push("/quotes/list");
          return;
        }

        const allItems = (itemsData || []) as QuoteItemRow[];

        const manual = allItems
          .filter((item) => item.category !== "labor")
          .map((item) => ({
            id: item.id,
            label: item.label || "",
            quantity: item.quantity || 1,
            unit: item.unit || "pièce",
            unit_price: item.unit_price || 0,
          }));

        const laborDefaults: Record<LaborType, LaborLine> = {
          mecanique: { labor_type: "mecanique", hours: 0, hourly_rate: 0 },
          carrosserie: { labor_type: "carrosserie", hours: 0, hourly_rate: 0 },
          peinture: { labor_type: "peinture", hours: 0, hourly_rate: 0 },
        };

        allItems
          .filter((item) => item.category === "labor" && item.labor_type)
          .forEach((item) => {
            const laborType = item.labor_type as LaborType;

            if (laborType in laborDefaults) {
              laborDefaults[laborType] = {
                labor_type: laborType,
                hours: item.quantity || 0,
                hourly_rate: item.unit_price || 0,
              };
            }
          });

        setQuote(quoteData);
        setManualLines(
          manual.length > 0
            ? manual
            : [{ label: "", quantity: 1, unit: "pièce", unit_price: 0 }]
        );
        setLaborLines([
          laborDefaults.mecanique,
          laborDefaults.carrosserie,
          laborDefaults.peinture,
        ]);
        setCustomers(customersData || []);
        setVehicles(vehiclesData || []);
      } catch (error) {
        console.error("Erreur réseau edit devis:", error);
        showToast({
          type: "error",
          title: "Erreur réseau",
        });
        router.push("/quotes/list");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [quoteId, router, showToast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        <div className="mx-auto max-w-6xl">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Modifier le devis</h1>
          <p className="mt-2 text-sm text-white/60">
            {labels.pageDescription}
          </p>
        </div>

        <QuoteForm
          mode="edit"
          quoteId={quote.id}
          customers={customers}
          vehicles={vehicles}
          initialCustomerId={quote.customer_id}
          initialVehicleId={quote.vehicle_id || ""}
          initialClaimNumber={quote.claim_number || ""}
          initialVatRate={quote.vat_rate ?? defaultVatRate}
          initialLines={manualLines}
          initialLaborLines={laborLines}
          initialStatus={quote.status}
          initialIssueDate={quote.issue_date}
          initialCustomerNotes={quote.customer_notes || ""}
          initialInternalNotes={quote.internal_notes || ""}
        />
      </div>
    </div>
  );
}