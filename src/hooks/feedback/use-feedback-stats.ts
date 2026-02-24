// src\hooks\feedback\use-feedback-stats.ts
"use client";

import { useState, useEffect, useCallback } from "react";

interface FeedbackStats {
    totalFeedback: number;
    likes: number;
    dislikes: number;
    satisfactionPercentage: number;
    avgRating: number;
    recentFeedback: {
        total: number;
        likes: number;
        dislikes: number;
        satisfactionPercentage: number;
    };
    trend: number;
    organizationId?: string;
    organizationUserCount?: number;
}

interface UseFeedbackStatsReturn {
    feedbackStats: FeedbackStats | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useFeedbackStats(): UseFeedbackStatsReturn {
    const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFeedbackStats = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch('/api/chat/feedback/stats');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                setFeedbackStats(result.data);
            } else {
                throw new Error(result.error || 'Failed to fetch feedback stats');
            }
        } catch (err) {
            console.error('Error fetching feedback stats:', err);
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
            // Set default values on error
            setFeedbackStats({
                totalFeedback: 0,
                likes: 0,
                dislikes: 0,
                satisfactionPercentage: 0,
                avgRating: 0,
                recentFeedback: {
                    total: 0,
                    likes: 0,
                    dislikes: 0,
                    satisfactionPercentage: 0,
                },
                trend: 0,
                organizationId: undefined,
                organizationUserCount: 0,
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFeedbackStats();
    }, [fetchFeedbackStats]);

    return {
        feedbackStats,
        isLoading,
        error,
        refetch: fetchFeedbackStats,
    };
}