import { redirect } from "next/navigation";

interface LandingPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
  // Await searchParams since it's now a Promise in Next.js 15
  const params = await searchParams;

  // Check if there are any query parameters
  const hasParams = Object.keys(params).length > 0;

  if (hasParams) {
    // Convert params to URLSearchParams to preserve all parameters
    const urlParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          // Handle array values by adding each item
          value.forEach(item => urlParams.append(key, item));
        } else {
          urlParams.append(key, value);
        }
      }
    });

    // Redirect to OAuth callback with all parameters preserved
    redirect(`/oauth/callback?${urlParams.toString()}`);
  }

  // No parameters exist, redirect to signin
  redirect("/signin");
}