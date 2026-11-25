import { useState } from 'react';
import { getStats } from '../api/researchApi.js';
import { Stagger, StaggerItem } from '../components/motion/Reveal.jsx';
import { ActivityPanel } from '../components/overview/ActivityPanel.jsx';
import { HeroSection } from '../components/overview/HeroSection.jsx';
import { HowItWorks } from '../components/overview/HowItWorks.jsx';
import { QuickActions } from '../components/overview/QuickActions.jsx';
import { QuickStats } from '../components/overview/QuickStats.jsx';
import { RecentProjects } from '../components/overview/RecentProjects.jsx';
import { useApi } from '../hooks/useApi.js';

export function OverviewPage() {
  const [days, setDays] = useState(7);
  const { data: stats, loading, error } = useApi((signal) => getStats(signal, days), days);

  return (
    <main>
      <HeroSection />
      <QuickActions />
      <Stagger className="mx-auto mt-6 grid max-w-[1440px] gap-4 px-4 sm:px-6 lg:grid-cols-[1fr_1.15fr_1fr]">
        <StaggerItem className="min-w-0"><RecentProjects /></StaggerItem>
        <StaggerItem className="min-w-0">
          {error ? (
            <section className="glass p-5 text-sm text-rose-300">Activity unavailable: {error.message}</section>
          ) : (
            <ActivityPanel stats={stats} days={days} onDaysChange={setDays} loading={loading} />
          )}
        </StaggerItem>
        <StaggerItem className="min-w-0"><QuickStats stats={stats} /></StaggerItem>
      </Stagger>
      <HowItWorks />
    </main>
  );
}
