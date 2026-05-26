import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SQLPreviewModal } from '../SQLPreviewModal';

// Helper to format date as used in component
const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

describe('SQLPreviewModal', () => {
    const defaultConfig = { usuario: 'MG01', fase: '100' };
    const mockOnOpenChange = vi.fn();
    const mockOnExecute = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderModal = (props: Partial<React.ComponentProps<typeof SQLPreviewModal>> = {}) => {
        const defaultProps = {
            open: true,
            onOpenChange: mockOnOpenChange,
            config: defaultConfig,
            ...props,
        };
        return render(<SQLPreviewModal {...defaultProps} />);
    };

    describe('Phase Input Modes', () => {
        it('renders text input for phase when fases prop is not provided', () => {
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
            });

            // Should have an input with placeholder for fase
            const phaseInput = screen.getByPlaceholderText('Código de fase') as HTMLInputElement;
            expect(phaseInput).toBeDefined();
            expect(phaseInput.value).toBe('100'); // from config.fase
        });

        it('renders dropdown for phase when fases prop is provided', () => {
            const fases = [
                { id: '100', label: 'Fase 100' },
                { id: '200', label: 'Fase 200' },
            ];
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                fases,
            });

            // Should show combobox trigger with placeholder text
            const combobox = screen.getByRole('combobox');
            expect(combobox).toBeTruthy();

            // Open the dropdown to see options
            fireEvent.click(combobox);

            // Options should be present in the portal
            // Using getAllByText because multiple elements may exist (portal and hidden)
            expect(screen.getAllByText('Fase 100').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Fase 200').length).toBeGreaterThan(0);
        });

        it('dropdown selects a phase and updates editedTask', () => {
            const fases = [
                { id: '100', label: 'Fase 100' },
                { id: '200', label: 'Fase 200' },
            ];
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                fases,
                config: defaultConfig,
            });

            // Open dropdown
            const combobox = screen.getByRole('combobox');
            fireEvent.click(combobox);

            // Select '200'
            fireEvent.click(screen.getByText('Fase 200'));

            // The combobox now should display the selected label 'Fase 200'
            expect(combobox.textContent).toContain('Fase 200');
        });
    });

    describe('taskData Handling', () => {
        it('initializes with taskData values when provided', () => {
            const taskData = {
                name: 'My Task',
                fechaInicio: '15/06/2026',
                fechaFin: '22/06/2026',
                totalMinutes: 240,
            };
            renderModal({ taskData });

            // Check date inputs
            const dateInputs = screen.getAllByPlaceholderText('DD/MM/AAAA') as HTMLInputElement[];
            expect(dateInputs[0].value).toBe('15/06/2026');
            expect(dateInputs[1].value).toBe('22/06/2026');

            // Hours: 240/60 = 4
            const hoursInput = document.querySelector('input[type="number"][step="0.25"]') as HTMLInputElement;
            expect(hoursInput.value).toBe('4');
        });

        it('initializes with default values when taskData is null', () => {
            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            const expectedStart = formatDate(today);
            const expectedEnd = formatDate(nextWeek);

            renderModal({ taskData: null });

            const dateInputs = screen.getAllByPlaceholderText('DD/MM/AAAA') as HTMLInputElement[];
            expect(dateInputs[0].value).toBe(expectedStart);
            expect(dateInputs[1].value).toBe(expectedEnd);

            // Hours should be 0
            const hoursInput = document.querySelector('input[type="number"][step="0.25"]') as HTMLInputElement;
            expect(hoursInput.value).toBe('0');
        });

        it('uses config.usuario and config.fase when initializing', () => {
            renderModal({
                taskData: null,
                config: { usuario: 'USER01', fase: '200' },
            });

            // Phase input should show '200'
            const phaseInput = screen.getByPlaceholderText('Código de fase') as HTMLInputElement;
            expect(phaseInput.value).toBe('200');
        });
    });

    describe('SQL Generation', () => {
        it('generates SQL with correct values', () => {
            const taskData = {
                name: 'Test Task',
                fechaInicio: '01/06/2026',
                fechaFin: '08/06/2026',
                totalMinutes: 120,
            };
            renderModal({ taskData });

            const sqlBlock = document.querySelector('pre');
            expect(sqlBlock).toBeTruthy();
            const sql = sqlBlock?.textContent || '';
            expect(sql).toContain('Test Task');
            // Dates are converted to YYYYMMDD in the SQL (unambiguous for SQL Server)
            expect(sql).toContain('20260601');
            expect(sql).toContain('20260608');
            expect(sql).toContain('@pFase');
        });

        it('updates SQL when hours change', () => {
            const taskData = {
                name: 'Task',
                fechaInicio: '01/06/2026',
                fechaFin: '08/06/2026',
                totalMinutes: 120,
            };
            renderModal({ taskData });

            const hoursInput = document.querySelector('input[type="number"][step="0.25"]') as HTMLInputElement;
            fireEvent.change(hoursInput, { target: { value: '3' } });

            const sqlBlock = document.querySelector('pre');
            const sql = sqlBlock?.textContent || '';
            // 3 hours -> 180 minutes
            expect(sql).toContain('180');
        });

        it('updates SQL when phase text input changes', () => {
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: '01/06/2026',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
            });

            const phaseInput = screen.getByPlaceholderText('Código de fase') as HTMLInputElement;
            fireEvent.change(phaseInput, { target: { value: '999' } });

            const sqlBlock = document.querySelector('pre');
            const sql = sqlBlock?.textContent || '';
            expect(sql).toContain('999');
        });
    });

    describe('Validation', () => {
        it('disables execute button when dates are invalid', () => {
            renderModal({
                taskData: {
                    name: 'Task',
                    fechaInicio: 'invalid',
                    fechaFin: '08/06/2026',
                    totalMinutes: 120,
                },
                onExecute: mockOnExecute,
            });

            const executeButton = screen.getByRole('button', { name: /Ejecutar en BD/i });
            expect(executeButton.hasAttribute('disabled')).toBe(true);
        });

        it('enables execute button when all fields are valid', () => {
            const taskData = {
                name: 'Task',
                fechaInicio: '01/06/2026',
                fechaFin: '08/06/2026',
                totalMinutes: 120,
            };
            renderModal({ taskData, onExecute: mockOnExecute });

            const executeButton = screen.getByRole('button', { name: /Ejecutar en BD/i });
            expect(executeButton.hasAttribute('disabled')).toBe(false);
        });
    });

    describe('Integration with Step2Tasks', () => {
        it('does not break when no fases and taskData provided (existing usage)', () => {
            // This is a smoke test that the modal renders without fases and with taskData as used by Step2Tasks
            const taskData = {
                name: 'Some Task',
                fechaInicio: '01/06/2026',
                fechaFin: '08/06/2026',
                totalMinutes: 90,
            };
            renderModal({
                taskData,
                config: { usuario: 'MG01', fase: '123' },
                onExecute: vi.fn(),
                isExecuting: false,
            });

            // Should show text input for phase
            const phaseInput = screen.getByPlaceholderText('Código de fase') as HTMLInputElement;
            expect(phaseInput).toBeDefined();
            // Phase should be '123'
            expect(phaseInput.value).toBe('123');
            // Execute button should be visible and enabled
            const executeButton = screen.getByRole('button', { name: /Ejecutar en BD/i });
            expect(executeButton).toBeTruthy();
            expect(executeButton.hasAttribute('disabled')).toBe(false);
        });
    });
});
