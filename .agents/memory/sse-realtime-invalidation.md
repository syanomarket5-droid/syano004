---
name: SSE real-time query invalidation
description: NotificationProvider invalidates conversation/order queries on SSE events
---

## Rule
When SSE delivers a notification, invalidate the related React Query caches so the UI updates without a manual refresh.

## How to apply
In `NotificationProvider.tsx` `es.onmessage`, after the toast logic:
```ts
const type = (notif as any).type as string | undefined;
if (type === "new_message") {
  queryClient.invalidateQueries({ queryKey: getConversationsQueryKey() });
  queryClient.invalidateQueries({
    predicate: (q) => Array.isArray(q.queryKey) && typeof q.queryKey[0] === "string"
      && q.queryKey[0].startsWith("/api/conversations/"),
  });
} else if (ORDER_TYPES.includes(type)) {
  queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
}
```
ORDER_TYPES = new_order, order_placed, order_processing, order_shipped, order_delivered, order_cancelled, order_cancelled_by_customer, order_refunded.

**Why:** Without this, order status changes and new messages require a page reload to become visible.
