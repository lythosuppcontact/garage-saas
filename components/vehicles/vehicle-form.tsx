"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

type Customer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type Vehicle = {
  id: string;
  make: string | null;
  model: string | null;
  plate_number: string | null;
  mileage: number | null;
  customer_id: string | null;
};

type VehicleFormProps = {
  vehicleId: string;
  initialData: Vehicle;
  customers: Customer[];
};

export function VehicleForm({
  vehicleId,
  initialData,
  customers,
}: VehicleFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [customerId, setCustomerId] = useState(initialData.customer_id || "");
  const [make, setMake] = useState(initialData.make || "");
  const [model, setModel] = useState(initialData.model || "");
  const [plateNumber, setPlateNumber] = useState(initialData.plate_number || "");
  const [mileage, setMileage] = useState(
    initialData.mileage !== null && initialData.mileage !== undefined
      ? String(initialData.mileage)
      : ""
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!customerId) {
      showToast({
        type: "info",
        title: "Client requis",
        message: "Merci de sélectionner un client.",
      });
      return;
    }

    if (!make && !model && !plateNumber) {
      showToast({
        type: "info",
        title: "Informations manquantes",
        message: "Merci de remplir au moins marque, modèle ou plaque.",
      });
      return;
    }

    if (mileage && Number.isNaN(Number(mileage))) {
      showToast({
        type: "error",
        title: "Kilométrage invalide",
        message: "Le kilométrage doit être un nombre.",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("vehicles")
        .update({
          customer_id: customerId,
          make: make || null,
          model: model || null,
          plate_number: plateNumber || null,
          mileage: mileage ? Number(mileage) : null,
        })
        .eq("id", vehicleId);

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Erreur modification véhicule",
        });
        return;
      }

      showToast({
        type: "success",
        title: "Véhicule mis à jour",
      });

      router.push("/vehicles");
      router.refresh();
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

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <select
          className="w-full rounded bg-white p-3 text-black md:col-span-2"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">Sélectionner un client</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {[customer.first_name, customer.last_name]
                .filter(Boolean)
                .join(" ") || customer.email || customer.id}
            </option>
          ))}
        </select>

        <input
          className="w-full rounded bg-white p-3 text-black"
          placeholder="Marque"
          value={make}
          onChange={(e) => setMake(e.target.value)}
        />

        <input
          className="w-full rounded bg-white p-3 text-black"
          placeholder="Modèle"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />

        <input
          className="w-full rounded bg-white p-3 text-black"
          placeholder="Plaque"
          value={plateNumber}
          onChange={(e) => setPlateNumber(e.target.value)}
        />

        <input
          className="w-full rounded bg-white p-3 text-black"
          placeholder="Kilométrage"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="rounded bg-red-500 px-4 py-3 text-white disabled:opacity-50"
        >
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>

        <Link
          href="/vehicles"
          className="rounded border border-white/20 px-4 py-3 text-white hover:bg-white/10"
        >
          Annuler
        </Link>
      </div>
    </div>
  );
}