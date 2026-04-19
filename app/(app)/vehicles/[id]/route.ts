import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("auth_user_id", user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    }

    const body = await req.json();

    const payload = {
      customer_id: body.customer_id || null,
      make: body.make || null,
      model: body.model || null,
      plate_number: body.plate_number || null,
      mileage:
        body.mileage === null || body.mileage === undefined || body.mileage === ""
          ? null
          : Number(body.mileage),
    };

    if (
      payload.mileage !== null &&
      (Number.isNaN(payload.mileage) || payload.mileage < 0)
    ) {
      return NextResponse.json(
        { error: "Kilométrage invalide" },
        { status: 400 }
      );
    }

    const { data: existingVehicle, error: existingVehicleError } = await supabase
      .from("vehicles")
      .select("id, company_id")
      .eq("id", id)
      .eq("company_id", profile.company_id)
      .single();

    if (existingVehicleError || !existingVehicle) {
      return NextResponse.json(
        { error: "Véhicule introuvable" },
        { status: 404 }
      );
    }

    if (payload.customer_id) {
      const { data: existingCustomer, error: customerError } = await supabase
        .from("customers")
        .select("id")
        .eq("id", payload.customer_id)
        .eq("company_id", profile.company_id)
        .single();

      if (customerError || !existingCustomer) {
        return NextResponse.json(
          { error: "Client invalide" },
          { status: 400 }
        );
      }
    }

    const { error: updateError } = await supabase
      .from("vehicles")
      .update(payload)
      .eq("id", id)
      .eq("company_id", profile.company_id);

    if (updateError) {
      console.error(updateError);
      return NextResponse.json(
        { error: "Erreur mise à jour véhicule" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}