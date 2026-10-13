"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { LocationPicker } from "@/components/ui/LocationPicker";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { updateUserProfile } from "@/lib/auth-service";
import { errorMessage } from "@/lib/http";
import { resolveAccountMode, type AccountMode } from "@/hooks/useAccountMode";
import countriesData from "@/data/countries.json";
import type { AuthUser } from "@/types/auth";
import {
  countryFlag,
  normalizeWorkerTypes,
  parseAddress,
  workerTypesForMode,
  type ProfileFormData,
} from "./profile-utils";

type Country = (typeof countriesData)[number];
const countries = countriesData as Country[];

function initialForm(user: AuthUser): ProfileFormData {
  const parsed = parseAddress(user.address);
  return {
    displayName: user.displayName || "",
    phoneNumber: user.phoneNumber || "",
    accountMode: resolveAccountMode(user),
    ...parsed,
    country: parsed.country || user.country || "",
    state: parsed.state || user.state || "",
    postcode: parsed.postcode || user.postcode || "",
    number: parsed.number || user.number || "",
  };
}

interface ProfileEditFormProps {
  user: AuthUser;
  onDone: () => void;
}

export function ProfileEditForm({ user, onDone }: ProfileEditFormProps) {
  const { t } = useTranslation();
  const { updateUser, refreshUser } = useAuth();
  const { push } = useToast();
  const errorId = useId();
  const [form, setForm] = useState<ProfileFormData>(() => initialForm(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCountry = useMemo(() => countries.find((c) => c.code2 === form.country), [form.country]);
  const set = <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const addressPayload = {
        country: form.country,
        state: form.state,
        address: form.address,
        city: form.city,
        postcode: form.postcode,
        number: form.number,
        latitude: form.latitude,
        longitude: form.longitude,
      };
      const workerTypes = workerTypesForMode(form.accountMode);
      const updated = await updateUserProfile(user.id, {
        displayName: form.displayName,
        phoneNumber: form.phoneNumber,
        accountMode: form.accountMode,
        workerTypes,
        address: addressPayload,
      });

      const savedAddress = parseAddress(updated.address as string | null);
      updateUser({
        displayName: updated.displayName ?? null,
        phoneNumber: updated.phoneNumber ?? null,
        accountMode: updated.accountMode ?? form.accountMode,
        workerTypes: normalizeWorkerTypes(updated.workerTypes, workerTypes),
        country: savedAddress.country || null,
        state: savedAddress.state || null,
        address: updated.address ?? JSON.stringify(addressPayload),
        city: savedAddress.city || null,
        postcode: savedAddress.postcode || null,
        number: savedAddress.number || null,
      });
      void refreshUser();
      push({ tone: "success", message: t("profile.saved") });
      onDone();
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError(errorMessage(err, t("profile.updateError")));
    } finally {
      setSaving(false);
    }
  };

  const modeOptions: { value: AccountMode; label: string }[] = [
    { value: "REQUESTOR", label: t("nav.viewHiring") },
    { value: "WORKER", label: t("nav.viewWorking") },
    { value: "BOTH", label: t("profile.modeBoth") },
  ];

  return (
    <form onSubmit={handleSubmit} aria-describedby={error ? errorId : undefined} className="space-y-6" noValidate>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-2 rounded-control border-l-4 border-l-danger bg-danger-soft p-3 text-label font-normal text-ink"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          label={t("profile.displayName")}
          value={form.displayName}
          autoComplete="name"
          onChange={(e) => set("displayName", e.target.value)}
        />
        <Input
          label={t("profile.phoneNumber")}
          type="tel"
          value={form.phoneNumber}
          autoComplete="tel"
          onChange={(e) => set("phoneNumber", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-label text-ink">{t("profile.accountMode")}</p>
        <SegmentedControl
          label={t("profile.accountMode")}
          tone="mode"
          value={form.accountMode}
          onChange={(value) => set("accountMode", value)}
          options={modeOptions}
          className="flex w-full max-w-md"
        />
        <p className="text-caption text-ink-muted">{t("profile.accountModeHint")}</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-label text-ink">{t("profile.address")}</p>
        <LocationPicker
          value={{ lat: form.latitude ?? 0, lng: form.longitude ?? 0, address: form.address }}
          onChange={({ lat, lng, address, components }) =>
            setForm((prev) => ({
              ...prev,
              address,
              latitude: lat,
              longitude: lng,
              city: components?.city || prev.city,
              postcode: components?.postcode || prev.postcode,
            }))
          }
          addressPlaceholder={t("profile.address")}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Select
          label={t("profile.country")}
          value={form.country}
          autoComplete="country"
          onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value, state: "" }))}
        >
          <option value="">{t("profile.selectCountry")}</option>
          {countries.map((c) => (
            <option key={c.code2} value={c.code2}>
              {`${countryFlag(c.code2)} ${c.name}`}
            </option>
          ))}
        </Select>
        <Select
          label={t("profile.state")}
          value={form.state}
          disabled={!selectedCountry || selectedCountry.states.length === 0}
          hint={!selectedCountry ? t("profile.selectCountryFirst") : undefined}
          autoComplete="address-level1"
          onChange={(e) => set("state", e.target.value)}
        >
          <option value="">{t("profile.selectState")}</option>
          {(selectedCountry?.states ?? []).map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </Select>
        <Input label={t("profile.city")} value={form.city} autoComplete="address-level2" onChange={(e) => set("city", e.target.value)} />
        <Input label={t("profile.number")} value={form.number} onChange={(e) => set("number", e.target.value)} />
        <Input
          label={t("profile.postcode")}
          value={form.postcode}
          autoComplete="postal-code"
          onChange={(e) => set("postcode", e.target.value)}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onDone} disabled={saving}>
          {t("profile.cancel")}
        </Button>
        <Button type="submit" loading={saving}>
          {saving ? t("profile.saving") : t("profile.saveChanges")}
        </Button>
      </div>
    </form>
  );
}
