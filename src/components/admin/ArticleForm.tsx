"use client";

import { useState, type ChangeEvent } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { uploadApi } from "@/lib/upload-api";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import type { Article, CreateArticlePayload } from "@/api/types";

const articleFormSchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().optional(),
  coverImageUrl: z.string().optional(),
  coverImageDeleteUrl: z.string().optional(),
  bodyHtml: z.string().optional(),
  visibleFrom: z.string().optional(),
  visibleTo: z.string().optional(),
  displayOrder: z.string().optional(),
  isPublished: z.boolean(),
});

type ArticleFormValues = z.infer<typeof articleFormSchema>;

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toUtcIso(localValue?: string): string | undefined {
  if (!localValue) return undefined;
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

interface ArticleFormProps {
  initial?: Article;
  onSubmit: (payload: CreateArticlePayload) => Promise<void>;
  submitError?: string | null;
}

export function ArticleForm({ initial, onSubmit, submitError }: ArticleFormProps) {
  const { t } = useTranslation();
  const { firebaseToken } = useAuth();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: initial?.title ?? "",
      excerpt: initial?.excerpt ?? "",
      coverImageUrl: initial?.coverImageUrl ?? "",
      coverImageDeleteUrl: initial?.coverImageDeleteUrl ?? "",
      bodyHtml: initial?.bodyHtml ?? "",
      visibleFrom: toDatetimeLocalValue(initial?.visibleFrom),
      visibleTo: toDatetimeLocalValue(initial?.visibleTo),
      displayOrder: initial?.displayOrder != null ? String(initial.displayOrder) : "",
      isPublished: initial?.isPublished ?? false,
    },
  });

  const coverImageUrl = watch("coverImageUrl");

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCropFileName(file.name);
    setCropSrc(URL.createObjectURL(file));
  }

  async function handleCropped(file: File) {
    setCropSrc(null);
    if (!firebaseToken) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadApi.uploadImage(file, firebaseToken);
      setValue("coverImageUrl", uploaded.url);
      setValue("coverImageDeleteUrl", uploaded.deleteUrl);
    } catch (error) {
      console.error("Failed to upload cover image:", error);
      setUploadError(error instanceof Error ? error.message : t("articleForm.uploadError"));
    } finally {
      setUploading(false);
    }
  }

  async function submit(values: ArticleFormValues) {
    setSubmitting(true);
    try {
      await onSubmit({
        title: values.title.trim(),
        excerpt: values.excerpt?.trim() || null,
        coverImageUrl: values.coverImageUrl || null,
        coverImageDeleteUrl: values.coverImageDeleteUrl || null,
        bodyHtml: values.bodyHtml || null,
        visibleFrom: toUtcIso(values.visibleFrom) ?? null,
        visibleTo: toUtcIso(values.visibleTo) ?? null,
        displayOrder: values.displayOrder ? Number(values.displayOrder) : null,
        isPublished: values.isPublished,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      {submitError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {submitError}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">{t("common.title")}</label>
        <input {...register("title")} placeholder={t("articleForm.titlePlaceholder")} className="field-shell w-full" />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">{t("articleForm.excerptLabel")}</label>
        <textarea
          {...register("excerpt")}
          rows={2}
          placeholder={t("articleForm.excerptPlaceholder")}
          className="field-shell w-full"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">{t("articleForm.coverImageLabel")}</label>
        {coverImageUrl ? (
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-32 overflow-hidden rounded-2xl bg-[#eff7fa]">
              <Image src={coverImageUrl} alt="" fill unoptimized className="object-cover" />
            </div>
            <button
              type="button"
              onClick={() => {
                setValue("coverImageUrl", "");
                setValue("coverImageDeleteUrl", "");
              }}
              className="secondary-cta"
            >
              <X className="h-4 w-4" />
              {t("articleForm.removeCover")}
            </button>
          </div>
        ) : (
          <label className="field-shell flex w-full cursor-pointer items-center justify-center gap-2 py-6 text-sm text-ink-muted">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? t("profile.uploading") : t("articleForm.uploadCover")}
            <input type="file" accept="image/*" className="sr-only" onChange={handleFileSelect} disabled={uploading} />
          </label>
        )}
        {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">{t("articleForm.bodyLabel")}</label>
        <Controller
          control={control}
          name="bodyHtml"
          render={({ field }) => <RichTextEditor value={field.value ?? ""} onChange={field.onChange} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">{t("articleForm.visibleFromLabel")}</label>
          <input type="datetime-local" {...register("visibleFrom")} className="field-shell w-full" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">{t("articleForm.visibleToLabel")}</label>
          <input type="datetime-local" {...register("visibleTo")} className="field-shell w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">{t("articleForm.displayOrderLabel")}</label>
          <input type="number" step="1" {...register("displayOrder")} className="field-shell w-full" />
        </div>
        <label className="flex items-center gap-2 self-end pb-2.5">
          <input type="checkbox" {...register("isPublished")} className="h-4 w-4 rounded border-outline text-brand" />
          <span className="text-sm font-semibold text-ink">{t("articleForm.publishedLabel")}</span>
        </label>
      </div>

      <div className="flex items-center gap-3 border-t border-outline pt-6">
        <Button type="submit" disabled={submitting || uploading}>
          {submitting ? t("articleForm.saving") : t("articleForm.save")}
        </Button>
      </div>

      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          fileName={cropFileName}
          onCancel={() => setCropSrc(null)}
          onCropped={handleCropped}
        />
      )}
    </form>
  );
}
