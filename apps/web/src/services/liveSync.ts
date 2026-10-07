import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const CHANNEL_NAME = 'himayat-live-sync';
let channel: BroadcastChannel | null = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {}

export function notifyLiveSync(type: string, payload?: any) {
  const msg = { type, payload, timestamp: Date.now() };

  // 1. BroadcastChannel across tabs/windows
  try {
    channel?.postMessage(msg);
  } catch {}

  // 2. Local window event within the same tab
  try {
    window.dispatchEvent(new CustomEvent('himayat-live-sync', { detail: msg }));
  } catch {}

  // 3. LocalStorage event fallback for cross-tab communication
  try {
    localStorage.setItem('himayat_sync_tick', `${type}_${Date.now()}`);
  } catch {}
}

export function useLiveSyncListener(onSync?: (type: string) => void) {
  const qc = useQueryClient();

  useEffect(() => {
    function handleSync(eventData?: any) {
      const type = eventData?.type || 'all';
      // Invalidate all critical application queries
      qc.invalidateQueries({ queryKey: ['ceo'] });
      qc.invalidateQueries({ queryKey: ['ceo-expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-heads'] });
      qc.invalidateQueries({ queryKey: ['finance'] });
      qc.invalidateQueries({ queryKey: ['report'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['cases'] });
      qc.invalidateQueries({ queryKey: ['cases-for-reports'] });
      qc.invalidateQueries({ queryKey: ['outsource'] });
      qc.invalidateQueries({ queryKey: ['outsource-summary'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users-for-reports'] });
      qc.invalidateQueries({ queryKey: ['team-agents'] });
      qc.invalidateQueries({ queryKey: ['audit'] });

      if (onSync) {
        onSync(type);
      }
    }

    // 1. Listen to BroadcastChannel
    function onBroadcast(e: MessageEvent) {
      handleSync(e.data);
    }
    channel?.addEventListener('message', onBroadcast);

    // 2. Listen to Window event
    function onCustom(e: Event) {
      handleSync((e as CustomEvent).detail);
    }
    window.addEventListener('himayat-live-sync', onCustom);

    // 3. Listen to Storage event
    function onStorage(e: StorageEvent) {
      if (e.key === 'himayat_sync_tick') {
        handleSync({ type: 'storage' });
      }
    }
    window.addEventListener('storage', onStorage);

    return () => {
      channel?.removeEventListener('message', onBroadcast);
      window.removeEventListener('himayat-live-sync', onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, [qc, onSync]);
}
