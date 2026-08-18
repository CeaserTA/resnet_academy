import { useState, type ChangeEvent } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ApiError } from '@/lib/api/client';
import { downloadQuestionsCsvTemplate } from '@/features/assessment/api';
import { useImportQuestionsCsv } from '@/features/assessment/useAssessment';

interface QuestionCsvImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    bankId: number;
    courseId: number;
    bankTitle: string;
}

/**
 * Upload modal for the zero-AI CSV question import: template download link,
 * a .csv file picker, and per-row validation errors surfaced from the API.
 */
export function QuestionCsvImportModal({
    isOpen,
    onClose,
    bankId,
    courseId,
    bankTitle,
}: QuestionCsvImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [rowErrors, setRowErrors] = useState<string[]>([]);
    const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
    const importCsv = useImportQuestionsCsv(courseId);

    const handleClose = () => {
        setFile(null);
        setError(null);
        setRowErrors([]);
        onClose();
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFile(e.target.files?.[0] ?? null);
        setError(null);
        setRowErrors([]);
    };

    const handleDownloadTemplate = async () => {
        setIsDownloadingTemplate(true);
        try {
            await downloadQuestionsCsvTemplate();
        } catch {
            setError('Could not download the template. Please try again.');
        } finally {
            setIsDownloadingTemplate(false);
        }
    };

    const handleImport = async () => {
        if (!file) return;
        setError(null);
        setRowErrors([]);

        try {
            await importCsv.mutateAsync({ bankId, file });
            handleClose();
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
                setRowErrors(err.fields?.csv_file ?? []);
            } else {
                setError('Import failed. Please try again.');
            }
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={`Import Questions — ${bankTitle}`}
            className="max-w-lg"
            footer={
                <>
                    <Button variant="ghost" onClick={handleClose} disabled={importCsv.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={!file} isLoading={importCsv.isPending}>
                        Import Questions
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                <p className="text-sm text-ink-600">
                    Upload a CSV file with one question per row. Columns: type, question_text,
                    points, option_1…option_8 and correct_options (option numbers, e.g. &quot;1&quot;
                    or &quot;1,3&quot;). Points default to 1 when left empty.
                </p>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    isLoading={isDownloadingTemplate}
                    className="self-start"
                >
                    <Download className="size-3.5" />
                    Download sample template
                </Button>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink-900">CSV File</span>
                    <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleFileChange}
                        className="rounded-lg border border-surface-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-600"
                    />
                </label>

                {file && (
                    <p className="flex items-center gap-1.5 text-xs text-ink-500">
                        <FileSpreadsheet className="size-3.5" />
                        {file.name}
                    </p>
                )}

                {error && (
                    <p className="rounded-md bg-danger-600/10 px-3 py-2 text-sm text-danger-600">{error}</p>
                )}

                {rowErrors.length > 0 && (
                    <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border border-danger-600/20 px-3 py-2">
                        {rowErrors.map((message) => (
                            <li key={message} className="text-xs text-danger-600">
                                {message}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Modal>
    );
}
