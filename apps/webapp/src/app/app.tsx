import { Route, Routes } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import AppTheme from '../theme/AppTheme';
import { AssistantWidget } from '../components/assistant/AssistantWidget';

export function App() {
  return (
    <AppTheme>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
      <AssistantWidget />
    </AppTheme>
  );
}

export default App;
