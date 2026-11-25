import { Suspense, lazy } from 'react';
import { Link, Navigate, Route, Routes, useParams } from 'react-router';
import { ErrorBoundary } from './components/common/ErrorBoundary.jsx';
import { PageSkeleton } from './components/common/Skeleton.jsx';
import { Footer } from './components/layout/Footer.jsx';
import { NavBar } from './components/layout/NavBar.jsx';
import { PageTransition } from './components/motion/PageTransition.jsx';
import { CatalogProvider } from './context/CatalogContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { OverviewPage } from './pages/OverviewPage.jsx';

// Route-level code splitting: each page loads on first visit (Overview stays eager).
const page = (name) => lazy(() => import(`./pages/${name}.jsx`).then((m) => ({ default: m[name] })));
const BatchesPage = page('BatchesPage');
const BatchPage = page('BatchPage');
const ComparePage = page('ComparePage');
const DashboardPage = page('DashboardPage');
const EnhancePage = page('EnhancePage');
const HistoryPage = page('HistoryPage');
const ModelsPage = page('ModelsPage');
const ProjectPage = page('ProjectPage');
const ProjectsPage = page('ProjectsPage');
const RunPage = page('RunPage');

function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-mono text-sm text-brand-400">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">Page not found</h1>
      <Link to="/" className="mt-4 inline-block text-brand-300 hover:underline">Back to the overview</Link>
    </main>
  );
}

/** Old /experiments URLs (bookmarks, PDF links) keep working. */
function LegacyProjectRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/projects/${id}` : '/projects'} replace />;
}

export default function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <CatalogProvider>
          <div className="flex min-h-screen flex-col">
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-3 focus:py-2 focus:text-on-brand">Skip to content</a>
            <NavBar />
            <div id="main" className="flex-1">
              <PageTransition>
                {(location) => (
                  <ErrorBoundary resetKey={location.pathname}>
                  <Suspense fallback={<PageSkeleton />}>
                  <Routes location={location}>
                    <Route path="/" element={<OverviewPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/enhance" element={<EnhancePage />} />
                    <Route path="/compare" element={<ComparePage />} />
                    <Route path="/batches" element={<BatchesPage />} />
                    <Route path="/batches/:id" element={<BatchPage />} />
                    <Route path="/models" element={<ModelsPage />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="/projects/:id" element={<ProjectPage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/runs/:id" element={<RunPage />} />
                    <Route path="/experiments" element={<LegacyProjectRedirect />} />
                    <Route path="/experiments/:id" element={<LegacyProjectRedirect />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  </Suspense>
                  </ErrorBoundary>
                )}
              </PageTransition>
            </div>
            <Footer />
          </div>
        </CatalogProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}
