'use client'

// src\components\chat\history.tsx
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { toast } from '@/hooks/use-toast'
import useSWR from 'swr'
import { InfoIcon, MenuIcon, MoreHorizontalIcon, PencilEditIcon, TrashIcon } from './icons'
import { Skeleton } from '../ui/loading-skeletons/skeleton-base'

import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@radix-ui/react-accordion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/utils'
import { useRouter } from 'nextjs-toploader/app';
import { Icons } from '../icons'
import { Data } from '@/stores/agent/model'


interface HistoryProps {
  currentChatId?: string
  onSelectChat: (id: string) => Promise<void>
  onNewChat: () => void
  handleAgentSelect: (agentName: string, agentId: string) => void
  agents: Data[]
  selectedAgentName: string
  isAgentLoading: boolean
}

interface MessagePart {
  type: 'text' | 'reasoning'
  text: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  parts?: MessagePart[]
  experimental_attachments?: any[]
  toolInvocations?: any[]
}

interface StoredChat {
  id: string
  createdAt: Date
  messages: string // JSON string from database
  userId: string
}

interface ParsedChat {
  id: string
  createdAt: Date
  messages: ChatMessage[]
  userId: string
}

interface GroupedChats {
  today: ParsedChat[]
  yesterday: ParsedChat[]
  previousWeek: ParsedChat[]
  older: ParsedChat[]
}

// Helper function to extract text from parts (AI SDK 5.0)
const getTextFromParts = (message: ChatMessage | undefined): string => {
  if (!message || !message.parts || message.parts.length === 0) {
    return ''
  }

  // Extract text from all text parts
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join(' ')
}

const parseChatMessages = (chat: StoredChat): ParsedChat => {
  return {
    ...chat,
    messages: JSON.parse(chat.messages),
  }
}

const groupChatsByDate = (chats: ParsedChat[]): GroupedChats => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const previousWeek = new Date(today)
  previousWeek.setDate(previousWeek.getDate() - 7)

  return {
    today: chats.filter((chat) => {
      const chatDate = new Date(chat.createdAt)
      chatDate.setHours(0, 0, 0, 0)
      return chatDate.getTime() === today.getTime()
    }),
    yesterday: chats.filter((chat) => {
      const chatDate = new Date(chat.createdAt)
      chatDate.setHours(0, 0, 0, 0)
      return chatDate.getTime() === yesterday.getTime()
    }),
    previousWeek: chats.filter((chat) => {
      const chatDate = new Date(chat.createdAt)
      chatDate.setHours(0, 0, 0, 0)
      return chatDate > previousWeek && chatDate < yesterday
    }),
    older: chats.filter((chat) => {
      const chatDate = new Date(chat.createdAt)
      chatDate.setHours(0, 0, 0, 0)
      return chatDate <= previousWeek
    }),
  }
}

export const History = ({
  currentChatId,
  onSelectChat,
  onNewChat,
  handleAgentSelect,
  agents,
  selectedAgentName,
  isAgentLoading,
}: HistoryProps) => {
  const { data: session } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isHistoryVisible, setIsHistoryVisible] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  // Parse the raw history data
  

  const { data: rawHistory, isLoading, mutate } = useSWR<StoredChat[]>(
    session?.user ? '/api/chat' : null,
    async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch data')
      return res.json()
    }
  )

  const history = rawHistory?.map(parseChatMessages)
  const groupedChats = history ? groupChatsByDate(history) : null

  const handleDelete = async () => {
    if (!deleteId || !session?.user) return

    try {
      const response = await fetch(`/api/chat/${deleteId}`, {
        method: 'PUT',
      })
      if (!response.ok) throw new Error('Failed to delete chat')

      await mutate()
      setShowDeleteDialog(false)
      if (deleteId === currentChatId) {
        router.push('/chatbot')
      }

      toast({
        title: 'Success',
        description: 'Chat deleted successfully',
      })
    } catch (error) {
      console.log(error);
      toast({
        title: 'Error',
        description: 'Failed to delete chat',
        variant: 'destructive',
      })
    }
  }

  const handleSelectChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch chat');
      }

      const chat = await response.json();

      if (chat.agent) {
        handleAgentSelect(chat.agent.agentName || 'Default Agent', chat.agent.id || '');
      }

      await onSelectChat(chatId)
    } catch (error) {
      console.log(error);
      toast({
        title: 'Error',
        description: 'Failed to load chat',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="p-1.5 h-fit"
        onClick={() => setIsHistoryVisible(true)}
      >
        <MenuIcon />
      </Button>

      <Sheet
        open={isHistoryVisible}
        onOpenChange={(state) => setIsHistoryVisible(state)}
      >
        <SheetContent side="left" className="p-3 w-80 bg-muted">
          <SheetHeader>
            <VisuallyHidden.Root>
              <SheetTitle className="text-left">History</SheetTitle>
              <SheetDescription className="text-left">
                {history === undefined ? "loading" : history.length} chats
              </SheetDescription>
            </VisuallyHidden.Root>
          </SheetHeader>

          <div className="text-sm flex flex-row items-center justify-between">
            <div className="flex flex-row gap-2">
              <div className="dark:text-zinc-300">History</div>
              <div className="dark:text-zinc-400 text-zinc-500">
                {history === undefined ? "loading" : history.length} chats
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col">
            {session?.user && (
              <Button
                className="font-normal text-sm flex flex-row justify-between text-white"
                onClick={onNewChat}
              >
                <div>Start a new chat</div>
                <PencilEditIcon size={14} />
              </Button>
            )}

            <div className="flex flex-col overflow-y-scroll p-1 h-[calc(100dvh-124px)]">
              {!session?.user ? (
                <div className="text-zinc-500 h-dvh w-full flex flex-row justify-center items-center text-sm gap-2">
                  <InfoIcon />
                  <div>Login to save and revisit previous chats!</div>
                </div>
              ) : null}

              {!isLoading && history?.length === 0 && session?.user ? (
                <div className="text-zinc-500 h-dvh w-full flex flex-row justify-center items-center text-sm gap-2">
                  <InfoIcon />
                  <div>No chats found</div>
                </div>
              ) : null}

              {isLoading && session?.user ? (
                <div className="flex flex-col gap-2 p-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-1 p-2 rounded-md bg-zinc-50 dark:bg-zinc-900/50">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2 opacity-50" />
                    </div>
                  ))}
                </div>
              ) : null}


              {!isLoading && groupedChats && session?.user && (
                <Accordion
                  type="multiple"
                  defaultValue={['today', 'yesterday', 'previousWeek']}
                >
                  {groupedChats.today.length > 0 && (
                    <AccordionItem value="today">
                      <AccordionTrigger className="my-4 text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                        Today
                      </AccordionTrigger>
                      <AccordionContent>
                        {groupedChats.today.map((chat) => (
                          <div
                            key={chat.id}
                            className={cn(
                              "flex flex-row items-center gap-6 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md pr-2",
                              { "bg-zinc-200 dark:bg-zinc-700": chat.id === currentChatId }
                            )}
                          >
                            <Button
                              variant="ghost"
                              className={cn(
                                "hover:bg-zinc-200 dark:hover:bg-zinc-700 justify-between p-0 text-sm font-normal flex flex-row items-center gap-2 pr-2 w-full transition-none"
                              )}
                              onClick={() => handleSelectChat(chat.id)}
                            >
                              <div className="text-ellipsis overflow-hidden text-left py-2 pl-2 rounded-lg outline-zinc-900">
                                {getTextFromParts(chat.messages[0]) || 'New Chat'}
                              </div>
                            </Button>

                            <DropdownMenu modal={true}>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  className="p-0 h-fit font-normal text-zinc-500 transition-none hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                  variant="ghost"
                                >
                                  <MoreHorizontalIcon />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent side="left" className="z-[60]">
                                <DropdownMenuItem asChild>
                                  <Button
                                    className="flex flex-row gap-2 items-center justify-start w-full h-fit font-normal p-1.5 rounded-sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setDeleteId(chat.id)
                                      setShowDeleteDialog(true)
                                    }}
                                  >
                                    <TrashIcon />
                                    <div>Delete</div>
                                  </Button>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {groupedChats.yesterday.length > 0 && (
                    <AccordionItem value="yesterday">
                      <AccordionTrigger className="my-4 text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                        Yesterday
                      </AccordionTrigger>
                      <AccordionContent>
                        {groupedChats.yesterday.map((chat) => (
                          <div
                            key={chat.id}
                            className={cn(
                              "flex flex-row items-center gap-6 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md pr-2",
                              { "bg-zinc-200 dark:bg-zinc-700": chat.id === currentChatId }
                            )}
                          >
                            <Button
                              variant="ghost"
                              className={cn(
                                "hover:bg-zinc-200 dark:hover:bg-zinc-700 justify-between p-0 text-sm font-normal flex flex-row items-center gap-2 pr-2 w-full transition-none"
                              )}
                              onClick={() => handleSelectChat(chat.id)}
                            >
                              <div className="text-ellipsis overflow-hidden text-left py-2 pl-2 rounded-lg outline-zinc-900">
                                {getTextFromParts(chat.messages[0]) || 'New Chat'}
                              </div>
                            </Button>

                            <DropdownMenu modal={true}>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  className="p-0 h-fit font-normal text-zinc-500 transition-none hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                  variant="ghost"
                                >
                                  <MoreHorizontalIcon />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent side="left" className="z-[60]">
                                <DropdownMenuItem asChild>
                                  <Button
                                    className="flex flex-row gap-2 items-center justify-start w-full h-fit font-normal p-1.5 rounded-sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setDeleteId(chat.id)
                                      setShowDeleteDialog(true)
                                    }}
                                  >
                                    <TrashIcon />
                                    <div>Delete</div>
                                  </Button>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {groupedChats.previousWeek.length > 0 && (
                    <AccordionItem value="previousWeek">
                      <AccordionTrigger className="my-4 text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                        Previous 7 Days
                      </AccordionTrigger>
                      <AccordionContent>
                        {groupedChats.previousWeek.map((chat) => (
                          <div
                            key={chat.id}
                            className={cn(
                              "flex flex-row items-center gap-6 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md pr-2",
                              { "bg-zinc-200 dark:bg-zinc-700": chat.id === currentChatId }
                            )}
                          >
                            <Button
                              variant="ghost"
                              className={cn(
                                "hover:bg-zinc-200 dark:hover:bg-zinc-700 justify-between p-0 text-sm font-normal flex flex-row items-center gap-2 pr-2 w-full transition-none"
                              )}
                              onClick={() => handleSelectChat(chat.id)}
                            >
                              <div className="text-ellipsis overflow-hidden text-left py-2 pl-2 rounded-lg outline-zinc-900">
                                {getTextFromParts(chat.messages[0]) || 'New Chat'}
                              </div>
                            </Button>

                            <DropdownMenu modal={true}>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  className="p-0 h-fit font-normal text-zinc-500 transition-none hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                  variant="ghost"
                                >
                                  <MoreHorizontalIcon />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent side="left" className="z-[60]">
                                <DropdownMenuItem asChild>
                                  <Button
                                    className="flex flex-row gap-2 items-center justify-start w-full h-fit font-normal p-1.5 rounded-sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setDeleteId(chat.id)
                                      setShowDeleteDialog(true)
                                    }}
                                  >
                                    <TrashIcon />
                                    <div>Delete</div>
                                  </Button>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {groupedChats.older.length > 0 && (
                    <AccordionItem value="older">
                      <AccordionTrigger className="my-4 text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                        Older
                      </AccordionTrigger>
                      <AccordionContent>
                        {groupedChats.older.map((chat) => (
                          <div
                            key={chat.id}
                            className={cn(
                              "flex flex-row items-center gap-6 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md pr-2",
                              { "bg-zinc-200 dark:bg-zinc-700": chat.id === currentChatId }
                            )}
                          >
                            <Button
                              variant="ghost"
                              className={cn(
                                "hover:bg-zinc-200 dark:hover:bg-zinc-700 justify-between p-0 text-sm font-normal flex flex-row items-center gap-2 pr-2 w-full transition-none"
                              )}
                              onClick={() => handleSelectChat(chat.id)}
                            >
                              <div className="text-ellipsis overflow-hidden text-left py-2 pl-2 rounded-lg outline-zinc-900">
                                {getTextFromParts(chat.messages[0]) || 'New Chat'}
                              </div>
                            </Button>

                            <DropdownMenu modal={true}>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  className="p-0 h-fit font-normal text-zinc-500 transition-none hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                  variant="ghost"
                                >
                                  <MoreHorizontalIcon />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent side="left" className="z-[60]">
                                <DropdownMenuItem asChild>
                                  <Button
                                    className="flex flex-row gap-2 items-center justify-start w-full h-fit font-normal p-1.5 rounded-sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setDeleteId(chat.id)
                                      setShowDeleteDialog(true)
                                    }}
                                  >
                                    <TrashIcon />
                                    <div>Delete</div>
                                  </Button>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              )}
            </div>
          </div>

          <div className="mt-4 sticky bottom-4 bg-background pt-2">
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left text-xs font-medium"
                >
                  {isAgentLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2" />
                      Loading agents...
                    </>
                  ) : (
                    <>
                      <Icons.SettingsIcon className="mr-2 h-4 w-4" />
                      {`Selected Agent: ${selectedAgentName}`}
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px]">
                <div className="px-2 py-2">
                  <input
                    type="text"
                    placeholder="Search agents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {isAgentLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
                    </div>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => handleAgentSelect('Default Agent', '')}>
                        Default Agent
                      </DropdownMenuItem>
                      {agents
                        .filter((agent) =>
                          agent.agentName?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((agent) => (
                          <DropdownMenuItem
                            key={agent.id}
                            onClick={() => handleAgentSelect(agent.agentName || '', agent.id || '')}
                          >
                            {agent.agentName}
                          </DropdownMenuItem>
                        ))}
                    </>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your chat and remove it
              from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}