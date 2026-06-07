import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetOrder, useUpdateOrderStatus, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ChevronLeft, Package, MapPin, Phone, Truck, Calendar, AlertTriangle, Copy, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { OrderStatusTimeline } from "@/components/OrderStatusTimeline";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function OrderDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [trackingCopied, setTrackingCopied] = useState(false);

  const { data: order, isLoading, refetch } = useGetOrder(id, {
    query: { enabled: !!id, queryKey: ["getOrder", id] }
  });

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
      case "pending": return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200">{t("orders.status_pending")}</Badge>;
      case "processing": return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200">{t("orders.status_processing")}</Badge>;
      case "shipped": return <Badge variant="outline" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200">{t("orders.status_shipped")}</Badge>;
      case "delivered": return <Badge className="bg-primary hover:bg-primary text-primary-foreground">{t("orders.status_delivered")}</Badge>;
      case "cancelled": return <Badge variant="destructive">{t("orders.status_cancelled")}</Badge>;
      case "refunded": return <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200">{t("orders.status_refunded")}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Customers can cancel from pending or processing
  const canCancel = order && (order.status === "pending" || order.status === "processing") && user?.role === "customer";

  const handleCopyTracking = (trackingNumber: string) => {
    navigator.clipboard.writeText(trackingNumber).then(() => {
      setTrackingCopied(true);
      setTimeout(() => setTrackingCopied(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12 max-w-4xl space-y-4">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="h-12 w-64 bg-muted rounded animate-pulse" />
          <div className="h-32 bg-muted rounded-xl animate-pulse" />
          <div className="h-48 bg-muted rounded-xl animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (!order) {
    return <Layout><div className="container py-12 text-muted-foreground">{t("orders.empty")}</div></Layout>;
  }

  const cancelTitle = order.status === "processing"
    ? t("orders.cancel_processing_title", "Cancel this processing order?")
    : t("orders.cancel_title");
  const cancelDesc = order.status === "processing"
    ? t("orders.cancel_processing_desc", { id: order.id })
    : t("orders.cancel_desc", { id: order.id });

  return (
    <Layout>
      <div className="container py-8 md:py-12 max-w-4xl">
        <Link href="/orders" className="inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ChevronLeft className="h-4 w-4" />
          {t("orders.back")}
        </Link>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 flex flex-wrap items-center gap-3">
              {t("orders.order_id", { id: order.id })}
              {getStatusBadge(order.status)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("orders.placed_on", { date: format(new Date(order.createdAt), "MMMM d, yyyy 'at' h:mm a") })}
            </p>
            {order.estimatedDelivery && order.status !== "delivered" && order.status !== "cancelled" && order.status !== "refunded" && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {t("orders.estimated_delivery")}: {format(new Date(order.estimatedDelivery), "MMM d, yyyy")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-end shrink-0">
              <div className="text-2xl font-bold" translate="no">{formatCurrency(order.total)}</div>
              <p className="text-sm text-muted-foreground mt-0.5">{order.items.length} {t("orders.items")}</p>
            </div>
            {canCancel && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive/10">
                    <AlertTriangle className="h-3.5 w-3.5 me-1.5" />
                    {t("orders.cancel_order")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{cancelTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {cancelDesc}
                    </AlertDialogDescription>
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
            )}
          </div>
        </div>

        <div className="mb-6">
          <OrderStatusTimeline
            orderId={order.id}
            status={order.status}
            createdAt={order.createdAt}
            updatedAt={order.updatedAt}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 sm:px-6 py-4 border-b bg-muted/30">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" /> {t("orders.items")}
                </h3>
              </div>
              <div className="divide-y">
                {order.items.map((item, idx) => (
                  <div key={idx} className="px-4 sm:px-6 py-4 flex items-center gap-4">
                    <div className="h-14 w-14 bg-muted rounded-lg border overflow-hidden shrink-0">
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                        : <div className="h-full w-full flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground/40" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm leading-snug">
                        <Link href={`/products/${item.productId}`} className="hover:text-primary hover:underline transition-colors">
                          {item.productName}
                        </Link>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("checkout.qty", { count: item.quantity })} × <span translate="no">{formatCurrency(item.unitPrice)}</span>
                      </p>
                    </div>
                    <div className="font-semibold text-sm shrink-0" translate="no">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 sm:px-6 py-4 border-t bg-muted/10 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{t("checkout.subtotal")}</span>
                  <span className="font-medium text-foreground" translate="no">{formatCurrency(order.total)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{t("orders.delivery_fee")}</span>
                  <span className="font-medium">{t("checkout.free")}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2 mt-1">
                  <span>{t("checkout.total")}</span>
                  <span translate="no">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 sm:px-6 py-4 border-b bg-muted/30">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> {t("orders.address")}
                </h3>
              </div>
              <div className="p-4 sm:p-5 space-y-2">
                {order.city && (
                  <p className="text-sm font-medium text-foreground">{order.city}</p>
                )}
                <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                  {order.shippingAddress}
                </p>
                {order.deliveryNotes && (
                  <p className="text-xs text-muted-foreground italic border-t pt-2 mt-2">
                    "{order.deliveryNotes}"
                  </p>
                )}
              </div>
            </div>

            {order.customerPhone && (
              <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 sm:px-6 py-4 border-b bg-muted/30">
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" /> {t("orders.contact")}
                  </h3>
                </div>
                <div className="p-4 sm:p-5">
                  <a href={`tel:${order.customerPhone}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-2" translate="no">
                    <Phone className="h-4 w-4 shrink-0" />
                    {order.customerPhone}
                  </a>
                </div>
              </div>
            )}

            {/* Shipping info (tracking + company) when order is shipped/delivered */}
            {(order.shippingCompany || order.trackingNumber) && (
              <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 sm:px-6 py-4 border-b bg-muted/30">
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" /> {t("orders.shipping_info")}
                  </h3>
                </div>
                <div className="p-4 sm:p-5 space-y-3">
                  {order.shippingCompany && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">{t("orders.shipping_company")}</p>
                      <p className="text-sm font-semibold">{order.shippingCompany}</p>
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">{t("orders.tracking_number")}</p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1 break-all" translate="no">{order.trackingNumber}</code>
                        <button
                          onClick={() => handleCopyTracking(order.trackingNumber!)}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title={t("orders.copy_tracking")}
                        >
                          {trackingCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 sm:px-6 py-4 border-b bg-muted/30">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" /> {t("orders.payment")}
                </h3>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-sm font-medium">{t("checkout.demo_gateway")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("orders.cod_desc")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
