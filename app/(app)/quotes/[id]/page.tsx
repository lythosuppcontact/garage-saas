"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BusinessType, getBusinessConfig } from "@/lib/business-types";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Quote = {
  id: string;
  number: string;
  status: string;
  issue_date: string | null;
  claim_number: string | null;
  currency: string | null;
  subtotal_amount: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  customer_notes: string | null;
  internal_notes: string | null;
  customers: {
    id?: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone?: string | null;
    city?: string | null;
  } | null;
  vehicles: {
    id?: string;
    make: string | null;
    model: string | null;
    plate_number: string | null;
  } | null;
};

type QuoteItem = {
  id: string;
  label: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  line_total: number | null;
  sort_order: number | null;
};

type PdfHeaderMode = "text" | "logo" | "logo_text";

type Company = {
  name: string;
  logo_url: string | null;
  pdf_header_mode: PdfHeaderMode | null;
  business_type: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  vat_number: string | null;
} | null;

export default function QuoteDetailPage() {
  const { showToast } = useToast();

  const params = useParams();
  const router = useRouter();
  const quoteId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [company, setCompany] = useState<Company>(null);
  const [businessType, setBusinessType] = useState<BusinessType>("garage");

  const businessConfig = getBusinessConfig(businessType);

  const labels = {
    customer:
      businessConfig.entities.customerSingular.charAt(0).toUpperCase() +
      businessConfig.entities.customerSingular.slice(1),
    vehicle:
      businessType === "garage"
        ? "Véhicule"
        : businessConfig.entities.vehicleSingular.charAt(0).toUpperCase() +
          businessConfig.entities.vehicleSingular.slice(1),
    plate:
      businessType === "garage" ? "Plaque" : "Référence / identifiant",
    claim: businessType === "garage" ? "Sinistre" : "Référence",
  };

  const formatMoney = (value: number | null | undefined) =>
    new Intl.NumberFormat("fr-CH", {
      style: "currency",
      currency: quote?.currency || "CHF",
    }).format(value || 0);

  const formatCHFPdf = (value: number | null | undefined) => {
    const amount = Number(value || 0);
    const fixed = amount.toFixed(2);
    const [integerPart, decimalPart] = fixed.split(".");
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    return `${formattedInteger}.${decimalPart} CHF`;
  };

  const formattedDate = useMemo(() => {
    if (!quote?.issue_date) return "-";

    const date = new Date(quote.issue_date);
    if (Number.isNaN(date.getTime())) return quote.issue_date;

    return new Intl.DateTimeFormat("fr-CH").format(date);
  }, [quote?.issue_date]);

  const customerName =
    [quote?.customers?.first_name, quote?.customers?.last_name]
      .filter(Boolean)
      .join(" ") || quote?.customers?.email || "-";

  const vehicleName =
    [quote?.vehicles?.make, quote?.vehicles?.model, quote?.vehicles?.plate_number]
      .filter(Boolean)
      .join(" - ") || "-";

  const createInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `FAC-${year}-${rand}`;
  };

  const loadImageAsDataUrl = (url: string) =>
    new Promise<string>((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas introuvable"));
          return;
        }

        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = () => reject(new Error("Impossible de charger le logo"));
      img.src = url;
    });

  const handleConvertToInvoice = async () => {
    if (!quote || convertLoading) return;

    setConvertLoading(true);

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

      const companyId = profile.company_id;

      const { data: existingInvoice, error: existingInvoiceError } = await supabase
        .from("invoices")
        .select("id")
        .eq("quote_id", quote.id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (existingInvoiceError) {
        console.error(existingInvoiceError);
        showToast({
          type: "error",
          title: "Erreur vérification facture",
        });
        return;
      }

      if (existingInvoice) {
        showToast({
          type: "info",
          title: "Facture déjà existante",
        });
        router.push(`/invoices/${existingInvoice.id}`);
        return;
      }

      const invoiceNumber = createInvoiceNumber();

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          company_id: companyId,
          quote_id: quote.id,
          customer_id: quote.customers?.id || null,
          vehicle_id: businessConfig.sidebar.showVehicles
            ? quote.vehicles?.id || null
            : null,
          claim_number: businessConfig.features.showClaimNumber
            ? quote.claim_number || null
            : null,
          number: invoiceNumber,
          status: "draft",
          issue_date: new Date().toISOString().slice(0, 10),
          currency: quote.currency || "CHF",
          subtotal_amount: quote.subtotal_amount || 0,
          discount_amount: 0,
          vat_rate: quote.vat_rate || 0,
          vat_amount: quote.vat_amount || 0,
          total_amount: quote.total_amount || 0,
          amount_paid: 0,
          balance_due: quote.total_amount || 0,
          customer_notes: quote.customer_notes || "",
          internal_notes: quote.internal_notes || "",
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
          item_type,
          category,
          labor_type,
          label,
          description,
          quantity,
          unit,
          unit_price,
          discount_rate,
          vat_rate,
          line_total,
          sort_order
        `)
        .eq("quote_id", quote.id)
        .eq("company_id", companyId)
        .order("sort_order", { ascending: true });

      if (quoteItemsError) {
        console.error("quoteItemsError:", quoteItemsError);
        await supabase.from("invoices").delete().eq("id", invoice.id);

        showToast({
          type: "error",
          title: "Erreur chargement lignes devis",
        });
        return;
      }

      const invoiceItemsPayload = (quoteItems || []).map((item, index) => ({
        company_id: companyId,
        invoice_id: invoice.id,
        item_type: item.item_type || "service",
        label: item.label || "Ligne",
        description: item.description || null,
        quantity: Number(item.quantity) || 0,
        unit: item.unit || "unité",
        unit_price: Number(item.unit_price) || 0,
        discount_rate: Number(item.discount_rate) || 0,
        vat_rate: Number(item.vat_rate) || 0,
        line_total:
          Number(item.line_total) ||
          (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        sort_order: item.sort_order ?? index,
      }));

      console.log("QUOTE ITEMS:", quoteItems);
      console.log("INVOICE ITEMS PAYLOAD:", invoiceItemsPayload);

      if (invoiceItemsPayload.length > 0) {
        const { error: invoiceItemsError } = await supabase
          .from("invoice_items")
          .insert(invoiceItemsPayload);

        if (invoiceItemsError) {
          console.error("invoiceItemsError:", invoiceItemsError);
          await supabase.from("invoices").delete().eq("id", invoice.id);

          showToast({
            type: "error",
            title: "Erreur création lignes facture",
            message:
              invoiceItemsError.message ||
              "Impossible de copier les lignes du devis",
          });
          return;
        }
      }

      showToast({
        type: "success",
        title: "Facture créée",
        message: invoice.number,
      });

      router.push(`/invoices/${invoice.id}`);
    } catch (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Erreur réseau",
      });
    } finally {
      setConvertLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quote) return;

    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const primary = company?.primary_color || "#ff3131";
    const secondary = company?.secondary_color || "#111111";
    const headerMode: PdfHeaderMode = company?.pdf_header_mode || "text";

    const showVehicle = businessConfig.sidebar.showVehicles;
    const showClaimNumber = businessConfig.features.showClaimNumber;

    const hexToRgb = (hex: string) => {
      const cleaned = hex.replace("#", "");
      const bigint = parseInt(cleaned, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return [r, g, b] as const;
    };

    const [pr, pg, pb] = hexToRgb(primary);
    const [sr, sg, sb] = hexToRgb(secondary);

    const companyName = company?.name || "Lytho";
    const companyEmail = company?.email || "";
    const companyPhone = company?.phone || "";
    const companyVat = company?.vat_number || "";

    const companyAddress = [
      company?.address_line_1,
      company?.address_line_2,
      [company?.postal_code, company?.city].filter(Boolean).join(" "),
      company?.country,
    ]
      .filter(Boolean)
      .join(", ");

    const pdfCustomerName =
      [quote.customers?.first_name, quote.customers?.last_name]
        .filter(Boolean)
        .join(" ") || quote.customers?.email || "-";

    const pdfVehicleName =
      [quote.vehicles?.make, quote.vehicles?.model].filter(Boolean).join(" - ") || "-";

    const statusLabel =
      {
        draft: "Brouillon",
        sent: "Envoyé",
        approved: "Accepté",
        rejected: "Refusé",
      }[quote.status] || quote.status;

    const hasClaim = showClaimNumber && Boolean(quote.claim_number);
    const headerHeight = hasClaim ? 145 : 120;

    doc.setFillColor(sr, sg, sb);
    doc.rect(0, 0, 595, headerHeight, "F");

    const logoBoxX = 40;
    const logoBoxY = 22;
    const logoBoxW = 130;
    const logoBoxH = 60;

    if (headerMode === "logo" || headerMode === "logo_text") {
      if (company?.logo_url) {
        try {
          const logoDataUrl = await loadImageAsDataUrl(company.logo_url);
          doc.addImage(logoDataUrl, "PNG", logoBoxX, logoBoxY, logoBoxW, logoBoxH);
        } catch (error) {
          console.error("Erreur chargement logo PDF:", error);
        }
      }
    }

    doc.setTextColor(255, 255, 255);

    if (headerMode === "text") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.text(companyName, 40, 52);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      if (companyEmail) doc.text(companyEmail, 40, 74);
      if (companyPhone) doc.text(companyPhone, 40, 90);
    }

    if (headerMode === "logo_text") {
      const headerTextX = 185;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.text(companyName, headerTextX, 52);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      if (companyEmail) doc.text(companyEmail, headerTextX, 74);
      if (companyPhone) doc.text(companyPhone, headerTextX, 90);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("DEVIS", 555, 50, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`N° ${quote.number}`, 555, 72, { align: "right" });
    doc.text(`Date : ${formattedDate}`, 555, 88, { align: "right" });
    doc.text(`Statut : ${statusLabel}`, 555, 104, { align: "right" });

    if (hasClaim) {
      doc.text(`${labels.claim} : ${quote.claim_number}`, 555, 126, {
        align: "right",
      });
    }

    doc.setTextColor(20, 20, 20);

    const contentStartY = headerHeight + 35;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(labels.customer, 40, contentStartY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(pdfCustomerName, 40, contentStartY + 20);
    if (quote.customers?.email) doc.text(quote.customers.email, 40, contentStartY + 38);
    if (quote.customers?.phone) doc.text(quote.customers.phone, 40, contentStartY + 56);
    if (quote.customers?.city) doc.text(quote.customers.city, 40, contentStartY + 74);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Entreprise", 320, contentStartY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(companyName, 320, contentStartY + 20);

    if (companyAddress) {
      doc.text(doc.splitTextToSize(companyAddress, 220), 320, contentStartY + 38);
    }

    if (companyVat) {
      doc.text(`TVA : ${companyVat}`, 320, contentStartY + 90);
    }

    let tableStartY = contentStartY + 120;

    if (showVehicle) {
      const vehicleBlockY = contentStartY + 120;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(labels.vehicle, 40, vehicleBlockY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(pdfVehicleName, 40, vehicleBlockY + 20);
      doc.text(
        `${labels.plate} : ${quote.vehicles?.plate_number || "-"}`,
        40,
        vehicleBlockY + 38
      );

      tableStartY = vehicleBlockY + 55;
    }

    autoTable(doc, {
      startY: tableStartY,
      head: [["Description", "Qté", "Unité", "PU", "Total"]],
      body: items.map((item) => [
        item.label || "-",
        String(item.quantity ?? 0),
        item.unit || "-",
        formatCHFPdf(item.unit_price ?? 0),
        formatCHFPdf(item.line_total ?? 0),
      ]),
      headStyles: {
        fillColor: [pr, pg, pb],
        textColor: [255, 255, 255],
      },
      styles: {
        fontSize: 10,
        cellPadding: 8,
        textColor: [30, 30, 30],
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: 40, right: 40 },
    });

    let finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 100;
    const pageHeight = doc.internal.pageSize.getHeight();

    if (finalY + 170 > pageHeight - 40) {
      doc.addPage();
      finalY = 60;
    }

    doc.setDrawColor(230, 230, 230);
    doc.line(330, finalY + 20, 545, finalY + 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    doc.text("Sous-total", 330, finalY + 45);
    doc.text(formatCHFPdf(quote.subtotal_amount), 545, finalY + 45, {
      align: "right",
    });

    doc.text(`TVA ${quote.vat_rate ?? 0}%`, 330, finalY + 65);
    doc.text(formatCHFPdf(quote.vat_amount), 545, finalY + 65, {
      align: "right",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Total TTC", 330, finalY + 105);
    doc.text(formatCHFPdf(quote.total_amount), 545, finalY + 105, {
      align: "right",
    });

    const footerY = doc.internal.pageSize.getHeight() - 20;

    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `${companyName}${companyEmail ? ` · ${companyEmail}` : ""}${companyPhone ? ` · ${companyPhone}` : ""}`,
      40,
      footerY
    );

    doc.save(`${quote.number}.pdf`);
  };

  const handleDeleteQuote = async () => {
    if (!quote) return;

    setDeleteLoading(true);

    try {
      const { error: itemsError } = await supabase
        .from("quote_items")
        .delete()
        .eq("quote_id", quote.id);

      if (itemsError) {
        console.error(itemsError);
        showToast({
          type: "error",
          title: "Erreur suppression lignes devis",
        });
        return;
      }

      const { error: quoteError } = await supabase
        .from("quotes")
        .delete()
        .eq("id", quote.id);

      if (quoteError) {
        console.error(quoteError);
        showToast({
          type: "error",
          title: "Erreur suppression devis",
        });
        return;
      }

      showToast({
        type: "success",
        title: "Devis supprimé",
      });

      setShowDeleteDialog(false);
      window.location.href = "/quotes/list";
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

  const loadQuote = async () => {
    if (!quoteId) return;

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
        .select(`
          name,
          logo_url,
          pdf_header_mode,
          business_type,
          primary_color,
          secondary_color,
          address_line_1,
          address_line_2,
          postal_code,
          city,
          country,
          phone,
          email,
          vat_number
        `)
        .eq("id", profile.company_id)
        .single();

      if (companyError) {
        console.error(companyError);
      } else {
        setCompany(companyData);
        setBusinessType(
          (companyData.business_type as BusinessType | null) || "garage"
        );
      }

      const [
        { data: quoteData, error: quoteError },
        { data: itemsData, error: itemsError },
      ] = await Promise.all([
        supabase
          .from("quotes")
          .select(`
            id,
            number,
            status,
            issue_date,
            claim_number,
            currency,
            subtotal_amount,
            vat_rate,
            vat_amount,
            total_amount,
            customer_notes,
            internal_notes,
            customers (
              id,
              first_name,
              last_name,
              email,
              phone,
              city
            ),
            vehicles (
              id,
              make,
              model,
              plate_number
            )
          `)
          .eq("id", quoteId)
          .eq("company_id", profile.company_id)
          .single(),

        supabase
          .from("quote_items")
          .select(`
            id,
            label,
            description,
            quantity,
            unit,
            unit_price,
            line_total,
            sort_order
          `)
          .eq("quote_id", quoteId)
          .eq("company_id", profile.company_id)
          .order("sort_order", { ascending: true }),
      ]);

      if (quoteError || !quoteData) {
        console.error("Erreur chargement devis:", quoteError);
        showToast({
          type: "error",
          title: "Erreur chargement devis",
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

      const normalizedQuote: Quote = {
  ...quoteData,
  customers: Array.isArray(quoteData.customers)
    ? quoteData.customers[0] || null
    : quoteData.customers || null,
  vehicles: Array.isArray(quoteData.vehicles)
    ? quoteData.vehicles[0] || null
    : quoteData.vehicles || null,
};

setQuote(normalizedQuote);
      setItems((itemsData as QuoteItem[]) || []);
    } catch (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Erreur réseau",
      });
      router.push("/quotes/list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuote();
  }, [quoteId]);

  const updateStatus = async (nextStatus: string) => {
    if (!quote) return;

    setStatusLoading(true);

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
        .from("quotes")
        .update({ status: nextStatus })
        .eq("id", quote.id)
        .eq("company_id", profile.company_id);

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Erreur mise à jour statut",
        });
        return;
      }

      setQuote((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      showToast({
        type: "success",
        title: "Statut mis à jour",
      });
    } catch (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Erreur réseau",
      });
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        Chargement...
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        Devis introuvable
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex justify-between rounded-2xl border border-white/10 bg-white/5 p-6">
          <div>
            <h1 className="text-3xl font-bold">{quote.number}</h1>
            <div className="mt-2">
              <StatusBadge status={quote.status} />
            </div>
            <div className="mt-2 text-white/70">
              {labels.customer} : {customerName}
            </div>

            {businessConfig.sidebar.showVehicles ? (
              <div className="text-white/70">
                {labels.vehicle} : {vehicleName}
              </div>
            ) : null}

            <div className="text-white/70">Date : {formattedDate}</div>

            {businessConfig.features.showClaimNumber && quote.claim_number ? (
              <div className="text-white/70">
                {labels.claim} : {quote.claim_number}
              </div>
            ) : null}
          </div>

          <div className="space-y-4 text-right">
            <div>
              <div className="uppercase text-white/60">Total TTC</div>
              <div className="text-3xl font-bold">
                {formatMoney(quote.total_amount)}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => updateStatus("draft")}
                disabled={statusLoading}
                className="rounded bg-white/10 px-3 py-2 text-sm disabled:opacity-50"
              >
                Draft
              </button>

              <button
                type="button"
                onClick={() => updateStatus("sent")}
                disabled={statusLoading}
                className="rounded bg-blue-600 px-3 py-2 text-sm disabled:opacity-50"
              >
                Envoyé
              </button>

              <button
                type="button"
                onClick={() => updateStatus("approved")}
                disabled={statusLoading}
                className="rounded bg-green-600 px-3 py-2 text-sm disabled:opacity-50"
              >
                Accepté
              </button>

              <button
                type="button"
                onClick={() => updateStatus("rejected")}
                disabled={statusLoading}
                className="rounded bg-red-600 px-3 py-2 text-sm disabled:opacity-50"
              >
                Refusé
              </button>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleConvertToInvoice}
                disabled={convertLoading}
                className="rounded bg-green-600 px-4 py-3 font-medium disabled:opacity-50"
              >
                {convertLoading ? "Conversion..." : "Convertir en facture"}
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="rounded bg-red-500 px-4 py-3 font-medium"
              >
                Télécharger le PDF
              </button>

              <Link
                href={`/quotes/${quote.id}/edit`}
                className="rounded border border-white/20 px-4 py-3 font-medium hover:bg-white/10"
              >
                Modifier
              </Link>

              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                className="rounded bg-red-900 px-4 py-3 font-medium hover:bg-red-800"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>

        <div
          className={`grid gap-6 ${
            businessConfig.sidebar.showVehicles ? "md:grid-cols-2" : "md:grid-cols-1"
          }`}
        >
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-2 text-xl font-semibold">{labels.customer}</h2>
            <div>{customerName}</div>
            <div className="text-white/70">{quote.customers?.email || "-"}</div>
            <div className="text-white/70">{quote.customers?.phone || "-"}</div>
            <div className="text-white/70">{quote.customers?.city || "-"}</div>
          </div>

          {businessConfig.sidebar.showVehicles ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h2 className="mb-2 text-xl font-semibold">{labels.vehicle}</h2>
              <div>
                {quote.vehicles?.make || "-"} - {quote.vehicles?.model || "-"}
              </div>
              <div className="text-white/70">
                {labels.plate} : {quote.vehicles?.plate_number || "-"}
              </div>
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <table className="w-full text-left">
            <thead className="bg-red-500 text-white">
              <tr>
                <th className="p-3">Description</th>
                <th>Qté</th>
                <th>Unité</th>
                <th>PU</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-white/60">
                    Aucune ligne de devis.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t border-white/10">
                    <td className="p-3">{item.label || "-"}</td>
                    <td>{item.quantity ?? 0}</td>
                    <td>{item.unit || "-"}</td>
                    <td>{formatMoney(item.unit_price ?? 0)}</td>
                    <td>{formatMoney(item.line_total ?? 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-2 text-xl font-semibold">Notes client</h2>
            <div className="text-white/70">{quote.customer_notes || "-"}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-2 text-xl font-semibold">Notes internes</h2>
            <div className="text-white/70">{quote.internal_notes || "-"}</div>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="w-full max-w-sm space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="flex justify-between">
              <span>Sous-total</span>
              <span>{formatMoney(quote.subtotal_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>TVA {quote.vat_rate ?? 0}%</span>
              <span>{formatMoney(quote.vat_amount)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>{formatMoney(quote.total_amount)}</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        title="Supprimer le devis"
        message={
          quote
            ? `Tu es sur le point de supprimer définitivement le devis ${quote.number}. Cette action est irréversible.`
            : ""
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteQuote}
        onCancel={() => {
          if (!deleteLoading) setShowDeleteDialog(false);
        }}
      />
    </div>
  );
}