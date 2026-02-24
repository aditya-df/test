// src/components/theme-error-boundary.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ThemeErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

interface ThemeErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ComponentType<{
        error: Error;
        resetError: () => void;
    }>;
}

class ThemeErrorBoundary extends React.Component<
    ThemeErrorBoundaryProps,
    ThemeErrorBoundaryState
> {
    constructor(props: ThemeErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ThemeErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Theme Error Boundary caught an error:', error, errorInfo);
    }

    resetError = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError && this.state.error) {
            const FallbackComponent = this.props.fallback || DefaultErrorFallback;
            return (
                <FallbackComponent
                    error={this.state.error}
                    resetError={this.resetError}
                />
            );
        }

        return this.props.children;
    }
}

const DefaultErrorFallback: React.FC<{
    error: Error;
    resetError: () => void;
}> = ({ error, resetError }) => (
    <div className="flex items-center justify-center min-h-[200px] p-4">
        <div className="text-center space-y-4">
            <div className="flex justify-center">
                <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <div className="space-y-2">
                <h3 className="text-lg font-semibold">Theme Error</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                    There was an error loading the theme system. This might be due to
                    corrupted theme data or a network issue.
                </p>
                {process.env.NODE_ENV === 'development' && (
                    <details className="text-xs text-left bg-muted p-2 rounded">
                        <summary className="cursor-pointer">Error Details</summary>
                        <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
                    </details>
                )}
            </div>
            <div className="flex gap-2 justify-center">
                <Button onClick={resetError} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                </Button>
                <Button
                    onClick={() => {
                        localStorage.removeItem('theme-storage');
                        window.location.reload();
                    }}
                    variant="destructive"
                    size="sm"
                >
                    Reset Themes
                </Button>
            </div>
        </div>
    </div>
);

export default ThemeErrorBoundary;