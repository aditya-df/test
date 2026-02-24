import { Data } from "@/stores/users/model";

export const getUserOnboardingStatus = async (email: string) => {
  try {
    // Fetch user details using email
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/onboarding/${email}`,
      {
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
          // Add any authentication headers if needed
        },
      }
    );

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const result = await response.json();
    const data: Data = result.data;

    // Check if the user has completed onboarding
    const hasOnboarded = data?.onboardingCompleted;
    const hasVerify = data?.isVerified;

    return { hasOnboarded, data, hasVerify };
  } catch (error) {
    console.error("Error fetching user onboarding status:", error);
    return { hasOnboarded: false, data: null, hasVerify: false };
  }
};
