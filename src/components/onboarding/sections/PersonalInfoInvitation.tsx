'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/utils/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PasswordInput } from '@/components/password-input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'nextjs-toploader/app';
import {
  User,
  UserCheck,
  Phone,
  MapPin,
  Lock,
  Shield,
  CheckCircle,
  Loader2,
  Mail,
  Users,
  Building,
  LogIn
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const formSchema = z.object({
  name: z.string().min(3, { message: 'Name is required' }).max(100),
  phone: z.string().refine((val) => /^(\+62|0)8\d{8,11}$/.test(val), {
    message: 'Phone number is invalid',
  }),
  surname: z.string().min(3, { message: 'Surname is required' }).max(100),
  username: z
    .string()
    .min(1, { message: 'Username is required' })
    .min(5, { message: 'Minimal 5 characters' })
    .max(100)
    .refine(
      async (username) => {
        const response = await fetch(`/api/user/username`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username }),
        })
        const data = await response.json()
        return !data.exists
      },
      {
        message: 'Username already used',
      },
    ),
  address: z.string().min(5, { message: 'Address is required' }).max(1000),
  password: z.string().min(5, { message: 'Password must be at least 5 characters' }).max(1000),
  confirmPassword: z.string().min(5, { message: 'Confirm password is required' }).max(1000),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type ValidationSchema = z.infer<typeof formSchema>;

interface PersonalInvitationInfoProps {
  token: string;
  isGoogleInviteEnabled: boolean;
}

interface InvitationData {
  email: string;
  organizationId: string;
  organizationName: string;
  invitedBy: {
    name?: string;
    email?: string;
    image?: string;
  } | null;
  expires: string;
  createdAt: string;
}

export default function PersonalInvitationInfo({ token, isGoogleInviteEnabled }: PersonalInvitationInfoProps) {
  const { data: session, status } = useSession();
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAcceptingOAuth, setIsAcceptingOAuth] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [hasSuccessfullyJoined, setHasSuccessfullyJoined] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Use ref to track if token validation has already run
  const hasValidatedToken = useRef(false);

  const form = useForm<ValidationSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });
  const {
    control,
    formState: { errors },
    handleSubmit,
  } = form;

  useEffect(() => {
    // Don't validate if:
    // - Already redirecting
    // - Already successfully joined
    // - Token validation already completed
    if (isRedirecting || hasSuccessfullyJoined || hasValidatedToken.current) return;

    const validateToken = async () => {
      try {
        const response = await fetch('/api/invitation/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok && data.valid) {
          setIsTokenValid(true);
          setInvitationData(data.invitation);
          hasValidatedToken.current = true;
        } else {
          setIsTokenValid(false);
          if (!hasSuccessfullyJoined && !isRedirecting) {
            toast({
              variant: 'destructive',
              title: 'Invalid Invitation',
              description: data.message || 'Invitation link is invalid or has expired.',
            });
            setTimeout(() => {
              router.replace('/');
            }, 3000);
          }
        }
      } catch (error) {
        console.error("Error validating token:", error);
        setIsTokenValid(false);
        if (!hasSuccessfullyJoined && !isRedirecting) {
          toast({
            variant: 'destructive',
            title: 'Validation Error',
            description: 'An error occurred while validating the invitation.',
          });
          setTimeout(() => {
            router.replace('/');
          }, 3000);
        }
      }
    };

    validateToken();
  }, [token, toast, router, isRedirecting, hasSuccessfullyJoined]);

  // Handle OAuth invitation acceptance
  const handleOAuthAcceptance = async () => {
    setIsAcceptingOAuth(true);
    try {
      const response = await fetch('/api/invitation/oauth-accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setHasSuccessfullyJoined(true);
        setIsRedirecting(true);
        toast({
          variant: 'default',
          title: 'Welcome aboard! 🎉',
          description: data.alreadyMember
            ? "You're already a member of this organization. Redirecting to dashboard..."
            : "Successfully joined the organization! Redirecting to dashboard...",
        });

        // Use immediate redirect instead of setTimeout to prevent re-validation
        setTimeout(() => {
          router.replace('/dashboard');
        }, 1500);
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to Join',
          description: data.message || "Failed to join organization. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error accepting OAuth invitation:", error);
      toast({
        variant: 'destructive',
        title: 'Something went wrong',
        description: "An error occurred while joining the organization.",
      });
    } finally {
      setIsAcceptingOAuth(false);
    }
  };

  const onSubmitHandler = async (values: ValidationSchema) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/organization/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...values, token }),
      });

      const data = await response.json();

      if (response.status === 409 || data.code === 'USER_ALREADY_EXISTS') {
        toast({
          variant: 'destructive',
          title: 'Already Registered',
          description: data.message || "This email is already registered. Please sign in instead.",
        });
        // Optionally redirect to sign in after a delay
        setTimeout(() => {
          router.replace('/signin');
        }, 3000);
      }

      if (data.code === 'USERNAME_TAKEN') {
        toast({
          variant: 'destructive',
          title: 'Username Taken',
          description: data.message || "This username is already taken. Please choose another one.",
        });
      }

      if (response.ok && data.success) {
        setHasSuccessfullyJoined(true);
        toast({
          variant: 'default',
          title: 'Welcome aboard! 🎉',
          description: "Registration successful. Redirecting to login...",
        });
        setTimeout(() => {
          router.replace('/signin');
        }, 2000);
      } else {
        toast({
          variant: 'destructive',
          title: 'Registration Failed',
          description: data.message || "Failed to register. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error during form submission:", error);
      toast({
        variant: 'destructive',
        title: 'Something went wrong',
        description: "An error occurred during registration.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-signout logic for authenticated users when Google invite is disabled
  useEffect(() => {
    if (!isGoogleInviteEnabled && status === 'authenticated' && session?.user && !hasSuccessfullyJoined) {
      // Show toast and redirect to signout
      toast({
        title: 'Google OAuth Disabled',
        description: 'Google OAuth invitations are disabled. Please complete manual registration.',
      });

      setTimeout(() => {
        window.location.href = `/api/auth/signout?callbackUrl=${encodeURIComponent(`/invitation?token=${token}`)}`;
      }, 2000);
    }
  }, [isGoogleInviteEnabled, status, session, token, toast, hasSuccessfullyJoined]);

  // Show loading state during redirect
  if (isRedirecting || hasSuccessfullyJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Success! 🎉
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Redirecting you to the dashboard...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isTokenValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Validating Invitation
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please wait while we verify your invitation link...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isTokenValid) {
    return null;
  }

  // Show signout message if Google invite is disabled and user is authenticated
  if (!isGoogleInviteEnabled && status === 'authenticated' && session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-orange-600 dark:text-orange-400 animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Redirecting...
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Google OAuth invitations are disabled. Signing you out to complete manual registration...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show OAuth flow if user is already logged in AND Google invite is enabled
  if (status === 'authenticated' && session?.user && invitationData && isGoogleInviteEnabled) {
    const isCorrectEmail = session.user.email === invitationData.email;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">Join {invitationData.organizationName}</CardTitle>
                  <CardDescription className="text-blue-100 mt-1">
                    You are already signed in!
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardHeader className="text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-green-800 dark:text-green-200">
                    You have been invited!
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Join {invitationData.organizationName} and start collaborating
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8">
              {/* Inviter Information */}
              {invitationData.invitedBy && (
                <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Invited by:
                  </p>
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12">
                      {invitationData.invitedBy.image ? (
                        <AvatarImage src={invitationData.invitedBy.image} alt={invitationData.invitedBy.name || 'User'} />
                      ) : null}
                      <AvatarFallback className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                        {invitationData.invitedBy.name
                          ? invitationData.invitedBy.name.charAt(0).toUpperCase()
                          : invitationData.invitedBy.email?.charAt(0).toUpperCase() || 'U'
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {invitationData.invitedBy.name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {invitationData.invitedBy.email}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Invitation method: <span className="font-medium text-gray-700 dark:text-gray-300">Google OAuth</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Action Section */}
              <div className="space-y-6">
                {isCorrectEmail ? (
                  <div className="space-y-4">
                    {/* Email Verification Status */}
                    <div className="flex items-center justify-center space-x-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        Email verified: {session.user.email}
                      </span>
                    </div>

                    {/* Join Button */}
                    <Button
                      onClick={handleOAuthAcceptance}
                      disabled={isAcceptingOAuth}
                      size="lg"
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {isAcceptingOAuth ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Joining Organization...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Join {invitationData.organizationName}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Email Mismatch Warning */}
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-orange-600 dark:text-orange-400 text-xs font-bold">!</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-1">
                            Email Mismatch
                          </h4>
                          <p className="text-sm text-orange-700 dark:text-orange-300">
                            You are signed in as <code className="px-1 py-0.5 bg-orange-100 dark:bg-orange-900/40 rounded text-xs">{session.user.email}</code> but this invitation is for <code className="px-1 py-0.5 bg-orange-100 dark:bg-orange-900/40 rounded text-xs">{invitationData.email}</code>.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid gap-3">
                      <Button
                        onClick={() => signIn('google', {
                          callbackUrl: `/invitation?token=${token}`,
                        })}
                        size="lg"
                        variant="outline"
                        className="w-full border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign in with correct email
                      </Button>

                      <Button
                        onClick={() => {
                          window.location.href = `/api/auth/signout?callbackUrl=${encodeURIComponent(`/invitation?token=${token}`)}`;
                        }}
                        size="lg"
                        variant="ghost"
                        className="w-full hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Sign out and register manually
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show loading if session is loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-gray-600">Checking authentication...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show registration form ONLY for non-authenticated users OR when Google invite is disabled
  // This ensures users who clicked "Continue with Google" won't see the form again
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Join {invitationData?.organizationName || 'Our Organization'}</CardTitle>
                <CardDescription className="text-blue-100 mt-1">
                  Complete your profile to get started
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            {/* OAuth Options - Only show if Google invite is enabled AND user is not authenticated */}
            {isGoogleInviteEnabled && status !== 'authenticated' && (
              <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-center">
                  Quick Sign Up
                </h4>
                <Button
                  onClick={() => signIn('google', {
                    callbackUrl: `/invitation?token=${token}`
                  })}
                  variant="outline"
                  className="w-full mb-4"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </Button>
              </div>
            )}

            {/* Welcome Message */}
            <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                  <Mail className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-800 dark:text-green-200">
                    You&apos;ve been invited!
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Please fill out the form below to complete your registration.
                  </p>

                  {invitationData?.invitedBy && (
                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        The account that invited you:
                      </p>
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6">
                          {invitationData.invitedBy.image ? (
                            <AvatarImage src={invitationData.invitedBy.image} />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {invitationData.invitedBy.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {invitationData.invitedBy.name || 'Unknown User'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Registration Form - Only show for manual registration */}
            {!isGoogleInviteEnabled && (
              <Form {...form}>
                <form className="space-y-6" onSubmit={handleSubmit(onSubmitHandler)}>
                  {/* Personal Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <User className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Personal Information
                      </h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Name Field */}
                      <FormField
                        control={control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-300 font-medium flex items-center space-x-2">
                              <User className="w-4 h-4" />
                              <span>First Name</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                className={cn(
                                  'h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                  'placeholder:text-gray-400 border-gray-300 dark:border-gray-600',
                                  {
                                    'border-red-500 focus:ring-red-500 focus:border-red-500': errors.name?.message,
                                  },
                                )}
                                placeholder="Enter your first name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-sm" />
                          </FormItem>
                        )}
                      />

                      {/* Surname Field */}
                      <FormField
                        control={control}
                        name="surname"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-300 font-medium flex items-center space-x-2">
                              <User className="w-4 h-4" />
                              <span>Last Name</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                className={cn(
                                  'h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                  'placeholder:text-gray-400 border-gray-300 dark:border-gray-600',
                                  {
                                    'border-red-500 focus:ring-red-500 focus:border-red-500': errors.surname?.message,
                                  },
                                )}
                                placeholder="Enter your last name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-sm" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Username Field */}
                      <FormField
                        control={control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-300 font-medium flex items-center space-x-2">
                              <UserCheck className="w-4 h-4" />
                              <span>Username</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                className={cn(
                                  'h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                  'placeholder:text-gray-400 border-gray-300 dark:border-gray-600',
                                  {
                                    'border-red-500 focus:ring-red-500 focus:border-red-500': errors.username?.message,
                                  },
                                )}
                                placeholder="Choose a unique username"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-sm" />
                          </FormItem>
                        )}
                      />

                      {/* Phone Number Field */}
                      <FormField
                        control={control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-300 font-medium flex items-center space-x-2">
                              <Phone className="w-4 h-4" />
                              <span>Phone Number</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                className={cn(
                                  'h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                  'placeholder:text-gray-400 border-gray-300 dark:border-gray-600',
                                  {
                                    'border-red-500 focus:ring-red-500 focus:border-red-500': errors.phone?.message,
                                  },
                                )}
                                placeholder="+62 812-3456-7890"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-sm" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Address Field */}
                    <FormField
                      control={control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300 font-medium flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>Address</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              className={cn(
                                'min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                'placeholder:text-gray-400 border-gray-300 dark:border-gray-600 resize-none',
                                {
                                  'border-red-500 focus:ring-red-500 focus:border-red-500': errors.address?.message,
                                },
                              )}
                              placeholder="Enter your complete address"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-red-500 text-sm" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator className="my-6" />

                  {/* Security Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Account Security
                      </h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Password Field */}
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-300 font-medium flex items-center space-x-2">
                              <Lock className="w-4 h-4" />
                              <span>Password</span>
                            </FormLabel>
                            <FormControl>
                              <PasswordInput
                                className={cn(
                                  'h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                  {
                                    'border-red-500 focus:ring-red-500 focus:border-red-500': errors.password?.message,
                                  },
                                )}
                                placeholder="Create a secure password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-sm" />
                          </FormItem>
                        )}
                      />

                      {/* Confirm Password Field */}
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-300 font-medium flex items-center space-x-2">
                              <Lock className="w-4 h-4" />
                              <span>Confirm Password</span>
                            </FormLabel>
                            <FormControl>
                              <PasswordInput
                                className={cn(
                                  'h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                  {
                                    'border-red-500 focus:ring-red-500 focus:border-red-500': errors.confirmPassword?.message,
                                  },
                                )}
                                placeholder="Confirm your password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-sm" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Password Requirements */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                        Password Requirements:
                      </h4>
                      <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3" />
                          <span>At least 5 characters long</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3" />
                          <span>Both passwords must match</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={cn(
                        'w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
                        'text-white font-semibold rounded-lg transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'flex items-center justify-center space-x-2'
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-5 h-5" />
                          <span>Complete Registration</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Footer Note */}
                  <div className="text-center pt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      By completing registration, you agree to join the organization and
                      accept the terms of service.
                    </p>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Additional Help Card */}
        <Card className="mt-6 border-0 bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  Need Help?
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  If you encounter any issues during registration, please contact your organization administrator.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}