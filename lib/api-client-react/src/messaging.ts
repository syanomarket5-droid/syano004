import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  MutationFunction,
  QueryFunction,
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { ErrorType } from "./custom-fetch";

/* ── Types ───────────────────────────────────────────────────── */

export interface ConversationMessage {
  id: number;
  senderId: number;
  senderName: string;
  body: string;
  readAt: string | null;
  flagged: boolean;
  createdAt: string;
}

export interface Conversation {
  id: number;
  customerId: number;
  sellerId: number;
  productId: number | null;
  status: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  productName: string | null;
  sellerName: string;
}

export interface StartConversationResponse {
  conversation: ConversationWithMessages;
  messages: ConversationMessage[];
}

export interface ConversationListItem {
  id: number;
  customerId: number;
  sellerId: number;
  productId: number | null;
  status: string;
  partnerName: string;
  lastMessage: { body: string; senderId: number; createdAt: string } | null;
  unreadCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export interface StartConversationBody {
  sellerId: number;
  productId?: number;
}

export interface SendMessageBody {
  body: string;
}

/* ── Start / Get Conversation ────────────────────────────────── */

export const startConversation = async (
  body: StartConversationBody
): Promise<StartConversationResponse> =>
  customFetch<StartConversationResponse>("/api/conversations", {
    method: "POST",
    body: JSON.stringify(body),
  });

export function useStartConversation(
  options?: UseMutationOptions<StartConversationResponse, ErrorType<unknown>, StartConversationBody>
): UseMutationResult<StartConversationResponse, ErrorType<unknown>, StartConversationBody> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => startConversation(body),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: getConversationsQueryKey() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

/* ── List Conversations ──────────────────────────────────────── */

export const getConversationsQueryKey = () => ["/api/conversations"] as const;

export const getConversations = async (
  options?: RequestInit
): Promise<ConversationListItem[]> =>
  customFetch<ConversationListItem[]>("/api/conversations", { ...options, method: "GET" });

export function useGetConversations<TData = ConversationListItem[], TError = ErrorType<unknown>>(
  options?: { query?: UseQueryOptions<ConversationListItem[], TError, TData>; request?: RequestInit }
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const { query: queryOptions, request } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getConversationsQueryKey();
  const queryFn: QueryFunction<ConversationListItem[]> = ({ signal }) =>
    getConversations({ signal, ...request });
  const query = useQuery({
    queryKey,
    queryFn,
    refetchInterval: 15_000,
    ...queryOptions,
  });
  return { ...query, queryKey };
}

/* ── Get Messages ────────────────────────────────────────────── */

export const getMessagesUrl = (convId: number) => `/api/conversations/${convId}/messages` as const;

export const getMessagesQueryKey = (convId: number) => [getMessagesUrl(convId)] as const;

export const getMessages = async (
  convId: number,
  options?: RequestInit
): Promise<ConversationMessage[]> =>
  customFetch<ConversationMessage[]>(getMessagesUrl(convId), { ...options, method: "GET" });

export function useGetMessages<TData = ConversationMessage[], TError = ErrorType<unknown>>(
  convId: number,
  options?: { query?: UseQueryOptions<ConversationMessage[], TError, TData>; request?: RequestInit }
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const { query: queryOptions, request } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getMessagesQueryKey(convId);
  const queryFn: QueryFunction<ConversationMessage[]> = ({ signal }) =>
    getMessages(convId, { signal, ...request });
  const query = useQuery({
    queryKey,
    queryFn,
    enabled: !!convId,
    refetchInterval: 8_000,
    ...queryOptions,
  });
  return { ...query, queryKey };
}

/* ── Send Message ────────────────────────────────────────────── */

export const sendMessage = async (
  convId: number,
  body: SendMessageBody
): Promise<ConversationMessage> =>
  customFetch<ConversationMessage>(`/api/conversations/${convId}/messages`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export function useSendMessage(
  convId: number,
  options?: UseMutationOptions<ConversationMessage, ErrorType<unknown>, SendMessageBody>
): UseMutationResult<ConversationMessage, ErrorType<unknown>, SendMessageBody> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => sendMessage(convId, body),
    onSuccess: (msg, ...rest) => {
      qc.setQueryData(
        getMessagesQueryKey(convId),
        (prev: ConversationMessage[] | undefined) => [...(prev ?? []), msg]
      );
      qc.invalidateQueries({ queryKey: getConversationsQueryKey() });
      options?.onSuccess?.(msg, ...rest);
    },
    ...options,
  });
}
