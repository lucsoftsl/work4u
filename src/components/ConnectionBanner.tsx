'use client';

import { WifiOff } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/** Shown while the person is signed in but the API can't be reached; auth retries on its own. */
export function ConnectionBanner({ onRetry, rateLimited = false }: { onRetry: () => void; rateLimited?: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 border-b-4 border-warning bg-warning-soft px-4 py-3 text-body-sm text-ink"
    >
      <WifiOff className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>
        {rateLimited
          ? t('auth.connection.rateLimited', 'Lots of requests right now. Waiting a moment, then retrying automatically…')
          : t('auth.connection.retrying', "Can't reach work4u. Retrying…")}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-[44px] rounded-md border border-ink px-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {t('auth.connection.retryNow', 'Retry now')}
      </button>
    </div>
  );
}
