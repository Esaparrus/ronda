'use client';

import { useEffect } from 'react';
import { useRondaStore } from '@/lib/store';
import {
  diagnosticContextFromState,
  flushQueuedDiagnostics,
  reportClientIssue,
} from '@/lib/diagnostics';
import { recordDiagnostic } from '@/lib/diagnostic-recorder';

function currentContext() {
  return diagnosticContextFromState(useRondaStore.getState());
}

/** Captura fallos asíncronos que los error boundaries de React no ven. */
export function DiagnosticsProvider() {
  const connection = useRondaStore((state) => state.connection);
  const roomCode = useRondaStore((state) => state.roomCode);

  useEffect(() => {
    function handleError(event: ErrorEvent) {
      recordDiagnostic('window:error', {
        name: event.error instanceof Error ? event.error.name : 'Error',
        message: event.message.slice(0, 200),
      });
      void reportClientIssue('client_error', currentContext(), event.error ?? event.message);
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      recordDiagnostic('window:unhandled_rejection', {
        name: reason instanceof Error ? reason.name : 'Error',
        message: (reason instanceof Error ? reason.message : String(reason)).slice(0, 200),
      });
      void reportClientIssue('unhandled_rejection', currentContext(), reason);
    }

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (connection === 'online' && roomCode) void flushQueuedDiagnostics();
  }, [connection, roomCode]);

  return null;
}
