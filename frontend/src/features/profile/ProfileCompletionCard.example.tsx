/**
 * Example usage of ProfileCompletionCard component
 * This file demonstrates how to integrate the ProfileCompletionCard into a dashboard.
 */

import { ProfileCompletionCard } from './ProfileCompletionCard';

/**
 * Example 1: Student with 50% profile completion
 * Missing phone and country fields
 */
export function PartiallyCompletedProfileExample() {
    return (
        <div className="p-4">
            <h2 className="mb-4 text-xl font-bold">Example: 50% Complete Profile</h2>
            <ProfileCompletionCard
                percentage={50}
                missingFields={['phone', 'country']}
                completedFields={['name', 'email']}
            />
        </div>
    );
}

/**
 * Example 2: Student with 66.67% profile completion
 * Missing 2 out of 6 required fields
 */
export function MostlyCompletedProfileExample() {
    return (
        <div className="p-4">
            <h2 className="mb-4 text-xl font-bold">Example: 66.67% Complete Profile</h2>
            <ProfileCompletionCard
                percentage={66.67}
                missingFields={['phone', 'highest_qualification']}
                completedFields={['name', 'email', 'country', 'city']}
            />
        </div>
    );
}

/**
 * Example 3: Student with 100% profile completion
 * Card should not render
 */
export function CompleteProfileExample() {
    return (
        <div className="p-4">
            <h2 className="mb-4 text-xl font-bold">Example: 100% Complete Profile (Card Hidden)</h2>
            <ProfileCompletionCard
                percentage={100}
                missingFields={[]}
                completedFields={['name', 'email', 'phone', 'country', 'city', 'highest_qualification']}
            />
            <p className="mt-4 text-sm text-gray-600">
                ↑ The card above should not be visible because the profile is 100% complete
            </p>
        </div>
    );
}

/**
 * Example 4: Integration with Dashboard
 * Shows how to fetch profile status from API and render the card
 */
export function DashboardIntegrationExample() {
    // In a real implementation, this would come from an API call:
    // const { data: profileStatus } = useProfileStatus();
    
    const profileStatus = {
        percentage: 75,
        missing: ['phone'],
        completed: ['name', 'email', 'country', 'city', 'highest_qualification'],
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">Student Dashboard</h1>
            
            {/* Profile completion card appears at top of dashboard when incomplete */}
            <div className="mt-6">
                <ProfileCompletionCard
                    percentage={profileStatus.percentage}
                    missingFields={profileStatus.missing}
                    completedFields={profileStatus.completed}
                />
            </div>

            {/* Rest of dashboard content */}
            <div className="mt-6">
                <h2 className="text-xl font-semibold">My Courses</h2>
                <p className="text-gray-600">Course cards would appear here...</p>
            </div>
        </div>
    );
}
