import { z } from "zod"

const emptyToNull = (value: unknown) => {
  if (value === "" || value === undefined) return null
  return value
}

export const vehicleSchema = z.object({
  client_id: z.preprocess(
    emptyToNull,
    z.string().uuid("Client invalide").nullable()
  ),

  registration: z
    .string()
    .trim()
    .min(1, "L'immatriculation est requise")
    .max(20, "L'immatriculation est trop longue"),

  vin: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .max(17, "Le VIN ne peut pas dépasser 17 caractères")
      .nullable()
  ),

  make: z.string().trim().min(1, "La marque est requise"),
  model: z.string().trim().min(1, "Le modèle est requis"),

  trim: z.preprocess(
    emptyToNull,
    z.string().trim().max(100).nullable()
  ),

year: z.preprocess(
  emptyToNull,
  z.coerce
    .number()
    .refine((val) => !Number.isNaN(val), {
      message: "L'année doit être un nombre",
    })
    .int("L'année doit être un entier")
    .min(1900, "Année invalide")
    .max(2100, "Année invalide")
    .nullable()
),

mileage: z.preprocess(
  emptyToNull,
  z.coerce
    .number()
    .refine((val) => !Number.isNaN(val), {
      message: "Le kilométrage doit être un nombre",
    })
    .int("Le kilométrage doit être un entier")
    .min(0, "Le kilométrage ne peut pas être négatif")
    .nullable()
),

  fuel_type: z.preprocess(
    emptyToNull,
    z.string().trim().max(50).nullable()
  ),

  transmission: z.preprocess(
    emptyToNull,
    z.string().trim().max(50).nullable()
  ),

  color: z.preprocess(
    emptyToNull,
    z.string().trim().max(50).nullable()
  ),

power_hp: z.preprocess(
  emptyToNull,
  z.coerce
    .number()
    .refine((val) => !Number.isNaN(val), {
      message: "La puissance doit être un nombre",
    })
    .int("La puissance doit être un entier")
    .min(0, "La puissance ne peut pas être négative")
    .nullable()
),
  first_registration_date: z.preprocess(
    emptyToNull,
    z.string().trim().nullable()
  ),

  notes: z.preprocess(
    emptyToNull,
    z.string().trim().max(5000).nullable()
  ),
})

export type VehicleFormValues = z.infer<typeof vehicleSchema>