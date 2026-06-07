import { useState } from "react";
import { Link } from "wouter";
import { useListOrders, useUpdateOrderStatus, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Package, ArrowRight, ChevronRight, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const STATUS_TAB_KEYS = [
  { key: "all", labelKey: "orders.tab_all" },
  { key: "active", labelKey: "orders.tab_active", statuses: ["pending", "processing", "shipped"] },
  { key: "delivered", labelKey: "orders.status_delivered", statuses: ["delivered"] },
  { key: "cancelled", labelKey: "orders.status_cancelled", statuses: ["cancelled", "refunded"] },
];

export default function OrderHistory() {
  const { data: orders, isLoading, refetch } = useListOrders();
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        toast({ title: t("orders.cancel_success", "Order cancelled successfully") });
        refetch();
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      },
      onError: () => {
        toast({ title: t("orders.cancel_failed", "Failed to cancel order"), variant: "destructive" });
      }
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 shrink-0">{t("orders.status_pending")}</Badge>;
      case "processing": return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 shrink-0">{t("orders.status_processing")}</Badge>;
      case "shipped": return <Badge variant="outline" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 shrink-0">{t("orders.status_shipped")}</Badge>;
      case "delivered": return <Badge className="bg-primary hover:bg-primary text-primary-foreground shrink-0">{t("orders.status_delivered")}</Badge>;
      case "cancelled": return <Badge variant="destructive" className="shrink-0">{t("orders.status_cancelled")}</Badge>;
      case "refunded": return <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 shrink-0">{t("orders.status_refunded")}</Badge>;
      default: return <Badge variant="secondary" className="shrink-0">{status}</Badge>;
    }
  };

  const STATUS_TABS = STATUS_TAB_KEYS.map(tab => ({ ...tab, label: t(tab.labelKey) }));

  const filteredOrders = (() => {
    if (!orders) return [];
    const tab = STATUS_TABS.find(tb => tb.key === activeTab);
    if (!tab || !tab.statuses) return orders;
    return orders.filter(o => tab.statuses!.includes(o.status));
  })();

  const tabCounts = STATUS_TABS.map(tab => ({
    ...tab,
    count: tab.statuses
      ? (orders ?? []).filter(o => tab.statuses!.includes(o.status)).length
      : (orders ?? []).length
  }));

  return (
    <Layout>
      <div className="container py-8 md:py-12 max-w-5xl">
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("orders.title")}</h1>
        </div>

        {/* Status filter tabs */}
        {!isLoading && orders && orders.length > 0 && (
          <div className="flex gap-1 mb-6 bg-muted/50 p-1 rounded-xl overflow-x-auto">
            {tabCounts.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                    activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-xl border">
            <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">{t("orders.empty")}</h3>
            <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">{t("orders.empty_desc")}</p>
            <Link href="/products" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
              {t("orders.start_shopping")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-xl border">
            <Package className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
            <p className="text-muted-foreground font-medium">{t("orders.empty_filtered")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const canCancel = order.status === "pending" || order.status === "processing";
              const cancelTitle = order.status === "processing"
                ? t("orders.cancel_processing_title", "Cancel this processing order?")
                : t("orders.cancel_title");
              const cancelDesc = order.status === "processing"
                ? t("orders.cancel_processing_desc", { id: order.id })
                : t("orders.cancel_desc", { id: order.id });

              return (
                <div key={order.id} className="group bg-card border rounded-xl hover:border-primary/40 hover:-translate-y-0.5 transition-[transform,border-color] duration-150">
                  <Link href={`/orders/${order.id}`}>
                    <div className="p-5 sm:p-6 cursor-pointer">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-base">{t("orders.order_id", { id: order.id })}</span>
                            {getStatusBadge(order.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t("orders.placed_on", { date: format(new Date(order.createdAt), "MMM d, yyyy") })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.items.length === 1
                              ? t("orders.items_total", { count: order.items.length })
                              : t("orders.items_total_plural", { count: order.items.length })}
                            {" "}
                            <span className="font-semibold text-foreground" translate="no">{formatCurrency(order.total)}</span>
                          </p>
                        </div>

                        {/* Thumbnail strip */}
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <div
                                key={idx}
                                className="h-10 w-10 rounded-lg border-2 border-background bg-muted overflow-hidden shrink-0"
                                style={{ zIndex: 3 - idx }}
                              >
                                {item.imageUrl
                                  ? <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                                  : <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs"><Package className="h-4 w-4" /></div>
                                }
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <div className="h-10 w-10 rounded-lg border-2 border-background bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">
                                +{order.items.length - 3}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center text-primary group-hover:underline text-sm font-medium shrink-0">
                            {t("orders.view_details")}
                            <ChevronRight className="h-4 w-4 ms-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Cancel button for pending/processing */}
                  {canCancel && (
                    <div className="px-5 sm:px-6 pb-4 border-t pt-3 flex justify-start">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs gap-1.5"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {t("orders.cancel_order")}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{cancelTitle}</AlertDialogTitle>
                            <AlertDialogDescription>{cancelDesc}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("orders.keep_order")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => updateStatus.mutate({ id: order.id, data: { status: "cancelled" } })}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {t("orders.confirm_cancel")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
