"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Gift } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { updateUserProfile } from "@/lib/auth-service";
import { uploadApi } from "@/lib/upload-api";
import { errorMessage } from "@/lib/http";
import { currentPath, signInPath } from "@/lib/auth-redirect";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types/auth";
import { DataAndDangerSection } from "./DataAndDangerSection";
import { ProfileDetails } from "./ProfileDetails";
import { ProfileEditForm } from "./ProfileEditForm";

function PhotoUpload({ user }: { user: AuthUser }) {
  const { t } = useTranslation();
  const { firebaseToken, updateUser } = useAuth();
  const { push } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !firebaseToken) return;
    setUploading(true);
    try {
      const uploaded = await uploadApi.uploadImage(file, firebaseToken);
      const updated = await updateUserProfile(user.id, { photoUrl: uploaded.url });
      updateUser({ photoUrl: updated.photoUrl ?? uploaded.url });
      push({ tone: "success", message: t("profile.photoUpdated") });
    } catch (err) {
      console.error("Failed to upload photo:", err);
      push({ tone: "error", message: errorMessage(err, t("profile.uploadPhotoError")) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <label
      className={cn(
        buttonClasses("secondary", "default", "cursor-pointer focus-within:shadow-focus"),
        uploading && "pointer-events-none opacity-60"
      )}
    >
      <Camera className="h-4 w-4" aria-hidden="true" />
      {uploading ? t("profile.uploading") : t("profile.changePhoto")}
      <input type="file" accept="image/*" className="sr-only" onChange={handleChange} disabled={uploading} />
    </label>
  );
}

export function AccountTab({ user }: { user: AuthUser }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut } = useAuth();
  const { push } = useToast();
  const [editing, setEditing] = useState(false);

  const name = user.displayName || user.email || t("common.worker");

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push(signInPath(currentPath()));
    } catch (err) {
      console.error("Sign out failed:", err);
      push({ tone: "error", message: errorMessage(err, t("profile.signOutError")) });
    }
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="profile-account-heading" className="rounded-card border border-line bg-surface p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {user.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoUrl} alt="" className="h-20 w-20 shrink-0 rounded-full border border-line object-cover" />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-h1 text-primary"
              >
                {name[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 id="profile-account-heading" className="truncate font-display text-h2 text-ink">
                {name}
              </h2>
              {user.email ? (
                <p className="truncate text-body text-ink-muted" title={user.email}>
                  {user.email}
                </p>
              ) : null}
            </div>
          </div>
          <PhotoUpload user={user} />
        </div>

        <div className="mt-6 border-t border-line pt-6">
          {editing ? (
            <ProfileEditForm user={user} onDone={() => setEditing(false)} />
          ) : (
            <>
              <ProfileDetails user={user} />
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => setEditing(true)}>{t("profile.editButton")}</Button>
                <Button variant="secondary" onClick={handleSignOut}>
                  {t("nav.signOut")}
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      <Link
        href="/referrals"
        className="flex min-h-[64px] items-center justify-between gap-3 rounded-card border border-line bg-primary-soft px-5 py-3 transition-colors duration-fast hover:border-line-strong"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Gift className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-label text-ink">{t("profile.inviteFriendsTitle")}</span>
            <span className="block text-caption text-ink-muted">{t("profile.inviteFriendsDescNeutral")}</span>
          </span>
        </span>
        <span className="shrink-0 text-label text-primary">{t("profile.inviteAction")} &rarr;</span>
      </Link>

      <section aria-labelledby="profile-quick-heading" className="rounded-card border border-line bg-surface p-5 md:p-6">
        <h2 id="profile-quick-heading" className="font-display text-h3 text-ink">
          {t("profile.quickActions")}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/my-jobs" className={buttonClasses("secondary")}>
            {t("myJobs.title")}
          </Link>
          <Link href="/jobs" className={buttonClasses("secondary")}>
            {t("jobs.title")}
          </Link>
          <Link href="/post-job" className={buttonClasses("secondary")}>
            {t("nav.postJob")}
          </Link>
        </div>
      </section>

      <DataAndDangerSection userId={user.id} />
    </div>
  );
}
