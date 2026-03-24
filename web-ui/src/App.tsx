import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ImportCsvPage } from './pages/ImportCsvPage';
import { LiveTimeEntriesPage } from './pages/LiveTimeEntriesPage';
import { DashboardPage } from './features/dashboard/DashboardPage';

function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/import" element={<ImportCsvPage />} />
            <Route path="/live-entries" element={<LiveTimeEntriesPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
