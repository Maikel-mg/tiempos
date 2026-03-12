import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ImportCsvPage } from './pages/ImportCsvPage';
import { PlaceholderLivePage } from './pages/PlaceholderLivePage';

function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/import" element={<ImportCsvPage />} />
            <Route path="/live-entries" element={<PlaceholderLivePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
