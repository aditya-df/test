"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface FormErrors {
  name?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export const TrialSignUp = () => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [trialData, setTrialData] = useState<any>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [passwordStrength, setPasswordStrength] = useState<number>(0);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    useEffect(() => {
        if (!token) {
            setError("Invalid trial invitation link");
            setLoading(false);
            return;
        }
        validateTrialToken();
    }, [token]);

    const validateTrialToken = async () => {
        try {
            const response = await fetch("/api/trial/validate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ token }),
            });

            if (response.ok) {
                const data = await response.json();
                setTrialData(data);
                setFormData((prev) => ({ ...prev, email: data.email }));
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Invalid trial token");
            }
        } catch (error) {
            setError(`Failed to validate trial invitation: ${error}`);
        } finally {
            setLoading(false);
        }
    };
    const calculatePasswordStrength = (password: string): number => {
        let strength = 0;
        if (password.length >= 8) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        return strength;
    };

    const validateForm = (): boolean => {
        const errors: FormErrors = {};

        if (!formData.name.trim()) {
            errors.name = "Full name is required";
        } else if (formData.name.trim().length < 2) {
            errors.name = "Name must be at least 2 characters";
        }

        if (!formData.password) {
            errors.password = "Password is required";
        } else if (formData.password.length < 6) {
            errors.password = "Password must be at least 6 characters";
        }

        if (!formData.confirmPassword) {
            errors.confirmPassword = "Please confirm your password";
        } else if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = "Passwords do not match";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));

        // Clear specific field error when user starts typing
        if (formErrors[field as keyof FormErrors]) {
            setFormErrors((prev) => ({ ...prev, [field]: undefined }));
        }

        // Update password strength
        if (field === "password") {
            setPasswordStrength(calculatePasswordStrength(value));
        }

        // Clear general error
        if (error) setError("");
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            // Step 1: Create trial user account
            console.log("🔄 Creating trial user account...");
            const response = await fetch("/api/auth/trial-signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...formData,
                    trialToken: token,
                    trialDays: trialData.trialDays,
                }),
            });

            if (response.ok) {
                console.log("✅ Trial account created successfully");

                // Step 2: Sign in the user
                console.log("🔄 Signing in user...");
                const result = await signIn("credentials", {
                    email: formData.email,
                    password: formData.password,
                    redirect: false,
                });

                if (result?.ok) {
                    console.log("✅ User signed in successfully");

                    // Step 3: Automatically mark invitation as used
                    console.log("🔄 Marking invitation as used...");
                    try {
                        const markUsedResponse = await fetch(
                            `https://knowgen-ai-dev.metrodata.web.id/key/api/invitations/mark-used/`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                token,
                                userEmail: formData.email
                            }),
                        });

                        if (markUsedResponse.ok) {
                            const markUsedData = await markUsedResponse.json();
                            console.log("✅ Invitation marked as used successfully:", markUsedData);

                            // Success - proceed to onboarding
                            setError("");
                            setTimeout(() => {
                                router.push("/onboarding");
                            }, 1000);
                        } else {
                            const errorData = await markUsedResponse.json();
                            console.error("⚠️ Failed to mark invitation as used:", errorData);

                            // Still proceed to onboarding even if marking fails
                            // (User account was created successfully)
                            setTimeout(() => {
                                router.push("/onboarding");
                            }, 1000);
                        }
                    } catch (markError) {
                        console.error("❌ Error marking invitation as used:", markError);

                        // Still proceed to onboarding even if marking fails
                        // (User account was created successfully)
                        setTimeout(() => {
                            router.push("/onboarding");
                        }, 1000);
                    }
                } else {
                    console.error("❌ Failed to sign in after account creation");
                    setError(
                        "Failed to sign in after account creation. Please try signing in manually."
                    );
                }
            } else {
                const errorData = await response.json();
                console.error("❌ Failed to create trial account:", errorData);
                setError(errorData.error || "Failed to create account");
            }
        } catch (error) {
            console.error("❌ Error in trial signup process:", error);
            setError(`Failed to create trial account: ${error}`);
        } finally {
            setSubmitting(false);
        }
    };

    const getPasswordStrengthColor = (strength: number): string => {
        if (strength <= 1) return "bg-red-500";
        if (strength <= 2) return "bg-orange-500";
        if (strength <= 3) return "bg-yellow-500";
        if (strength <= 4) return "bg-blue-500";
        return "bg-green-500";
    };

    const getPasswordStrengthText = (strength: number): string => {
        if (strength <= 1) return "Very Weak";
        if (strength <= 2) return "Weak";
        if (strength <= 3) return "Fair";
        if (strength <= 4) return "Good";
        return "Strong";
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Validating Invitation
                    </h2>
                    <p className="text-gray-600">
                        Please wait while we verify your trial invitation...
                    </p>
                </div>
            </div>
        );
    }

    if (error && !trialData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
                <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
                    <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Invalid Invitation
                    </h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => router.push("/")}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Go to Homepage
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
            <div className="max-w-md w-full">
                {/* Header Card */}
                <div className="bg-white rounded-t-2xl shadow-lg p-6 text-center">
                    {/* <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div> */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Welcome to KnowgenAI!
                    </h1>
                    <p className="text-gray-600 mb-4">
                        Complete your account setup to start your {trialData?.trialDays}-day
                        free trial
                    </p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800 font-medium">
                            🎉 {trialData?.trialDays} days of full access included
                        </p>
                    </div>
                </div>

                {/* Features Preview - MOVED HERE
          <div className="bg-white shadow-lg px-8 py-6 border-t border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              What's included in your trial:
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                <span>Full access to all premium features</span>
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                <span>Unlimited AI-powered content generation</span>
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                <span>Priority customer support</span>
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                <span>Advanced analytics and reporting</span>
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                <span>No credit card required</span>
              </div>
            </div>
          </div> */}

                {/* Form Card */}
                <div className="bg-white rounded-b-2xl shadow-lg p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-6">
                        {/* Email Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                disabled
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-600 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                This email was pre-selected from your invitation
                            </p>
                        </div>

                        {/* Name Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange("name", e.target.value)}
                                className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${formErrors.name
                                    ? "border-red-300 bg-red-50"
                                    : "border-gray-300"
                                    }`}
                                placeholder="Enter your full name"
                                required
                            />
                            {formErrors.name && (
                                <p className="text-sm text-red-600 mt-1 flex items-center">
                                    <XCircle className="h-4 w-4 mr-1" />
                                    {formErrors.name}
                                </p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password *
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) =>
                                        handleInputChange("password", e.target.value)
                                    }
                                    className={`w-full border rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${formErrors.password
                                        ? "border-red-300 bg-red-50"
                                        : "border-gray-300"
                                        }`}
                                    placeholder="Create a secure password"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>

                            {formData.password && (
                                <div className="mt-2">
                                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                        <span>Password strength:</span>
                                        <span
                                            className={`font-medium ${passwordStrength >= 4
                                                ? "text-green-600"
                                                : passwordStrength >= 3
                                                    ? "text-blue-600"
                                                    : passwordStrength >= 2
                                                        ? "text-yellow-600"
                                                        : "text-red-600"
                                                }`}
                                        >
                                            {getPasswordStrengthText(passwordStrength)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all ${getPasswordStrengthColor(
                                                passwordStrength
                                            )}`}
                                            style={{ width: `${(passwordStrength / 5) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {formErrors.password && (
                                <p className="text-sm text-red-600 mt-1 flex items-center">
                                    <XCircle className="h-4 w-4 mr-1" />
                                    {formErrors.password}
                                </p>
                            )}
                        </div>

                        {/* Confirm Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password *
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={formData.confirmPassword}
                                    onChange={(e) =>
                                        handleInputChange("confirmPassword", e.target.value)
                                    }
                                    className={`w-full border rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${formErrors.confirmPassword
                                        ? "border-red-300 bg-red-50"
                                        : "border-gray-300"
                                        }`}
                                    placeholder="Confirm your password"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>

                            {formData.confirmPassword && formData.password && (
                                <div className="mt-1 flex items-center text-sm">
                                    {formData.password === formData.confirmPassword ? (
                                        <div className="flex items-center text-green-600">
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            <span>Passwords match</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center text-red-600">
                                            <XCircle className="h-4 w-4 mr-1" />
                                            <span>Passwords don&apos;t match</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {formErrors.confirmPassword && (
                                <p className="text-sm text-red-600 mt-1 flex items-center">
                                    <XCircle className="h-4 w-4 mr-1" />
                                    {formErrors.confirmPassword}
                                </p>
                            )}
                        </div>

                        {/* Terms and Privacy */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-xs text-gray-600">
                                By creating an account, you agree to our{" "}
                                <Link href="/terms" className="text-blue-600 hover:underline">
                                    Terms of Service
                                </Link>{" "}
                                and{" "}
                                <Link href="/privacy" className="text-blue-600 hover:underline">
                                    Privacy Policy
                                </Link>
                                . Your trial will automatically expire in {trialData?.trialDays}{" "}
                                days.
                            </p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={
                                submitting ||
                                !formData.name ||
                                !formData.password ||
                                !formData.confirmPassword
                            }
                            className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center ${submitting ||
                                !formData.name ||
                                !formData.password ||
                                !formData.confirmPassword
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                }`}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                    Creating Your Account...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-5 w-5 mr-2" />
                                    Start My Free Trial
                                </>
                            )}
                        </button>

                        {/* Additional Info */}
                        <div className="text-center">
                            <p className="text-sm text-gray-500">
                                Already have an account?{" "}
                                <Link
                                    href="/signin"
                                    className="text-blue-600 hover:underline font-medium"
                                >
                                    Sign in here
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>

                {/* Trust Indicators - Moved to bottom */}
                <div className="mt-6 text-center">
                    <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
                        <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span>Secure & Encrypted</span>
                        </div>
                        {/* <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                <span>Cancel Anytime</span>
              </div> */}
                    </div>
                </div>
            </div>
        </div>
    );
}
