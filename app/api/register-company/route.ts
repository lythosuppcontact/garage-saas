import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

console.log("API register-company chargée");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Variables d'environnement manquantes: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

const createUniqueSlug = (name: string) => {
  const base = slugify(name) || "entreprise";
  return `${base}-${Date.now()}`;
};

export async function POST(req: NextRequest) {
  try {
    console.log("POST /api/register-company appelée");

    const body = await req.json();

    const {
      userId,
      email,
      companyName,
      fullName,
    }: {
      userId?: string;
      email?: string;
      companyName?: string;
      fullName?: string;
    } = body;

    console.log("BODY:", body);

    if (!userId || !email || !companyName) {
      return NextResponse.json(
        { error: "Données manquantes." },
        { status: 400 }
      );
    }

    const slug = createUniqueSlug(companyName);

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: companyName.trim(),
        slug,
        email: email.trim(),
        country: "CH",
        default_vat_rate: 8.1,
        currency: "CHF",
        timezone: "Europe/Zurich",
        business_type: null,
        access_status: "pending",
        approved_at: null,
      })
      .select()
      .single();

    console.log("COMPANY:", company);
    console.log("COMPANY ERROR:", companyError);

    if (companyError || !company) {
      return NextResponse.json(
        { error: companyError?.message || "Erreur création société" },
        { status: 500 }
      );
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      auth_user_id: userId,
      company_id: company.id,
      email: email.trim(),
      full_name: fullName?.trim() || "",
      role: "admin",
      is_active: true,
      is_platform_admin: false,
    });

    console.log("PROFILE ERROR:", profileError);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message || "Erreur création profil" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      companyId: company.id,
    });
  } catch (error) {
    console.error("Erreur API register-company:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur serveur inattendue.",
      },
      { status: 500 }
    );
  }
}