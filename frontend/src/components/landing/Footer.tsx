import React from 'react';
import { GraduationCap, Users, ExternalLink, MailCheck, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface FooterProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

export function Footer({ onLoginClick, onSignupClick }: FooterProps) {
  const handleAnchor = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-[#e8ecf1] bg-[#fafbfc] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 grid-cols-1 md:grid-cols-4">
          <div>
            <a href="/" className="flex items-center gap-2 text-lg font-semibold text-blue-600">
              <GraduationCap className="size-6 text-blue-600" />
              <span>Resnet LMS</span>
            </a>
            <p className="mt-3 text-sm text-[#94a3b8]">Hands-on mentorship in modern web development</p>
            <div className="mt-4 flex gap-3">
              <a aria-label="Community" href="#" className="text-[#94a3b8] hover:text-blue-600">
                <Users className="size-5" />
              </a>
              <a aria-label="Resources" href="#" className="text-[#94a3b8] hover:text-blue-600">
                <ExternalLink className="size-5" />
              </a>
              <a aria-label="Contact" href="#" className="text-[#94a3b8] hover:text-blue-600">
                <MailCheck className="size-5" />
              </a>
              <a aria-label="Support" href="#" className="text-[#94a3b8] hover:text-blue-600">
                <MessageSquare className="size-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink-900">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#features" onClick={(e) => handleAnchor(e, 'features')} className="text-[#94a3b8] hover:text-blue-600">
                  Features
                </a>
              </li>
              <li>
                <a href="#courses" onClick={(e) => handleAnchor(e, 'courses')} className="text-[#94a3b8] hover:text-blue-600">
                  Courses
                </a>
              </li>
              <li>
                <a href="#testimonials" onClick={(e) => handleAnchor(e, 'testimonials')} className="text-[#94a3b8] hover:text-blue-600">
                  Testimonials
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink-900">Company</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#" className="text-[#94a3b8] hover:text-blue-600">About</a>
              </li>
              <li>
                <a href="#" className="text-[#94a3b8] hover:text-blue-600">Contact</a>
              </li>
              <li>
                <a href="#" className="text-[#94a3b8] hover:text-blue-600">Careers</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink-900">Get Started</h4>
            <div className="mt-3 flex flex-col gap-3">
              <Button variant="outline" size="sm" className="text-blue-700 border-blue-200 hover:bg-blue-50" onClick={onLoginClick}>
                Log in
              </Button>
              <Button variant="primary" size="sm" onClick={onSignupClick}>
                Sign up
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-[#e8ecf1] pt-4 flex flex-col items-center gap-3 md:flex-row md:justify-between">
          <p className="text-sm text-[#94a3b8]">© 2026 Resnet LMS. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="text-sm text-[#94a3b8] hover:text-blue-600">Privacy</a>
            <a href="#" className="text-sm text-[#94a3b8] hover:text-blue-600">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
