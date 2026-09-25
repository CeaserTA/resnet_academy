import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CertificateVerifyModal } from '@/features/progress/CertificateVerifyModal';

interface FooterProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

const exploreLinks = [
  { label: 'Courses', href: '/#courses' },
  { label: 'Features', href: '/#features' },
  { label: 'Testimonials', href: '/#testimonials' },
];

const companyLinks = [
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'Careers', to: '#' },
];

const socialLinks = [
  {
    label: 'Facebook',
    href: '#',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden="true">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    label: 'Twitter / X',
    href: '#',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: '#',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden="true">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: '#',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden="true">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect width="4" height="12" x="2" y="9" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
];

const linkClass =
  'inline-flex items-center text-sm font-normal text-muted-foreground transition-colors duration-200 hover:translate-x-0.5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const colHeadingClass = 'text-xs font-medium uppercase tracking-widest text-foreground';

export function Footer({ onLoginClick, onSignupClick }: FooterProps) {
  // Verification opens in place rather than on its own page; the footer owns it so it works on
  // every public page that renders this footer.
  const [verifyOpen, setVerifyOpen] = useState(false);
  // Scanning the QR code on a printed certificate lands here with ?verify=CERT-… — the modal
  // then opens on the result rather than on an empty field.
  const [searchParams, setSearchParams] = useSearchParams();
  const verifyParam = searchParams.get('verify');

  const closeVerify = () => {
    setVerifyOpen(false);

    if (verifyParam !== null) {
      const next = new URLSearchParams(searchParams);
      next.delete('verify');
      setSearchParams(next, { replace: true });
    }
  };

  return (
    <footer
      aria-label="Site footer"
      style={{
        background: 'linear-gradient(to bottom, #bfdbfe 0%, #eff6ff 45%, #f8fafc 100%)',
      }}
    >
      <div className="px-6 py-6 sm:px-8 sm:py-8 lg:px-12">
        <div className="mx-auto max-w-7xl">

          {/* ── CTA banner ── */}
          <div className="mb-8 flex flex-col items-start justify-between gap-4 border border-border bg-white px-5 py-4 rounded-xl sm:flex-row sm:items-center">
            <div>
              <p className="text-base font-semibold text-foreground">
                Ready to start learning?
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Join thousands of developers building real, job-ready skills.
              </p>
            </div>
            <Button
              variant="primary"
              className="shrink-0"
              onClick={onSignupClick}
            >
              Get started free
            </Button>
          </div>

          {/* ── 4-column grid ── */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

            {/* Col 1 — Brand */}
            <div>
              <Link
                to="/"
                aria-label="Resnet Academy home"
                className="inline-flex items-center gap-2 text-lg font-semibold text-foreground transition-colors duration-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <GraduationCap className="size-6 text-primary" aria-hidden="true" />
                Resnet Academy
              </Link>

              <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
                Hands-on mentorship in web technologies. Learn by building real
                projects with guided support to launch your tech career.
              </p>

              <div className="mt-5 flex gap-2" role="list" aria-label="Social media links">
                {socialLinks.map(({ label, href, svg }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    role="listitem"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-primary bg-blue-50 text-primary transition-colors duration-200 hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {svg}
                  </a>
                ))}
              </div>
            </div>

            {/* Col 2 — Explore */}
            <div>
              <h3 className={colHeadingClass}>Explore</h3>
              <nav aria-label="Explore links">
                <ul className="mt-4 space-y-3">
                  {exploreLinks.map(({ label, href }) => (
                    <li key={label}>
                      <a href={href} className={linkClass}>{label}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            {/* Col 3 — Company */}
            <div>
              <h3 className={colHeadingClass}>Company</h3>
              <nav aria-label="Company links">
                <ul className="mt-4 space-y-3">
                  {companyLinks.map(({ label, to }) => (
                    <li key={label}>
                      {to === '#' ? (
                        <a href={to} className={linkClass}>{label}</a>
                      ) : (
                        <Link to={to} className={linkClass}>{label}</Link>
                      )}
                    </li>
                  ))}
                  <li>
                    <button type="button" onClick={() => setVerifyOpen(true)} className={linkClass}>
                      Verify a certificate
                    </button>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Col 4 — Get Started */}
            <div>
              <h3 className={colHeadingClass}>Get Started</h3>
              <p className="mt-4 text-sm text-muted-foreground">
                Already have an account?
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onLoginClick}
                >
                  Log in
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={onSignupClick}
                >
                  Sign up free
                </Button>
              </div>
            </div>

          </div>

          {/* ── Bottom bar ── */}
          <div className="mt-8 flex flex-col items-center gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
            <p className="text-center text-sm text-muted-foreground sm:text-left">
              © {new Date().getFullYear()} Resnet Academy. All rights reserved.
            </p>
            <nav aria-label="Legal links">
              <ul className="flex gap-5">
                <li><a href="#" className={linkClass}>Privacy</a></li>
                <li><a href="#" className={linkClass}>Terms</a></li>
              </ul>
            </nav>
          </div>

        </div>
      </div>
      {/* Radix portals the dialog to <body>, so its place in the tree does not affect layout. */}
      <CertificateVerifyModal
        isOpen={verifyOpen || verifyParam !== null}
        onClose={closeVerify}
        initialNumber={verifyParam}
      />
    </footer>
  );
}
