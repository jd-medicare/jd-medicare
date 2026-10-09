import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/admin';
import { errorMessage } from '../../services/api-client';
import { Dialog, TextField, pageStyle } from '../../design-system';
import {
  NAV,
  getCustomMenus,
  saveCustomMenu,
  deleteCustomMenu,
  isSuperUser,
  type CustomMenuDef,
} from '../../app/nav';
import type { SessionUserDto } from '../../schemas';

const PRESET_PATHS = [
  { label: 'New Customer Intake (/customers/new)', path: '/customers/new' },
  { label: 'Cases Management (/cases)', path: '/cases' },
  { label: 'Team Agents (/team/agents)', path: '/team/agents' },
  { label: 'Outsource Review (/outsource)', path: '/outsource' },
  { label: 'Reports Dashboard (/reports)', path: '/reports' },
  { label: 'CEO Dashboard (/ceo)', path: '/ceo' },
  { label: 'Finance Income (/finance/income)', path: '/finance/income' },
  { label: 'Finance Expenses (/finance/expenses)', path: '/finance/expenses' },
  { label: 'User Management (/admin/users)', path: '/admin/users' },
  { label: 'Audit Log (/admin/audit)', path: '/admin/audit' },
];

export default function MenusManagementPage({ user }: { user: SessionUserDto }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [menuKey, setMenuKey] = useState('');
  const [menuLabel, setMenuLabel] = useState('');
  const [menuPath, setMenuPath] = useState('/cases');
  const [menuDesc, setMenuDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [customList, setCustomList] = useState<CustomMenuDef[]>(getCustomMenus());

  const qc = useQueryClient();
  const menusQuery = useQuery({
    queryKey: ['menus'],
    queryFn: () => adminService.menus(),
  });

  const isSuper = isSuperUser(user);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const cleanKey = menuKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const cleanLabel = menuLabel.trim() || cleanKey;
    const cleanPath = menuPath.trim() || '/cases';

    if (!cleanKey) {
      setErr('Menu key is required.');
      return;
    }

    setBusy(true);
    setErr('');

    try {
      // 1. Try to persist to backend
      try {
        await adminService.createMenu(cleanKey);
      } catch (backendErr) {
        console.warn('Backend createMenu notice:', backendErr);
      }

      // 2. Save locally for instantaneous frontend routing and persistence
      saveCustomMenu({
        key: cleanKey,
        label: cleanLabel,
        path: cleanPath,
        description: menuDesc.trim() || undefined,
      });

      setCustomList(getCustomMenus());
      qc.invalidateQueries({ queryKey: ['menus'] });
      qc.invalidateQueries({ queryKey: ['session'] });

      setMenuKey('');
      setMenuLabel('');
      setMenuPath('/cases');
      setMenuDesc('');
      setCreateOpen(false);
    } catch (e: any) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteCustom(key: string) {
    if (window.confirm(`Are you sure you want to remove menu "${key}"?`)) {
      try {
        await adminService.deleteMenu(key);
      } catch (err) {
        console.warn('Backend delete menu notice:', err);
      }
      deleteCustomMenu(key);
      setCustomList(getCustomMenus());
      qc.invalidateQueries({ queryKey: ['menus'] });
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['session'] });
    }
  }

  const backendMenus = menusQuery.data?.data || [];
  const systemMenuKeys = [
    'CUSTOMERS',
    'CASES',
    'OUTSOURCE',
    'REPORTS',
    'FINANCE',
    'EXPENSES',
    'CEO',
    'ADMINISTRATION',
  ];

  return (
    <main style={{ ...pageStyle, maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Menu Management</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--muted, #64748b)', fontSize: 14 }}>
            Create and configure navigation menus that can be assigned to users and roles.
          </p>
        </div>
        {isSuper && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontWeight: 600 }}
            onClick={() => {
              setErr('');
              setCreateOpen(true);
            }}
          >
            <span>➕</span> Create Menu
          </button>
        )}
      </div>

      {/* Info Card */}
      <div
        style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 22 }}>💡</span>
        <div style={{ fontSize: 13, color: 'var(--text, #1e293b)', lineHeight: 1.5 }}>
          <strong>How menu assignment works:</strong> Any menu listed below can be assigned directly to individual users when creating or editing them in <strong>Users</strong>. Administrators and Superadmins automatically have access to all menus.
        </div>
      </div>

      {/* Menus Table */}
      <section className="card" style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface-muted, #f8fafc)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Menu Key</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Display Label</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Linked Route</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* System Menus */}
            {NAV.map((item) => (
              <tr key={item.path} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <code style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                    {item.menu}
                  </code>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.label}</td>
                <td style={{ padding: '12px 16px', color: 'var(--muted, #64748b)' }}>{item.path}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span className="badge b-ACTIVE" style={{ fontSize: 11 }}>
                    System Built-in
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--muted, #94a3b8)', fontStyle: 'italic' }}>
                  Standard
                </td>
              </tr>
            ))}

            {/* Custom Created Menus */}
            {customList.map((cm) => (
              <tr key={cm.key} style={{ borderBottom: '1px solid var(--border)', background: 'rgba(99, 102, 241, 0.03)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <code style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                    {cm.key}
                  </code>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{cm.label}</td>
                <td style={{ padding: '12px 16px', color: 'var(--muted, #64748b)' }}>{cm.path}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#4f46e5', fontSize: 11, fontWeight: 600 }}>
                    Custom Menu
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => handleDeleteCustom(cm.key)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Create Menu Dialog */}
      <Dialog open={createOpen} title="Create New Menu" onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreate} noValidate>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted, #64748b)' }}>
            Define a new menu that can be assigned to users. Once created, it will immediately appear in the user menu assignment dropdown.
          </p>

          <TextField
            label="Menu Key / Code (e.g. SUPPORT, QUALITY, DISPATCH)"
            required
            value={menuKey}
            placeholder="e.g. SUPPORT"
            onChange={(v) => setMenuKey(v.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
          />

          <TextField
            label="Menu Display Label"
            required
            value={menuLabel}
            placeholder="e.g. Support Center"
            onChange={setMenuLabel}
          />

          <div style={{ marginTop: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Target Page / Route *
            </label>
            <select
              className="input"
              style={{ width: '100%', height: 42, borderRadius: 8, padding: '0 12px' }}
              value={menuPath}
              onChange={(e) => setMenuPath(e.target.value)}
            >
              {PRESET_PATHS.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.label}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: 'var(--muted, #94a3b8)', marginTop: 4, display: 'block' }}>
              Select which page opens when the user clicks this menu in their sidebar.
            </span>
          </div>

          <div style={{ marginTop: 14 }}>
            <TextField
              label="Description (optional)"
              value={menuDesc}
              placeholder="e.g. Dedicated queue for customer support"
              onChange={setMenuDesc}
            />
          </div>

          {err && <p className="err" role="alert" style={{ marginTop: 14 }}>{err}</p>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
            <button type="button" className="btn" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create Menu'}
            </button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}
