"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
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

type QuoteFormProps = {
  mode: "edit";
  quoteId: string;
  customers: Customer[];
  vehicles: Vehicle[];
  initialCustomerId: string;
  initialVehicleId: string;
  initialClaimNumber: string;
  initialVatRate: number;
  initialLines: QuoteLine[];
  initialLaborLines: LaborLine[];
  initialStatus: string;
  initialIssueDate: string;
  initialCustomerNotes: string;
  initialInternalNotes: string;
};

export function QuoteForm({
  mode,
  quoteId,
  customers,
  vehicles,
  initialCustomerId,
  initialVehicleId,
  initialClaimNumber,
  initialVatRate,
  initialLines,
  initialLaborLines,
  initialStatus,
  initialIssueDate,
  initialCustomerNotes,
  initialInternalNotes,
}: QuoteFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [businessType, setBusinessType] = useState<BusinessType>("garage");
  const [loadingBusinessType, setLoadingBusinessType] = useState(true);

  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [vehicleId, setVehicleId] = useState(initialVehicleId);
  const [claimNumber, setClaimNumber] = useState(initialClaimNumber || "");
  const [vatRate, setVatRate] = useState(initialVatRate);
  const [status, setStatus] = useState(initialStatus || "draft");
  const [issueDate, setIssueDate] = useState(initialIssueDate || "");
  const [customerNotes, setCustomerNotes] = useState(initialCustomerNotes);
  const [internalNotes, setInternalNotes] = useState(initialInternalNotes);
  const [lines, setLines] = useState<QuoteLine[]>(
    initialLines.length > 0
      ? initialLines
      : [{ label: "", quantity: 1, unit: "pièce", unit_price: 0 }]
  );
  const [laborLines, setLaborLines] = useState<LaborLine[]>(initialLaborLines);
  const [saving, setSaving] = useState(false);

  const [customerSearch, setCustomerSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");

  const businessConfig = getBusinessConfig(businessType);

  const quoteUi = useMemo(() => {
    const showVehicles = businessConfig.sidebar.showVehicles;
    const showClaimNumber = businessConfig.features.showClaimNumber;
    const laborMode = businessType === "garage" ? "garage" : "none";

    const defaultUnits =
      businessType === "garage"
        ? ["pièce", "litre", "heure", "kg", "mètre", "forfait"]
        : ["heure", "forfait", "unité", "m²", "mètre", "kg"];

    const lineLabel =
      businessType === "cleaning"
        ? "Description de la prestation"
        : businessType === "plumbing"
          ? "Description de l’intervention"
          : businessType === "electrical"
            ? "Description de l’intervention"
            : businessType === "landscaping"
              ? "Description du service"
              : businessType === "btp"
                ? "Description du poste"
                : businessType === "other"
                  ? "Description"
                  : "Description";

    const vehicleLabel =
      businessType === "garage"
        ? "véhicule"
        : businessConfig.entities.vehicleSingular;

    const claimLabel =
      businessType === "garage"
        ? "Numéro de sinistre / assurance"
        : "Référence / dossier";

    return {
      showVehicles,
      showClaimNumber,
      laborMode,
      defaultUnits,
      lineLabel,
      vehicleLabel,
      claimLabel,
    };
  }, [businessConfig, businessType]);

  const unitOptions = quoteUi.defaultUnits;

  const laborLabelMap: Record<LaborType, string> = {
    mecanique: "Main-d’œuvre mécanique",
    carrosserie: "Main-d’œuvre carrosserie",
    peinture: "Main-d’œuvre peinture",
  };

  useEffect(() => {
    const loadBusinessType = async () => {
      setLoadingBusinessType(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoadingBusinessType(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("auth_user_id", user.id)
          .single();

        if (profileError || !profile?.company_id) {
          console.error(profileError);
          setLoadingBusinessType(false);
          return;
        }

        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("business_type")
          .eq("id", profile.company_id)
          .single();

        if (companyError) {
          console.error(companyError);
          setLoadingBusinessType(false);
          return;
        }

        setBusinessType(
          (companyData?.business_type as BusinessType | null) || "garage"
        );
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingBusinessType(false);
      }
    };

    loadBusinessType();
  }, []);

  useEffect(() => {
    const fallbackUnit = quoteUi.defaultUnits[0] || "unité";

    setLines((prev) =>
      prev.map((line) => ({
        ...line,
        unit: quoteUi.defaultUnits.includes(line.unit) ? line.unit : fallbackUnit,
      }))
    );

    if (!quoteUi.showVehicles) {
      setVehicleId("");
      setVehicleSearch("");
    }

    if (!quoteUi.showClaimNumber) {
      setClaimNumber("");
    }
  }, [quoteUi]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId),
    [customers, customerId]
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === vehicleId),
    [vehicles, vehicleId]
  );

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();

    if (!q) return [];

    return customers.filter((customer) => {
      const fullName =
        `${customer.first_name || ""} ${customer.last_name || ""}`.toLowerCase();

      return (
        fullName.includes(q) ||
        (customer.email || "").toLowerCase().includes(q)
      );
    });
  }, [customers, customerSearch]);

  const vehiclesForCustomer = useMemo(() => {
    if (!customerId) return vehicles;

    return vehicles.filter(
      (vehicle) => String(vehicle.customer_id) === String(customerId)
    );
  }, [vehicles, customerId]);

  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();

    if (!q) return [];

    return vehiclesForCustomer.filter((vehicle) => {
      const label = [vehicle.make, vehicle.model, vehicle.plate_number]
        .filter(Boolean)
        .join(" - ")
        .toLowerCase();

      return label.includes(q);
    });
  }, [vehiclesForCustomer, vehicleSearch]);

  const manualSubtotal = useMemo(() => {
    return lines.reduce(
      (sum, line) => sum + line.quantity * line.unit_price,
      0
    );
  }, [lines]);

  const laborSubtotal = useMemo(() => {
    if (quoteUi.laborMode !== "garage") return 0;

    return laborLines.reduce(
      (sum, line) => sum + line.hours * line.hourly_rate,
      0
    );
  }, [laborLines, quoteUi.laborMode]);

  const subtotal = useMemo(() => {
    return manualSubtotal + laborSubtotal;
  }, [manualSubtotal, laborSubtotal]);

  const vatAmount = useMemo(() => {
    return subtotal * (vatRate / 100);
  }, [subtotal, vatRate]);

  const total = useMemo(() => {
    return subtotal + vatAmount;
  }, [subtotal, vatAmount]);

  const formatCHF = (value: number) =>
    new Intl.NumberFormat("fr-CH", {
      style: "currency",
      currency: "CHF",
    }).format(value || 0);

  const updateLine = (index: number, field: keyof QuoteLine, value: string) => {
    const nextLines = [...lines];

    if (field === "quantity" || field === "unit_price") {
      nextLines[index][field] = Number(value) || 0;
    } else {
      nextLines[index][field] = value as never;
    }

    setLines(nextLines);
  };

  const addLine = () => {
    setLines([
      ...lines,
      {
        label: "",
        quantity: 1,
        unit: quoteUi.defaultUnits[0] || "unité",
        unit_price: 0,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLaborLine = (
    index: number,
    field: "hours" | "hourly_rate",
    value: string
  ) => {
    const next = [...laborLines];
    next[index][field] = Number(value) || 0;
    setLaborLines(next);
  };

  const getLaborLineTotal = (line: LaborLine) => {
    return line.hours * line.hourly_rate;
  };

  const clearSelectedCustomer = () => {
    setCustomerId("");
    setVehicleId("");
    setCustomerSearch("");
    setVehicleSearch("");
  };

  const clearSelectedVehicle = () => {
    setVehicleId("");
    setVehicleSearch("");
  };

  const handleSaveQuote = async () => {
    if (!customerId) {
      showToast({
        type: "info",
        title: "Client requis",
        message: "Merci de sélectionner un client.",
      });
      return;
    }

    const fallbackUnit = quoteUi.defaultUnits[0] || "unité";

    const cleanedLines = lines
      .map((line) => ({
        label: line.label.trim(),
        quantity: Number(line.quantity) || 0,
        unit: line.unit || fallbackUnit,
        unit_price: Number(line.unit_price) || 0,
      }))
      .filter((line) => line.label && line.quantity > 0);

    const cleanedLaborLines =
      quoteUi.laborMode === "garage"
        ? laborLines.filter((line) => line.hours > 0 && line.hourly_rate > 0)
        : [];

    if (cleanedLines.length === 0 && cleanedLaborLines.length === 0) {
      showToast({
        type: "info",
        title: "Lignes manquantes",
        message: "Merci d'ajouter au moins une ligne valide.",
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

      const { error: quoteError } = await supabase
        .from("quotes")
        .update({
          customer_id: customerId,
          vehicle_id: quoteUi.showVehicles ? vehicleId || null : null,
          claim_number: quoteUi.showClaimNumber ? claimNumber || null : null,
          status,
          issue_date: issueDate || null,
          subtotal_amount: subtotal,
          discount_amount: 0,
          vat_rate: vatRate,
          vat_amount: vatAmount,
          total_amount: total,
          customer_notes: customerNotes,
          internal_notes: internalNotes,
        })
        .eq("id", quoteId)
        .eq("company_id", profile.company_id);

      if (quoteError) {
        console.error(quoteError);
        showToast({
          type: "error",
          title: "Erreur mise à jour devis",
        });
        return;
      }

      const { error: deleteItemsError } = await supabase
        .from("quote_items")
        .delete()
        .eq("quote_id", quoteId)
        .eq("company_id", profile.company_id);

      if (deleteItemsError) {
        console.error(deleteItemsError);
        showToast({
          type: "error",
          title: "Erreur mise à jour lignes devis",
        });
        return;
      }

      const manualItems = cleanedLines.map((line, index) => ({
        company_id: profile.company_id,
        quote_id: quoteId,
        item_type: "service",
        category: "manual",
        label: line.label,
        description: null,
        quantity: line.quantity,
        unit: line.unit,
        unit_price: line.unit_price,
        discount_rate: 0,
        vat_rate: vatRate,
        line_total: line.quantity * line.unit_price,
        sort_order: index,
      }));

      const laborItems = cleanedLaborLines.map((line, index) => ({
        company_id: profile.company_id,
        quote_id: quoteId,
        item_type: "service",
        category: "labor",
        labor_type: line.labor_type,
        label: laborLabelMap[line.labor_type],
        description: null,
        quantity: line.hours,
        unit: "heure",
        unit_price: line.hourly_rate,
        discount_rate: 0,
        vat_rate: vatRate,
        line_total: line.hours * line.hourly_rate,
        sort_order: manualItems.length + index,
      }));

      const itemsPayload = [...manualItems, ...laborItems];

      const { error: insertItemsError } = await supabase
        .from("quote_items")
        .insert(itemsPayload);

      if (insertItemsError) {
        console.error(insertItemsError);
        showToast({
          type: "error",
          title: "Erreur enregistrement lignes devis",
        });
        return;
      }

      showToast({
        type: "success",
        title: "Devis mis à jour",
      });

      router.push(`/quotes/${quoteId}`);
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

  if (loadingBusinessType) {
    return (
      <div className="space-y-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white">
          Chargement...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">
          {mode === "edit" ? "Modifier le devis" : "Devis"}
        </h2>

        <div className="text-sm text-white/50">
          Mode activité : {businessConfig.label}
        </div>

        <div
          className={`grid grid-cols-1 gap-4 ${
            quoteUi.showVehicles
              ? "lg:grid-cols-[1fr_1fr_180px]"
              : "lg:grid-cols-[1fr_180px]"
          }`}
        >
          <div className="space-y-2">
            <input
              placeholder="Rechercher un client..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full rounded bg-white p-3 text-black"
            />

            {customerSearch.trim() && (
              <div className="max-h-40 overflow-y-auto rounded bg-white text-black">
                {filteredCustomers.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">
                    Aucun client trouvé.
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => {
                        setCustomerId(customer.id);
                        setVehicleId("");
                        setCustomerSearch("");
                        setVehicleSearch("");
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

            <div className="flex min-h-[72px] flex-col gap-2 rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
              <span>
                {selectedCustomer
                  ? `Client sélectionné : ${
                      [selectedCustomer.first_name, selectedCustomer.last_name]
                        .filter(Boolean)
                        .join(" ") ||
                      selectedCustomer.email ||
                      selectedCustomer.id
                    }`
                  : "Aucun client sélectionné"}
              </span>

              {selectedCustomer ? (
                <button
                  type="button"
                  onClick={clearSelectedCustomer}
                  className="self-start rounded border border-white/20 px-3 py-1 text-xs font-medium hover:bg-white/10"
                >
                  Désélectionner
                </button>
              ) : null}
            </div>
          </div>

          {quoteUi.showVehicles ? (
            <div className="space-y-2">
              <input
                placeholder={
                  customerId
                    ? `Rechercher un ${quoteUi.vehicleLabel} du client...`
                    : `Rechercher un ${quoteUi.vehicleLabel}...`
                }
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                className="w-full rounded bg-white p-3 text-black"
              />

              {vehicleSearch.trim() && (
                <div className="max-h-40 overflow-y-auto rounded bg-white text-black">
                  {filteredVehicles.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">
                      Aucun {quoteUi.vehicleLabel} trouvé.
                    </div>
                  ) : (
                    filteredVehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        onClick={() => {
                          setVehicleId(vehicle.id);
                          setVehicleSearch("");
                        }}
                        className="cursor-pointer p-2 hover:bg-gray-200"
                      >
                        {[vehicle.make, vehicle.model, vehicle.plate_number]
                          .filter(Boolean)
                          .join(" - ") || vehicle.id}
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="flex min-h-[72px] flex-col gap-2 rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
                <span>
                  {selectedVehicle
                    ? `${quoteUi.vehicleLabel.charAt(0).toUpperCase() + quoteUi.vehicleLabel.slice(1)} sélectionné : ${
                        [
                          selectedVehicle.make,
                          selectedVehicle.model,
                          selectedVehicle.plate_number,
                        ]
                          .filter(Boolean)
                          .join(" - ") || selectedVehicle.id
                      }`
                    : `Aucun ${quoteUi.vehicleLabel} sélectionné`}
                </span>

                {selectedVehicle ? (
                  <button
                    type="button"
                    onClick={clearSelectedVehicle}
                    className="self-start rounded border border-white/20 px-3 py-1 text-xs font-medium hover:bg-white/10"
                  >
                    Désélectionner
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="rounded border border-white/10 bg-black/20 p-3">
            <div className="mb-2 text-sm font-medium text-white/60">TVA</div>

            <div className="flex items-center rounded bg-white px-2 text-black">
              <input
                type="number"
                step="0.1"
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value) || 0)}
                className="w-full bg-transparent p-2 outline-none"
              />
              <span className="pr-1 text-sm text-black/70">%</span>
            </div>
          </div>
        </div>

        {quoteUi.showClaimNumber ? (
          <input
            className="w-full rounded bg-white p-3 text-black"
            placeholder={quoteUi.claimLabel}
            value={claimNumber}
            onChange={(e) => setClaimNumber(e.target.value)}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <select
            className="w-full rounded bg-white p-3 text-black"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="draft">Brouillon</option>
            <option value="sent">Envoyé</option>
            <option value="approved">Accepté</option>
            <option value="rejected">Refusé</option>
          </select>

          <input
            type="date"
            className="w-full rounded bg-white p-3 text-black"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Lignes libres</h3>

          {lines.map((line, index) => (
            <div
              key={index}
              className="grid grid-cols-1 items-center gap-3 md:grid-cols-12"
            >
              <input
                className="w-full rounded bg-white p-3 text-black md:col-span-4"
                placeholder={quoteUi.lineLabel}
                value={line.label}
                onChange={(e) => updateLine(index, "label", e.target.value)}
              />

              <input
                type="number"
                className="w-full rounded bg-white p-3 text-black md:col-span-2"
                placeholder="Qté"
                value={line.quantity}
                onChange={(e) => updateLine(index, "quantity", e.target.value)}
              />

              <select
                className="w-full rounded bg-white p-3 text-black md:col-span-2"
                value={line.unit}
                onChange={(e) => updateLine(index, "unit", e.target.value)}
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit.charAt(0).toUpperCase() + unit.slice(1)}
                  </option>
                ))}
              </select>

              <input
                type="number"
                step="0.01"
                className="w-full rounded bg-white p-3 text-black md:col-span-2"
                placeholder="Prix unitaire"
                value={line.unit_price}
                onChange={(e) => updateLine(index, "unit_price", e.target.value)}
              />

              <button
                type="button"
                onClick={() => removeLine(index)}
                className="w-full rounded bg-white/10 px-4 py-3 md:col-span-2"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>

        {quoteUi.laborMode === "garage" ? (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-6">
            <h3 className="text-lg font-semibold">Main-d’œuvre</h3>

            <div className="space-y-3">
              {laborLines.map((line, index) => (
                <div
                  key={line.labor_type}
                  className="grid grid-cols-1 items-center gap-3 md:grid-cols-4"
                >
                  <div className="rounded bg-white/10 px-4 py-3 capitalize">
                    {line.labor_type}
                  </div>

                  <input
                    type="number"
                    step="0.1"
                    className="w-full rounded bg-white p-3 text-black"
                    placeholder="Heures"
                    value={line.hours}
                    onChange={(e) =>
                      updateLaborLine(index, "hours", e.target.value)
                    }
                  />

                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded bg-white p-3 text-black"
                    placeholder="Tarif horaire"
                    value={line.hourly_rate}
                    onChange={(e) =>
                      updateLaborLine(index, "hourly_rate", e.target.value)
                    }
                  />

                  <div className="rounded bg-white/10 px-4 py-3 text-right font-medium">
                    {formatCHF(getLaborLineTotal(line))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <textarea
            className="min-h-[120px] w-full rounded bg-white p-3 text-black"
            placeholder="Notes client"
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
          />

          <textarea
            className="min-h-[120px] w-full rounded bg-white p-3 text-black"
            placeholder="Notes internes"
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={addLine}
            className="rounded bg-white/10 px-4 py-3"
          >
            Ajouter une ligne
          </button>

          <button
            type="button"
            onClick={handleSaveQuote}
            disabled={saving}
            className="rounded bg-red-500 px-4 py-3 disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>

          <Link
            href={`/quotes/${quoteId}`}
            className="rounded border border-white/20 px-4 py-3 hover:bg-white/10"
          >
            Annuler
          </Link>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">Résumé</h2>
        <div className="text-white/80">
          Sous-total lignes libres : {formatCHF(manualSubtotal)}
        </div>

        {quoteUi.laborMode === "garage" ? (
          <div className="text-white/80">
            Sous-total main-d’œuvre : {formatCHF(laborSubtotal)}
          </div>
        ) : null}

        <div className="text-white/80">
          Sous-total global : {formatCHF(subtotal)}
        </div>
        <div className="text-white/80">TVA : {formatCHF(vatAmount)}</div>
        <div className="text-2xl font-bold">Total TTC : {formatCHF(total)}</div>
      </div>
    </div>
  );
}