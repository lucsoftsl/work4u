"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { AlertCircle, Camera, ImageOff, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/http";
import { uploadApi } from "@/lib/upload-api";
import type { JobWorkPhoto } from "@/api/types";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/QueryState";

interface JobWorkPhotosProps {
  jobId: string;
  firebaseToken: string;
  currentUserId?: string;
}

export function JobWorkPhotos({ jobId, firebaseToken, currentUserId }: JobWorkPhotosProps) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<JobWorkPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listJobWorkPhotos(jobId, firebaseToken)
      .then((data) => {
        if (!cancelled) setPhotos(data);
      })
      .catch((err) => {
        console.error("Failed to load job photos:", err);
        if (!cancelled) setError(t("workPhotos.errorLoad"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, firebaseToken, t]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadApi.uploadImage(file, firebaseToken);
      const photo = await api.addJobWorkPhoto(jobId, uploaded.url, firebaseToken);
      setPhotos((prev) => [photo, ...prev]);
    } catch (err) {
      setError(errorMessage(err, t("workPhotos.errorUpload")));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photoId: string) {
    setError(null);
    try {
      await api.deleteJobWorkPhoto(jobId, photoId, firebaseToken);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      setError(errorMessage(err, t("workPhotos.errorDelete")));
    }
  }

  return (
    <section aria-labelledby="work-photos-title" className="rounded-card border border-line bg-surface p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="work-photos-title" className="font-display text-h3 text-ink">
          {t("workPhotos.title")}
        </h2>
        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} loading={uploading}>
          {!uploading ? <Camera className="h-4 w-4" aria-hidden="true" /> : null}
          {uploading ? t("workPhotos.uploading") : t("workPhotos.addPhoto")}
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" tabIndex={-1} aria-hidden="true" onChange={handleFileChange} />
      </div>

      {error ? (
        <p role="alert" className="mb-3 flex items-start gap-2 rounded-control bg-danger-soft p-3 text-label font-normal text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-card" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line-strong bg-canvas px-4 py-8 text-center">
          <ImageOff className="h-6 w-6 text-ink-subtle" aria-hidden="true" />
          <p className="text-label font-normal text-ink-muted">{t("workPhotos.empty")}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <li key={photo.id} className="relative aspect-square overflow-hidden rounded-card bg-sunken">
              <Image src={photo.imageUrl} alt={photo.caption || t("workPhotos.alt")} fill sizes="(min-width: 1024px) 200px, 45vw" className="object-cover" />
              <span
                className={cn(
                  "absolute left-1.5 top-1.5 rounded-control px-1.5 py-0.5 text-micro",
                  photo.role === "WORKER" ? "bg-primary text-on-fill" : "bg-surface text-ink"
                )}
              >
                {photo.role === "WORKER" ? t("workPhotos.roleWorker") : t("workPhotos.rolePoster")}
              </span>
              {photo.uploadedByUserId === currentUserId ? (
                <button
                  type="button"
                  onClick={() => handleDelete(photo.id)}
                  aria-label={t("workPhotos.removeAria")}
                  className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-control bg-ink/70 text-surface transition-colors duration-fast hover:bg-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
