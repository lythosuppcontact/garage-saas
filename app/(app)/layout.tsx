"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getBusinessConfig } from "@/lib/business-types";

type CompanyLite = {
  id: string;
  name: string | null;
  business_type: string | null;
  access_status: string | null;
  is_platform_admin: boolean;
} | null;

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [company, setCompany] = useState<CompanyLite>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const loadCompany = async () => {
      setLoadingCompany(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          setLoadingCompany(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("company_id, is_platform_admin")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (profileError || !profile?.company_id) {
          setLoadingCompany(false);
          router.replace("/login");
          return;
        }

        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("id, name, business_type, access_status")
          .eq("id", profile.company_id)
          .maybeSingle();

        if (companyError || !companyData) {
          setLoadingCompany(false);
          router.replace("/login");
          return;
        }

        setCompany({
          ...companyData,
          is_platform_admin: profile.is_platform_admin || false,
        });
      } catch {
        router.replace("/login");
      } finally {
        setLoadingCompany(false);
      }
    };

    loadCompany();
  }, [router]);

  useEffect(() => {
    if (loadingCompany) return;
    if (!company) return;

    const isOnboardingPage = pathname.startsWith("/onboarding");
    const isPendingPage = pathname.startsWith("/pending-approval");

    const accessStatus = company.access_status || "pending";
    const hasBusinessType = Boolean(company.business_type);

    if (accessStatus !== "active" && !isPendingPage) {
      router.replace("/pending-approval");
      return;
    }

    if (accessStatus === "active" && !hasBusinessType && !isOnboardingPage) {
      router.replace("/onboarding");
      return;
    }

    if (accessStatus === "active" && hasBusinessType && isOnboardingPage) {
      router.replace("/dashboard");
      return;
    }

    if (accessStatus === "active" && isPendingPage) {
      router.replace("/dashboard");
    }
  }, [loadingCompany, company, pathname, router]);

  const handleLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoggingOut(false);
    }
  };

  if (loadingCompany) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        Chargement...
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        Chargement...
      </div>
    );
  }

  const accessStatus = company.access_status || "pending";
  const hasBusinessType = Boolean(company.business_type);
  const businessConfig = getBusinessConfig(company.business_type);

  if (accessStatus !== "active" && !pathname.startsWith("/pending-approval")) {
    return null;
  }

  if (
    accessStatus === "active" &&
    !hasBusinessType &&
    !pathname.startsWith("/onboarding")
  ) {
    return null;
  }

  if (
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/pending-approval")
  ) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <aside className="flex w-80 flex-col border-r border-white/10 bg-[#090909] px-5 py-6">
        <div className="mb-8">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                  Lytho
                </div>
                <div className="mt-1 text-2xl font-black tracking-tight text-red-500">
                  Devis
                </div>
              </div>

              <div className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-300">
                MVP
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-3 py-3">
              <div className="text-xs text-white/40">Entreprise</div>
              <div className="mt-1 truncate text-sm font-semibold text-white">
                {company.name || "Espace entreprise"}
              </div>
              <div className="mt-1 text-xs text-white/45">
                {businessConfig.label}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/30">
          Navigation
        </div>

        <nav className="space-y-1.5">
          <NavItem
            href="/dashboard"
            label="Dashboard"
            isActive={pathname === "/dashboard"}
          />

          <NavItem
            href="/customers"
            label={businessConfig.sidebar.customersLabel}
            isActive={pathname.startsWith("/customers")}
          />

          {businessConfig.sidebar.showVehicles ? (
            <NavItem
              href="/vehicles"
              label={businessConfig.sidebar.vehiclesLabel}
              isActive={pathname.startsWith("/vehicles")}
            />
          ) : null}

          <NavItem
            href="/quotes"
            label={businessConfig.sidebar.quotesNewLabel}
            isActive={pathname === "/quotes"}
          />

          <NavItem
            href="/quotes/list"
            label={businessConfig.sidebar.quotesListLabel}
            isActive={pathname.startsWith("/quotes/list")}
          />

          <NavItem
            href="/invoices"
            label={businessConfig.sidebar.invoicesNewLabel}
            isActive={pathname === "/invoices"}
          />

          <NavItem
            href="/invoices/list"
            label={businessConfig.sidebar.invoicesListLabel}
            isActive={pathname.startsWith("/invoices/list")}
          />

          {company.is_platform_admin ? (
            <NavItem
              href="/admin/companies"
              label="Validation entreprises"
              isActive={pathname.startsWith("/admin/companies")}
            />
          ) : null}

          <NavItem
            href="/settings/company"
            label="Paramètres"
            isActive={pathname.startsWith("/settings")}
          />
        </nav>

        <div className="mt-auto pt-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/30">
              Produit
            </div>
            <div className="mt-2 text-sm text-white/75">
              Application de devis et factures multi-métiers.
            </div>
            <div className="mt-3 text-xs text-white/35">
              {businessConfig.description}
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
            >
              {loggingOut ? "Déconnexion..." : "Se déconnecter"}
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="sticky top-0 z-10 border-b border-white/10 bg-black/70 px-8 py-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-white">
                Espace de gestion
              </div>
              <div className="mt-1 text-sm text-white/40">
                {businessConfig.description}
              </div>
            </div>

            <div className="hidden rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/45 md:block">
              {businessConfig.label}
            </div>
          </div>
        </div>

        <div>{children}</div>
      </main>
    </div>
  );
}

function NavItem({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200",
        isActive
          ? "border-red-500/30 bg-red-500/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "border-transparent bg-transparent text-white/70 hover:border-white/10 hover:bg-white/[0.04] hover:text-white",
      ].join(" ")}
    >
      <span
        className={[
          "absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full transition-all",
          isActive ? "bg-red-500" : "bg-transparent group-hover:bg-white/10",
        ].join(" ")}
      />

      <span
        className={[
          "h-2 w-2 rounded-full transition-all",
          isActive ? "bg-red-400" : "bg-white/20 group-hover:bg-white/40",
        ].join(" ")}
      />

      <span>{label}</span>
    </Link>
  );
}