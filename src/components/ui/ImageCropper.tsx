"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useTranslation } from "@/lib/i18n";
import { getCroppedImg } from "@/lib/cropImage";
import { Button } from "@/components/ui/Button";

interface ImageCropperProps {
  imageSrc: string;
  fileName: string;
  aspect?: number;
  onCancel: () => void;
  onCropped: (file: File) => void;
}

export function ImageCropper({ imageSrc, fileName, aspect = 16 / 9, onCancel, onCropped }: ImageCropperProps) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const file = await getCroppedImg(imageSrc, croppedAreaPixels, fileName);
      onCropped(file);
    } catch (error) {
      console.error("Failed to crop image:", error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-soft">
        <div className="border-b border-outline px-5 py-4">
          <h2 className="text-lg font-bold text-ink">{t("articleForm.cropTitle")}</h2>
        </div>
        <div className="relative h-80 w-full bg-black/90">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-outline px-5 py-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
            {t("jobDetail.cancel")}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={processing || !croppedAreaPixels}>
            {t("articleForm.cropConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
