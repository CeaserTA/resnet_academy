import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { ApiError } from '@/lib/api/client';

export type AuthMode = 'login' | 'signup';

interface AuthModalProps {
  open: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
}

const roleOptions = [
  { value: 'student', label: 'Student' },
  { value: 'instructor', label: 'Instructor' },
] as const;
// Admin accounts are provisioned by existing admins via POST /api/v1/admin/users — not public signup.

const expertiseOptions = [
  { value: 'web-development', label: 'Web development' },
  { value: 'data-analytics', label: 'Data & analytics' },
  { value: 'ui-ux', label: 'UI/UX design' },
];

export function AuthModal({ open, mode, onModeChange, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<(typeof roleOptions)[number]['value']>('student');
  const [expertise, setExpertise] = useState(expertiseOptions[0].value);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignup = mode === 'signup';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (isSignup) {
        await register(name, email, password, password);
      } else {
        await login(email, password);
      }
      onClose();
      navigate('/dashboard');
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : isSignup
            ? 'Could not create your account. Try again.'
            : 'Those credentials don\'t match an account. Check your email and password.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(95vw,520px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-[32px] border border-[#e8ecf1] bg-[#fafbfc] p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-2xl font-semibold text-ink-900">
                {isSignup ? 'Create your account' : 'Log in to Resnet Academy'}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-[#64748b]">
                {isSignup
                  ? 'Sign up to access learning paths, projects, and mentorship.'
                  : 'Log in to continue your courses and progress.'}
              </Dialog.Description>
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full border border-transparent p-2 text-[#64748b] transition hover:bg-surface-100 hover:text-ink-900"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-6 rounded-full border border-[#e8ecf1] bg-white p-1 shadow-sm">
            <div className="grid grid-cols-2 rounded-full bg-[#fafbfc]">
              {(['login', 'signup'] as AuthMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onModeChange(item)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition',
                    item === mode
                      ? 'bg-blue-600 text-white'
                      : 'text-[#64748b] hover:bg-blue-50 hover:text-blue-700',
                  )}
                >
                  {item === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {formError && <Alert variant="error" message={formError} />}
            {isSignup && (
              <Input
                label="Full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            {!isSignup && (
              <div className="flex justify-end text-sm">
                <button type="button" className="text-blue-600 hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            {isSignup && (
              <div className="space-y-4 rounded-3xl border border-[#e8ecf1] bg-white p-4">
                <p className="text-sm font-semibold text-ink-900">Choose your role</p>
                <div className="grid grid-cols-2 gap-3">
                  {roleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRole(option.value)}
                      className={cn(
                        'rounded-2xl border px-4 py-3 text-center transition',
                        role === option.value
                          ? 'border-blue-300 bg-blue-50 shadow-sm'
                          : 'border-[#e8ecf1] bg-white hover:border-blue-200 hover:bg-blue-50',
                      )}
                    >
                      <p className="text-sm font-semibold text-ink-900">{option.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isSignup && role === 'instructor' && (
              <Select
                label="Area of expertise"
                value={expertise}
                options={expertiseOptions}
                onChange={(event) => setExpertise(event.target.value)}
              />
            )}

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              {isSignup ? 'Create account' : 'Log in'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-[#64748b]">
            {isSignup ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => onModeChange('login')}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => onModeChange('signup')}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
