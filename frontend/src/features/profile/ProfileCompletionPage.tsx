import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, Camera, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Avatar } from '@/components/ui/Avatar';
import { profileApi, type ProfileFormState } from '@/lib/api/profileApi';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const QUALIFICATION_OPTIONS = [
    { label: 'Select qualification...', value: '', disabled: true },
    { label: 'High School', value: 'High School' },
    { label: 'Diploma', value: 'Diploma' },
    { label: "Bachelor's Degree", value: "Bachelor's Degree" },
    { label: "Master's Degree", value: "Master's Degree" },
    { label: 'Doctorate', value: 'Doctorate' },
    { label: 'Other', value: 'Other' },
];

interface ValidationErrors {
    first_name?: string;
    last_name?: string;
    phone?: string;
    country?: string;
    city?: string;
    highest_qualification?: string;
    linkedin_profile?: string;
    portfolio_website?: string;
    avatar?: string;
}

/**
 * Profile completion page component.
 * Allows students to complete/edit their profile with required and optional fields.
 * Displays progress bar, validates inputs, and handles form submission.
 *
 * **Validates Requirements: 4.1, 4.2, 4.3, 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3, 10.1, 10.7**
 */
export function ProfileCompletionPage() {
    const { user, refetch } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state - Requirement 4.1, 4.2
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

    // Requirement 4.3: Pre-populate form fields with existing user data
    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name ?? '',
                last_name: user.last_name ?? '',
                phone: user.phone ?? '',
                country: user.country ?? '',
                city: user.city ?? '',
                highest_qualification: '',
                bio: user.bio ?? '',
                occupation: '',
                linkedin_profile: '',
                portfolio_website: '',
            });

            // Fetch profile status to get completion percentage
            profileApi.getStatus().then((status) => {
                setCompletionPercentage(status.percentage);
            });
        }
    }, [user]);

    // Requirement 13.2: Update progress bar dynamically as fields are completed
    useEffect(() => {
        const requiredFields = ['first_name', 'phone', 'country', 'city', 'highest_qualification'];
        const completedFields = requiredFields.filter((field) => {
            const value = formData[field as keyof ProfileFormState];
            return value !== null && value !== undefined && String(value).trim() !== '';
        });
        // Add email and name from user object (always present after auth)
        const totalRequired = requiredFields.length + 2; // +2 for email and name (from user object)
        const totalCompleted = completedFields.length + 2;
        setCompletionPercentage(Math.round((totalCompleted / totalRequired) * 100));
    }, [formData]);

    // Requirement 14.1: Validate required fields on blur
    const validateField = (name: string, value: string): string | undefined => {
        switch (name) {
            case 'first_name':
                if (!value.trim()) return 'First name is required';
                break;
            case 'phone':
                // Requirement 8.1, 8.2: Phone validation
                if (!value.trim()) return 'Phone number is required';
                if (!/^[0-9\s\-\+]+$/.test(value)) return 'Phone must contain only digits, spaces, hyphens, and plus signs';
                if (value.length < 8) return 'Phone must be at least 8 characters';
                if (value.length > 20) return 'Phone must not exceed 20 characters';
                break;
            case 'country':
                // Requirement 8.3: Country validation
                if (!value.trim()) return 'Country is required';
                break;
            case 'city':
                // Requirement 8.4: City validation
                if (!value.trim()) return 'City is required';
                break;
            case 'highest_qualification':
                // Requirement 8.5: Qualification enum validation
                if (!value.trim()) return 'Highest qualification is required';
                break;
            case 'linkedin_profile':
                // Requirement 8.6, 14.2: LinkedIn URL validation
                if (value.trim() && !isValidUrl(value)) return 'Please enter a valid URL';
                break;
            case 'portfolio_website':
                // Requirement 8.7, 14.2: Portfolio URL validation
                if (value.trim() && !isValidUrl(value)) return 'Please enter a valid URL';
                break;
        }
        return undefined;
    };

    const isValidUrl = (url: string): boolean => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    const handleBlur = (field: string) => {
        setTouched((prev) => new Set(prev).add(field));
        const value = formData[field as keyof ProfileFormState];
        const error = validateField(field, String(value ?? ''));
        setValidationErrors((prev) => ({
            ...prev,
            [field]: error,
        }));
    };

    const handleChange = (field: keyof ProfileFormState, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));

        // Requirement 14.2: Real-time URL validation
        if (field === 'linkedin_profile' || field === 'portfolio_website') {
            const error = validateField(field, value);
            setValidationErrors((prev) => ({
                ...prev,
                [field]: error,
            }));
        }
    };

    // Requirement 10.1: File upload field for profile picture
    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        e.target.value = '';
        if (!selected) return;

        setAvatarError(null);

        // Requirement 10.2: Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(selected.type)) {
            setAvatarError('Please upload a JPEG, PNG, GIF, or WEBP image');
            return;
        }

        // Requirement 10.3: Validate file size (max 5MB)
        if (selected.size > MAX_AVATAR_BYTES) {
            setAvatarError('Image must be less than 5 MB');
            return;
        }

        setAvatarFile(selected);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(selected);
    };

    // Requirement 14.4, 14.5: Determine if form is valid for submission
    const isFormValid = (): boolean => {
        const requiredFields = ['first_name', 'phone', 'country', 'city', 'highest_qualification'];

        // Check all required fields have values
        for (const field of requiredFields) {
            const value = formData[field as keyof ProfileFormState];
            if (!value || String(value).trim() === '') {
                return false;
            }
        }

        // Check no validation errors exist
        for (const field of requiredFields) {
            const error = validateField(field, String(formData[field as keyof ProfileFormState] ?? ''));
            if (error) {
                return false;
            }
        }

        // Check optional URL fields don't have errors
        if (formData.linkedin_profile && !isValidUrl(formData.linkedin_profile)) {
            return false;
        }
        if (formData.portfolio_website && !isValidUrl(formData.portfolio_website)) {
            return false;
        }

        return true;
    };

    // Requirement 4.5: Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(false);

        // Mark all required fields as touched to show validation errors
        const requiredFields = ['first_name', 'phone', 'country', 'city', 'highest_qualification'];
        setTouched(new Set(requiredFields));

        // Validate all fields
        const errors: ValidationErrors = {};
        for (const field of requiredFields) {
            const error = validateField(field, String(formData[field as keyof ProfileFormState] ?? ''));
            if (error) {
                errors[field as keyof ValidationErrors] = error;
            }
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        setIsSubmitting(true);

        try {
            // Upload avatar first if selected
            if (avatarFile) {
                try {
                    await profileApi.uploadAvatar(avatarFile);
                } catch (err) {
                    setAvatarError(err instanceof ApiError ? err.message : 'Could not upload profile picture');
                }
            }

            // Update profile
            await profileApi.updateProfile(formData);
            await refetch();

            setSubmitSuccess(true);

            // Requirement 7.1, 7.2, 7.3, 7.4: Return-to-context redirect
            setTimeout(() => {
                const returnUrl = sessionStorage.getItem('returnUrl');
                if (returnUrl) {
                    sessionStorage.removeItem('returnUrl');
                    navigate(returnUrl);
                } else {
                    navigate('/dashboard');
                }
            }, 1500);
        } catch (err) {
            // Requirement 4.6, 8.8: Display specific validation error messages
            if (err instanceof ApiError && err.fields) {
                const fieldErrors: ValidationErrors = {};
                Object.entries(err.fields).forEach(([field, messages]) => {
                    fieldErrors[field as keyof ValidationErrors] = messages[0];
                });
                setValidationErrors(fieldErrors);
                setSubmitError('Please correct the errors below');
            } else {
                setSubmitError(err instanceof ApiError ? err.message : 'Could not update profile. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) {
        return null;
    }

    const currentAvatarUrl = avatarPreview ?? user.avatar_url;

    return (
        <div className="mx-auto max-w-3xl py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-ink-900">Complete Your Profile</h1>
                <p className="mt-1 text-sm text-ink-600">
                    Fill in the required information to apply for courses and make the most of your learning experience
                </p>
            </div>

            {/* Requirement 13.1, 13.3: Progress bar showing completion percentage */}
            <Card className="mb-6">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-900">Profile completion</span>
                    <span className="font-mono text-ink-600">{completionPercentage}%</span>
                </div>
                <ProgressBar percent={completionPercentage} className="mt-2" />
            </Card>

            <form onSubmit={handleSubmit}>
                <Card>
                    {submitSuccess && <Alert variant="success" message="Profile updated successfully!" className="mb-6" />}
                    {submitError && <Alert variant="error" message={submitError} className="mb-6" />}

                    {/* Requirement 10.1, 10.7: Profile picture upload */}
                    <div className="mb-6 border-b border-surface-100 pb-6">
                        <h2 className="mb-4 text-lg font-semibold text-ink-900">Profile Picture</h2>
                        <div className="flex items-center gap-4">
                            <Avatar name={user.name} src={currentAvatarUrl} size="lg" />
                            <div className="flex-1">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    className="hidden"
                                    onChange={handleAvatarChange}
                                />
                                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                                    <Camera className="size-4" aria-hidden="true" />
                                    {currentAvatarUrl ? 'Change photo' : 'Upload photo'}
                                </Button>
                                <p className="mt-1 text-xs text-ink-600">JPEG, PNG, GIF, or WEBP (max 5 MB)</p>
                                {avatarError && <p className="mt-1 text-sm text-danger-600">{avatarError}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Required Fields Section - Requirement 4.1, 13.4 */}
                    <div className="mb-6 border-b border-surface-100 pb-6">
                        <div className="mb-4 flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-ink-900">Required Information</h2>
                            <span className="rounded-full bg-danger-100 px-2 py-0.5 text-xs font-medium text-danger-700">Required</span>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Input
                                    label="First Name"
                                    value={formData.first_name}
                                    onChange={(e) => handleChange('first_name', e.target.value)}
                                    onBlur={() => handleBlur('first_name')}
                                    error={touched.has('first_name') ? validationErrors.first_name : undefined}
                                    required
                                />
                                <Input
                                    label="Last Name"
                                    value={formData.last_name}
                                    onChange={(e) => handleChange('last_name', e.target.value)}
                                />
                            </div>

                            <Input
                                label="Phone Number"
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                onBlur={() => handleBlur('phone')}
                                error={touched.has('phone') ? validationErrors.phone : undefined}
                                placeholder="+1 234 567 8900"
                                required
                            />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                label="Highest Qualification"
                                options={QUALIFICATION_OPTIONS}
                                value={formData.highest_qualification}
                                onChange={(e) => handleChange('highest_qualification', e.target.value)}
                                onBlur={() => handleBlur('highest_qualification')}
                                required
                            />
                            {touched.has('highest_qualification') && validationErrors.highest_qualification && (
                                <p className="-mt-3 text-sm text-danger-600">{validationErrors.highest_qualification}</p>
                            )}
                        </div>
                    </div>

                    {/* Optional Fields Section - Requirement 4.2, 13.4, 13.5 */}
                    <div className="mb-6">
                        <div className="mb-4 flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-ink-900">Additional Information</h2>
                            <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-ink-600">Optional</span>
                        </div>

                        <div className="space-y-4">
                            <Input
                                label="Occupation"
                                value={formData.occupation}
                                onChange={(e) => handleChange('occupation', e.target.value)}
                                placeholder="Software Engineer, Teacher, etc."
                            />

                            <Textarea
                                label="Bio"
                                value={formData.bio}
                                onChange={(e) => handleChange('bio', e.target.value)}
                                rows={4}
                                placeholder="Tell us a bit about yourself..."
                            />

                            <Input
                                label="LinkedIn Profile"
                                value={formData.linkedin_profile}
                                onChange={(e) => handleChange('linkedin_profile', e.target.value)}
                                onBlur={() => handleBlur('linkedin_profile')}
                                error={validationErrors.linkedin_profile}
                                placeholder="https://linkedin.com/in/yourname"
                            />

                            <Input
                                label="Portfolio Website"
                                value={formData.portfolio_website}
                                onChange={(e) => handleChange('portfolio_website', e.target.value)}
                                onBlur={() => handleBlur('portfolio_website')}
                                error={validationErrors.portfolio_website}
                                placeholder="https://yourwebsite.com"
                            />
                        </div>
                    </div>

                    {/* Requirement 14.3: Inline error messages summary */}
                    {Object.keys(validationErrors).length > 0 && (
                        <Alert
                            variant="error"
                            message="Please correct the errors above before submitting"
                            className="mb-6"
                        />
                    )}

                    {/* Requirement 14.4: Dynamic submit button state */}
                    <div className="flex items-center justify-between border-t border-surface-100 pt-6">
                        <Button type="button" variant="ghost" onClick={() => navigate('/dashboard')}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!isFormValid() || isSubmitting} isLoading={isSubmitting}>
                            {submitSuccess && <Check className="size-4" />}
                            {submitSuccess ? 'Profile saved!' : 'Save profile'}
                        </Button>
                    </div>
                </Card>
            </form>
        </div>
    );
}
