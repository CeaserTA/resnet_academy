import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Camera, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { profileApi, type ProfileFormState } from '@/lib/api/profileApi';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const QUALIFICATION_OPTIONS = [
    { label: 'Select qualification…', value: '', disabled: true },
    { label: 'High School', value: 'High School' },
    { label: 'Diploma', value: 'Diploma' },
    { label: "Bachelor's Degree", value: "Bachelor's Degree" },
    { label: "Master's Degree", value: "Master's Degree" },
    { label: 'Doctorate', value: 'Doctorate' },
    { label: 'Other', value: 'Other' },
];

interface ValidationErrors {
    phone?: string;
    country?: string;
    city?: string;
    highest_qualification?: string;
    linkedin_profile?: string;
    portfolio_website?: string;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
    title,
    badge,
    children,
}: {
    title: string;
    badge?: { label: string; className: string };
    children: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
            <div className="flex items-center gap-2 border-b border-surface-100 bg-surface-50 px-4 py-3">
                <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
                {badge && (
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', badge.className)}>
                        {badge.label}
                    </span>
                )}
            </div>
            <div className="space-y-3 bg-blue-50/30 p-4">{children}</div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProfileCompletionPage() {
    const { user, refetch } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<ProfileFormState>({
        first_name: '',
        last_name: '',
        phone: '',
        country: '',
        city: '',
        highest_qualification: '',
        bio: '',
        occupation: '',
        linkedin_profile: '',
        portfolio_website: '',
    });

    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [touched, setTouched] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [completionPercentage, setCompletionPercentage] = useState(0);

    useEffect(() => {
        if (!user) return;
        const nameParts = (user.name || '').trim().split(' ');
        setFormData({
            first_name: user.first_name || nameParts[0] || '',
            last_name: user.last_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''),
            phone: user.phone ?? '',
            country: user.country ?? '',
            city: user.city ?? '',
            highest_qualification: user.highest_qualification ?? '',
            bio: user.bio ?? '',
            occupation: user.occupation ?? '',
            linkedin_profile: user.linkedin_profile ?? '',
            portfolio_website: user.portfolio_website ?? '',
        });
        profileApi.getStatus().then((s) => setCompletionPercentage(s.percentage));
    }, [user]);

    // Dynamic progress from form values
    useEffect(() => {
        const required = ['phone', 'country', 'city', 'highest_qualification'];
        const done = required.filter((f) => String(formData[f as keyof ProfileFormState] ?? '').trim() !== '').length;
        setCompletionPercentage(Math.round(((done + 2) / (required.length + 2)) * 100));
    }, [formData]);

    const isValidUrl = (url: string) => { try { new URL(url); return true; } catch { return false; } };

    const validateField = (name: string, value: string): string | undefined => {
        if (name === 'phone') {
            if (!value.trim()) return 'Phone number is required';
            if (!/^[0-9\s\-\+]+$/.test(value)) return 'Digits, spaces, hyphens and + only';
            if (value.length < 8) return 'At least 8 characters';
            if (value.length > 20) return 'Max 20 characters';
        }
        if (name === 'country' && !value.trim()) return 'Country is required';
        if (name === 'city' && !value.trim()) return 'City is required';
        if (name === 'highest_qualification' && !value.trim()) return 'Qualification is required';
        if ((name === 'linkedin_profile' || name === 'portfolio_website') && value.trim() && !isValidUrl(value))
            return 'Enter a valid URL';
        return undefined;
    };

    const handleBlur = (field: string) => {
        setTouched((prev) => new Set(prev).add(field));
        const error = validateField(field, String(formData[field as keyof ProfileFormState] ?? ''));
        setValidationErrors((prev) => ({ ...prev, [field]: error }));
    };

    const handleChange = (field: keyof ProfileFormState, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (field === 'linkedin_profile' || field === 'portfolio_website') {
            const error = value.trim() ? validateField(field, value) : undefined;
            setValidationErrors((prev) => ({ ...prev, [field]: error }));
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setAvatarError(null);
        if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
            setAvatarError('JPEG, PNG, GIF or WEBP only');
            return;
        }
        if (file.size > MAX_AVATAR_BYTES) { setAvatarError('Max 5 MB'); return; }
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const isFormValid = () => {
        const required = ['phone', 'country', 'city', 'highest_qualification'];
        if (required.some((f) => !String(formData[f as keyof ProfileFormState] ?? '').trim())) return false;
        if (required.some((f) => validateField(f, String(formData[f as keyof ProfileFormState] ?? '')))) return false;
        if (formData.linkedin_profile?.trim() && !isValidUrl(formData.linkedin_profile)) return false;
        if (formData.portfolio_website?.trim() && !isValidUrl(formData.portfolio_website)) return false;
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(false);

        const required = ['phone', 'country', 'city', 'highest_qualification'];
        setTouched(new Set(required));
        const errors: ValidationErrors = {};
        for (const f of required) {
            const err = validateField(f, String(formData[f as keyof ProfileFormState] ?? ''));
            if (err) errors[f as keyof ValidationErrors] = err;
        }
        if (Object.keys(errors).length > 0) { setValidationErrors(errors); return; }

        setIsSubmitting(true);
        try {
            if (avatarFile) {
                try { await profileApi.uploadAvatar(avatarFile); }
                catch (err) { setAvatarError(err instanceof ApiError ? err.message : 'Could not upload photo'); }
            }

            const submitData: Partial<ProfileFormState> = {
                first_name: formData.first_name.trim() || user?.name || '',
                last_name: formData.last_name.trim() || undefined,
                phone: formData.phone.trim(),
                country: formData.country.trim(),
                city: formData.city.trim(),
                highest_qualification: formData.highest_qualification,
            };
            if (formData.bio?.trim()) submitData.bio = formData.bio.trim();
            if (formData.occupation?.trim()) submitData.occupation = formData.occupation.trim();
            if (formData.linkedin_profile?.trim()) submitData.linkedin_profile = formData.linkedin_profile.trim();
            if (formData.portfolio_website?.trim()) submitData.portfolio_website = formData.portfolio_website.trim();

            await profileApi.updateProfile(submitData as ProfileFormState);
            await refetch();
            setSubmitSuccess(true);

            setTimeout(() => {
                const returnUrl = sessionStorage.getItem('returnUrl');
                if (returnUrl) { sessionStorage.removeItem('returnUrl'); navigate(returnUrl); }
                else navigate('/dashboard');
            }, 1500);
        } catch (err) {
            if (err instanceof ApiError && err.fields) {
                const fieldErrors: ValidationErrors = {};
                Object.entries(err.fields).forEach(([f, msgs]) => {
                    fieldErrors[f as keyof ValidationErrors] = msgs[0];
                });
                setValidationErrors(fieldErrors);
                setSubmitError('Please correct the errors below');
            } else {
                setSubmitError(err instanceof ApiError ? err.message : 'Could not update profile. Try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) return null;

    const currentAvatarUrl = avatarPreview ?? user.avatar_url;

    return (
        <div className="mx-auto max-w-6xl space-y-4">

            {/* Header + progress */}
            <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-sm font-semibold text-white">Complete your profile</h1>
                            <p className="text-xs text-blue-100">Required to apply for courses</p>
                        </div>
                        <span className="font-mono text-lg font-bold text-white">{completionPercentage}%</span>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                        <div
                            className="h-full rounded-full bg-white transition-all duration-500"
                            style={{ width: `${completionPercentage}%` }}
                            role="presentation"
                        />
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

                {submitSuccess && <Alert variant="success" message="Profile saved successfully!" />}
                {submitError && <Alert variant="error" message={submitError} />}

                {/* Two-column layout */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">

                    {/* LEFT — photo + required (single card so it matches right column height) */}
                    <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                        {/* Photo sub-section */}
                        <div className="border-b border-surface-100 bg-surface-50 px-4 py-3">
                            <h2 className="text-sm font-semibold text-ink-900">Profile photo</h2>
                        </div>
                        <div className="space-y-3 p-4 pb-0">
                            <div className="flex items-center gap-3">
                                <Avatar name={user.name} src={currentAvatarUrl} size="lg" className="size-14 shrink-0" />
                                <div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                        className="hidden"
                                        onChange={handleAvatarChange}
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Camera className="size-3.5" aria-hidden="true" />
                                        {currentAvatarUrl ? 'Change photo' : 'Upload photo'}
                                    </Button>
                                    <p className="mt-1 text-xs text-ink-400">JPEG, PNG, GIF or WEBP · max 5 MB</p>
                                    {avatarError && <p className="mt-1 text-xs text-danger-600">{avatarError}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Required sub-section */}
                        <div className="mt-4 border-t border-surface-100 bg-surface-50 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-semibold text-ink-900">Required information</h2>
                                <span className="rounded-full bg-danger-600/10 px-2 py-0.5 text-xs font-medium text-danger-600">Required</span>
                            </div>
                        </div>
                        <div className="space-y-3 p-4">
                            <Input
                                label="Phone number"
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                onBlur={() => handleBlur('phone')}
                                error={touched.has('phone') ? validationErrors.phone : undefined}
                                placeholder="+256 700 000 000"
                                required
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Country"
                                    value={formData.country}
                                    onChange={(e) => handleChange('country', e.target.value)}
                                    onBlur={() => handleBlur('country')}
                                    error={touched.has('country') ? validationErrors.country : undefined}
                                    required
                                />
                                <Input
                                    label="City"
                                    value={formData.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    onBlur={() => handleBlur('city')}
                                    error={touched.has('city') ? validationErrors.city : undefined}
                                    required
                                />
                            </div>
                            <Select
                                label="Highest qualification"
                                options={QUALIFICATION_OPTIONS}
                                value={formData.highest_qualification}
                                onChange={(e) => handleChange('highest_qualification', e.target.value)}
                                onBlur={() => handleBlur('highest_qualification')}
                                required
                            />
                            {touched.has('highest_qualification') && validationErrors.highest_qualification && (
                                <p className="text-xs text-danger-600">{validationErrors.highest_qualification}</p>
                            )}
                        </div>
                    </div>

                    {/* RIGHT — additional info */}
                    <Section
                        title="Additional information"
                        badge={{ label: 'Optional', className: 'bg-surface-100 text-ink-600' }}
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="First name"
                                value={formData.first_name}
                                onChange={(e) => handleChange('first_name', e.target.value)}
                            />
                            <Input
                                label="Last name"
                                value={formData.last_name}
                                onChange={(e) => handleChange('last_name', e.target.value)}
                            />
                        </div>
                        <Input
                            label="Occupation"
                            value={formData.occupation}
                            onChange={(e) => handleChange('occupation', e.target.value)}
                            placeholder="Software engineer, teacher…"
                        />
                        <Textarea
                            label="Bio"
                            value={formData.bio}
                            onChange={(e) => handleChange('bio', e.target.value)}
                            rows={3}
                            placeholder="Tell us a bit about yourself…"
                        />
                        <Input
                            label="LinkedIn profile"
                            value={formData.linkedin_profile}
                            onChange={(e) => handleChange('linkedin_profile', e.target.value)}
                            onBlur={() => handleBlur('linkedin_profile')}
                            error={validationErrors.linkedin_profile}
                            placeholder="https://linkedin.com/in/yourname"
                        />
                        <Input
                            label="Portfolio website"
                            value={formData.portfolio_website}
                            onChange={(e) => handleChange('portfolio_website', e.target.value)}
                            onBlur={() => handleBlur('portfolio_website')}
                            error={validationErrors.portfolio_website}
                            placeholder="https://yourwebsite.com"
                        />
                    </Section>
                </div>

                {/* Centered save button */}
                <div className="flex justify-center pt-1">
                    <Button
                        type="submit"
                        disabled={!isFormValid() || isSubmitting}
                        isLoading={isSubmitting}
                        className="px-10"
                    >
                        {submitSuccess ? <><Check className="size-3.5" /> Saved!</> : 'Save profile'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
