import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { AppLayout } from './layouts/app-layout';
import { AuthLayout } from './layouts/auth-layout';
import { HomePage } from './pages/home';
import { LoginPage } from './pages/login';
import { RegisterPage } from './pages/register';
import { OnboardingPage } from './pages/onboarding';
import { SelectOrganizationPage } from './pages/select-organization';
import { SettingsPage } from './pages/settings';
import { ItemsPage } from './pages/items';
import { authClient } from './lib/auth-client';
import './lib/i18n';
import { Toaster } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowNoOrg?: boolean;
}

function ProtectedRoute({ children, allowNoOrg = false }: Readonly<ProtectedRouteProps>) {
  const session = authClient.useSession();
  const activeOrg = authClient.useActiveOrganization();
  const userOrgs = authClient.useListOrganizations();

  const isPending = session.isPending || activeOrg.isPending || userOrgs.isPending;
  const isSettingActiveRef = useRef(false);

  useEffect(() => {
    if (
      !isPending &&
      session.data &&
      !activeOrg.data &&
      userOrgs.data?.length === 1 &&
      !isSettingActiveRef.current
    ) {
      isSettingActiveRef.current = true;
      const soleOrg = userOrgs.data[0];
      authClient.organization
        .setActive({
          organizationId: soleOrg.id,
        })
        .catch(() => {
          isSettingActiveRef.current = false;
        });
    }
  }, [isPending, session.data, activeOrg.data, userOrgs.data]);

  useEffect(() => {
    if (activeOrg.data) {
      isSettingActiveRef.current = false;
    }
  }, [activeOrg.data]);

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#08090B] text-slate-400 text-sm">
        Loading...
      </div>
    );
  }

  if (!session.data) {
    return <Navigate to="/login" replace />;
  }

  if (!allowNoOrg) {
    const orgs = userOrgs.data || [];
    if (orgs.length === 0) {
      return <Navigate to="/onboarding" replace />;
    }

    if (!activeOrg.data && orgs.length > 1) {
      return <Navigate to="/select-organization" replace />;
    }
  }

  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" richColors closeButton duration={4000} />
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute allowNoOrg>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Standalone Authenticated Organization Selector Route */}
          <Route
            path="/select-organization"
            element={
              <ProtectedRoute allowNoOrg>
                <SelectOrganizationPage />
              </ProtectedRoute>
            }
          />

          {/* Protected App Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
