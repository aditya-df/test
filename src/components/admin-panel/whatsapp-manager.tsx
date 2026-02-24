'use client'

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

// Define types for better type safety
type BotStatus = 'disconnected' | 'initializing' | 'ready' | 'error';

interface WhatsAppStatusResponse {
    status: string;
    qr?: string;
    info?: any;
    error?: string;
    isScanned?: boolean;
    phoneNumber?: string;
    lastUpdated?: string;
}

interface SendMessageResponse {
    success?: boolean;
    error?: string;
}

export default function WhatsAppManager() {
    // Add proper type annotations to fix the TypeScript errors
    const [status, setStatus] = useState<BotStatus>('disconnected');
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [recipient, setRecipient] = useState<string>('');
    const [logs, setLogs] = useState<string[]>([]); // This fixes the main error!
    const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');

    const checkStatus = async (): Promise<WhatsAppStatusResponse | null> => {
        try {
            const response = await fetch('/api/whatsapp');
            const data: WhatsAppStatusResponse = await response.json();
            setStatus(data.status as BotStatus);
            
            // Generate QR code if available
            if (data.qr && data.status === 'initializing') {
                try {
                    const qrDataURL = await QRCode.toDataURL(data.qr, {
                        width: 256,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    });
                    setQrCodeDataURL(qrDataURL);
                } catch (qrError) {
                    console.error('Error generating QR code:', qrError);
                }
            } else if (data.status === 'ready') {
                setQrCodeDataURL(''); // Clear QR code when ready
            }
            
            return data;
        } catch (error) {
            console.error('Error checking status:', error);
            setStatus('error');
            return null;
        }
    };

    const sendMessage = async (): Promise<void> => {
        if (!message || !recipient) return;

        setLoading(true);
        try {
            const response = await fetch('/api/whatsapp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: recipient,
                    message: message
                })
            });

            const data: SendMessageResponse = await response.json();

            if (data.success) {
                setLogs(prev => [...prev, `✅ Sent to ${recipient}: ${message}`]);
                setMessage('');
            } else {
                setLogs(prev => [...prev, `❌ Error: ${data.error || 'Unknown error'}`]);
            }
        } catch (error: any) {
            setLogs(prev => [...prev, `❌ Error: ${error.message || 'Network error'}`]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (): string => {
        switch (status) {
            case 'ready': return 'text-green-600';
            case 'initializing': return 'text-yellow-600';
            case 'error': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                    WhatsApp Bot Manager
                </h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`font-semibold ${getStatusColor()}`}>
                        {status.toUpperCase()}
                    </span>
                    {status === 'initializing' && !qrCodeDataURL && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                </div>
            </div>

            {status === 'initializing' && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 mb-4">
                        🔄 Bot is initializing... Scan the QR code below with WhatsApp.
                    </p>
                    {qrCodeDataURL ? (
                        <div className="flex flex-col items-center">
                            <img 
                                src={qrCodeDataURL} 
                                alt="WhatsApp QR Code" 
                                className="border-2 border-gray-300 rounded-lg"
                            />
                            <p className="text-sm text-gray-600 mt-2 text-center">
                                Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
                            </p>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
                        </div>
                    )}
                </div>
            )}

            {status === 'ready' && (
                <div className="mb-6">
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800">
                            ✅ Bot is connected and ready to send messages!
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Recipient (phone number with country code, e.g., 1234567890@c.us)
                            </label>
                            <input
                                type="text"
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="1234567890@c.us"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Message
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="Enter your message here..."
                            />
                        </div>

                        <button
                            onClick={sendMessage}
                            disabled={loading || !message || !recipient}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Sending...' : 'Send Message'}
                        </button>
                    </div>
                </div>
            )}

            {logs.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Logs</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                        {logs.map((log, index) => (
                            <div key={index} className="text-sm text-gray-700 mb-1">
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Bot Commands:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Send <code className="bg-blue-100 px-1 rounded">!ping</code> to get a &quot;pong&quot; response</li>
                    <li>• Send <code className="bg-blue-100 px-1 rounded">!help</code> to see available commands</li>
                    <li>• The bot automatically responds to messages in WhatsApp</li>
                </ul>
            </div>
        </div>
    );
}