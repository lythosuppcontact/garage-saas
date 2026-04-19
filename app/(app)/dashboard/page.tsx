"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { BusinessType, getBusinessConfig } from "@/lib/business-types";
import StatusBadge from "@/components/StatusBadge";

type DashboardStats = {
  totalInvoices: number;
  totalRevenue: number;
  totalPaid: number;
  totalPending: number;
  totalQuotes: number;
};

type RecentQuote = {
  id: string;
  number: string;
  status: string;
  issue_date: string | null;
  total_amount: number | null;
  customers: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

type RecentInvoice = {
  id: string;
  number: string;
  status: string;
  issue_date: string | null;
  total_amount: number | null;
  balance_due: number | null;
  customers: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("other");

  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    totalRevenue: 0,
    totalPaid: 0,
    totalPending: 0,
    totalQuotes: 0,
  });

  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);

  const businessConfig = getBusinessConfig(businessType);

  const formatCHF = (value: number | null | undefined) =>
    new Intl.NumberFormat("fr-CH", {
      style: "currency",
      currency: "CHF",
    }).format(value || 0);

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("fr-CH").format(date);
  };

  const getCustomerName = (
    customer:
      | {
          first_name: string | null;
          last_name: string | null;
          email: string | null;
        }
      | null
      | undefined
  ) =>
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
    customer?.email ||
    "-";

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("auth_user_id", user.id)
          .single();

        if (profileError || !profile?.company_id) {
          console.error(profileError);
          setLoading(false);
          return;
        }

        const companyId = profile.company_id;

        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("name, business_type")
          .eq("id", companyId)
          .single();

        if (companyError) {
          console.error(companyError);
        } else {
          setCompanyName(companyData?.name || "");
          setBusinessType(
            (companyData?.business_type as BusinessType | null) || "other"
          );
        }

        const [
          { data: invoices, error: invoicesError },
          { data: quotes, error: quotesError },
          { data: quotesRecent, error: quotesRecentError },
          { data: invoicesRecent, error: invoicesRecentError },
        ] = await Promise.all([
          supabase
            .from("invoices")
            .select("total_amount, amount_paid")
            .eq("company_id", companyId),

          supabase
            .from("quotes")
            .select("id")
            .eq("company_id", companyId),

          supabase
            .from("quotes")
            .select(`
              id,
              number,
              status,
              issue_date,
              total_amount,
              customers (
                first_name,
                last_name,
                email
              )
            `)
            .eq("company_id", companyId)
            .order("created_at", { ascending: false })
            .limit(5),

          supabase
            .from("invoices")
            .select(`
              id,
              number,
              status,
              issue_date,
              total_amount,
              balance_due,
              customers (
                first_name,
                last_name,
                email
              )
            `)
            .eq("company_id", companyId)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        if (invoicesError) console.error(invoicesError);
        if (quotesError) console.error(quotesError);
        if (quotesRecentError) console.error(quotesRecentError);
        if (invoicesRecentError) console.error(invoicesRecentError);

        const totalInvoices = invoices?.length || 0;

        const totalRevenue =
          invoices?.reduce(
            (sum, invoice) => sum + Number(invoice.total_amount || 0),
            0
          ) || 0;

        const totalPaid =
          invoices?.reduce(
            (sum, invoice) => sum + Number(invoice.amount_paid || 0),
            0
          ) || 0;

        const totalPending = totalRevenue - totalPaid;
        const totalQuotes = quotes?.length || 0;

        setStats({
          totalInvoices,
          totalRevenue,
          totalPaid,
          totalPending,
          totalQuotes,
        });

        setRecentQuotes((quotesRecent as RecentQuote[]) || []);
        setRecentInvoices((invoicesRecent as RecentInvoice[]) || []);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const collectionRate = useMemo(() => {
    if (!stats.totalRevenue) return 0;
    return Math.round((stats.totalPaid / stats.totalRevenue) * 100);
  }, [stats.totalPaid, stats.totalRevenue]);

  return (
    <div className="space-y-8 p-8 text-white">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.18em] text-white/35">
            Dashboard
          </div>
          <h1 className="mt-2 text-4xl font-black tracking-tight">
            {companyName || businessConfig.dashboard.title}
          </h1>
          <p className="mt-2 text-white/50">
            {businessConfig.dashboard.subtitle}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <div className="text-xs uppercase tracking-[0.18em] text-white/35">
            Encaissement
          </div>
          <div className="mt-1 text-2xl font-bold text-red-400">
            {collectionRate}%
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={businessConfig.dashboard.invoicesLabel}
          value={loading ? "..." : stats.totalInvoices}
          subtitle={`Nombre total de ${businessConfig.dashboard.invoicesLabel.toLowerCase()}`}
        />
        <StatCard
          title={businessConfig.dashboard.quotesLabel}
          value={loading ? "..." : stats.totalQuotes}
          subtitle={`Nombre total de ${businessConfig.dashboard.quotesLabel.toLowerCase()}`}
        />
        <StatCard
          title={businessConfig.dashboard.revenueLabel}
          value={loading ? "..." : formatCHF(stats.totalRevenue)}
          subtitle="Montant facturé total"
          highlight
        />
        <StatCard
          title={businessConfig.dashboard.pendingLabel}
          value={loading ? "..." : formatCHF(stats.totalPending)}
          subtitle="Montant encore en attente"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <BigStat
          title={businessConfig.dashboard.paidLabel}
          value={loading ? "..." : formatCHF(stats.totalPaid)}
          description={`Vue synthétique de ${businessConfig.dashboard.paidLabel.toLowerCase()} sur l’ensemble de l’activité.`}
        />

        <SummaryCard
          revenueLabel={businessConfig.dashboard.revenueLabel}
          paidLabel={businessConfig.dashboard.paidLabel}
          pendingLabel={businessConfig.dashboard.pendingLabel}
          quotesLabel={businessConfig.dashboard.quotesLabel}
          invoicesLabel={businessConfig.dashboard.invoicesLabel}
          totalRevenue={loading ? "..." : formatCHF(stats.totalRevenue)}
          totalPaid={loading ? "..." : formatCHF(stats.totalPaid)}
          totalPending={loading ? "..." : formatCHF(stats.totalPending)}
          totalInvoices={loading ? "..." : String(stats.totalInvoices)}
          totalQuotes={loading ? "..." : String(stats.totalQuotes)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RecentSection
          title={businessConfig.dashboard.recentQuotesLabel}
          actionHref="/quotes/list"
          actionLabel={businessConfig.sidebar.quotesListLabel}
        >
          {loading ? (
            <EmptyRow label="Chargement..." />
          ) : recentQuotes.length === 0 ? (
            <EmptyRow label={`Aucun ${businessConfig.dashboard.quotesLabel.toLowerCase()} récent.`} />
          ) : (
            recentQuotes.map((quote) => (
              <RecentRow
                key={quote.id}
                title={quote.number}
                subtitle={getCustomerName(quote.customers)}
                meta={`Date : ${formatDate(quote.issue_date)}`}
                amount={formatCHF(quote.total_amount)}
                badge={<StatusBadge status={quote.status} />}
                href={`/quotes/${quote.id}`}
                cta="Voir"
              />
            ))
          )}
        </RecentSection>

        <RecentSection
          title={businessConfig.dashboard.recentInvoicesLabel}
          actionHref="/invoices/list"
          actionLabel={businessConfig.sidebar.invoicesListLabel}
        >
          {loading ? (
            <EmptyRow label="Chargement..." />
          ) : recentInvoices.length === 0 ? (
            <EmptyRow label={`Aucune ${businessConfig.dashboard.invoicesLabel.toLowerCase().slice(0, -1)} récente.`} />
          ) : (
            recentInvoices.map((invoice) => (
              <RecentRow
                key={invoice.id}
                title={invoice.number}
                subtitle={getCustomerName(invoice.customers)}
                meta={`Solde : ${formatCHF(invoice.balance_due)}`}
                amount={formatCHF(invoice.total_amount)}
                badge={<StatusBadge status={invoice.status} />}
                href={`/invoices/${invoice.id}`}
                cta="Voir"
              />
            ))
          )}
        </RecentSection>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  highlight = false,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-3xl border p-5",
        highlight
          ? "border-red-500/20 bg-red-500/[0.08]"
          : "border-white/10 bg-white/[0.04]",
      ].join(" ")}
    >
      <div className="text-sm text-white/45">{title}</div>
      <div className="mt-3 text-3xl font-black tracking-tight">{value}</div>
      <div className="mt-2 text-sm text-white/35">{subtitle}</div>
    </div>
  );
}

function BigStat({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6">
      <div className="text-sm uppercase tracking-[0.18em] text-white/35">
        {title}
      </div>
      <div className="mt-4 text-4xl font-black tracking-tight text-white">
        {value}
      </div>
      <div className="mt-3 max-w-xl text-sm text-white/45">{description}</div>
    </div>
  );
}

function SummaryCard({
  revenueLabel,
  paidLabel,
  pendingLabel,
  quotesLabel,
  invoicesLabel,
  totalRevenue,
  totalPaid,
  totalPending,
  totalInvoices,
  totalQuotes,
}: {
  revenueLabel: string;
  paidLabel: string;
  pendingLabel: string;
  quotesLabel: string;
  invoicesLabel: string;
  totalRevenue: string;
  totalPaid: string;
  totalPending: string;
  totalInvoices: string;
  totalQuotes: string;
}) {
  const rows = [
    { label: revenueLabel, value: totalRevenue },
    { label: paidLabel, value: totalPaid },
    { label: pendingLabel, value: totalPending },
    { label: invoicesLabel, value: totalInvoices },
    { label: quotesLabel, value: totalQuotes },
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div className="text-sm uppercase tracking-[0.18em] text-white/35">
        Résumé
      </div>

      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
          >
            <span className="text-sm text-white/55">{row.label}</span>
            <span className="text-sm font-semibold text-white">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentSection({
  title,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  actionHref: string;
  actionLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm uppercase tracking-[0.18em] text-white/35">
          {title}
        </div>

        <Link
          href={actionHref}
          className="text-sm text-red-400 transition hover:text-red-300"
        >
          {actionLabel}
        </Link>
      </div>

      <div className="mt-5 space-y-3">{children}</div>
    </div>
  );
}

function RecentRow({
  title,
  subtitle,
  meta,
  amount,
  badge,
  href,
  cta,
}: {
  title: string;
  subtitle: string;
  meta: string;
  amount: string;
  badge: React.ReactNode;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="font-semibold text-white">{title}</div>
          <div className="text-sm text-white/55">{subtitle}</div>
          <div className="text-xs text-white/35">{meta}</div>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          <div className="text-sm">{badge}</div>
          <div className="font-semibold text-white">{amount}</div>
          <Link
            href={href}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
          >
            {cta}
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-white/45">
      {label}
    </div>
  );
}