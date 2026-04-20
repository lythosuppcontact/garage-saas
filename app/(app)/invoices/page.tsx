"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { BusinessType, getBusinessConfig } from "@/lib/business-types";
import { useToast } from "@/components/ui/toast";

type QuoteOption = {
  id: string;
  number: string;
  customer_id: string;
  vehicle_id: string | null;
  claim_number: string | null;
  subtotal_amount: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  customers: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

type QuoteItem = {
  label: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  discount_rate: number;
  vat_rate: number | null;
  line_total: number;
  item_type: string;
  category: string | null;
  sort_order: number;
};

export default function InvoicesPage() {
  const { showToast } = useToast();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>("garage");
  const [loadingContext, setLoadingContext] = useState(true);

  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [quoteSearch, setQuoteSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const businessConfig = getBusinessConfig(businessType);

  const labels = {
    customer:
      businessConfig.entities.customerSingular.charAt(0).toUpperCase() +
      businessConfig.entities.customerSingular.slice(1),
    vehicle:
      businessType === "garage"
        ? "véhicule"
        : businessConfig.entities.vehicleSingular,
    claim:
      businessType === "garage" ? "sinistre" : "référence",
  };

  const selectedQuote = useMemo(
    () => quotes.find((q) => q.id === selectedQuoteId) || null,
    [quotes, selectedQuoteId]
  );

  const filteredQuotes = useMemo(() => {
    const q = quoteSearch.trim().toLowerCase();

    if (!q) return [];

    return quotes.filter((quote) => {
      const customerName =
        [quote.customers?.first_name, quote.customers?.last_name]
          .filter(Boolean)
          .join(" ") || quote.customers?.email || "";

      const values = businessConfig.features.showClaimNumber
        ? [quote.number, quote.claim_number, customerName]
        : [quote.number, customerName];

      return values
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [quotes, quoteSearch, businessConfig.features.showClaimNumber]);

  const createInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `FAC-${year}-${rand}`;
  };

  const formatCHF = (value: number | null | undefined) =>
    new Intl.NumberFormat("fr-CH", {
      style: "currency",
      currency: "CHF",
    }).format(value || 0);

  const loadQuotes = async () => {
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

      const { data, error } = await supabase
        .from("quotes")
        .select(`
          id,
          number,
          customer_id,
          vehicle_id,
          claim_number,
          subtotal_amount,
          vat_rate,
          vat_amount,
          total_amount,
          customers (
            first_name,
            last_name,
            email
          )
        `)
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Erreur chargement devis",
        });
        setLoadingContext(false);
        return;
      }

      const normalizedQuotes: QuoteOption[] = ((data || []) as any[]).map((quote) => ({
  ...quote,
  customers: Array.isArray(quote.customers)
    ? quote.customers[0] || null
    : quote.customers || null,
}));

setQuotes(normalizedQuotes);
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

  useEffect(() => {
    loadQuotes();
  }, []);

  const clearSelectedQuote = () => {
    setSelectedQuoteId("");
    setQuoteSearch("");
  };

  const handleCreateInvoice = async () => {
    if (!companyId) {
      showToast({
        type: "error",
        title: "Entreprise introuvable",
      });
      return;
    }

    if (!selectedQuote) {
      showToast({
        type: "info",
        title: "Devis requis",
        message: "Merci de sélectionner un devis.",
      });
      return;
    }

    setLoading(true);

    try {
      const invoiceNumber = createInvoiceNumber();

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          company_id: companyId,
          customer_id: selectedQuote.customer_id,
          vehicle_id: businessConfig.sidebar.showVehicles
            ? selectedQuote.vehicle_id
            : null,
          quote_id: selectedQuote.id,
          claim_number: businessConfig.features.showClaimNumber
            ? selectedQuote.claim_number || null
            : null,
          number: invoiceNumber,
          status: "draft",
          issue_date: new Date().toISOString().slice(0, 10),
          due_date: null,
          currency: "CHF",
          subtotal_amount: selectedQuote.subtotal_amount,
          discount_amount: 0,
          vat_rate: selectedQuote.vat_rate,
          vat_amount: selectedQuote.vat_amount,
          total_amount: selectedQuote.total_amount,
          amount_paid: 0,
          balance_due: selectedQuote.total_amount,
          customer_notes: "",
          internal_notes: "",
        })
        .select()
        .single();

      if (invoiceError || !invoice) {
        console.error(invoiceError);
        showToast({
          type: "error",
          title: "Erreur création facture",
        });
        return;
      }

      const { data: quoteItems, error: quoteItemsError } = await supabase
        .from("quote_items")
        .select(`
          label,
          description,
          quantity,
          unit,
          unit_price,
          discount_rate,
          vat_rate,
          line_total,
          item_type,
          category,
          sort_order
        `)
        .eq("quote_id", selectedQuote.id)
        .eq("company_id", companyId)
        .order("sort_order", { ascending: true });

      if (quoteItemsError) {
        console.error(quoteItemsError);
        showToast({
          type: "error",
          title: "Erreur chargement lignes devis",
        });
        return;
      }

      const invoiceItemsPayload = ((quoteItems as QuoteItem[]) || []).map(
        (item) => ({
          company_id: companyId,
          invoice_id: invoice.id,
          item_type: item.item_type,
          category: item.category,
          label: item.label,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          discount_rate: item.discount_rate,
          vat_rate: item.vat_rate,
          line_total: item.line_total,
          sort_order: item.sort_order,
        })
      );

      if (invoiceItemsPayload.length > 0) {
        const { error: invoiceItemsError } = await supabase
          .from("invoice_items")
          .insert(invoiceItemsPayload);

        if (invoiceItemsError) {
          console.error(invoiceItemsError);
          showToast({
            type: "error",
            title: "Erreur création lignes facture",
          });
          return;
        }
      }

      showToast({
        type: "success",
        title: "Facture créée",
        message: invoiceNumber,
      });
      setSelectedQuoteId("");
      setQuoteSearch("");
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
          <h1 className="text-3xl font-bold">
            {businessConfig.sidebar.invoicesNewLabel}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Mode activité : {businessConfig.label}
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">
            Créer une facture depuis un devis
          </h2>

          <div className="space-y-2">
            <input
              placeholder={
                businessConfig.features.showClaimNumber
                  ? `Rechercher un devis, client ou ${labels.claim}...`
                  : "Rechercher un devis ou un client..."
              }
              value={quoteSearch}
              onChange={(e) => setQuoteSearch(e.target.value)}
              className="w-full rounded bg-white p-3 text-black"
            />

            {quoteSearch.trim() && (
              <div className="max-h-40 overflow-y-auto rounded bg-white text-black">
                {filteredQuotes.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">
                    Aucun devis trouvé.
                  </div>
                ) : (
                  filteredQuotes.map((quote) => {
                    const customerName =
                      [quote.customers?.first_name, quote.customers?.last_name]
                        .filter(Boolean)
                        .join(" ") || quote.customers?.email || "-";

                    return (
                      <div
                        key={quote.id}
                        onClick={() => {
                          setSelectedQuoteId(quote.id);
                          setQuoteSearch("");
                        }}
                        className="cursor-pointer p-2 hover:bg-gray-200"
                      >
                        <div className="font-medium">{quote.number}</div>
                        <div className="text-sm text-gray-600">
                          {customerName}
                        </div>

                        {businessConfig.features.showClaimNumber &&
                        quote.claim_number ? (
                          <div className="text-xs text-gray-500">
                            {labels.claim.charAt(0).toUpperCase() +
                              labels.claim.slice(1)}{" "}
                            : {quote.claim_number}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
              <span>
                {selectedQuote
                  ? `Devis sélectionné : ${selectedQuote.number}`
                  : "Aucun devis sélectionné"}
              </span>

              {selectedQuote ? (
                <button
                  type="button"
                  onClick={clearSelectedQuote}
                  className="self-start rounded border border-white/20 px-3 py-1 text-xs font-medium hover:bg-white/10"
                >
                  Désélectionner
                </button>
              ) : null}
            </div>
          </div>

          {selectedQuote && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="font-semibold">{selectedQuote.number}</div>
              <div className="text-white/70">
                {labels.customer} :{" "}
                {[selectedQuote.customers?.first_name, selectedQuote.customers?.last_name]
                  .filter(Boolean)
                  .join(" ") || selectedQuote.customers?.email || "-"}
              </div>

              {businessConfig.features.showClaimNumber &&
              selectedQuote.claim_number ? (
                <div className="text-white/70">
                  {labels.claim.charAt(0).toUpperCase() + labels.claim.slice(1)} :{" "}
                  {selectedQuote.claim_number}
                </div>
              ) : null}

              <div className="text-white/70">
                Sous-total : {formatCHF(selectedQuote.subtotal_amount)}
              </div>
              <div className="text-white/70">
                TVA : {formatCHF(selectedQuote.vat_amount)}
              </div>
              <div className="text-xl font-bold">
                Total : {formatCHF(selectedQuote.total_amount)}
              </div>
            </div>
          )}

          <button
            onClick={handleCreateInvoice}
            disabled={loading}
            className="rounded bg-red-500 px-4 py-3 font-medium disabled:opacity-50"
          >
            {loading ? "Création..." : "Créer la facture"}
          </button>
        </div>
      </div>
    </div>
  );
}