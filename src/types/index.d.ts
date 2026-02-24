import type { Account, Profile, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { LucideProps } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  disabled?: boolean;
}

export interface NavItemFooter {
  title: string;
  items: {
    title: string;
    href: string;
    external?: boolean;
  }[];
}

export interface SessionCallbackParams {
  session: Session;
  token: JWT;
  user: User;
}

export interface JWTCallbackParams {
  token: JWT;
  user?: User | undefined;
  account?: Account | null | undefined;
  profile?: Profile | undefined;
  isNewUser?: boolean | undefined;
}

export interface Feature {
  title: string;
  description: string;
  image: string;
}

export interface ACLItem {
  id: string;
  menuType: string;
  role: string;
  create: boolean;
  update: boolean;
  delete: boolean;
  read: boolean;
}

export interface Submenu {
  href: string;
  label: string;
  active: boolean;
}

export interface Menu {
  href: string;
  label: string;
  active: boolean;
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
  submenus: Submenu[];
  constant: string;
}

export interface Group {
  groupLabel?: string;
  menus: Menu[];
}

export interface FrequentlyAskedQuestion {
  question: string;
  answer: string;
}

export interface ParsedChat {
  id: string;
  createdAt: Date;
  messages: ChatMessage[];
  userId: string;
  agentId?: string;
  topic?: string;
}

export interface Action<T> {
  setSelectedData: (obj: State<T>["selectedData"]) => void;
  getList: (obj?: {
    offset: number;
    limit: number | string;
    filters?: any;
    queryParams?: Record<string, any>;
    role?: string;
  }) => Promise<T[]>;
  getDetail: (id: string) => void | Promise<T>;
  create: (obj: T) => void | Promise<T>;
  update: (obj: T) => void | Promise<T>;
  delete: (id: string) => void;
  makeCustomEndpointRequest?: (params: {
    path: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    data?: any;
    queryParams?: Record<string, any>;
    customKey?: string;
  }) => Promise<any>;
}

export interface ActionUpload<T> {
  setSelectedData: (obj: State<T>["selectedData"]) => void;
  getList: (obj: { offset: number; limit: number }) => void;
  getDetail: (id: string) => void | Promise<T>;
  create: (obj: T, file: File) => void;
  update: (obj: T) => void;
  delete: (id: string) => void;
}

export interface PayloadParameters {
  offset: number;
  limit: number;
  filters: string;
  ordering: string;
}

export interface IframeWidgetProps {
  token: string;
  iframeSrc: string;
}

export interface ReplyData {
  messageId: string;
  content: string;
  role: "user" | "assistant" | "system" | "data";

  senderName?: string;
  timestamp?: Date;
}

export interface ExtendedMessage extends Message {
  replyTo?: ReplyData;
}

type MimeType =
  | "application/vnd.google-apps.audio"
  | "application/vnd.google-apps.document"
  | "application/vnd.google-apps.drive-sdk"
  | "application/vnd.google-apps.drawing"
  | "application/vnd.google-apps.file"
  | "application/vnd.google-apps.folder"
  | "application/vnd.google-apps.form"
  | "application/vnd.google-apps.fusiontable"
  | "application/vnd.google-apps.jam"
  | "application/vnd.google-apps.mail-layout"
  | "application/vnd.google-apps.map"
  | "application/vnd.google-apps.photo"
  | "application/vnd.google-apps.presentation"
  | "application/vnd.google-apps.script"
  | "application/vnd.google-apps.shortcut"
  | "application/vnd.google-apps.site"
  | "application/vnd.google-apps.spreadsheet"
  | "application/vnd.google-apps.unknown"
  | "application/vnd.google-apps.vid"
  | "application/vnd.google-apps.video"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "image/jpeg"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "application/vnd.google-apps.spreadsheet"
  | "application/vnd.google-apps.folder"
  | "image/dng"
  | "application/vnd.google-apps.document"
  | "application/vnd.google-apps.form"
  | "application/pdf"
  | "image/png"
  | "application/x-zip-compressed"
  | "application/vnd.ms-excel.sheet.macroenabled.12"
  | "audio/mp4"
  | "video/mp4"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/rar"
  | "application/vnd.jgraph.mxfile"
  | "image/webp"
  | "text/x-vcard"
  | "application/vnd.google-apps.shortcut"
  | "application/x-zip"
  | "text/markdown"
  | "application/zip"
  | "audio/mpeg"
  | "text/plain"
  | "application/vnd.android.package-archive";

interface Files {
  parents: string[];
  id: string;
  name: string;
  mimeType: MimeType;
  iconLink: string;
  exportLinks?: Record<string, string>;
  fileExtension: string;
  modifiedTime: string;
  size: number;
}

interface GetListParams {
  offset: number;
  limit: number | string;
  filters?: any;
  queryParams?: Record<string, any>;
}
