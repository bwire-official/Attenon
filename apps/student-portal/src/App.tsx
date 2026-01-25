import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { DetailsFormScreen } from './screens/DetailsFormScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomeScreen />} />
          <Route path="/form" element={<DetailsFormScreen />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
