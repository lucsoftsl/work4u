'use client';

import { useEffect } from 'react';
import { stripCredentialParams } from './auth-outage';

/** If a form was submitted before hydration the browser may have put credentials in the URL: remove them. */
export function useStripCredentialParams() {
  useEffect(() => {
    const cleaned = stripCredentialParams(`${window.location.pathname}${window.location.search}${window.location.hash}`);
    if (cleaned) window.history.replaceState(window.history.state, '', cleaned);
  }, []);
}
