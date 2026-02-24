import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const text = await req.text();
        // const apiKey = process.env.GOOGLE_CONSENT_SECRET;
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        const endpoint = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${apiKey}`;

        if (!text) {
            return NextResponse.json({ error: 'No text provided' }, { status: 400 });
        }

        const payload = {
            "audioConfig": {
                "audioEncoding": "MP3",
                "effectsProfileId": [
                    "small-bluetooth-speaker-class-device"
                ],
                "pitch": 0,
                "speakingRate": 1
            },
            "input": {
                "text": text
            },
            "voice": {
                "languageCode": "id-ID",
                "name": "id-ID-Standard-C"
            }
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Google TTS API error:', errorData);
            return NextResponse.json(
                { error: 'Text-to-speech service error' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Verify audioContent exists in the response
        if (!data.audioContent) {
            console.error('No audio content in response:', data);
            return NextResponse.json(
                { error: 'No audio content in response' },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Synthesize text to speech:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to synthesize text to speech' },
            { status: 500 }
        );
    }
}