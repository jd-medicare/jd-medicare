import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authService } from '../services/auth';
import type { SessionUserDto } from '../schemas';
import { AppShell } from './AppShell';
import { homeFor, NAV } from './nav';
const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('../features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../features/auth/ResetPasswordPage'));
const OutsourcePage = lazy(() => import('../features/outsource/OutsourcePage'));
const NewCustomerPage = lazy(() => import('../features/agent/NewCustomerPage'));
const CasesPage = lazy(() => import('../features/cases/CasesPage'));
const CaseDetailPage = lazy(() => import('../features/cases/CaseDetailPage'));
const UsersPage = lazy(() => import('../features/admin/UsersPage'));
const AuditPage = lazy(() => import('../features/admin/AuditPage'));
const CeoDashboardPage = lazy(() => import('../features/ceo/CeoDashboardPage'));
const ReportsPage = lazy(() => import('../features/reports/ReportsPage'));
const FinancePage = lazy(() => import('../features/finance/FinancePage'));

const useSession = () => useQuery({ queryKey: ['session'], queryFn: async () => (await authService.me()).data });
const Skeleton = () => <div className="skeleton" style={{ height: 200, margin: 24 }} aria-busy="true" />;
// UI gate only; the backend decides.
function Guard({ menu, perm, children }: { menu?: string; perm?: string; children: (u: SessionUserDto) => ReactNode }) {
  const { data: user, isLoading, isError } = useSession();
  if (isLoading) return <Skeleton />;
  if (isError || !user) return <Navigate to="/login" replace />;
  const denied = (menu && !user.menus.includes(menu)) || (perm && !user.permissions.includes(perm));
  return <AppShell user={user}>{denied ? <p role="alert" style={{ padding: 24 }}>You do not have access to this page.</p> : children(user)}</AppShell>;
}
/** Gate taken from the nav table so a route and its nav link can never disagree. */
function R({ nav, children }: { nav: string; children: (u: SessionUserDto) => ReactNode }) {
  const n = NAV.find((x) => x.path === nav);
  return <Guard menu={n?.menu} perm={n?.perm}>{children}</Guard>;
}
function Home() {
  const { data: user, isLoading, isError } = useSession();
  if (isLoading) return <Skeleton />;
  if (isError || !user) return <Navigate to="/login" replace />;
  const to = homeFor(user);
  return to ? <Navigate to={to} replace /> : <p role="alert" style={{ padding: 24 }}>No pages are assigned to your account. Contact your administrator.</p>;
}
export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Skeleton />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={<Home />} />
          <Route path="/customers/new" element={<R nav="/customers/new">{() => <NewCustomerPage />}</R>} />
          <Route path="/cases" element={<R nav="/cases">{(u) => <CasesPage user={u} />}</R>} />
          <Route path="/cases/:id" element={<R nav="/cases">{(u) => <CaseDetailPage user={u} />}</R>} />
          <Route path="/outsource" element={<R nav="/outsource">{(u) => <OutsourcePage user={u} />}</R>} />
          <Route path="/reports" element={<R nav="/reports">{(u) => <ReportsPage user={u} />}</R>} />
          <Route path="/ceo" element={<R nav="/ceo">{() => <CeoDashboardPage />}</R>} />
          <Route path="/finance/income" element={<R nav="/finance/income">{(u) => <FinancePage kind="income" user={u} />}</R>} />
          <Route path="/finance/expenses" element={<R nav="/finance/expenses">{(u) => <FinancePage kind="expense" user={u} />}</R>} />
          <Route path="/admin/users" element={<R nav="/admin/users">{(u) => <UsersPage user={u} />}</R>} />
          <Route path="/admin/audit" element={<R nav="/admin/audit">{() => <AuditPage />}</R>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
