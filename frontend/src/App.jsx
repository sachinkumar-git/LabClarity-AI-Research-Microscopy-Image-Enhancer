import { Footer } from './components/layout/Footer.jsx';
import { Header } from './components/layout/Header.jsx';
import { Hero } from './components/layout/Hero.jsx';
import { useModels } from './hooks/useModels.js';
import { Workspace } from './pages/Workspace.jsx';

export default function App() {
  const models = useModels();
  return (
    <div className="flex min-h-screen flex-col">
      <Header runtime={models.runtime} modelsError={models.error} modelsLoading={models.loading} />
      <Hero />
      <div className="flex-1">
        <Workspace models={models} />
      </div>
      <Footer />
    </div>
  );
}
