"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import StatusBadge from "@/components/StatusBadge";
import { BusinessType, getBusinessConfig } from "@/lib/business-types";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Invoice = {
  id: string;
  number: string;
  status: string;
  issue_date: string;
  claim_number: string | null;
  total_amount: number;
  subtotal_amount: number;
  vat_amount: number;
  vat_rate: number;
  amount_paid: number;
  balance_due: number;
  customers: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
  } | null;
  vehicles: {
    make: string | null;
    model: string | null;
    plate_number: string | null;
  } | null;
};

type InvoiceItem = {
  id?: string;
  label: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  line_total: number | null;
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

export default function InvoiceDetailPage() {
  const { showToast } = useToast();

  const params = useParams();
  const invoiceId = params?.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

  const formatCHF = (value: number | null | undefined) =>
    new Intl.NumberFormat("fr-CH", {
      style: "currency",
      currency: "CHF",
    }).format(value || 0);

  const formatCHFPdf = (value: number | null | undefined) => {
    const amount = Number(value || 0);
    const fixed = amount.toFixed(2);
    const [integerPart, decimalPart] = fixed.split(".");
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    return `${formattedInteger}.${decimalPart} CHF`;
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("fr-CH").format(date);
  };

  const customerName =
    [invoice?.customers?.first_name, invoice?.customers?.last_name]
      .filter(Boolean)
      .join(" ") || invoice?.customers?.email || "-";

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

  const handleDownloadPdf = async () => {
    if (!invoice) return;

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
      [invoice.customers?.first_name, invoice.customers?.last_name]
        .filter(Boolean)
        .join(" ") || invoice.customers?.email || "-";

    const vehicleName =
      [invoice.vehicles?.make, invoice.vehicles?.model]
        .filter(Boolean)
        .join(" - ") || "-";

    const statusLabel =
      {
        draft: "Brouillon",
        sent: "Envoyée",
        paid: "Payée",
        partially_paid: "Partiellement payée",
        overdue: "En retard",
        cancelled: "Annulée",
      }[invoice.status] || invoice.status;

    const hasClaim = showClaimNumber && Boolean(invoice.claim_number);
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
    doc.text("FACTURE", 555, 50, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`N° ${invoice.number}`, 555, 72, { align: "right" });
    doc.text(`Date : ${formatDate(invoice.issue_date)}`, 555, 88, {
      align: "right",
    });
    doc.text(`Statut : ${statusLabel}`, 555, 104, { align: "right" });

    if (hasClaim) {
      doc.text(`${labels.claim} : ${invoice.claim_number}`, 555, 126, {
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
    if (invoice.customers?.email)
      doc.text(invoice.customers.email, 40, contentStartY + 38);
    if (invoice.customers?.phone)
      doc.text(invoice.customers.phone, 40, contentStartY + 56);
    if (invoice.customers?.city)
      doc.text(invoice.customers.city, 40, contentStartY + 74);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Entreprise", 320, contentStartY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(companyName, 320, contentStartY + 20);

    if (companyAddress) {
      doc.text(
        doc.splitTextToSize(companyAddress, 220),
        320,
        contentStartY + 38
      );
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
      doc.text(vehicleName, 40, vehicleBlockY + 20);
      doc.text(
        `${labels.plate} : ${invoice.vehicles?.plate_number || "-"}`,
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
        formatCHFPdf(item.unit_price),
        formatCHFPdf(item.line_total),
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

    if (finalY + 210 > pageHeight - 40) {
      doc.addPage();
      finalY = 60;
    }

    doc.setDrawColor(230, 230, 230);
    doc.line(330, finalY + 20, 545, finalY + 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    doc.text("Sous-total", 330, finalY + 45);
    doc.text(formatCHFPdf(invoice.subtotal_amount), 545, finalY + 45, {
      align: "right",
    });

    doc.text(`TVA ${invoice.vat_rate}%`, 330, finalY + 65);
    doc.text(formatCHFPdf(invoice.vat_amount), 545, finalY + 65, {
      align: "right",
    });

    doc.text("Montant payé", 330, finalY + 85);
    doc.text(formatCHFPdf(invoice.amount_paid), 545, finalY + 85, {
      align: "right",
    });

    doc.text("Solde restant", 330, finalY + 105);
    doc.text(formatCHFPdf(invoice.balance_due), 545, finalY + 105, {
      align: "right",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Total TTC", 330, finalY + 140);
    doc.text(formatCHFPdf(invoice.total_amount), 545, finalY + 140, {
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

    doc.save(`${invoice.number}.pdf`);
  };

  const handleDeleteInvoice = async () => {
    if (!invoice) return;

    setDeleteLoading(true);

    try {
      const { error: itemsError } = await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", invoice.id);

      if (itemsError) {
        console.error(itemsError);
        showToast({
          type: "error",
          title: "Erreur suppression lignes facture",
        });
        return;
      }

      const { error: invoiceError } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoice.id);

      if (invoiceError) {
        console.error(invoiceError);
        showToast({
          type: "error",
          title: "Erreur suppression facture",
        });
        return;
      }

      showToast({
        type: "success",
        title: "Facture supprimée",
      });

      setShowDeleteDialog(false);
      window.location.href = "/invoices/list";
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

  const updateInvoiceStatus = async (nextStatus: string) => {
    if (!invoice) return;

    let amountPaid = 0;
    let balanceDue = invoice.total_amount;

    if (nextStatus === "paid") {
      amountPaid = invoice.total_amount;
      balanceDue = 0;
    }

    if (nextStatus === "draft" || nextStatus === "sent") {
      amountPaid = 0;
      balanceDue = invoice.total_amount;
    }

    const { error } = await supabase
      .from("invoices")
      .update({
        status: nextStatus,
        amount_paid: amountPaid,
        balance_due: balanceDue,
      })
      .eq("id", invoice.id);

    if (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Erreur mise à jour statut",
      });
      return;
    }

    setInvoice({
      ...invoice,
      status: nextStatus,
      amount_paid: amountPaid,
      balance_due: balanceDue,
    });

    showToast({
      type: "success",
      title: "Statut mis à jour",
    });
  };

  useEffect(() => {
    if (!invoiceId) return;

    const loadInvoice = async () => {
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
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (profileError || !profile?.company_id) {
          console.error("Erreur profil:", profileError);
          showToast({
            type: "error",
            title: "Profil introuvable",
          });
          setLoading(false);
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
          .maybeSingle();

        if (companyError) {
          console.error("Erreur company:", companyError);
        } else {
          setCompany(companyData);
          setBusinessType(
            (companyData?.business_type as BusinessType | null) || "garage"
          );
        }

        const { data, error } = await supabase
          .from("invoices")
          .select(`
            id,
            number,
            status,
            issue_date,
            claim_number,
            total_amount,
            subtotal_amount,
            vat_amount,
            vat_rate,
            amount_paid,
            balance_due,
            customers (
              first_name,
              last_name,
              email,
              phone,
              city
            ),
            vehicles (
              make,
              model,
              plate_number
            )
          `)
          .eq("id", invoiceId)
          .eq("company_id", profile.company_id)
          .maybeSingle();

        if (error) {
          console.error("Erreur chargement facture:", error);
          showToast({
            type: "error",
            title: "Erreur chargement facture",
          });
          setLoading(false);
          return;
        }

        if (!data) {
          showToast({
            type: "error",
            title: "Facture introuvable",
          });
          setLoading(false);
          return;
        }

        setInvoice(data as Invoice);

        const { data: itemsData, error: itemsError } = await supabase
          .from("invoice_items")
          .select("id, label, quantity, unit, unit_price, line_total")
          .eq("invoice_id", invoiceId)
          .eq("company_id", profile.company_id)
          .order("sort_order", { ascending: true });

        if (itemsError) {
          console.error("Erreur chargement lignes:", itemsError);
          showToast({
            type: "error",
            title: "Erreur chargement lignes",
          });
          setLoading(false);
          return;
        }

        setItems((itemsData as InvoiceItem[]) || []);
      } catch (error) {
        console.error("Erreur réseau facture:", error);
        showToast({
          type: "error",
          title: "Erreur réseau",
        });
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">Chargement...</div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        Facture introuvable
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex justify-between rounded-2xl border border-white/10 bg-white/5 p-6">
          <div>
            <h1 className="text-3xl font-bold">{invoice.number}</h1>
            <div className="mt-2">
              <StatusBadge status={invoice.status} />
            </div>
            <div className="mt-2 text-white/70">
              Date : {formatDate(invoice.issue_date)}
            </div>

            {businessConfig.features.showClaimNumber && invoice.claim_number ? (
              <div className="text-white/70">
                {labels.claim} : {invoice.claim_number}
              </div>
            ) : null}
          </div>

          <div className="space-y-4 text-right">
            <div>
              <div className="text-white/60 uppercase">Total TTC</div>
              <div className="text-3xl font-bold">
                {formatCHF(invoice.total_amount)}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={() => updateInvoiceStatus("draft")}
                className="rounded bg-white/10 px-3 py-2 text-sm"
              >
                Draft
              </button>

              <button
                onClick={() => updateInvoiceStatus("sent")}
                className="rounded bg-blue-600 px-3 py-2 text-sm"
              >
                Envoyée
              </button>

              <button
                onClick={() => updateInvoiceStatus("paid")}
                className="rounded bg-green-600 px-3 py-2 text-sm"
              >
                Payée
              </button>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={handleDownloadPdf}
                className="rounded bg-red-500 px-4 py-3 font-medium"
              >
                Télécharger le PDF
              </button>

              <button
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
            <div className="text-white/70">{invoice.customers?.email || "-"}</div>
            <div className="text-white/70">{invoice.customers?.phone || "-"}</div>
            <div className="text-white/70">{invoice.customers?.city || "-"}</div>
          </div>

          {businessConfig.sidebar.showVehicles ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h2 className="mb-2 text-xl font-semibold">{labels.vehicle}</h2>
              <div>
                {invoice.vehicles?.make || "-"} - {invoice.vehicles?.model || "-"}
              </div>
              <div className="text-white/70">
                {labels.plate} : {invoice.vehicles?.plate_number || "-"}
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
                    Aucune ligne de facture.
                  </td>
                </tr>
              ) : (
                items.map((item, i) => (
                  <tr key={item.id || i} className="border-t border-white/10">
                    <td className="p-3">{item.label || "-"}</td>
                    <td>{item.quantity ?? 0}</td>
                    <td>{item.unit || "-"}</td>
                    <td>{formatCHF(item.unit_price)}</td>
                    <td>{formatCHF(item.line_total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-full max-w-sm space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="flex justify-between">
              <span>Sous-total</span>
              <span>{formatCHF(invoice.subtotal_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>TVA {invoice.vat_rate}%</span>
              <span>{formatCHF(invoice.vat_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Montant payé</span>
              <span>{formatCHF(invoice.amount_paid)}</span>
            </div>
            <div className="flex justify-between">
              <span>Solde restant</span>
              <span>{formatCHF(invoice.balance_due)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>{formatCHF(invoice.total_amount)}</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        title="Supprimer la facture"
        message={
          invoice
            ? `Tu es sur le point de supprimer définitivement la facture ${invoice.number}. Cette action est irréversible.`
            : ""
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteInvoice}
        onCancel={() => {
          if (!deleteLoading) setShowDeleteDialog(false);
        }}
      />
    </div>
  );
}