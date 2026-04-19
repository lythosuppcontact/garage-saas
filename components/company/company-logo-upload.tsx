"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

type CompanyLogoUploadProps = {
  companyId: string;
  currentLogoUrl: string | null;
  onUploaded: (url: string | null) => void;
};

export function CompanyLogoUpload({
  companyId,
  currentLogoUrl,
  onUploaded,
}: CompanyLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  const handlePickFile = () => {
    inputRef.current?.click();
  };

  const handleUpload = async (file: File) => {
    if (!file) return;

    const isPng =
      file.type === "image/png" ||
      file.name.toLowerCase().endsWith(".png");

    if (!isPng) {
      showToast({
        type: "info",
        title: "Format invalide",
        message: "Merci d’importer un logo au format PNG.",
      });
      return;
    }

    setUploading(true);

    try {
      const baseName = file.name.replace(/\.[^/.]+$/, "");

      const safeBaseName = baseName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

      const safeName = `${safeBaseName || "logo"}.png`;

      const filePath = `logos/${companyId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: "image/png",
        });

      if (uploadError) {
        console.error(uploadError);
        showToast({
          type: "error",
          title: "Erreur upload logo",
          message: uploadError.message,
        });
        return;
      }

      const { data } = supabase.storage
        .from("company-assets")
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_url: publicUrl })
        .eq("id", companyId);

      if (updateError) {
        console.error(updateError);
        showToast({
          type: "error",
          title: "Erreur sauvegarde logo",
          message: updateError.message,
        });
        return;
      }

      onUploaded(publicUrl);

      showToast({
        type: "success",
        title: "Logo mis à jour",
      });
    } catch (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Erreur réseau",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);

    try {
      const { error } = await supabase
        .from("companies")
        .update({ logo_url: null })
        .eq("id", companyId);

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Erreur suppression logo",
        });
        return;
      }

      onUploaded(null);

      showToast({
        type: "success",
        title: "Logo supprimé",
      });
    } catch (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Erreur réseau",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white">Logo</h2>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex h-28 w-full max-w-[280px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30 p-3">
          {currentLogoUrl ? (
            <Image
              src={currentLogoUrl}
              alt="Logo entreprise"
              width={260}
              height={100}
              className="max-h-full w-auto max-w-full object-contain"
              unoptimized
            />
          ) : (
            <span className="text-sm text-white/40">Aucun logo</span>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePickFile}
              disabled={uploading}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {uploading ? "Upload..." : "Importer un PNG"}
            </button>

            {currentLogoUrl ? (
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
              >
                Supprimer
              </button>
            ) : null}
          </div>

          <p className="text-sm text-white/50">
            Le logo peut être carré ou horizontal. Il sera affiché entièrement
            dans les PDF sans être coupé.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleUpload(file);
          }
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}