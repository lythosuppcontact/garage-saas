"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { vehicleSchema } from "@/lib/validations/vehicle"

type ActionResult = {
  ok: boolean
  message?: string
  errors?: Record<string, string[] | undefined>
}

function normalizeFormData(formData: FormData) {
  return {
    client_id: formData.get("client_id"),
    registration: formData.get("registration"),
    vin: formData.get("vin"),
    make: formData.get("make"),
    model: formData.get("model"),
    trim: formData.get("trim"),
    year: formData.get("year"),
    mileage: formData.get("mileage"),
    fuel_type: formData.get("fuel_type"),
    transmission: formData.get("transmission"),
    color: formData.get("color"),
    power_hp: formData.get("power_hp"),
    first_registration_date: formData.get("first_registration_date"),
    notes: formData.get("notes"),
  }
}

export async function updateVehicle(
  id: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  const rawValues = normalizeFormData(formData)
  const parsed = vehicleSchema.safeParse(rawValues)

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "Merci de corriger les champs du formulaire.",
    }
  }

  const { error } = await supabase
    .from("vehicles")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    return {
      ok: false,
      message: error.message,
    }
  }

  revalidatePath("/vehicles")
  revalidatePath(`/vehicles/${id}`)
  revalidatePath(`/vehicles/${id}/edit`)

  redirect(`/vehicles/${id}`)
}