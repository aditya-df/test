// lib/audit-log.ts
import { prisma } from "@/config/db";

export enum AuditAction {
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    LOGIN_FAILED = 'LOGIN_FAILED',
    PASSWORD_RESET = 'PASSWORD_RESET',
    ACCOUNT_CREATED = 'ACCOUNT_CREATED',
    ACCOUNT_UPDATED = 'ACCOUNT_UPDATED',
    AGENT_CREATED = 'AGENT_CREATED',
    AGENT_UPDATED = 'AGENT_UPDATED',
    AGENT_DELETED = 'AGENT_DELETED',
    CHAT_HISTORY = 'CHAT_HISTORY',
    CHAT_HISTORY_DELETED = 'CHAT_HISTORY_DELETED',
    USER_INVITED = 'USER_INVITED',
    USER_ROLE_UPDATED = 'USER_ROLE_UPDATED',
    USER_DELETED = 'USER_DELETED',
    USER_AGENTS_UPDATED = 'USER_AGENTS_UPDATED',
    USER_ORGANIZATION_UPDATED = 'USER_ORGANIZATION_UPDATED',
    SETTINGS_UPDATED = 'SETTINGS_UPDATED',
    MESSAGE_FEEDBACK_GIVEN = 'MESSAGE_FEEDBACK_GIVEN'
}

interface AuditLogData {
    userId?: string;
    userEmail?: string;
    userName?: string;
    action: AuditAction;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    success?: boolean;
    errorMessage?: string;
    chatId?: string;
}

export async function createAuditLog(data: AuditLogData) {
    try {
        const auditLog = await prisma.auditLog.create({
            data: {
                userId: data.userId || null,
                userEmail: data.userEmail || null,
                userName: data.userName || null,
                action: data.action,
                details: data.details || null,
                ipAddress: data.ipAddress || 'unknown',
                userAgent: data.userAgent || 'unknown',
                sessionId: data.sessionId || null,
                success: data.success ?? true,
                errorMessage: data.errorMessage || null,
                chatId: data.chatId || null
            }
        });
        console.log(`Audit log created successfully: ${data.action} for user ${data.userId}`);
        return auditLog;
    } catch (error) {
        console.error('Error creating audit log:', error);
        console.error('Audit log data that failed:', JSON.stringify(data, null, 2));
        // Don't throw here to prevent breaking the main flow
        return null;
    } finally {
        await prisma.$disconnect();
    }
}

// Utility function to get client IP from request headers
export function getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const real = request.headers.get('x-real-ip');
    const clientIP = forwarded?.split(',')[0] || real || 'unknown';
    return clientIP;
}

// Utility function to get user agent
export function getUserAgent(request: Request): string {
    return request.headers.get('user-agent') || 'unknown';
}

// Helper to create login audit log
export async function logLogin(
    userId: string,
    userEmail: string,
    userName: string,
    request: Request,
    sessionId?: string,
    success: boolean = true,
    errorMessage?: string
) {
    return createAuditLog({
        userId: success ? userId : undefined,
        userEmail,
        userName,
        action: success ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED,
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
        sessionId,
        success,
        errorMessage
    });
}

// Helper to create logout audit log
export async function logLogout(
    userId: string,
    userEmail: string,
    userName: string,
    request: Request,
    sessionId?: string
) {
    return createAuditLog({
        userId,
        userEmail,
        userName,
        action: AuditAction.LOGOUT,
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
        sessionId
    });
}

// Helper to log user actions with request context
export async function logUserAction(
    userId: string,
    userEmail: string,
    userName: string,
    action: AuditAction,
    request: Request,
    details?: any,
    success: boolean = true,
    errorMessage?: string
) {
    return createAuditLog({
        userId,
        userEmail,
        userName,
        action,
        details,
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
        success,
        errorMessage
    });
}

// Helper to log chat actions (creation/deletion)
export async function logChatAction(
    userId: string,
    userEmail: string,
    userName: string,
    action: AuditAction.CHAT_HISTORY | AuditAction.CHAT_HISTORY_DELETED,
    chatId: string,
    request: Request,
    details?: any,
    success: boolean = true,
    errorMessage?: string
) {
    return createAuditLog({
        userId,
        userEmail,
        userName,
        action,
        chatId,
        details,
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
        success,
        errorMessage
    });
}

// Helper to log message feedback actions
export async function logMessageFeedback(
    userId: string,
    userEmail: string,
    userName: string,
    chatId: string,
    request: Request,
    details?: any,
    success: boolean = true,
    errorMessage?: string
) {
    return createAuditLog({
        userId,
        userEmail,
        userName,
        action: AuditAction.MESSAGE_FEEDBACK_GIVEN,
        chatId,
        details,
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
        success,
        errorMessage
    });
}

// Helper to update chat audit log with latest message count
export async function updateChatAuditLog(
    chatId: string,
    details: any
) {
    try {
        // Find the CHAT_HISTORY audit log entry for this chat
        const existingLog = await prisma.auditLog.findFirst({
            where: {
                chatId: chatId,
                action: AuditAction.CHAT_HISTORY
            },
            orderBy: {
                timestamp: 'desc'
            }
        });

        if (!existingLog) {
            console.log(`No existing audit log found for chat: ${chatId}`);
            return null;
        }

        // Merge existing details with new details
        const existingDetails = (existingLog.details && typeof existingLog.details === 'object')
            ? existingLog.details
            : {};
        const mergedDetails = {
            ...existingDetails,
            ...details
        };

        // Update the audit log entry
        const updatedLog = await prisma.auditLog.update({
            where: { id: existingLog.id },
            data: {
                details: mergedDetails
            }
        });

        console.log(`Audit log updated successfully for chat: ${chatId}`);
        return updatedLog;
    } catch (error) {
        console.error('Error updating chat audit log:', error);
        return null;
    } finally {
        await prisma.$disconnect();
    }
}