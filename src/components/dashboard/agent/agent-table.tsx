/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { Data } from "@/stores/agent/model";
import { ColDef } from "ag-grid-community";
import { useEffect, useRef, useState, useMemo } from "react";
import { ModuleRegistry } from "ag-grid-community";
import { ClientSideRowModelModule } from "ag-grid-community";
import { Button } from "@/components/ui/button";
import TableComponent, {
  TableComponentHandle,
} from "@/components/layouts/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useStore } from "@/stores/agent/useStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Copy,
  Handshake,
  AlertTriangle,
  Code,
  MessageCircle,
  Trash2,
  Edit,
  Calendar,
  CheckCircle,
  Wrench,
  Building2,
  Lock,
  Globe,
  MoreVertical,
  Shield,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";
import { AvatarPreview, AVATAR_OPTIONS } from "./agent-avatar";
import { PaginationComponent } from "@/components/ui/pagination/pagination-component";
import { PaginationResult, usePaginationTable } from "@/hooks/use-pagination-table";
import { Session } from "next-auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApprovalStatus } from "@prisma/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import QRCode from 'qrcode';
import { getSession } from 'next-auth/react';

// Register only the modules you use
ModuleRegistry.registerModules([ClientSideRowModelModule]);

interface AgentTableProps {
  data: Data[];
  loading: boolean;
  viewAction: (data: any) => void;
  editAction: (data: any) => void;
  openKnowledgeAction: () => void;
  setSelectedKnowledge: (value: React.SetStateAction<string[]>) => void;
  totalItems: number;
  pagination: PaginationResult;
  session: Session | null;
  canEdit?: boolean;
  canDelete?: boolean;
  canView?: boolean;
}

interface IframeWidgetProps {
  token: string;
  iframeSrc: string;
}

interface ErrorDisplayProps {
  error: unknown;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    if (error && typeof error === "object" && "message" in error) {
      return String((error as { message: unknown }).message);
    }
    return "An unknown error occurred";
  };

  return (
    <div className="p-4 text-red-500">
      <h3 className="text-lg font-semibold mb-2">Error loading agents</h3>
      <p>{getErrorMessage(error)}</p>
    </div>
  );
};

const IframeWidget: React.FC<IframeWidgetProps> = ({ token, iframeSrc }) => {
  const [isOpenFrame, setIsOpenFrame] = useState(false);

  return (
    <Dialog open={isOpenFrame} onOpenChange={setIsOpenFrame}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span>Preview Widget</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] sm:h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Iframe Widget Preview</DialogTitle>
          <DialogDescription>
            This is how your chatbot will appear when embedded in your website.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-hidden mt-4 rounded-lg border">
          <iframe
            src={`${iframeSrc}?token=${encodeURIComponent(token)}`}
            className="w-full h-full shadow-xl rounded-lg"
            title="Iframe Widget"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const AgentTable = ({
  data,
  loading,
  viewAction,
  editAction,
  openKnowledgeAction,
  setSelectedKnowledge,
  totalItems,
  pagination,
  session,
  canEdit = true,
  canDelete = true,
  canView = true,
}: AgentTableProps) => {
  const tableRef = useRef<TableComponentHandle>(null);
  // Avoid using 'delete' as a variable name since it's a reserved keyword
  const { delete: deleteAgent } = useStore();

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Data | null>(null);

  // State for integration guide dialog
  const [showGuide, setShowGuide] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Data | null>(null);
  const [activeTab, setActiveTab] = useState("iframe");
  const contentRef = useRef<HTMLDivElement>(null);
  const hideQrCode = process.env.NEXT_PUBLIC_USING_WHATSAPP !== 'true' ? true : false;

  // Handle opening delete confirmation
  const handleDeleteClick = (agent: Data) => {
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
  };

  // Handle confirming delete
  const handleConfirmDelete = async () => {
    if (agentToDelete?.id) {
      try {
        // Using the deleteAgent function instead of remove
        await deleteAgent(agentToDelete.id);
        setDeleteDialogOpen(false);
        setAgentToDelete(null);
        window.dispatchEvent(new CustomEvent('agentDeleted'));
        toast({
          title: "Remove Agent",
          description: `Agent ${agentToDelete.agentName} deleted successfully`,
        });
      } catch (error) {
        console.error("Error deleting agent:", error);
      }
    }
  };

  // Handle opening integration guide
  const handleIntegrationClick = async (agent: Data) => {
    setSelectedAgent(agent);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL_V2}/session/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_token: agent.token
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get session token');
      }

      const sessionData = await response.json();
      console.log("Session data received:", sessionData);
    } catch (error) {
      console.error('Error exchanging token:', error);
      toast({
        title: "Error",
        description: "Failed to initialize integration guide",
        variant: "destructive"
      });
    }

    setShowGuide(true);
  };

  useEffect(() => {
    const content = contentRef.current;
    let startY = 0;
    let scrollTop = 0;

    const handleTouchStart = (e: React.TouchEvent | any) => {
      startY = e.touches[0].clientY;
      scrollTop = content?.scrollTop || 0;
    };

    const handleTouchMove = (e: React.TouchEvent | any) => {
      if (!content) return;
      const y = e.touches[0].clientY;
      const delta = startY - y;
      content.scrollTop = scrollTop + delta;
    };

    const handleWheel = (e: WheelEvent) => {
      if (!content) return;
      content.scrollTop += e.deltaY;
    };

    if (content) {
      content.addEventListener("touchstart", handleTouchStart as any, {
        passive: true,
      });
      content.addEventListener("touchmove", handleTouchMove as any, {
        passive: true,
      });
      content.addEventListener("wheel", handleWheel, { passive: true });
    }

    return () => {
      if (content) {
        content.removeEventListener("touchstart", handleTouchStart as any);
        content.removeEventListener("touchmove", handleTouchMove as any);
        content.removeEventListener("wheel", handleWheel);
      }
    };
  }, [showGuide]);

  // Function to get a color based on the first letter of the agent name
  const getColorForAgent = (name: string) => {
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-green-100 text-green-700",
      "bg-purple-100 text-purple-700",
      "bg-yellow-100 text-yellow-700",
      "bg-pink-100 text-pink-700",
      "bg-indigo-100 text-indigo-700",
      "bg-red-100 text-red-700",
      "bg-orange-100 text-orange-700",
      "bg-teal-100 text-teal-700",
    ];

    // Use the character code of the first letter to pick a color
    const charCode = name.charCodeAt(0) || 65;
    return colors[charCode % colors.length];
  };

  // Use useMemo to prevent re-creation of columnDefs on each render
  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "agentName",
        headerName: "Agent Name",
        flex: 1,
        sortable: true,
        filter: true,
        cellRenderer: (params: any) => {
          const agentName = params.value;
          const agentImage = params.data.image; // This might be an avatar ID or actual URL
          const colorClass = getColorForAgent(agentName);

          // Check if agentImage is an avatar ID from your avatar system
          const isAvatarId =
            agentImage &&
            AVATAR_OPTIONS.some((avatar) => avatar.id === agentImage);

          return (
            <div className="flex items-center gap-2 py-2">
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border border-gray-200">
                {isAvatarId ? (
                  // Use your custom AvatarPreview component for avatar IDs
                  <AvatarPreview avatarId={agentImage} size="sm" />
                ) : agentImage && agentImage.startsWith("http") ? (
                  // Use Next.js Image component for actual URLs
                  <Image
                    src={agentImage}
                    alt={`${agentName} avatar`}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to letter avatar if image fails to load
                      const target = e.target as HTMLImageElement;
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                    <div class="w-full h-full ${colorClass} flex items-center justify-center text-sm font-medium">
                      ${agentName.charAt(0).toUpperCase()}
                    </div>
                  `;
                      }
                    }}
                  />
                ) : (
                  // Fallback to letter avatar
                  <div
                    className={`w-full h-full ${colorClass} flex items-center justify-center text-sm font-medium`}
                  >
                    {agentName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="font-medium">{agentName}</div>
            </div>
          );
        },
      },
      {
        field: "visibilityType",
        headerName: "Visibility",
        width: 120,
        sortable: true,
        filter: true,
        // hide: true,
        cellRenderer: (params: any) => {

          // Handle different possible data structures
          let visibilityType = params.value;

          // If params.value is null/undefined, try to get from params.data
          if (!visibilityType && params.data) {
            visibilityType =
              params.data.visibilityType || params.data.visibility_type;
          }

          // Normalize the visibility type to uppercase
          if (typeof visibilityType === "string") {
            visibilityType = visibilityType.toUpperCase();
          }

          // Default to PRIVATE if still no value
          visibilityType = visibilityType || "PRIVATE";

          const visibilityConfig = {
            PRIVATE: {
              label: "Private",
              variant: "outline",
              icon: Lock,
              bgColor: "bg-gray-50 dark:bg-gray-900",
              borderColor: "border-gray-200 dark:border-gray-800",
              textColor: "text-gray-600 dark:text-gray-400",
            },
            ORGANIZATION: {
              label: "Organization",
              variant: "outline",
              icon: Building2,
              bgColor: "bg-blue-50 dark:bg-blue-900/20",
              borderColor: "border-blue-200 dark:border-blue-800",
              textColor: "text-blue-600 dark:text-blue-400",
            },
            PUBLIC: {
              label: "Public",
              variant: "outline",
              icon: Globe,
              bgColor: "bg-green-50 dark:bg-green-900/20",
              borderColor: "border-green-200 dark:border-green-800",
              textColor: "text-green-600 dark:text-green-400",
            },
          };

          // Get config with fallback
          const config =
            visibilityConfig[visibilityType as keyof typeof visibilityConfig] ||
            visibilityConfig.PRIVATE;

          return (
            <div className="py-2">
              <Badge
                variant={config.variant as any}
                className={`text-xs flex items-center gap-1 ${config.bgColor} ${config.borderColor} ${config.textColor} border`}
              >
                <config.icon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>
          );
        },
      },
      {
        field: "qrCode",
        headerName: "QR Code",
        width: 120,
        sortable: false,
        filter: false,
        hide: hideQrCode,
        cellRenderer: (params: any) => {
          const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
          const [isGenerating, setIsGenerating] = useState<boolean>(false);
          const [whatsappStatus, setWhatsappStatus] = useState<{
            status: string;
            isScanned: boolean;
            phoneNumber?: string;
            lastUpdated: Date;
          }>({ status: 'disconnected', isScanned: false, lastUpdated: new Date() });
          const wsRef = useRef<WebSocket | null>(null);
          const [qrCodeInitialized, setQrCodeInitialized] = useState<boolean>(false);

          const fetchQRCodeFromServer = async (qrString?: string) => {
            if (isGenerating) return;

            setIsGenerating(true);
            try {
              if (qrString) {
                const qrDataURL = await QRCode.toDataURL(qrString, {
                  width: 256,
                  margin: 2,
                  color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                  }
                });
                setQrCodeDataURL(qrDataURL);
              } else {
                // Fetch QR code from WhatsApp service
                const response = await fetch(`/api/whatsapp?agentId=${params.data.id}`);
                const data = await response.json();

                if (data.qr) {
                  // Convert the QR string to a data URL using QRCode library
                  const qrDataURL = await QRCode.toDataURL(data.qr, {
                    width: 256,
                    margin: 2,
                    color: {
                      dark: '#000000',
                      light: '#FFFFFF'
                    }
                  });
                  setQrCodeDataURL(qrDataURL);

                  // Update WhatsApp status with server data
                  setWhatsappStatus({
                    status: data.status || 'disconnected',
                    isScanned: data.isScanned || false,
                    phoneNumber: data.phoneNumber,
                    lastUpdated: new Date(data.lastUpdated || Date.now())
                  });
                } else {
                  console.log('No QR code available from server');
                  setQrCodeDataURL(''); // Clear QR if none is available
                }
              }
            } catch (error) {
              console.error('Error fetching QR code from server:', error);
            } finally {
              setIsGenerating(false);
            }
          };

          const connectWebSocket = async () => {
            try {
              const auth = await getSession();
              if (!auth?.user.id) {
                console.warn("No user session found, skipping WebSocket connection");
                return;
              }

              if (!process.env.NEXT_PUBLIC_WEBSOCKET_URL) {
                console.warn("NEXT_PUBLIC_WEBSOCKET_URL not configured, WebSocket features disabled");
                return;
              }

              const wsUrl = `${process.env.NEXT_PUBLIC_WEBSOCKET_URL}/whatsapp/${params.data.id}`;
              console.log("Attempting WebSocket connection to:", wsUrl);

              wsRef.current = new WebSocket(wsUrl);

              wsRef.current.onopen = () => {
                console.log("WebSocket connected successfully");
                wsRef.current?.send(
                  JSON.stringify({
                    action: "listen",
                    channel: "whatsapp_qr",
                    agentId: params.data.id,
                  })
                );
              };

              wsRef.current.onmessage = (event) => {
                try {
                  const data = JSON.parse(event.data);
                  if (data.action === "qr_update" && data.agentId === params.data.id) {
                    setWhatsappStatus({
                      status: data.status || 'disconnected',
                      isScanned: data.isScanned || false,
                      phoneNumber: data.phoneNumber,
                      lastUpdated: new Date()
                    });

                    // Fetch fresh QR code from server when status changes
                    if ((data.status === 'initializing' || data.qr) && qrCodeInitialized) {
                      fetchQRCodeFromServer(data.qr);
                    }
                  }
                } catch (parseError) {
                  console.error("Error parsing WebSocket message:", parseError);
                }
              };

              wsRef.current.onerror = (err) => {
                console.warn("WebSocket connection failed. Real-time updates disabled.", {
                  url: wsUrl,
                  error: err,
                  message: "This is expected if WebSocket server is not available"
                });
              };

              wsRef.current.onclose = (event) => {
                if (event.wasClean) {
                  console.log("WebSocket disconnected cleanly");
                } else {
                  console.warn("WebSocket connection lost", {
                    code: event.code,
                    reason: event.reason || 'Unknown reason'
                  });
                }
              };
            } catch (error) {
              console.warn("Failed to establish WebSocket connection:", {
                error: error instanceof Error ? error.message : 'Unknown error',
                note: "QR codes will still work without real-time updates"
              });
            }
          };

          // Initialize WebSocket connection on component mount, but don't fetch QR code yet
          useEffect(() => {
            connectWebSocket();

            const intervalId = setInterval(() => {
              if (qrCodeInitialized && (whatsappStatus.status === 'initializing' || !whatsappStatus.isScanned)) {
                console.log('Auto-refreshing QR code...');
                fetchQRCodeFromServer();
              }
            }, 30000); // Refresh every 30 seconds

            return () => {
              clearInterval(intervalId);
              if (wsRef.current) {
                wsRef.current.close();
              }
            };
          }, [params.data.id, qrCodeInitialized]);

          // Function to initialize QR code generation when WhatsApp button is clicked
          const initializeQRCode = () => {
            setQrCodeInitialized(true);
            fetchQRCodeFromServer();
          };

          const openWhatsAppModal = () => {
            const modalContent = `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>WhatsApp QR Code - ${params.data.agentName}</title>
                  <style>
                    body {
                      margin: 0;
                      padding: 20px;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                      color: white;
                      min-height: 100vh;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                    }
                    .container {
                      background: white;
                      border-radius: 20px;
                      padding: 30px;
                      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                      text-align: center;
                      max-width: 400px;
                      width: 100%;
                    }
                    .header {
                      color: #25D366;
                      font-size: 24px;
                      font-weight: bold;
                      margin-bottom: 10px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      gap: 10px;
                    }
                    .agent-name {
                      color: #666;
                      font-size: 16px;
                      margin-bottom: 20px;
                    }
                    .status-badge {
                      display: inline-block;
                      padding: 8px 16px;
                      border-radius: 20px;
                      font-size: 14px;
                      font-weight: 500;
                      margin-bottom: 20px;
                    }
                    .status-connected { background: #dcfce7; color: #166534; }
                    .status-disconnected { background: #fef2f2; color: #dc2626; }
                    .status-initializing { background: #fef3c7; color: #d97706; }
                    .qr-container {
                      margin: 20px 0;
                      padding: 20px;
                      background: #f9fafb;
                      border-radius: 12px;
                      border: 2px dashed #e5e7eb;
                    }
                    .qr-code {
                      width: 200px;
                      height: 200px;
                      margin: 0 auto;
                      display: block;
                    }
                    .phone-info {
                      background: #f0f9ff;
                      border: 1px solid #0ea5e9;
                      border-radius: 8px;
                      padding: 12px;
                      margin-top: 15px;
                      color: #0c4a6e;
                    }
                    .instructions {
                      color: #666;
                      font-size: 14px;
                      line-height: 1.5;
                      margin-top: 15px;
                    }
                    .refresh-btn {
                      background: #25D366;
                      color: white;
                      border: none;
                      padding: 10px 20px;
                      border-radius: 8px;
                      cursor: pointer;
                      font-size: 14px;
                      margin-top: 15px;
                      transition: background 0.2s;
                    }
                    .refresh-btn:hover {
                      background: #128C7E;
                    }
                    .logout-btn {
                      background: #ef4444;
                      color: white;
                      border: none;
                      padding: 10px 20px;
                      border-radius: 8px;
                      cursor: pointer;
                      font-size: 14px;
                      margin-top: 15px;
                      margin-bottom: 10px;
                      transition: background 0.2s;
                    }
                    .logout-btn:hover {
                      background: #dc2626;
                    }
                    .last-updated {
                      color: #999;
                      font-size: 12px;
                      margin-top: 10px;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                      </svg>
                      WhatsApp
                    </div>
                    <div class="agent-name">${params.data.agentName}</div>
                    
                    <div class="status-badge status-${whatsappStatus.isScanned ? 'connected' : whatsappStatus.status}">
                      Status: ${whatsappStatus.isScanned ? 'Connected' : whatsappStatus.status.charAt(0).toUpperCase() + whatsappStatus.status.slice(1)}
                    </div>
                    
                    <div class="qr-container">
                      ${qrCodeDataURL ? `<img src="${qrCodeDataURL}" class="qr-code" alt="WhatsApp QR Code" />` : '<div style="height:200px;display:flex;align-items:center;justify-content:center;color:#999;">Generating QR Code...</div>'}
                    </div>
                    
                    ${whatsappStatus.isScanned && whatsappStatus.phoneNumber ?
                `<div class="phone-info">
                        <strong>📱 Connected Phone:</strong><br>
                        ${whatsappStatus.phoneNumber}
                      </div>` :
                whatsappStatus.isScanned ?
                  '<div class="phone-info">✅ QR Code Scanned - Waiting for connection...</div>' :
                  '<div class="instructions">📱 Open WhatsApp on your phone<br>⚙️ Go to Settings → Linked Devices<br>🔗 Tap "Link a Device"<br>📷 Scan this QR code</div>'
              }
                    
                    ${whatsappStatus.isScanned || whatsappStatus.status === 'ready' || whatsappStatus.phoneNumber ?
                `<button class="logout-btn" onclick="fetch('/api/whatsapp/logout?agentId=${params.data.id}', {method: 'POST'}).then(() => { window.location.reload(); })">
                        🔌 Logout from WhatsApp
                      </button>` : ''
              }
                    
                    <button class="refresh-btn" onclick="fetch('/api/whatsapp').then(r => r.json()).then(data => { if(data.qr) window.location.reload(); })">
                      🔄 Refresh QR Code
                    </button>
                    
                    <div class="last-updated">
                      Last updated: ${whatsappStatus.lastUpdated.toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <script>
                    // Auto-refresh every 30 seconds
                    setTimeout(() => {
                      window.location.reload();
                    }, 30000);
                  </script>
                </body>
              </html>
            `;

            const newWindow = window.open('', '_blank', 'width=500,height=700,scrollbars=yes,resizable=yes');
            if (newWindow) {
              newWindow.document.write(modalContent);
              newWindow.document.close();
            }
          };

          return (
            <div className="py-2 flex justify-center">
              {isGenerating ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
              ) : qrCodeDataURL ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <img
                          src={qrCodeDataURL}
                          alt={`WhatsApp QR Code for ${params.data.agentName}`}
                          className="w-16 h-16 cursor-pointer hover:scale-110 transition-transform border border-gray-200 rounded"
                          onClick={openWhatsAppModal}
                        />
                        {/* Status indicator */}
                        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${whatsappStatus.status === 'ready' ? 'bg-green-500' :
                            whatsappStatus.status === 'initializing' ? 'bg-yellow-500' :
                              'bg-red-500'
                          }`}></div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <p>WhatsApp QR Code</p>
                        <p className="text-xs text-gray-400">
                          Status: {whatsappStatus.status}
                          {whatsappStatus.isScanned && ' (Scanned)'}
                        </p>
                        <p className="text-xs text-gray-400">Click to view details</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center border border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={initializeQRCode}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#25D366">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                        </svg>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <p>Generate WhatsApp QR Code</p>
                        <p className="text-xs text-gray-400">Click to generate QR code</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
      },
      {
        field: "assignedKnowledge",
        headerName: "Assigned Knowledge",
        flex: 1,
        sortable: true,
        filter: true,
        valueGetter: (params: any) => {
          return params.data.toolsOnAgent ? params.data.toolsOnAgent.length : 0
        },
        cellRenderer: (params: any) => {
          const role = session?.user.roles;
          if (
            !params.data.toolsOnAgent ||
            params.data.toolsOnAgent.length === 0
          ) {
            return (
              <div className="text-muted-foreground">No knowledge assigned</div>
            );
          }

          const approvalRequest = params.data?.approval_requests?.[0];

          if (role?.includes("user") && approvalRequest && approvalRequest.status === ApprovalStatus.PENDING) {
            return (
              <p>-</p>
            )
          }

          return (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-sm space-x-2"
              onClick={() => {
                setSelectedKnowledge(
                  params.data.toolsOnAgent.map(
                    (tool: any) => tool.functionToolId
                  )
                );
                openKnowledgeAction();
              }}
            >
              <Wrench className="h-4 w-4" />
              <span>{params.data.toolsOnAgent.length} Knowledge</span>
            </Button>
          );
        },
      },
      {
        field: "description",
        headerName: "Description",
        flex: 1.5,
        sortable: true,
        filter: true,
        cellStyle: {
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          overflow: "hidden",
        },
        cellRenderer: (params: any) => {
          return (
            <div className="truncate max-w-md py-2 text-sm">
              {params.value || "No description provided"}
            </div>
          );
        },
      },
      {
        field: "createdAt",
        headerName: "Created",
        width: 120,
        sortable: true,
        filter: true,
        cellRenderer: (params: any) => {
          const date = new Date(params.value || Date.now());
          const formattedDate = date.toLocaleDateString();

          return (
            <div className="flex items-center gap-1 py-2 text-muted-foreground text-xs">
              <Calendar className="h-3 w-3" />
              <span>{formattedDate}</span>
            </div>
          );
        },
      },
      {
        field: "user",
        headerName: "Created By",
        width: 150,
        sortable: true,
        filter: true,
        cellRenderer: (params: any) => {
          const user = params.value;

          if (!user) {
            return (
              <div className="py-2 text-xs text-muted-foreground">
                Unknown User
              </div>
            );
          }

          return (
            <div className="py-2">
              <div className="text-sm font-medium">
                {user.name || "No Name"}
              </div>
              {user.email && (
                <div className="text-xs text-muted-foreground">
                  {user.email}
                </div>
              )}
            </div>
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        width: 100,
        sortable: true,
        filter: true,
        cellRenderer: (params: any) => {
          const isActive = params.data.token ? true : false;
          const role = session?.user.roles;
          if (role?.includes("user")) {

            const approvalRequest = params.data?.approval_requests?.[0];
            if (approvalRequest) {
              return (
                <StatusBadge status={approvalRequest.status as ApprovalStatus} />
              )
            }
          }
          return (
            <div className="py-2">
              <StatusBadge status={isActive ? ApprovalStatus.ACTIVE : ApprovalStatus.DISABLED} />
            </div>
          );
        },
      },
      {
        headerName: "Actions",
        width: 160,
        sortable: false,
        filter: false,
        floatingFilter: false,
        cellRenderer: (params: any) => {
          const creatorUserId = params.data?.user?.id;
          const userId = session?.user.id;

          const approvalRequest = params.data?.approval_requests?.[0];
          const role = session?.user.roles;

          if (role?.includes("user") && approvalRequest && approvalRequest.status === ApprovalStatus.PENDING) {
            return (
              <p>-</p>
            )
          }
          return (
            <div className="flex justify-end items-center py-2 pr-3">
              {/* Desktop Layout - Original small icons */}
              <div className="hidden md:flex items-center gap-1">
                {canView && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                          onClick={() => viewAction(params.data)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>View agent details</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {canEdit && creatorUserId === userId && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:bg-green-50"
                          onClick={() => editAction(params.data)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit agent</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-purple-600 hover:bg-purple-50"
                        onClick={() => handleIntegrationClick(params.data)}
                      >
                        <Handshake className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View Integration Guide</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {canDelete && creatorUserId === userId && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteClick(params.data)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete agent</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Mobile Layout - Dropdown menu */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 p-0 border-gray-200 hover:bg-gray-50"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {canView && (
                      <DropdownMenuItem
                        onClick={() => viewAction(params.data)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                    )}

                    {canEdit && creatorUserId === userId && (
                      <DropdownMenuItem
                        onClick={() => editAction(params.data)}
                        className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 cursor-pointer"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Agent
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={() => handleIntegrationClick(params.data)}
                      className="flex items-center gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 cursor-pointer"
                    >
                      <Handshake className="h-4 w-4" />
                      Integration Guide
                    </DropdownMenuItem>

                    {canDelete && creatorUserId === userId && (
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(params.data)}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Agent
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        },
      },
    ],
    [viewAction, editAction, handleIntegrationClick, canView, canEdit, canDelete]
  );

  // Memoize the rowData to prevent unnecessary re-renders
  const rowData = useMemo(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  return (
    <>
      <TableComponent
        ref={tableRef}
        rowData={rowData}
        columnDefs={columnDefs}
        loading={loading}
      />

      <PaginationComponent
        currentPage={pagination.currentPage}
        pageSize={pagination.pageSize}
        totalItems={totalItems}
        totalPages={pagination.totalPages}
        pageSizeOptions={pagination.pageSizeOptions}
        onPageChange={pagination.setCurrentPage}
        onPageSizeChange={pagination.setPageSize}
      />

      {/* Integration Guide Dialog */}
      <TooltipProvider>
        <Dialog open={showGuide} onOpenChange={setShowGuide}>
          <DialogContent
            ref={contentRef}
            className="sm:max-w-[1024px] max-h-[80vh] overflow-hidden bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-gray-800"
          >
            <DialogHeader className="border-b pb-4">
              <DialogTitle className="text-2xl font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <Handshake className="h-6 w-6" />
                Integration Guide: KnowgenAI
              </DialogTitle>
              <DialogDescription className="text-base">
                Follow these steps to seamlessly integrate KnowgenAI into your
                website or application.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[calc(80vh-120px)]">
              <div className="space-y-6 p-4">
                <Alert className="border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                  <AlertTitle className="text-lg font-semibold">
                    🔒 Important Security Update
                  </AlertTitle>
                  <AlertDescription className="text-sm space-y-2">
                    <p><strong>New Session Token Mechanism:</strong> For enhanced security, our chat widget now uses session tokens instead of direct agent tokens.</p>
                    <p><strong>Server-Side Integration Required:</strong> You must implement server-side token exchange to obtain session tokens. Never expose agent tokens in client-side code.</p>
                    <p><strong>Benefits:</strong> Better security, token expiration control, and audit logging capabilities.</p>
                  </AlertDescription>
                </Alert>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 p-1 bg-purple-100 dark:bg-purple-900/30">
                    <TabsTrigger
                      value="iframe"
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300"
                    >
                      <div className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        <span>Iframe Implementation</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger
                      value="bubble"
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300"
                    >
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        <span>Bubble Chat Implementation</span>
                      </div>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="iframe" className="mt-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-purple-200 dark:border-purple-900 shadow-sm">
                      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-purple-700 dark:text-purple-300">
                        <Code className="h-5 w-5" />
                        Iframe Implementation with Session Tokens
                      </h3>
                      <ol className="list-inside space-y-6 ml-2">
                        <li className="text-sm">
                          <span className="font-medium text-base text-gray-800 dark:text-gray-200">
                            Step 1: Create a server-side endpoint to exchange your agent token for a session token:
                          </span>
                          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md text-sm relative group mt-2 border border-gray-200 dark:border-gray-700">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-purple-100 hover:bg-purple-200 text-purple-700"
                              onClick={() => {
                                navigator.clipboard.writeText(`// Example: Node.js/Express endpoint
app.post('/api/get-session-token', async (req, res) => {
  try {
    const response = await fetch('${process.env.NEXT_PUBLIC_APP_URL}/api/v1/session/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        agent_token: '${selectedAgent?.token}' // Your agent token (keep this secure!)
      }),
    });
    
    const sessionData = await response.json();
    res.json({ sessionToken: sessionData.data.session_token });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get session token' });
  }
});`);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <pre className="text-gray-800 dark:text-gray-200 overflow-x-auto">
                              {`// Example: Node.js/Express endpoint
app.post('/api/get-session-token', async (req, res) => {
  try {
    const response = await fetch('${process.env.NEXT_PUBLIC_APP_URL}/api/v1/session/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        agent_token: '${selectedAgent?.token}' // Your agent token (keep this secure!)
      }),
    });
    
    const sessionData = await response.json();
    res.json({ sessionToken: sessionData.data.session_token });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get session token' });
  }
});`}
                            </pre>
                          </div>
                        </li>
                        <li className="text-sm">
                          <span className="font-medium text-base text-gray-800 dark:text-gray-200">
                            Step 2: In your frontend, fetch the session token and create the iframe:
                          </span>
                          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md text-sm relative group mt-2 border border-gray-200 dark:border-gray-700">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-purple-100 hover:bg-purple-200 text-purple-700"
                              onClick={() => {
                                navigator.clipboard.writeText(`<script>
async function loadChatWidget() {
  try {
    // Fetch session token from your server
    const response = await fetch('/api/get-session-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    const sessionToken = data.sessionToken;
    
    // Create iframe with session token
    const iframe = document.createElement('iframe');
    iframe.src = '${process.env.NEXT_PUBLIC_APP_URL}/chat?token=' + encodeURIComponent(sessionToken);
    iframe.className = 'w-full h-full border-0';
    iframe.title = 'KnowgenAI Chat Widget';
    
    // Add iframe to your container
    document.getElementById('chat-container').appendChild(iframe);
  } catch (error) {
    console.error('Failed to load chat widget:', error);
  }
}

// Load the widget when page is ready
loadChatWidget();
</script>

<!-- HTML container for the chat widget -->
<div id="chat-container" style="width: 100%; height: 600px;"></div>`);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <pre className="text-gray-800 dark:text-gray-200 overflow-x-auto">
                              {`<script>
async function loadChatWidget() {
  try {
    // Fetch session token from your server
    const response = await fetch('/api/get-session-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    const sessionToken = data.sessionToken;
    
    // Create iframe with session token
    const iframe = document.createElement('iframe');
    iframe.src = '${process.env.NEXT_PUBLIC_APP_URL}/chat?token=' + encodeURIComponent(sessionToken);
    iframe.className = 'w-full h-full border-0';
    iframe.title = 'KnowgenAI Chat Widget';
    
    // Add iframe to your container
    document.getElementById('chat-container').appendChild(iframe);
  } catch (error) {
    console.error('Failed to load chat widget:', error);
  }
}

// Load the widget when page is ready
loadChatWidget();
</script>

<!-- HTML container for the chat widget -->
<div id="chat-container" style="width: 100%; height: 600px;"></div>`}
                            </pre>
                          </div>
                        </li>
                        <li className="text-sm">
                          <span className="font-medium text-base text-gray-800 dark:text-gray-200">
                            Step 3: Optional - Add custom styling for better integration:
                          </span>
                          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md text-sm relative group mt-2 border border-gray-200 dark:border-gray-700">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-purple-100 hover:bg-purple-200 text-purple-700"
                              onClick={() => {
                                navigator.clipboard.writeText(`<style>
#chat-container {
  width: 100%;
  height: 600px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  overflow: hidden;
  background: #f8f9fa;
}

#chat-container iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 12px;
}

/* Responsive design */
@media (max-width: 768px) {
  #chat-container {
    height: 500px;
    border-radius: 8px;
  }
}
</style>`);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <pre className="text-gray-800 dark:text-gray-200 overflow-x-auto">
                              {`<style>
#chat-container {
  width: 100%;
  height: 600px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  overflow: hidden;
  background: #f8f9fa;
}

#chat-container iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 12px;
}

/* Responsive design */
@media (max-width: 768px) {
  #chat-container {
    height: 500px;
    border-radius: 8px;
  }
}
</style>`}
                            </pre>
                          </div>
                        </li>
                      </ol>
                    </div>
                  </TabsContent>

                  <TabsContent value="bubble" className="mt-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-purple-200 dark:border-purple-900 shadow-sm">
                      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-purple-700 dark:text-purple-300">
                        <MessageCircle className="h-5 w-5" />
                        Bubble Chat Implementation with Session Tokens
                      </h3>
                      <ol className="list-inside space-y-6 ml-2">
                        <li className="text-sm">
                          <span className="font-medium text-base text-gray-800 dark:text-gray-200">
                            Step 1: Create a server-side endpoint to exchange your agent token for a session token:
                          </span>
                          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md text-sm relative group mt-2 border border-gray-200 dark:border-gray-700">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-purple-100 hover:bg-purple-200 text-purple-700"
                              onClick={() => {
                                navigator.clipboard.writeText(`// Example: Node.js/Express endpoint
app.post('/api/get-session-token', async (req, res) => {
  try {
    const response = await fetch('${process.env.NEXT_PUBLIC_APP_URL}/api/v1/session/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        agent_token: '${selectedAgent?.token}' // Your agent token (keep this secure!)
      }),
    });
    
    const sessionData = await response.json();
    res.json({ sessionToken: sessionData.data.session_token });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get session token' });
  }
});`);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <pre className="text-gray-800 dark:text-gray-200 overflow-x-auto">
                              {`// Example: Node.js/Express endpoint
app.post('/api/get-session-token', async (req, res) => {
  try {
    const response = await fetch('${process.env.NEXT_PUBLIC_APP_URL}/api/v1/session/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        agent_token: '${selectedAgent?.token}' // Your agent token (keep this secure!)
      }),
    });
    
    const sessionData = await response.json();
    res.json({ sessionToken: sessionData.data.session_token });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get session token' });
  }
});`}
                            </pre>
                          </div>
                        </li>

                        <li className="text-sm">
                          <span className="font-medium text-base text-gray-800 dark:text-gray-200">
                            Step 2: Add the chat widget script and initialize with session token:
                          </span>
                          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md text-sm relative group mt-2 border border-gray-200 dark:border-gray-700">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-purple-100 hover:bg-purple-200 text-purple-700"
                              onClick={() => {
                                navigator.clipboard.writeText(`<script src="${process.env.NEXT_PUBLIC_APP_URL}/chat-widget.js"></script>
<script id="chat-widget-init">
async function initializeChatWidget() {
  try {
    // Fetch session token from your server
    const response = await fetch('/api/get-session-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    const sessionToken = data.sessionToken;
    
    // Initialize chat widget with session token
    setTimeout(() => {
      if (typeof ChatWidget !== 'undefined') {
        ChatWidget.init(sessionToken);
      }
    }, 1000);
  } catch (error) {
    console.error('Failed to initialize chat widget:', error);
  }
}

// Initialize when page loads
initializeChatWidget();
</script>`);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <pre className="text-gray-800 dark:text-gray-200 overflow-x-auto">
                              {`<script src="${process.env.NEXT_PUBLIC_APP_URL}/chat-widget.js"></script>
<script id="chat-widget-init">
async function initializeChatWidget() {
  try {
    // Fetch session token from your server
    const response = await fetch('/api/get-session-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    const sessionToken = data.sessionToken;
    
    // Initialize chat widget with session token
    setTimeout(() => {
      if (typeof ChatWidget !== 'undefined') {
        ChatWidget.init(sessionToken);
      }
    }, 1000);
  } catch (error) {
    console.error('Failed to initialize chat widget:', error);
  }
}

// Initialize when page loads
initializeChatWidget();
</script>`}
                            </pre>
                          </div>
                        </li>

                        <li className="text-sm">
                          <span className="font-medium text-base text-gray-800 dark:text-gray-200">
                            Step 3: Customize the bubble chat appearance (optional):
                          </span>
                          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md text-sm relative group mt-2 border border-gray-200 dark:border-gray-700">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-purple-100 hover:bg-purple-200 text-purple-700"
                              onClick={() => {
                                navigator.clipboard.writeText(`<style>
  .btn-trigger-chat {
    /* Custom styles for the chat bubble */
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
  }
  .btn-trigger-chat:hover {
    /* Custom styles for the chat bubble when hovered */
    transform: scale(1.1);
    box-shadow: 0 6px 25px rgba(0,0,0,0.2);
  }
  .btn-trigger-chat svg {
    /* Custom styles for the chat bubble svg styling */
    color: white;
    width: 24px;
    height: 24px;
  }
</style>`);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <pre className="text-gray-800 dark:text-gray-200 overflow-x-auto">
                              {`<style>
  .btn-trigger-chat {
    /* Custom styles for the chat bubble */
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
  }
  .btn-trigger-chat:hover {
    /* Custom styles for the chat bubble when hovered */
    transform: scale(1.1);
    box-shadow: 0 6px 25px rgba(0,0,0,0.2);
  }
  .btn-trigger-chat svg {
    /* Custom styles for the chat bubble svg styling */
    color: white;
    width: 24px;
    height: 24px;
  }
</style>`}
                            </pre>
                          </div>
                        </li>

                        <li className="text-sm">
                          <span className="font-medium text-base text-gray-800 dark:text-gray-200">
                            The bubble chat will appear in the bottom-right corner of your website with secure session-based authentication.
                          </span>
                        </li>
                      </ol>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Security Notes Section */}
                <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-lg border border-amber-200 dark:border-amber-800 shadow-sm">
                  <h3 className="text-xl font-semibold mb-4 text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Best Practices
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                          Never expose your agent token in client-side code
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Your agent token should only be used on your server. The new session token mechanism ensures your agent token remains secure on your backend.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                          Session tokens are temporary and secure
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Session tokens expire automatically and can only be used for chat sessions, providing an additional layer of security.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                          Implement proper error handling
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Always handle cases where session token exchange fails and provide appropriate fallbacks for your users.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                          Use HTTPS for all communications
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Ensure all API calls to exchange tokens and load chat widgets are made over secure HTTPS connections.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-purple-200 dark:border-purple-900 shadow-sm">
                  <h3 className="text-xl font-semibold mb-4 text-purple-700 dark:text-purple-300">
                    {activeTab === "bubble" ? "Bubble Chat Preview" : "Preview Implementation"}
                  </h3>
                  <div className="flex justify-center">
                    {activeTab === "bubble" ? (
                      <div className="relative">
                        <div className="bg-gray-100 dark:bg-gray-900 p-8 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                          <div className="text-center text-gray-600 dark:text-gray-400 mb-4">
                            <p className="text-sm">Bubble chat will appear in the bottom-right corner</p>
                          </div>
                          <div className="relative w-80 h-60 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                            <div className="absolute bottom-4 right-4">
                              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer">
                                <MessageCircle className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                              Your website content
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <IframeWidget
                        token={selectedAgent?.token || ""}
                        iframeSrc={`${process.env.NEXT_PUBLIC_APP_URL}/chat`}
                      />
                    )}
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-lg border border-green-200 dark:border-green-800 shadow-sm">
                  <h3 className="text-xl font-semibold mb-2 text-green-700 dark:text-green-300 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Need Help?
                  </h3>
                  <p className="text-green-700 dark:text-green-300">
                    If you need assistance with integration or have any
                    questions, please contact our support team at{" "}
                    <span className="font-semibold">support@knowgenai.com</span>
                  </p>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </TooltipProvider>

      {/* Delete Confirmation Dialog - Updated to match other components */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Agent
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this agent? This action cannot be
              undone and will permanently remove the agent and all its
              associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800 text-sm">
            <p className="font-medium">{agentToDelete?.agentName}</p>
            <p className="text-muted-foreground mt-1  line-clamp-5">
              {agentToDelete?.description || "No description provided"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant={agentToDelete?.token ? "success" : "secondary"}
                className="text-xs"
              >
                {agentToDelete?.token ? "Active" : "Inactive"}
              </Badge>
              {agentToDelete?.token && (
                <span className="text-xs text-muted-foreground">
                  • Token: {agentToDelete.token.substring(0, 8)}...
                </span>
              )}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};