import { useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import * as Dialog from '@radix-ui/react-dialog';
import { GraduationCap, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
  /**
   * Where to send the user after a successful login/signup. Pass `null` to keep them on the
   * current page (e.g. the course detail page resumes its apply flow via saved guest intent).
   */
  redirectTo?: string | null;
}

// Fields sit on a white card, so they get a tinted fill + firmer border to read as inputs, then
// lift to white with a soft primary ring on focus.
const fieldClass =
  'h-10 border-ink-300/70 bg-surface-50 shadow-none transition-[background-color,border-color,box-shadow] duration-150 hover:border-ink-300 focus-visible:border-blue-600 focus-visible:bg-surface-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/15';

/**
 * Expands/collapses its content smoothly (grid-rows 0fr ↔ 1fr) so switching between login and
 * signup grows the form instead of jump-cutting. Collapsed content is `inert` — out of the tab
 * order and hidden from assistive tech. The inner `-m-1 p-1` keeps input focus rings from being
 * clipped by the overflow mask.
 */
function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <div
      inert={!show}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
        show ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="-m-1 min-h-0 overflow-hidden p-1">{children}</div>
    </div>
  );
}

export function AuthModal({ open, mode, onModeChange, onClose, redirectTo = '/dashboard' }: AuthModalProps) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const isSignup = mode === 'signup';

  // Passwords and errors shouldn't survive the modal closing or be carried across modes.
  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setFormError(null);
    onClose();
  };

  const handleModeChange = (nextMode: AuthMode) => {
    setFormError(null);
    onModeChange(nextMode);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (isSignup && password !== confirmPassword) {
      setFormError('Passwords do not match. Please try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignup) {
        await register(name, email, password, confirmPassword);
      } else {
        await login(email, password);
      }
      handleClose();
      if (redirectTo) {
        navigate(redirectTo);
      }
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
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          data-reduce-motion
          className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in"
        />
        <Dialog.Content
          data-reduce-motion
          // Land on the first field rather than the close button, so typing can start immediately.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (isSignup ? nameRef : emailRef).current?.focus();
          }}
          // The card itself never scrolls (a scrollbar on its edge squares off the rounded corner);
          // on very short screens the inner body scrolls instead, clipped by the rounded shell.
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(95vw,480px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-surface-100 bg-surface-0 shadow-2xl shadow-navy/20 focus-visible:outline-none data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in"
        >
          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute right-4 top-4 z-10 rounded-full p-2 text-ink-600 transition hover:bg-surface-100 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </button>
          </Dialog.Close>

          <div className="overflow-y-auto overscroll-contain p-6 [scrollbar-color:var(--color-surface-100)_transparent] [scrollbar-width:thin] sm:p-7">
            <div className="flex items-center gap-3 pr-8">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100">
                <GraduationCap className="size-5 text-blue-600" aria-hidden="true" />
              </span>
              {/* Keyed on mode so the heading crossfades when switching */}
              <Dialog.Title key={mode} className="animate-fade-slide-in text-2xl font-semibold text-ink-900">
                {isSignup ? 'Create your account' : 'Log in to Resnet Academy'}
              </Dialog.Title>
            </div>
            <Dialog.Description key={`${mode}-desc`} className="mt-2 animate-fade-slide-in text-sm leading-6 text-ink-600">
              {isSignup
                ? 'Sign up to access learning paths, projects, and mentorship.'
                : 'Log in to continue your courses and progress.'}
            </Dialog.Description>

            <div className="relative mt-5 grid grid-cols-2 rounded-full border border-surface-100 bg-surface-50 p-1">
              {/* Sliding thumb behind the active option */}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-blue-600 shadow-sm transition-transform duration-200 ease-out',
                  isSignup && 'translate-x-full',
                )}
              />
              {(['login', 'signup'] as AuthMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={item === mode}
                  onClick={() => handleModeChange(item)}
                  className={cn(
                    'relative z-10 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                    item === mode ? 'text-white' : 'text-ink-600 hover:text-blue-700',
                  )}
                >
                  {item === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-5">
              <fieldset disabled={isSubmitting} className="flex min-w-0 flex-col">
                {formError && (
                  <div className="mb-4 animate-fade-slide-in">
                    <Alert variant="error" message={formError} />
                  </div>
                )}

                <Reveal show={isSignup}>
                  <div className="pb-3">
                    <Input
                      ref={nameRef}
                      label="Full name"
                      className={fieldClass}
                      autoComplete="name"
                      required={isSignup}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                </Reveal>

                <Input
                  ref={emailRef}
                  label="Email"
                  className={fieldClass}
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />

                <div className="pt-3">
                  <Input
                    label="Password"
                    className={fieldClass}
                    type="password"
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <Reveal show={isSignup}>
                  <div className="pt-3">
                    <Input
                      label="Confirm password"
                      className={fieldClass}
                      type="password"
                      autoComplete="new-password"
                      required={isSignup}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </div>
                </Reveal>

                <Reveal show={!isSignup}>
                  <div className="flex justify-end pt-3 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        navigate('/forgot-password');
                      }}
                      className="rounded text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Forgot password?
                    </button>
                  </div>
                </Reveal>

                <Button
                  type="submit"
                  size="lg"
                  className="mt-5 w-full hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/25 active:translate-y-0 active:scale-[0.98] active:shadow-sm"
                  isLoading={isSubmitting}
                >
                  {isSubmitting
                    ? isSignup ? 'Creating account…' : 'Logging in…'
                    : isSignup ? 'Create account' : 'Log in'}
                </Button>
              </fieldset>
            </form>

            <p className="mt-4 text-center text-sm text-ink-600">
              {isSignup ? 'Already have an account?' : 'Don’t have an account?'}{' '}
              <button
                type="button"
                onClick={() => handleModeChange(isSignup ? 'login' : 'signup')}
                className="rounded font-semibold text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {isSignup ? 'Log in' : 'Sign up'}
              </button>
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
