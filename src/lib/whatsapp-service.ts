/* eslint-disable @typescript-eslint/no-unused-vars */

// lib/whatsapp-service.ts - Fixed version with proper exports
import { Client, Message, LocalAuth } from 'whatsapp-web.js';
import puppeteer, { Browser } from 'puppeteer';
import qrcode from 'qrcode-terminal';
import { prisma } from "@/config/db";
import { WhatsAppWebSocketManager } from "./whatsapp-websocket";
import path from 'path';

interface WhatsAppServiceStatus {
    isReady: boolean;
    qr: string | null;
    info: any | null;
    error?: string;
    isInitializing?: boolean;
    agentId?: string;
}

interface AgentClient {
    client: Client | null;
    browser: Browser | null;
    qrCode: string | null;
    isReady: boolean;
    isInitializing: boolean;
    initializationError: string | null;
    info: any | null;
}

const DEFAULT_WHATSAPP_ENABLED = process.env.NEXT_PUBLIC_USING_WHATSAPP === 'false' ? false : true;

export class WhatsAppService {
    private static instance: WhatsAppService;
    private static WHATSAPP_ENABLED = DEFAULT_WHATSAPP_ENABLED; // Changed to true to enable WhatsApp
    private agentClients: Map<string, AgentClient>;

    // Legacy properties for backward compatibility
    private client: Client | null;
    private browser: Browser | null;
    private qrCode: string | null;
    private isReady: boolean;
    private isInitializing: boolean;
    private initializationError: string | null;

    // Method to logout a specific agent or all agents
    // Method to disconnect WhatsApp client(s)
    async disconnect(agentId?: string): Promise<void> {
        if (agentId) {
            // Disconnect specific agent
            const agentClient = this.agentClients.get(agentId);
            if (agentClient?.client) {
                try {
                    await agentClient.client.destroy();
                    console.log(`✅ Disconnected WhatsApp client for agent ${agentId}`);

                    // Close browser if it exists
                    if (agentClient.browser) {
                        await agentClient.browser.close();
                        console.log(`✅ Closed browser for agent ${agentId}`);
                    }

                    // Reset agent client
                    this.agentClients.set(agentId, {
                        client: null,
                        browser: null,
                        qrCode: null,
                        isReady: false,
                        isInitializing: false,
                        initializationError: null,
                        info: null
                    });
                } catch (error) {
                    console.error(`❌ Error disconnecting client for agent ${agentId}:`, error);
                }
            }
        } else {
            // Disconnect legacy client
            if (this.client) {
                try {
                    await this.client.destroy();
                    console.log('✅ Disconnected legacy WhatsApp client');
                } catch (error) {
                    console.error('❌ Error disconnecting legacy client:', error);
                }
                this.client = null;
            }

            // Close legacy browser
            if (this.browser) {
                try {
                    await this.browser.close();
                    console.log('✅ Closed legacy browser');
                } catch (error) {
                    console.error('❌ Error closing legacy browser:', error);
                }
                this.browser = null;
            }

            // Disconnect all agent clients
            for (const [id, agentClient] of this.agentClients.entries()) {
                if (agentClient.client) {
                    try {
                        await agentClient.client.destroy();
                        console.log(`✅ Disconnected WhatsApp client for agent ${id}`);
                    } catch (error) {
                        console.error(`❌ Error disconnecting client for agent ${id}:`, error);
                    }
                }

                // Close browser if it exists
                if (agentClient.browser) {
                    try {
                        await agentClient.browser.close();
                        console.log(`✅ Closed browser for agent ${id}`);
                    } catch (error) {
                        console.error(`❌ Error closing browser for agent ${id}:`, error);
                    }
                }

                // Reset agent client
                this.agentClients.set(id, {
                    client: null,
                    browser: null,
                    qrCode: null,
                    isReady: false,
                    isInitializing: false,
                    initializationError: null,
                    info: null
                });
            }
        }
    }

    // Method to logout a specific agent or all agents
    async logout(agentId?: string): Promise<void> {
        if (agentId) {
            // Logout specific agent
            const agentClient = this.agentClients.get(agentId);
            if (agentClient?.client) {
                try {
                    await agentClient.client.logout();
                    console.log(`✅ Logged out WhatsApp client for agent ${agentId}`);

                    // Update agent status
                    agentClient.isReady = false;
                    agentClient.qrCode = null;

                    // Clear phone number in database
                    await prisma.agent.update({
                        where: { id: agentId },
                        data: { phoneNumber: null }
                    });
                    console.log(`✅ Cleared phone number for agent ${agentId}`);

                    // Broadcast logout status to WebSocket clients for this agent
                    const whatsappManager = WhatsAppWebSocketManager.getInstance();
                    whatsappManager.broadcastWhatsAppUpdate({
                        status: 'logged_out',
                        isScanned: false,
                        lastUpdated: new Date().toISOString()
                    }, agentId);

                    // Disconnect after logout
                    await this.disconnect(agentId);
                } catch (error) {
                    console.error(`❌ Error logging out client for agent ${agentId}:`, error);
                    throw new Error(`Failed to logout: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            } else {
                console.warn(`⚠️ No active client found for agent ${agentId} to logout`);
            }
        } else {
            // Logout legacy client
            if (this.client) {
                try {
                    await this.client.logout();
                    console.log('✅ Logged out legacy WhatsApp client');
                    this.isReady = false;
                    this.qrCode = null;

                    // Disconnect after logout
                    await this.disconnect();
                } catch (error) {
                    console.error('❌ Error logging out legacy client:', error);
                    throw new Error(`Failed to logout: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            // Logout all agent clients
            const logoutPromises: Promise<void>[] = [];
            const dbUpdatePromises: Promise<any>[] = [];

            for (const [id, agentClient] of this.agentClients.entries()) {
                if (agentClient.client) {
                    logoutPromises.push(
                        agentClient.client.logout().catch(error => {
                            console.error(`❌ Error logging out client for agent ${id}:`, error);
                        })
                    );

                    // Update agent status
                    agentClient.isReady = false;
                    agentClient.qrCode = null;

                    // Clear phone number in database
                    dbUpdatePromises.push(
                        prisma.agent.update({
                            where: { id },
                            data: { phoneNumber: null }
                        }).catch(error => {
                            console.error(`❌ Error clearing phone number for agent ${id}:`, error);
                        })
                    );

                    // Broadcast logout status
                    const whatsappManager = WhatsAppWebSocketManager.getInstance();
                    whatsappManager.broadcastWhatsAppUpdate({
                        status: 'logged_out',
                        isScanned: false,
                        lastUpdated: new Date().toISOString()
                    }, id);
                }
            }

            await Promise.all([...logoutPromises, ...dbUpdatePromises]);
            console.log('✅ All WhatsApp clients logged out and phone numbers cleared');

            // Disconnect all clients after logout
            await this.disconnect();
        }
    }

    private constructor() {
        this.agentClients = new Map<string, AgentClient>();

        // Legacy properties initialization
        this.client = null;
        this.browser = null;
        this.qrCode = null;
        this.isReady = false;
        this.isInitializing = false;
        this.initializationError = null;
    }

    static getInstance(): WhatsAppService {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
    }

    async initialize(agentId?: string): Promise<void> {
        // Feature flag to disable WhatsApp
        if (!WhatsAppService.WHATSAPP_ENABLED) {
            console.log('⚠️ WhatsApp service is temporarily disabled');
            if (agentId) {
                let agentClient = this.agentClients.get(agentId);
                if (!agentClient) {
                    agentClient = {
                        client: null,
                        browser: null,
                        qrCode: null,
                        isReady: false,
                        isInitializing: false,
                        initializationError: null,
                        info: null
                    };
                    this.agentClients.set(agentId, agentClient);
                }
                agentClient.initializationError = 'WhatsApp service is temporarily disabled';
            } else {
                this.initializationError = 'WhatsApp service is temporarily disabled';
            }
            return;
        }

        // If no agentId is provided, use the legacy implementation for backward compatibility
        if (!agentId) {
            return this.initializeLegacy();
        }

        // Check if this agent already has a client
        let agentClient = this.agentClients.get(agentId);

        // Prevent multiple initialization attempts for the same agent
        if (agentClient?.client || agentClient?.isInitializing) {
            return;
        }

        // Create a new agent client if it doesn't exist
        if (!agentClient) {
            agentClient = {
                client: null,
                browser: null,
                qrCode: null,
                isReady: false,
                isInitializing: false,
                initializationError: null,
                info: null
            };
            this.agentClients.set(agentId, agentClient);
        }

        agentClient.isInitializing = true;
        agentClient.initializationError = null;

        try {
            // Launch browser for this agent
            if (!agentClient.browser) {
                try {
                    agentClient.browser = await puppeteer.launch({
                        headless: true,
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--disable-accelerated-2d-canvas',
                            '--no-first-run',
                            '--no-zygote',
                            '--single-process',
                            '--disable-gpu'
                        ],
                    });
                } catch (error) {
                    console.error('Failed to launch browser. Try running: npx puppeteer browsers install chrome');
                    const errorMessage = `Could not launch browser. Please run 'npx puppeteer browsers install chrome' to install the required browser. This is a one-time setup requirement.`;
                    console.error(errorMessage);
                    throw new Error(errorMessage);
                }
            }

            // Create unique session directory for this agent to isolate WhatsApp sessions
            const sessionPath = path.join(process.cwd(), '.wwebjs_auth', `session-${agentId}`);
            console.log(`📁 Using session path for agent ${agentId}: ${sessionPath}`);

            // Create WhatsApp client for this agent with LocalAuth for session isolation
            agentClient.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: agentId, // Unique client ID for each agent
                    dataPath: sessionPath // Separate data directory for each agent
                }),
                puppeteer: {
                    browserWSEndpoint: agentClient.browser.wsEndpoint(),
                    headless: true,
                }
            });

            // Set up event listeners with detailed logging
            agentClient.client.once('ready', async () => {
                console.log(`✅ WhatsApp client for agent ${agentId} is ready!`);
                agentClient.isReady = true;
                agentClient.qrCode = null;
                agentClient.isInitializing = false;

                try {
                    // Get phone number from client info
                    if (agentClient.client?.info?.wid?.user) {
                        const phoneNumber = agentClient.client.info.wid.user;
                        console.log(`📱 Connected phone number: ${phoneNumber} to agent ${agentId}`);
                        agentClient.info = agentClient.client.info;

                        // Update the specific agent with the phone number
                        await prisma.agent.update({
                            where: { id: agentId },
                            data: { phoneNumber: phoneNumber }
                        });
                        console.log(`✅ Updated agent ${agentId} with phone number ${phoneNumber}`);

                        // Broadcast ready status to WebSocket clients for this agent
                        const whatsappManager = WhatsAppWebSocketManager.getInstance();
                        whatsappManager.broadcastWhatsAppUpdate({
                            status: 'ready',
                            isScanned: true,
                            phoneNumber: phoneNumber,
                            lastUpdated: new Date().toISOString()
                        }, agentId);
                    }
                } catch (error) {
                    console.error(`❌ Error saving phone number to database for agent ${agentId}:`, error);
                }
            });

            agentClient.client.on('qr', (qr: string) => {
                console.log(`QR Code for agent ${agentId}:`, qr);
                agentClient.qrCode = qr;
                try {
                    qrcode.generate(qr, { small: true });

                    // Broadcast QR code update to WebSocket clients for this agent
                    const whatsappManager = WhatsAppWebSocketManager.getInstance();
                    whatsappManager.broadcastWhatsAppUpdate({
                        status: 'initializing',
                        qr: qr,
                        isScanned: false,
                        lastUpdated: new Date().toISOString()
                    }, agentId);
                } catch (error) {
                    console.error(`❌ Failed to generate QR code for agent ${agentId}:`, error);
                }
            });

            agentClient.client.on('authenticated', async () => {
                console.log(`🔒 Agent ${agentId} authenticated successfully`);

                // Broadcast authenticated status to WebSocket clients for this agent
                const whatsappManager = WhatsAppWebSocketManager.getInstance();
                whatsappManager.broadcastWhatsAppUpdate({
                    status: 'initializing',
                    isScanned: true,
                    lastUpdated: new Date().toISOString()
                }, agentId);

                // Wait for client to be fully ready to get phone number
                agentClient.client?.on('ready', async () => {
                    try {
                        if (agentClient.client?.info?.wid?.user) {
                            const phoneNumber = agentClient.client.info.wid.user;
                            console.log(`📱 Connected phone number: ${phoneNumber} to agent ${agentId}`);

                            // Update the specific agent with the phone number
                            await prisma.agent.update({
                                where: { id: agentId },
                                data: { phoneNumber: phoneNumber }
                            });
                            console.log(`✅ Updated agent ${agentId} with phone number ${phoneNumber}`);
                        }
                    } catch (error) {
                        console.error(`❌ Error saving phone number to database for agent ${agentId}:`, error);
                    } finally {
                        await prisma.$disconnect();
                    }
                });
            });

            agentClient.client.on('auth_failure', (message: string) => {
                console.error(`🚫 Authentication failed for agent ${agentId}:`, message);
                agentClient.initializationError = `Authentication failed: ${message}`;
                agentClient.isInitializing = false;
            });

            agentClient.client.on('message_create', (message: Message) => {
                console.log(`💬 New message for agent ${agentId} from ${message.from}: ${message.body}`);
                this.handleMessage(message, agentId);
            });

            agentClient.client.on('disconnected', (reason: string) => {
                console.log(`❌ Client for agent ${agentId} disconnected:`, reason);
                agentClient.isReady = false;
                agentClient.client = null;
                agentClient.isInitializing = false;
            });

            agentClient.client.on('loading_screen', (percent: number, message: string) => {
                console.log(`📱 Loading for agent ${agentId}: ${percent}% - ${message}`);
            });

            // Initialize the client
            await agentClient.client.initialize();

        } catch (error: any) {
            console.error(`💥 Failed to initialize WhatsApp client for agent ${agentId}:`);
            console.error('Error details:', error);
            console.error('Stack trace:', error.stack);

            if (agentClient) {
                agentClient.initializationError = error.message || 'Initialization failed';
                agentClient.isInitializing = false;
                agentClient.client = null;
            }

            // Provide helpful error messages
            if (error.message?.includes('Chromium')) {
                console.error('🔧 Puppeteer/Chromium issue detected. Try:');
                console.error('   npm install puppeteer');
                console.error('   or install system dependencies for your OS');
            }

            if (error.message?.includes('ECONNREFUSED')) {
                console.error('🌐 Network connectivity issue detected');
            }

            throw error;
        }
    }

    // Legacy initialization method for backward compatibility
    private async initializeLegacy(): Promise<void> {
        // Prevent multiple initialization attempts
        if (this.client || this.isInitializing) {
            return;
        }

        this.isInitializing = true;
        this.initializationError = null;

        try {
            if (!this.browser) {
                try {
                    this.browser = await puppeteer.launch({
                        headless: true,
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--disable-accelerated-2d-canvas',
                            '--no-first-run',
                            '--no-zygote',
                            '--single-process',
                            '--disable-gpu'
                        ],
                    });
                } catch (error) {
                    console.error('Failed to launch browser. Try running: npx puppeteer browsers install chrome');
                    const errorMessage = `Could not launch browser. Please run 'npx puppeteer browsers install chrome' to install the required browser. This is a one-time setup requirement.`;
                    console.error(errorMessage);
                    throw new Error(errorMessage);
                }
            }

            this.client = new Client({
                puppeteer: {
                    browserWSEndpoint: this.browser.wsEndpoint(),
                    headless: true,
                }
            });

            // Set up event listeners with detailed logging
            this.client.once('ready', async () => {
                console.log('✅ WhatsApp client is ready!');
                this.isReady = true;
                this.qrCode = null;
                this.isInitializing = false;

                try {
                    // Get phone number from client info
                    if (this.client?.info?.wid?.user) {
                        const phoneNumber = this.client.info.wid.user;
                        console.log(`📱 Connected phone number: ${phoneNumber}`);

                        // Find the agent to update with this phone number
                        const agent = await prisma.agent.findFirst({
                            orderBy: {
                                createdAt: 'desc'
                            }
                        });

                        if (agent) {
                            // Update the agent with the phone number
                            await prisma.agent.update({
                                where: { id: agent.id },
                                data: { phoneNumber: phoneNumber }
                            });
                            console.log(`✅ Updated agent ${agent.id} with phone number ${phoneNumber}`);
                        } else {
                            console.warn('⚠️ No agent found to update with phone number');
                        }
                    }
                } catch (error) {
                    console.error('❌ Error saving phone number to database:', error);
                }
            });

            this.client.on('qr', (qr: string) => {
                console.log('QR Code:', qr);
                this.qrCode = qr;
                try {
                    qrcode.generate(qr, { small: true });
                } catch (error) {
                    console.error('❌ Failed to generate QR code:', error);
                }
            });

            this.client.on('authenticated', async () => {
                console.log('🔒 Authenticated successfully');

                // Wait for client to be fully ready to get phone number
                this.client?.on('ready', async () => {
                    try {
                        if (this.client?.info?.wid?.user) {
                            const phoneNumber = this.client.info.wid.user;
                            console.log(`📱 Connected phone number: ${phoneNumber}`);

                            // Find the agent to update with this phone number
                            const agent = await prisma.agent.findFirst({
                                orderBy: {
                                    createdAt: 'desc'
                                }
                            });

                            if (agent) {
                                // Update the agent with the phone number
                                await prisma.agent.update({
                                    where: { id: agent.id },
                                    data: { phoneNumber: phoneNumber }
                                });
                                console.log(`✅ Updated agent ${agent.id} with phone number ${phoneNumber}`);
                            } else {
                                console.warn('⚠️ No agent found to update with phone number');
                            }
                        }
                    } catch (error) {
                        console.error('❌ Error saving phone number to database:', error);
                    } finally {
                        await prisma.$disconnect();
                    }
                });
            });

            this.client.on('auth_failure', (message: string) => {
                console.error('🚫 Authentication failed:', message);
                this.initializationError = `Authentication failed: ${message}`;
                this.isInitializing = false;
            });

            this.client.on('message_create', (message: Message) => {
                console.log(`💬 New message from ${message.from}: ${message.body}`);
                this.handleMessage(message);
            });

            this.client.on('disconnected', (reason: string) => {
                console.log('❌ Client disconnected:', reason);
                this.isReady = false;
                this.client = null;
                this.isInitializing = false;
            });

            this.client.on('loading_screen', (percent: number, message: string) => {
                console.log(`📱 Loading: ${percent}% - ${message}`);
            });

            // Initialize the client
            await this.client.initialize();

        } catch (error: any) {
            console.error('💥 Failed to initialize WhatsApp client:');
            console.error('Error details:', error);
            console.error('Stack trace:', error.stack);

            this.initializationError = error.message || 'Initialization failed';
            this.isInitializing = false;
            this.client = null;

            // Provide helpful error messages
            if (error.message?.includes('Chromium')) {
                console.error('🔧 Puppeteer/Chromium issue detected. Try:');
                console.error('   npm install puppeteer');
                console.error('   or install system dependencies for your OS');
            }

            if (error.message?.includes('ECONNREFUSED')) {
                console.error('🌐 Network connectivity issue detected');
            }

            throw error;
        }
    }

    private async handleMessage(message: Message, agentId?: string): Promise<void> {
        try {
            const chat = message.from;
            const body = message.body;

            // Check if this is a group chat or personal chat
            const chatObj = await message.getChat();
            const isGroup = chatObj.isGroup;

            // Handle commands
            if (body === '!ping') {
                if (isGroup) {
                    // Only reply in group chats if the message is a reply or mention
                    if (message.hasQuotedMsg || message.mentionedIds?.length > 0) {
                        await message.reply('pong from group chat! 🏓');
                    }
                } else {
                    await message.reply('pong from personal chat! 🏓');
                }
                return;
            }

            if (body === '!help') {
                if (isGroup) {
                    // Only reply in group chats if the message is a reply or mention
                    if (message.hasQuotedMsg || message.mentionedIds?.length > 0) {
                        await message.reply('🤖 This is a group chat that mentioned you.\nAvailable commands:\n!ping - Get pong response\n!help - Show this help message\n!status - Show bot status');
                    }
                } else {
                    await message.reply('🤖 This is a personal chat.\nAvailable commands:\n!ping - Get pong response\n!help - Show this help message\n!status - Show bot status');
                }
                return;
            }

            if (body === '!status') {
                if (isGroup) {
                    // Only reply in group chats if the message is a reply or mention
                    if (message.hasQuotedMsg || message.mentionedIds?.length > 0) {
                        await message.reply('✅ Bot is online and working in this group chat!');
                    }
                } else {
                    await message.reply('✅ Bot is online and working in this personal chat!');
                }
                return;
            }

            // Handle all non-command messages with the agent
            if (body === 'tools apa aja yang kamu miliki?') {
                try {
                    // Find the first active agent
                    const agent = await prisma.agent.findFirst({
                        orderBy: {
                            createdAt: 'desc'
                        }
                    });

                    await prisma.$disconnect();

                    if (!agent) {
                        console.warn('⚠️ No active agent found in the database for WhatsApp responses.');
                        await message.reply('No agent configured to respond to messages.');
                        return;
                    }

                    console.log('Agent in whatsapp-service.ts:', agent);

                    // Get the chat object once at the beginning
                    const chat = await message.getChat();

                    await chat.sendMessage('🤖 Let me check my tools...');

                    // Call the WhatsApp-specific API endpoint
                    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/whatsapp-chat`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            message: body,
                            agentId: agent.id,
                            stream: true,
                        }),
                    });

                    console.log('Response from whatsapp-chat API:', response.status);

                    if (!response.ok) {
                        throw new Error(`WhatsApp Chat API responded with status: ${response.status}`);
                    }

                    let accumulatedResponse = '';
                    let wordCount = 0;
                    const WORDS_PER_UPDATE = 20; // Send update every 20 words

                    const reader = response.body?.getReader();
                    const decoder = new TextDecoder();

                    if (reader) {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            const chunk = decoder.decode(value, { stream: true });
                            const lines = chunk.split('\n');

                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    try {
                                        const data = JSON.parse(line.slice(6));
                                        if (data.done) {
                                            if (accumulatedResponse.trim()) {
                                                // Use chat.sendMessage with agent identification
                                                await chat.sendMessage(`🤖 *${agent.agentName}*:\n\n${accumulatedResponse}`);
                                            }
                                            return;
                                        }

                                        accumulatedResponse += data.chunk;
                                        wordCount += data.chunk.split(' ').length;

                                        // Send partial updates every N words
                                        if (wordCount >= WORDS_PER_UPDATE) {
                                            const sentences = accumulatedResponse.split('. ');
                                            if (sentences.length > 1) {
                                                const partialResponse = sentences.slice(0, -1).join('. ') + '.';
                                                // Use chat.sendMessage for partial updates too
                                                await chat.sendMessage(`🤖 *${agent.agentName}*:\n\n${partialResponse}`);
                                                accumulatedResponse = sentences[sentences.length - 1];
                                                wordCount = 0;
                                            }
                                        }
                                    } catch (parseError) {
                                        console.error('Parse error:', parseError);
                                    }
                                }
                            }
                        }
                    }

                    // Send final chunk if any remains
                    if (accumulatedResponse.trim()) {
                        await chat.sendMessage(`🤖 *${agent.agentName}*:\n\n${accumulatedResponse}`);
                    }

                } catch (error) {
                    console.error('❌ Error getting agent response:', error);
                    const chat = await message.getChat();
                    await chat.sendMessage('❌ Sorry, I encountered an error processing your request.');
                }
            }

            return;
        } catch (error) {
            console.error('❌ Error handling message:', error);
        }
    }

    private async getAgentResponse(message: string): Promise<string> {
        try {
            // Find the first active agent
            const agent = await prisma.agent.findFirst({
                orderBy: {
                    createdAt: 'desc'
                }
            });

            await prisma.$disconnect();

            if (!agent) {
                console.warn('⚠️ No active agent found in the database for WhatsApp responses.');
                return 'No agent configured to respond to messages.';
            }

            const agentId = agent.id;

            // Call the agent API with authentication
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    agentId,
                }),
            });

            if (!response.ok) {
                throw new Error(`Agent API responded with status: ${response.status}`);
            }

            const data = await response.json();
            return data.response || data.message || 'No response from agent';
        } catch (error) {
            console.error('❌ Error in getAgentResponse:', error);
            return 'Sorry, I could not get a response at this time.';
        }
    }

    async sendMessage(to: string, text: string, agentId?: string): Promise<any> {
        if (!WhatsAppService.WHATSAPP_ENABLED) {
            throw new Error('WhatsApp service is temporarily disabled');
        }

        // If agentId is provided, use that specific agent's client
        if (agentId) {
            const agentClient = this.agentClients.get(agentId);
            if (!agentClient?.client || !agentClient.isReady) {
                const errorMsg = `WhatsApp client for agent ${agentId} not ready. Current state: isReady=${agentClient?.isReady}, hasClient=${!!agentClient?.client}, isInitializing=${agentClient?.isInitializing}`;
                console.error('❌', errorMsg);
                throw new Error(errorMsg);
            }

            try {
                const formattedNumber = to.includes('@c.us') ? to : `${to}@c.us`;
                const result = await agentClient.client.sendMessage(formattedNumber, text);
                console.log(`✅ Message sent to ${formattedNumber} from agent ${agentId}`);
                return result;
            } catch (error: any) {
                console.error(`❌ Failed to send message from agent ${agentId}:`, error);
                throw new Error(`Failed to send message: ${error.message}`);
            }
        }

        // Legacy behavior - use the default client
        if (!this.isReady || !this.client) {
            const errorMsg = `WhatsApp client not ready. Current state: isReady=${this.isReady}, hasClient=${!!this.client}, isInitializing=${this.isInitializing}`;
            console.error('❌', errorMsg);
            throw new Error(errorMsg);
        }

        try {
            const formattedNumber = to.includes('@c.us') ? to : `${to}@c.us`;
            const result = await this.client.sendMessage(formattedNumber, text);
            console.log(`✅ Message sent to ${formattedNumber}`);
            return result;
        } catch (error: any) {
            console.error('❌ Failed to send message:', error);
            throw new Error(`Failed to send message: ${error.message}`);
        }
    }

    getStatus(agentId?: string): WhatsAppServiceStatus {
        if (!WhatsAppService.WHATSAPP_ENABLED) {
            return {
                isReady: false,
                isInitializing: false,
                qr: null,
                info: null,
                error: 'WhatsApp service is temporarily disabled'
            };
        }

        // If agentId is provided, return status for that specific agent
        if (agentId) {
            const agentClient = this.agentClients.get(agentId);
            if (agentClient) {
                return {
                    isReady: agentClient.isReady,
                    qr: agentClient.qrCode,
                    info: agentClient.client?.info || agentClient.info || null,
                    error: agentClient.initializationError || undefined,
                    isInitializing: agentClient.isInitializing,
                    agentId: agentId
                };
            }
            // If agent not found, return not ready status
            return {
                isReady: false,
                qr: null,
                info: null,
                error: `No WhatsApp client found for agent ${agentId}`,
                isInitializing: false,
                agentId: agentId
            };
        }

        // Legacy behavior - return status for the default client
        return {
            isReady: this.isReady,
            isInitializing: this.isInitializing,
            qr: this.qrCode,
            info: this.client?.info || null,
            error: this.initializationError || undefined
        };
    }

    // Method to restart the client if needed
    async restart(agentId?: string): Promise<void> {
        if (agentId) {
            // Restart specific agent's client
            const agentClient = this.agentClients.get(agentId);
            if (agentClient?.client) {
                try {
                    await agentClient.client.destroy();
                } catch (error) {
                    console.error(`⚠️ Error destroying previous client for agent ${agentId}:`, error);
                }
            }

            if (agentClient?.browser) {
                try {
                    await agentClient.browser.close();
                } catch (error) {
                    console.error(`⚠️ Error closing browser for agent ${agentId}:`, error);
                }
            }

            // Reset agent client state
            if (agentClient) {
                agentClient.client = null;
                agentClient.browser = null;
                agentClient.isReady = false;
                agentClient.isInitializing = false;
                agentClient.initializationError = null;
                agentClient.qrCode = null;
                agentClient.info = null;
            }

            await this.initialize(agentId);
        } else {
            // Legacy restart
            if (this.client) {
                try {
                    await this.client.destroy();
                } catch (error) {
                    console.error('⚠️ Error destroying previous client:', error);
                }
            }

            if (this.browser) {
                try {
                    await this.browser.close();
                } catch (error) {
                    console.error('⚠️ Error closing browser:', error);
                }
            }

            this.client = null;
            this.browser = null;
            this.isReady = false;
            this.isInitializing = false;
            this.initializationError = null;
            this.qrCode = null;

            await this.initialize();
        }
    }

    // Get all active agent IDs
    getActiveAgents(): string[] {
        return Array.from(this.agentClients.keys()).filter(agentId => {
            const client = this.agentClients.get(agentId);
            return client?.isReady || client?.isInitializing;
        });
    }

    // Check if service is enabled
    static isEnabled(): boolean {
        return WhatsAppService.WHATSAPP_ENABLED;
    }

    // Enable/disable the service
    static setEnabled(enabled: boolean): void {
        WhatsAppService.WHATSAPP_ENABLED = enabled;
        console.log(`WhatsApp service ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Create singleton instance
const whatsAppServiceInstance = WhatsAppService.getInstance();

// Export both default and named exports for compatibility
export default whatsAppServiceInstance;