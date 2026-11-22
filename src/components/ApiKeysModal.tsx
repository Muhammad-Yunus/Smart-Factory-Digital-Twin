import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, KeyRound, Plus, Trash2, X } from 'lucide-react';
import type { ApiKeySummary } from '../types/dashboard';

interface ApiKeysModalProps {
  token: string;
  onClose: () => void;
}

export function ApiKeysModal({ token, onClose }: ApiKeysModalProps) {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyName, setKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/keys', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load API keys');
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch keys');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: keyName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate API key');
      setNewRawKey(data.rawKey);
      setKeyName('');
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        await loadKeys();
      }
    } catch {
      setError('Failed to revoke key');
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-keys-modal-title"
    >
      <div className="w-full max-w-2xl bg-[#091224] border border-[#D4A44A]/50 rounded-[4px] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0d182e]">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-4 h-4 text-[#D4A44A]" />
            <h2
              id="api-keys-modal-title"
              className="font-display text-[15px] font-semibold text-white"
            >
              External Ingest API Keys
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto twin-scroll">
          <p className="text-[12px] text-slate-300 leading-relaxed">
            Use an <code className="font-mono-tabular text-amber-300">X-API-Key</code> credential
            to push real-time telemetry from external WMS, ERP, or PLC systems into{' '}
            <code className="font-mono-tabular text-cyan-300">/api/ingest/*</code>. User session
            tokens are rejected on ingest endpoints.
          </p>

          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Connector name (e.g., WMS Production PLC)"
              className="flex-1 px-3 py-2 text-[12px] bg-[#040914] border border-slate-700 focus:border-[#D4A44A] rounded-[3px] text-white placeholder-slate-500 outline-none"
              required
              minLength={2}
            />
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[12px] font-semibold bg-[#8A6124] hover:bg-[#A6762E] disabled:opacity-50 text-white border border-[#F5C55B]/60 rounded-[3px] transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {creating ? 'Generating...' : 'Generate API Key'}
            </button>
          </form>

          {error ? (
            <div className="px-3 py-2 text-[12px] bg-red-950/60 border border-red-500/40 text-red-200 rounded-[3px]">
              {error}
            </div>
          ) : null}

          {newRawKey ? (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/50 rounded-[3px] space-y-2">
              <div className="text-[11px] font-semibold text-emerald-300">
                New Ingest Key Created — Copy now (shown once):
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-2.5 py-1.5 bg-[#040914] border border-slate-700 rounded text-[11px] font-mono-tabular text-amber-300 break-all">
                  {newRawKey}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(newRawKey)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-600 shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="text-[11px] text-slate-300">
                Simulator command:{' '}
                <code className="font-mono-tabular text-cyan-300">
                  INGEST_API_KEY=&quot;{newRawKey}&quot; npm run simulate -- --seed
                </code>
              </div>
            </div>
          ) : null}

          <div className="border border-slate-800 rounded-[3px] overflow-hidden">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-[#0d182e] text-slate-300 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2 font-medium">Connector Name</th>
                  <th className="px-3 py-2 font-medium">Prefix</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Last Used</th>
                  <th className="px-3 py-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                      Loading API keys...
                    </td>
                  </tr>
                ) : keys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                      No API keys generated yet. Create one above to integrate external systems.
                    </td>
                  </tr>
                ) : (
                  keys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-900/50">
                      <td className="px-3 py-2 text-slate-100 font-medium">{k.name}</td>
                      <td className="px-3 py-2 font-mono-tabular text-amber-300">
                        {k.keyPrefix}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            k.isActive ? 'text-emerald-400 font-medium' : 'text-slate-500'
                          }
                        >
                          {k.isActive ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono-tabular text-slate-400">
                        {k.lastUsedAt
                          ? new Date(k.lastUsedAt).toLocaleString()
                          : 'Never'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {k.isActive ? (
                          <button
                            type="button"
                            onClick={() => handleRevoke(k.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] text-red-300 hover:text-red-200 hover:bg-red-950/60 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Revoke
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500">Revoked</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
