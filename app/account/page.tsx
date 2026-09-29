'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';
import { api, ApiError } from '@/lib/api';
import { AppHeader, MAIN_CONTENT_ID } from '@/components/AppHeader';
import { getToken, clearToken } from '@/lib/auth';
import { JobApplication, StatusChange, UserProfile } from '@/lib/types';
import { ProfileTab } from '@/components/account/ProfileTab';
import { SettingsTab } from '@/components/account/SettingsTab';
import { ReportsTab } from '@/components/account/ReportsTab';

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [history, setHistory] = useState<StatusChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }

    Promise.all([
      api.get<UserProfile>('/auth/me'),
      api.get<JobApplication[]>('/applications'),
      api.get<StatusChange[]>('/applications/status-history'),
    ])
      .then(([p, apps, h]) => {
        setProfile(p);
        setApplications(apps);
        setHistory(h);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor'))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSaveProfile(name: string) {
    const updated = await api.put<UserProfile>('/auth/me', { name });
    setProfile(updated);
  }

  async function handleChangePassword(currentPassword: string, newPassword: string) {
    await api.put('/auth/password', { currentPassword, newPassword });
  }

  async function handleDeleteAccount(password: string) {
    await api.delete('/auth/me', { password });
    clearToken();
    router.push('/');
  }

  return (
    <div style={{ background: 'var(--cds-background)' }} className="min-h-screen pt-12">
      <AppHeader current="account" applications={applications} />

      <main id={MAIN_CONTENT_ID} className="mx-auto max-w-[720px] px-4 sm:px-6">
        <h1 className="pt-6 text-[22px] font-semibold text-[color:var(--cds-text-primary)]">Mi cuenta</h1>

        {loading && (
          <p className="py-8 text-[14px] text-[color:var(--cds-text-secondary)]">Cargando...</p>
        )}

        {!loading && loadError && (
          <p className="py-8 text-[14px]" style={{ color: 'var(--cds-support-error)' }}>
            {loadError}
          </p>
        )}

        {!loading && !loadError && profile && (
          <Tabs selectedIndex={selectedIndex} onChange={({ selectedIndex: i }) => setSelectedIndex(i)}>
            <TabList aria-label="Secciones de la cuenta">
              <Tab>Perfil</Tab>
              <Tab>Configuración</Tab>
              <Tab>Reportes</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <ProfileTab profile={profile} onSave={handleSaveProfile} />
              </TabPanel>
              <TabPanel>
                <SettingsTab onChangePassword={handleChangePassword} onDeleteAccount={handleDeleteAccount} />
              </TabPanel>
              <TabPanel>
                <ReportsTab applications={applications} history={history} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        )}
      </main>
    </div>
  );
}
