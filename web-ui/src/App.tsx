import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ImportCsvPage } from './pages/ImportCsvPage';
import { LiveTimeEntriesPage } from './pages/LiveTimeEntriesPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { TimeTrackingPage } from './features/time-tracker/pages/TimeTrackingPage';
import { AppLayout } from './components/AppLayout';

function App() {
    return (
        <AppLayout>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/import" element={<ImportCsvPage />} />
                <Route path="/live-entries" element={<LiveTimeEntriesPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/time-tracker" element={<TimeTrackingPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AppLayout>
    );
}

export default App;