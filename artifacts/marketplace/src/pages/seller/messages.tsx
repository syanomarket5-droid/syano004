import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, Send, ArrowLeft, ArrowRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Navbar } from "@/components/Navbar";
import { SellerNav } from "@/components/SellerNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGetConversations,
  getConversationsQueryKey,
  useGetMessages,
  getMessagesQueryKey,
  useSendMessage,
  type ConversationListItem,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

function ConvItem({
  conv,
  active,
  userId,
  onClick,
}: {
  conv: ConversationListItem;
  active: boolean;
  userId: number;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const lastMsg = conv.lastMessage;
  const isMine = lastMsg?.senderId === userId;
  return (
    <button
      onClick={onClick}
      className={`w-full text-start p-3.5 rounded-xl border transition-all ${
        active ? "border-primary/40 bg-primary/5" : "border-transparent hover:bg-muted/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
          {conv.partnerName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-sm font-semibold truncate">{conv.partnerName}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {conv.unreadCount > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                  {conv.unreadCount}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          {lastMsg && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {isMine ? t("messages.you_prefix") : ""}{lastMsg.body}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ msg, isMine }: { msg: any; isMine: boolean }) {
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isMine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        }`}
      >
        <p>{msg.body}</p>
        <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function MessageThread({ conv, userId }: { conv: ConversationListItem; userId: number }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const { data: messages = [], isLoading } = useGetMessages(conv.id, {
    query: { refetchInterval: 3000, refetchIntervalInBackground: false, queryKey: getMessagesQueryKey(conv.id) },
  });
  const sendMut = useSendMessage(conv.id);

  useEffect(() => { isInitialLoadRef.current = true; }, [conv.id]);
  useEffect(() => {
    if (messages.length === 0) return;
    if (isInitialLoadRef.current) { isInitialLoadRef.current = false; return; }
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setBody("");
    sendMut.mutate(
      { body: trimmed },
      {
        onError: () => {
          setBody(trimmed);
          toast({
            title: t("messages.error_send_title"),
            description: t("messages.error_send_desc"),
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3 bg-card shrink-0">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
          {conv.partnerName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-sm">{conv.partnerName}</p>
          <p className="text-xs text-muted-foreground">{t("messages.customer_label")}</p>
        </div>
      </div>

      {/* Messages — only this scrolls */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-48 rounded-2xl self-start" />
            <Skeleton className="h-10 w-64 rounded-2xl self-end" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-10">
            <MessageCircle className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">{t("messages.no_messages")}</p>
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} msg={m} isMine={m.senderId === userId} />
          ))
        )}
      </div>

      {/* Input — always anchored at bottom, never clipped */}
      <div className="p-3 border-t bg-card shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKey}
            placeholder={t("messages.type_message")}
            className="flex-1 resize-none rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[44px] max-h-32"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!body.trim() || sendMut.isPending}
            size="icon"
            className="h-11 w-11 rounded-xl shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SellerMessagesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const { data: conversations = [], isLoading } = useGetConversations({
    query: { refetchInterval: 5000, refetchIntervalInBackground: false, queryKey: getConversationsQueryKey() },
  });
  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;

  /*
   * WhatsApp-style full-viewport layout for seller messages.
   * Navbar + SellerNav are both shrink-0 — their real heights
   * are automatically subtracted by flexbox, zero pixel math needed.
   *
   *  ┌─────────────────────────────────────────┐  ← 100dvh
   *  │ <Navbar />                  shrink-0    │
   *  │ <SellerNav />               shrink-0    │  ← real height auto-accounted
   *  ├─────────────────────────────────────────┤
   *  │ <main>  flex-1 overflow-hidden          │  ← fills remaining dvh exactly
   *  │  title row               shrink-0       │
   *  │  chat panel  flex-1 min-h-0             │
   *  │    sidebar │ header      shrink-0        │
   *  │            │ messages    flex-1 scroll   │  ← ONLY this scrolls
   *  │            │ input bar   shrink-0        │  ← always visible
   *  └─────────────────────────────────────────┘
   *
   * No <Footer /> — footer must never affect chat height.
   * No calc(100vh - Xpx) — no hardcoded pixel offsets.
   */
  return (
    <div
      className="flex flex-col overflow-hidden bg-background text-foreground"
      style={{ height: "100dvh" }}
    >
      <Navbar />
      <SellerNav />

      <main className="flex-1 overflow-hidden flex flex-col min-w-0 min-h-0">
        <div className="flex-1 overflow-hidden flex flex-col p-4 min-h-0 max-w-6xl mx-auto w-full">

          {/* Page title */}
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">{t("messages.seller_inbox_title")}</h1>
          </div>

          {/* Chat panel — flex-1 min-h-0 fills remaining space without pixel math */}
          <div className="flex-1 min-h-0 border rounded-2xl overflow-hidden bg-card">
            <div className="flex h-full">

              {/* Sidebar */}
              <div className={`w-full sm:w-80 border-r flex flex-col shrink-0 ${activeConv ? "hidden sm:flex" : "flex"}`}>
                <div className="p-3 border-b shrink-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("messages.conv_count_other", { count: conversations.length })}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
                  {isLoading
                    ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
                    : conversations.length === 0
                    ? (
                      <div className="text-center py-12 text-muted-foreground px-4">
                        <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">{t("messages.no_conversations")}</p>
                        <p className="text-xs mt-1">{t("messages.seller_no_conv_hint")}</p>
                      </div>
                    )
                    : conversations.map((c) => (
                      <ConvItem
                        key={c.id}
                        conv={c}
                        active={c.id === activeConvId}
                        userId={user?.id ?? 0}
                        onClick={() => setActiveConvId(c.id)}
                      />
                    ))}
                </div>
              </div>

              {/* Thread */}
              <div className={`flex-1 min-w-0 min-h-0 ${activeConv ? "flex" : "hidden sm:flex"} flex-col overflow-hidden`}>
                {activeConv ? (
                  <>
                    <div className="sm:hidden p-2 border-b shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => setActiveConvId(null)} className="gap-1.5">
                        <span className="rtl:hidden"><ArrowLeft className="h-4 w-4" /></span>
                        <span className="ltr:hidden"><ArrowRight className="h-4 w-4" /></span>
                        {t("messages.back")}
                      </Button>
                    </div>
                    <MessageThread conv={activeConv} userId={user?.id ?? 0} />
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                    <MessageCircle className="h-14 w-14 mb-4 opacity-20" />
                    <p className="font-semibold">{t("messages.select_conversation")}</p>
                    <p className="text-sm mt-1 text-center max-w-xs">
                      {t("messages.seller_select_hint")}
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
