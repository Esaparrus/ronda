'use client';

import { useEffect, useState } from 'react';
import type { DiagnosticContext } from '@ronda/protocol';
import { reportClientIssue } from './diagnostics';

export function useIncidentReport(
  error: unknown,
  getContext: () => DiagnosticContext,
): string | null {
  const [incidentId, setIncidentId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void reportClientIssue('client_error', getContext(), error).then((result) => {
      if (active) setIncidentId(result.incidentId);
    });
    return () => {
      active = false;
    };
  }, [error, getContext]);

  return incidentId;
}
