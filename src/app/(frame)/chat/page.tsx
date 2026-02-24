import { Metadata } from "next"
import { env } from "@/env.mjs"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
// import { Chat } from "@/components/chat/chat";
import { Chatbotv3embedable } from "@/components/chat/chatbot-embeddable";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: "Chat",
  description: "Chat with our AI",
}

async function getAgentData(token: string) {

  console.log("getAgentData token = ", token);

  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL_LOCAL}agent/sdk/${token}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    cache: 'no-store'
  })

  console.log("getAgentData response = ", response);

  if (!response.ok) {
    console.error(`Agent data fetch failed: ${response.status} ${response.statusText}`);
    const errorText = await response.text();
    console.error("Error response:", errorText);
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()
  console.log("response >>>", result)
  
  // Check if the response contains an error (for session token validation failures)
  if (result.error) {
    console.error("Agent data error:", result.error);
    throw new Error(result.error);
  }
  
  return result.data
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams;
  
  if (!resolvedSearchParams.token) {
    return <InvalidTokenView />
  }

  try {
    const agentData = await getAgentData(resolvedSearchParams.token as string)

    if (!agentData) {
      return <InvalidTokenView />
    }

    return <Chatbotv3embedable token={resolvedSearchParams.token as string} initialMessages={[]} />
  } catch (error) {
    console.error("Error fetching agent data:", error)
    return <InvalidTokenView />
  }
}

function InvalidTokenView() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <Card className="max-sm:flex max-sm:h-screen max-sm:w-full max-sm:flex-col max-sm:items-center max-sm:justify-center max-sm:rounded-none max-sm:border-none sm:min-w-[370px] sm:max-w-[368px]">
        <CardHeader>
          <CardTitle>Invalid Token</CardTitle>
          <CardDescription>
            Please provide correct token and try again
          </CardDescription>
        </CardHeader>
        {/* <CardContent>
          <Link
            aria-label="Go back to sign in page"
            href="/signin"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "w-full"
            )}
          >
            <Icons.arrowLeft className="mr-2 size-4" />
            <span className="sr-only">Try again</span>
            Try again
          </Link>
        </CardContent> */}
      </Card>
    </div>
  )
}
