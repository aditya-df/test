'use client'
import { cn } from "@/utils/utils";
import { ChatBubbleAvatar } from "../ui/chat/chat-bubble";
import { useAuth } from "@/utils/auth-utils-client";

interface UserAvatarProps {
    className?: string | null;
}

// Enhanced UserAvatar component that handles Gmail pictures and colored initials
export const UserAvatar = ({ className }: UserAvatarProps) => {
    const session = useAuth()
    const getColorForUser = (name: string) => {
        const colors = [
            "bg-blue-100 text-blue-700",
            "bg-green-100 text-green-700",
            "bg-purple-100 text-purple-700",
            "bg-yellow-100 text-yellow-700",
            "bg-pink-100 text-pink-700",
            "bg-indigo-100 text-indigo-700",
            "bg-red-100 text-red-700",
            "bg-orange-100 text-orange-700",
            "bg-teal-100 text-teal-700",
        ];

        // Use the character code of the first letter to pick a color
        const charCode = name.charCodeAt(0) || 65;
        return colors[charCode % colors.length];
    };

    const getInitials = (name: string | undefined, email: string | undefined) => {
        if (name) {
            const nameParts = name.trim().split(' ');
            if (nameParts.length >= 2) {
                return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
            }
            return name.substring(0, 2).toUpperCase();
        }

        if (email) {
            const emailName = email.split('@')[0];
            return emailName.substring(0, 2).toUpperCase();
        }

        return 'U'; // Default fallback
    };

    const displayName = session.user?.name || (session.user?.email)?.split('@')[0] || 'User';
    const initials = getInitials(session.user?.name || undefined, session.user?.email || undefined);
    const colorClass = getColorForUser(displayName);

    // If user has a profile image (Gmail picture), use it
    if (session.user?.image) {
        return (
            <div className={cn("relative", className)}>
                <img
                    src={session.user?.image}
                    alt={`${displayName}'s avatar`}
                    className="w-full h-full rounded-full object-cover border border-zinc-300 dark:border-zinc-600"
                    onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) {
                            fallback.style.display = 'flex';
                        }
                    }}
                />
                {/* Fallback initials avatar (hidden by default) */}
                <div
                    className={cn(
                        "absolute inset-0 w-full h-full rounded-full flex items-center justify-center text-sm font-medium border border-zinc-300 dark:border-zinc-600",
                        colorClass
                    )}
                    style={{ display: 'none' }}
                >
                    {initials}
                </div>
            </div>
        );
    }

    // Fallback to colored initials avatar
    return (
        <ChatBubbleAvatar
            role="user"
            className={cn(
                "border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-full",
                className
            )}
        />
    );
};