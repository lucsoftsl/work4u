"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

export interface SignaturePadHandle {
  clear: () => void;
  /** PNG of the drawn signature, or null when nothing was drawn. */
  toBlob: () => Promise<Blob | null>;
}

interface Props {
  onChange: (drawn: boolean) => void;
  label: string;
  clearLabel: string;
  handleRef?: Ref<SignaturePadHandle>;
}

/** Touch/mouse signature box. `signature_pad` is imported on demand so it only loads on the completion step. */
export default function SignaturePad({ onChange, label, clearLabel, handleRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<import("signature_pad").default | null>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    void import("signature_pad").then(({ default: SignaturePadLib }) => {
      const canvas = canvasRef.current;
      if (disposed || !canvas) return;
      const resize = () => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const data = padRef.current?.toData();
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d")?.scale(ratio, ratio);
        padRef.current?.clear();
        if (data?.length) padRef.current?.fromData(data);
      };
      const pad = new SignaturePadLib(canvas, { penColor: "#16191D", minWidth: 1, maxWidth: 3 });
      padRef.current = pad;
      resize();
      const end = () => { setDrawn(!pad.isEmpty()); onChange(!pad.isEmpty()); };
      pad.addEventListener("endStroke", end);
      window.addEventListener("resize", resize);
      cleanup = () => { pad.off(); window.removeEventListener("resize", resize); };
    });
    return () => { disposed = true; cleanup(); };
  }, [onChange]);

  useImperativeHandle(handleRef, () => ({
    clear: () => { padRef.current?.clear(); setDrawn(false); onChange(false); },
    toBlob: () => new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas || !padRef.current || padRef.current.isEmpty()) return resolve(null);
      canvas.toBlob((b) => resolve(b), "image/png");
    }),
  }), [onChange]);

  return (
    <div>
      <p className="font-bold" id="sig-label">{label}</p>
      <canvas ref={canvasRef} role="img" aria-labelledby="sig-label" className="mt-1 h-40 w-full touch-none rounded border-2 border-ops-border-strong bg-white" />
      <button
        type="button"
        disabled={!drawn}
        onClick={() => { padRef.current?.clear(); setDrawn(false); onChange(false); }}
        className="mt-2 min-h-[44px] rounded border border-ops-border-strong px-4 font-bold disabled:opacity-45"
      >
        {clearLabel}
      </button>
    </div>
  );
}
