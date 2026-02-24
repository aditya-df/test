import { getAuthSession } from "@/utils/auth-utils-server";

export async function GET(request: Request, { params }: { params: Promise<{ bucketName: string }> }) {
    const { bucketName } = await params;
    const session = await getAuthSession();

    if (!session?.user.backendToken) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL_V2}/document/get-document-from-gcs/${bucketName}`,
            {
                headers: {
                    "Authorization": `Bearer ${session.user.backendToken}`,
                },
            }
        );

        if (!response.ok) {
            return new Response('Document not found', { status: 404 });
        }

        return response
    } catch (error) {
        console.error('Error fetching document:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}