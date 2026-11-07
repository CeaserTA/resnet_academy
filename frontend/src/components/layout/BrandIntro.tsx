// BrandIntro.tsx — mobile-only brand intro overlay, once per browser session
import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';

export function BrandIntro() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('resnet_intro_shown')) return;
    setVisible(true);
    const fadeTimer = setTimeout(() => setFading(true), 1200);
    // Write the flag only after the animation has fully played
    const removeTimer = setTimeout(() => {
      sessionStorage.setItem('resnet_intro_shown', '1');
      setVisible(false);
    }, 1600);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#fafbfc] transition-opacity duration-[400ms] lg:hidden ${fading ? 'opacity-0' : 'opacity-100'
        }`}
      aria-hidden="true"
    >
      <GraduationCap className="size-10 text-primary" />
      <p className="mt-3 font-display text-2xl font-bold text-primary">ResNet Academy</p>
    </div>
  );
}
