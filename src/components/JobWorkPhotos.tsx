"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { Camera, Trash2, ImageOff } from "lucide-react";
import { api } from "@/lib/api";
import { uploadApi } from "@/lib/upload-api";
import type { JobWorkPhoto } from "@/api/types";
import { useTranslation } from "@/lib/i18n";

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
      .catch((err) => console.error("Failed to load job photos:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, firebaseToken]);

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
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photoId: string) {
    try {
      await api.deleteJobWorkPhoto(jobId, photoId, firebaseToken);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete photo");
    }
  }

  return (
    <div className="rounded-2xl border border-outline bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-brand" />
          <h3 className="text-sm font-bold text-ink">{t("workPhotos.title", "Work Photos")}</h3>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand transition hover:bg-brand hover:text-white disabled:opacity-60"
        >
          {uploading ? t("workPhotos.uploading", "Uploading...") : t("workPhotos.addPhoto", "Add photo")}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 py-8 text-center">
          <ImageOff size={20} className="text-ink-subtle" />
          <p className="text-xs text-ink-muted">
            {t("workPhotos.empty", "No photos yet. Add one to show progress or finished work.")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
              <Image src={photo.imageUrl} alt={photo.caption || "Work photo"} fill sizes="200px" className="object-cover" />
              <span
                className={`absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  photo.role === "WORKER" ? "bg-brand text-white" : "bg-white/90 text-ink"
                }`}
              >
                {photo.role === "WORKER" ? t("workPhotos.roleWorker", "Worker") : t("workPhotos.rolePoster", "Poster")}
              </span>
              {photo.uploadedByUserId === currentUserId && (
                <button
                  onClick={() => handleDelete(photo.id)}
                  aria-label={t("workPhotos.removeAria", "Remove photo")}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
