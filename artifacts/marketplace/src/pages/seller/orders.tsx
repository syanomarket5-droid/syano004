import { useState, useMemo, useEffect } from "react";
import { useListOrders, useUpdateOrderStatus, getListOrdersQueryKey, getListProductsQueryKey, getGetSellerDashboardQueryKey, type OrderItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { SellerNav } from "@/components/SellerNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format as dateFns } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Package, Phone, Search, X, ChevronLeft, ChevronRight, Truck,
  CheckCircle2, Clock, XCircle, Calendar, ChevronDown,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

/* ─── Status styles ────────────────────────────────────────────────── */
const STATUS_STYLES: Record<string, { pill: string; dot: string }> = {
  pending:    { pill: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",    dot: "bg-amber-500" },
  processing: { pill: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",         dot: "bg-blue-500" },
  shipped:    { pill: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800", dot: "bg-indigo-500" },
  delivered:  { pill: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800", dot: "bg-emerald-500" },
  cancelled:  { pill: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",               dot: "bg-red-500" },
  refunded:   { pill: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800", dot: "bg-violet-500" },
};

const ALL_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

/* ─── Delivery day presets ────────────────────────────────────────── */
function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function todayPlus(n: number) {
  return addDays(n);
}

/* ─── Inline ship form ────────────────────────────────────────────── */
interface ShipFormProps {
  orderId: number;
  onConfirm: (orderId: number, estimatedDelivery: string, shippingCompany: string, trackingNumber: string) => void;
  onCancel: () => void;
  isPending: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function ShipForm({ orderId, onConfirm, onCancel, isPending, t }: ShipFormProps) {
  const presets = [
    { label: t("seller_orders.est_2_days"), value: todayPlus(2) },
    { label: t("seller_orders.est_3_days"), value: todayPlus(3) },
    { label: t("seller_orders.est_5_days"), value: todayPlus(5) },
    { label: t("seller_orders.est_7_days"), value: todayPlus(7) },
  ];
  const [selected, setSelected] = useState(presets[1].value);
  const [customDate, setCustomDate] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [shippingCompany, setShippingCompany] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  const finalDate = useCustom && customDate ? customDate : selected;

  return (
    <div className="mt-3 p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl space-y-3">
      <div>
        <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-0.5">
          {t("seller_orders.est_delivery_title")}
        </p>
        <p className="text-xs text-indigo-600 dark:text-indigo-400">
          {t("seller_orders.est_delivery_desc")}
        </p>
      </div>

      {/* Day presets */}
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => { setSelected(p.value); setUseCustom(false); }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
              !useCustom && selected === p.value
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 hover:border-indigo-500"
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setUseCustom(true)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
            useCustom
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 hover:border-indigo-500"
          )}
        >
          {t("seller_orders.est_custom")}
        </button>
      </div>

      {/* Custom date input */}
      {useCustom && (
        <input
          type="date"
          value={customDate}
          min={addDays(1)}
          onChange={(e) => setCustomDate(e.target.value)}
          className="w-full h-9 px-3 text-sm rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-indigo-900/30 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      )}

      {/* Optional shipping details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <div>
          <label className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1 block">
            {t("seller_orders.shipping_company_label")}
          </label>
          <input
            type="text"
            value={shippingCompany}
            onChange={(e) => setShippingCompany(e.target.value)}
            placeholder={t("seller_orders.shipping_company_placeholder")}
            className="w-full h-9 px-3 text-sm rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-indigo-900/30 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1 block">
            {t("seller_orders.tracking_number_label")}
          </label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder={t("seller_orders.tracking_number_placeholder")}
            className="w-full h-9 px-3 text-sm rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-indigo-900/30 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={() => onConfirm(orderId, finalDate, shippingCompany, trackingNumber)}
          disabled={isPending || (useCustom && !customDate)}
        >
          <Truck className="h-3.5 w-3.5 me-1.5" />
          {t("seller_orders.confirm_ship")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isPending}
          className="text-muted-foreground"
        >
          <X className="h-3.5 w-3.5 me-1" />
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────── */
export default function SellerOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrency();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [shippingOrderId, setShippingOrderId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const ORDERS_PAGE_SIZE = 20;

  const { data: orders = [], isLoading } = useListOrders();

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        toast({ title: t("seller_orders.updated") });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSellerDashboardQueryKey() });
        setShippingOrderId(null);
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? t("seller_orders.update_failed");
        toast({ title: msg, variant: "destructive" });
        setShippingOrderId(null);
      },
    },
  });

  const handleForward = (orderId: number, newStatus: string, estimatedDelivery?: string, shippingCompany?: string, trackingNumber?: string) => {
    updateStatus.mutate({
      id: orderId,
      data: {
        status: newStatus as any,
        estimatedDelivery: estimatedDelivery ?? null,
        shippingCompany: shippingCompany ?? null,
        trackingNumber: trackingNumber ?? null,
      },
    });
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_STATUSES.forEach((s) => (counts[s] = 0));
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) counts[o.status]++;
    });
    return counts;
  }, [orders]);

  const filtered = useMemo(() => {
    let list = [...orders];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) => o.customerName.toLowerCase().includes(q) || String(o.id).includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((o) => o.status === statusFilter);
    }
    return list;
  }, [orders, search, statusFilter]);

  useEffect(() => setPage(1), [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ORDERS_PAGE_SIZE));
  const pagedFiltered = useMemo(
    () => filtered.slice((page - 1) * ORDERS_PAGE_SIZE, page * ORDERS_PAGE_SIZE),
    [filtered, page, ORDERS_PAGE_SIZE]
  );

  return (
    <Layout>
      <SellerNav />
      <div className="container py-6 md:py-10 max-w-6xl">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("seller_orders.title")}</h1>
          {!isLoading && (
            <p className="text-sm text-muted-foreground mt-1">
              {orders.length === 1
                ? t("seller_orders.items_count", { count: orders.length })
                : t("seller_orders.items_count_plural", { count: orders.length })}
            </p>
          )}
        </div>

        {/* Status filter chips */}
        {!isLoading && orders.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                statusFilter === "all"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {t("seller_orders.filter_all")}
              <span className={cn("text-[10px] font-bold px-1 py-0.5 rounded-full", statusFilter === "all" ? "bg-background/20" : "bg-muted")}>
                {orders.length}
              </span>
            </button>
            {ALL_STATUSES.filter((s) => statusCounts[s] > 0).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  statusFilter === s
                    ? `${STATUS_STYLES[s]?.pill} border-current`
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                )}
              >
                <div className={cn("h-1.5 w-1.5 rounded-full", STATUS_STYLES[s]?.dot)} />
                {t(`seller_orders.${s}`)}
                <span className="text-[10px] font-bold">{statusCounts[s]}</span>
              </button>
            ))}
          </div>
        )}

        {/* Search bar */}
        <div className="mb-5">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t("seller_orders.search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9 h-10"
            />
            {search && (
              <button
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setSearch("")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card border rounded-2xl">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold mb-1">{t("seller_orders.no_orders")}</h3>
            <p className="text-sm text-muted-foreground max-w-xs">{t("seller_orders.no_orders_desc")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-card border rounded-2xl">
            <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">{t("seller_orders.no_results")}</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
              {t("common.clear_filters", "Clear filters")}
            </Button>
          </div>
        ) : (
          <>
          <div className="space-y-4">
            {pagedFiltered.map((order) => {
              const pillStyle = STATUS_STYLES[order.status]?.pill ?? "bg-muted text-muted-foreground border-border";
              const isShippingThisOrder = shippingOrderId === order.id;

              return (
                <div key={order.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow transition-shadow">

                  {/* ── Card header ───────────────────────────────────── */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/20 gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("h-2 w-2 rounded-full shrink-0", STATUS_STYLES[order.status]?.dot ?? "bg-muted-foreground")} />
                      <span className="font-bold text-sm shrink-0" translate="no">#{order.id}</span>
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0", pillStyle)}>
                        {t(`seller_orders.${order.status}`, { defaultValue: order.status })}
                      </span>
                      {/* Estimated delivery when shipped */}
                      {order.status === "shipped" && order.estimatedDelivery && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold shrink-0">
                          <Calendar className="h-2.5 w-2.5" />
                          {t("seller_orders.est_delivery_label")}: {order.estimatedDelivery}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {dateFns(new Date(order.createdAt), "MMM d, yyyy · h:mm a")}
                    </span>
                  </div>

                  {/* ── Card body ─────────────────────────────────────── */}
                  <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                    {/* Customer info */}
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">{t("seller_orders.customer")}</p>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {(order.customerName || "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{order.customerName}</p>
                          <p className="text-xs text-muted-foreground truncate" translate="no">{order.customerEmail}</p>
                        </div>
                      </div>
                      {order.customerPhone && (
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                          translate="no"
                        >
                          <Phone className="h-3 w-3 shrink-0" />
                          {order.customerPhone}
                        </a>
                      )}
                    </div>

                    {/* Items + total */}
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">{t("seller_orders.items")}</p>
                      <p className="text-sm font-medium">
                        {order.items.length === 1
                          ? t("seller_orders.items_count", { count: order.items.length })
                          : t("seller_orders.items_count_plural", { count: order.items.length })}
                      </p>
                      <p className="text-lg font-black text-foreground mt-0.5" translate="no">
                        {formatCurrency(order.total)}
                      </p>
                    </div>

                    {/* ── Status action — forward-only ──────────────────
                         Shows only the single allowed next action as a
                         button. Cancelled and Delivered are read-only.   */}
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-2">{t("seller_orders.status")}</p>

                      {order.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                          onClick={() => handleForward(order.id, "processing")}
                          disabled={updateStatus.isPending}
                        >
                          <Clock className="h-3.5 w-3.5 me-1.5" />
                          {t("seller_orders.mark_processing")}
                        </Button>
                      )}

                      {order.status === "processing" && !isShippingThisOrder && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                          onClick={() => setShippingOrderId(order.id)}
                          disabled={updateStatus.isPending}
                        >
                          <Truck className="h-3.5 w-3.5 me-1.5" />
                          {t("seller_orders.mark_shipped")}
                          <ChevronDown className="h-3 w-3 ms-1" />
                        </Button>
                      )}

                      {order.status === "shipped" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                          onClick={() => handleForward(order.id, "delivered")}
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 me-1.5" />
                          {t("seller_orders.mark_delivered")}
                        </Button>
                      )}

                      {order.status === "delivered" && (
                        <div className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="h-4 w-4" />
                          {t("seller_orders.delivered_readonly")}
                        </div>
                      )}

                      {order.status === "cancelled" && (
                        <div className="inline-flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 font-semibold">
                          <XCircle className="h-4 w-4" />
                          {t("seller_orders.cancelled_readonly")}
                        </div>
                      )}

                      {order.status === "refunded" && (
                        <div className="inline-flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400 font-semibold">
                          <XCircle className="h-4 w-4" />
                          {t(`seller_orders.refunded`, { defaultValue: "Refunded" })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Ship inline form (only for the selected order) ─ */}
                  {isShippingThisOrder && (
                    <div className="px-5 pb-4">
                      <ShipForm
                        orderId={order.id}
                        onConfirm={(id, est, company, tracking) => handleForward(id, "shipped", est, company, tracking)}
                        onCancel={() => setShippingOrderId(null)}
                        isPending={updateStatus.isPending}
                        t={t}
                      />
                    </div>
                  )}

                  {/* ── Items chips ────────────────────────────────────── */}
                  {order.items.length > 0 && (
                    <div className="px-5 pb-4 border-t pt-3">
                      <div className="flex flex-wrap gap-2">
                        {order.items.map((item: OrderItem) => (
                          <div key={item.productId} className="inline-flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5 text-xs border border-border/50">
                            <span className="font-medium">{item.productName || `Product #${item.productId}`}</span>
                            <span className="text-muted-foreground">×{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                {t("common.prev", "Previous")}
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="gap-1.5"
              >
                {t("common.next", "Next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          </>
        )}
      </div>
    </Layout>
  );
}
