import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { HomePage } from './pages/HomePage';
import { ImportCsvPage } from './pages/ImportCsvPage';
import { LiveTimeEntriesPage } from './pages/LiveTimeEntriesPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { TimeTrackingPage } from './features/time-tracker/pages/TimeTrackingPage';
import { SettingsPage } from './pages/SettingsPage';
import { AppLayout } from './components/AppLayout';
import { getMigrationResult, wasMigrationWarningShown, markMigrationWarningShown } from './lib/storage/IndexedDBStorage';

function App() {
    useEffect(() => {
        const checkMigration = async () => {
            try {
                const alreadyWarned = await wasMigrationWarningShown();
                if (alreadyWarned) return;

                const result = await getMigrationResult();
                if (result && result.discarded > 0) {
                    toast.warning('Migración completada', {
                        description: `${result.discarded} registro(s) descartado(s) por ID de tarea inválido`,
                        duration: 10000,
                    });
                }
                await markMigrationWarningShown();
            } catch {
                // Silent fail — migration warnings are non-critical
            }
        };
        checkMigration();
    }, []);

    return (
        <AppLayout>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/import" element={<ImportCsvPage />} />
                <Route path="/live-entries" element={<LiveTimeEntriesPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:codCli/:proyecto" element={<ProjectDetailPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/time-tracker" element={<TimeTrackingPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AppLayout>
    );
}

export default App;