interface SignupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SignupModal({ isOpen, onClose }: SignupModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6">
                <h2 className="text-2xl font-bold text-ink-900">Sign Up</h2>
                <p className="mt-2 text-ink-600">Signup form placeholder</p>
                <button
                    onClick={onClose}
                    className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
