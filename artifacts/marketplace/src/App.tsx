import "@/i18n";
import { lazy, Suspense, useEffect } from "react";
// Home is imported EAGERLY — it is the primary landing page and lazy-loading it
// creates an extra async chunk waterfall that directly delays LCP. All other
// pages remain lazy since they are not in the critical first-render path.
import Home from "@/pages/home";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getGetPublicSettingsQueryKey,
  getListProductsQueryKey,
  getGetBestSellersQueryKey,
} from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { setupApi } from "@/lib/api-setup";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageTransition } from "@/components/PageTransition";
import { PageLoader } from "@/components/PageLoader";
import { ScrollToTop } from "@/components/ScrollToTop";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { GuestCartProvider } from "@/contexts/GuestCartContext";
import { NotificationToasts } from "@/components/NotificationToasts";
import { PushPermissionPrompt } from "@/components/PushPermissionPrompt";
import { NavigationProgress } from "@/components/NavigationProgress";
import { RoutePreloader } from "@/components/RoutePreloader";

const NotFound          = lazy(() => import("@/pages/not-found"));
const AccountSuspended  = lazy(() => import("@/pages/account-suspended"));
const Login             = lazy(() => import("@/pages/login"));
const Register          = lazy(() => import("@/pages/register"));
const VerifyPage        = lazy(() => import("@/pages/verify"));
const ForgotPassword    = lazy(() => import("@/pages/forgot-password"));
const Products          = lazy(() => import("@/pages/products"));
const ProductDetail     = lazy(() => import("@/pages/products/[id]"));
const Cart              = lazy(() => import("@/pages/cart"));
const Checkout          = lazy(() => import("@/pages/checkout"));
const OrderHistory      = lazy(() => import("@/pages/orders"));
const OrderDetail       = lazy(() => import("@/pages/orders/[id]"));
const CustomerDashboard = lazy(() => import("@/pages/customer/dashboard"));
const SellerDashboard   = lazy(() => import("@/pages/seller/dashboard"));
const SellerProducts    = lazy(() => import("@/pages/seller/products"));
const NewProduct        = lazy(() => import("@/pages/seller/products/new"));
const EditProduct       = lazy(() => import("@/pages/seller/products/[id]/edit"));
const SellerOrders      = lazy(() => import("@/pages/seller/orders"));
const Inventory         = lazy(() => import("@/pages/seller/inventory"));
const SellerStoreSettings = lazy(() => import("@/pages/seller/store-settings"));
const AdminDashboard    = lazy(() => import("@/pages/admin/index"));
const AdminUsers        = lazy(() => import("@/pages/admin/users"));
const AdminProducts     = lazy(() => import("@/pages/admin/products"));
const AdminOrders       = lazy(() => import("@/pages/admin/orders"));
const AdminSettings     = lazy(() => import("@/pages/admin/settings"));
const AdminLogs         = lazy(() => import("@/pages/admin/logs"));
const AdminSellers      = lazy(() => import("@/pages/admin/sellers"));
const AdminAnalytics    = lazy(() => import("@/pages/admin/analytics"));
const SellerApply       = lazy(() => import("@/pages/seller/apply"));
const ApplicationStatus = lazy(() => import("@/pages/seller/application-status"));
/* ── Footer / Info pages ─────────────────────────────────────── */
const AboutPage           = lazy(() => import("@/pages/about/index"));
const StoryPage           = lazy(() => import("@/pages/about/story"));
const TeamPage            = lazy(() => import("@/pages/about/team"));
const ContactPage         = lazy(() => import("@/pages/contact"));
const HowToSellPage       = lazy(() => import("@/pages/seller/how-to-sell"));
const SellerTermsPage     = lazy(() => import("@/pages/seller/terms"));
const SellerCenterPage    = lazy(() => import("@/pages/seller/center"));
const CommissionPage      = lazy(() => import("@/pages/seller/commission"));
const SellerFaqPage       = lazy(() => import("@/pages/seller/faq"));
const StorePage           = lazy(() => import("@/pages/store/[slug]"));
const MessagesPage        = lazy(() => import("@/pages/messages/index"));
const SellerMessages      = lazy(() => import("@/pages/seller/messages"));
const ShippingPage        = lazy(() => import("@/pages/shipping/index"));
const NationwidePage      = lazy(() => import("@/pages/shipping/nationwide"));
const PaymentMethodsPage  = lazy(() => import("@/pages/payment-methods"));
const SyanoGuaranteePage  = lazy(() => import("@/pages/syano-guarantee"));
const LoyaltyPage         = lazy(() => import("@/pages/loyalty"));
const HelpPage            = lazy(() => import("@/pages/help"));
const PrivacyPolicyPage   = lazy(() => import("@/pages/privacy-policy"));
const TermsOfUsePage      = lazy(() => import("@/pages/terms-of-use"));
const ReturnsPolicyPage   = lazy(() => import("@/pages/returns-policy"));
const CookiesPage         = lazy(() => import("@/pages/cookies"));

setupApi();

// ── window.__prefetch type declaration ────────────────────────────────────────
// The inline <script> in index.html fires 3 fetches before any JS loads.
// We declare the shape here so TypeScript knows the contract.
declare global {
  interface Window {
    __prefetch?: {
      settings?: Promise<unknown>;
      products?: Promise<unknown>;
      bestSellers?: Promise<unknown>;
    };
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000,   // 2 min — safe default for all volatile data
      gcTime: 15 * 60 * 1000,     // 15 min — keep cached data longer for back-navigation
    },
  },
});

// ── Seed React Query cache from early prefetch ─────────────────────────────────
// Fire-and-forget: when each promise resolves we call setQueryData.
// If it resolves before the home page mounts, the component renders with data
// already in cache and skips the loading state entirely.
// If it resolves after mount, React Query already has an in-flight request and
// setQueryData will simply update it (deduplicated, no double fetch).
if (typeof window !== "undefined" && window.__prefetch) {
  const { settings, products, bestSellers } = window.__prefetch;
  settings?.then((data) => {
    if (data) queryClient.setQueryData(getGetPublicSettingsQueryKey(), data);
  }).catch(() => {});
  products?.then((data) => {
    if (data) queryClient.setQueryData(getListProductsQueryKey({}), data);
  }).catch(() => {});
  bestSellers?.then((data) => {
    if (data) queryClient.setQueryData(getGetBestSellersQueryKey(4), data);
  }).catch(() => {});
}

/* ── Service Worker registration ─────────────────────────────── */
function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // In development / preview a previously-installed service worker (or its
    // caches) can pin stale code — e.g. an old sticky navbar that lingers even
    // after the source no longer contains it. Actively unregister any workers
    // and purge caches so the preview always reflects the latest source.
    if (!import.meta.env.PROD) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((reg) => reg.unregister()))
        .catch(() => {});
      if (typeof caches !== "undefined") {
        caches
          .keys()
          .then((keys) => keys.forEach((k) => caches.delete(k)))
          .catch(() => {});
      }
      return;
    }

    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(swUrl, { scope: import.meta.env.BASE_URL || "/" })
      .catch((err) => console.warn("[SW] Registration failed:", err));
  }, []);
  return null;
}

function Router() {
  return (
    <>
      <NavigationProgress />
      <RoutePreloader />
      <ScrollToTop />
      <ServiceWorkerRegistrar />
      <Suspense fallback={<PageLoader />}>
        <PageTransition>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/account-suspended" component={AccountSuspended} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/verify" component={VerifyPage} />
            <Route path="/forgot-password" component={ForgotPassword} />
            <Route path="/products" component={Products} />
            <Route path="/products/:id" component={ProductDetail} />

            <Route path="/cart" component={Cart} />
            <Route path="/checkout">
              <ProtectedRoute allowedRoles={["customer"]}><Checkout /></ProtectedRoute>
            </Route>
            <Route path="/orders">
              <ProtectedRoute allowedRoles={["customer"]}><OrderHistory /></ProtectedRoute>
            </Route>
            <Route path="/orders/:id">
              <ProtectedRoute allowedRoles={["customer"]}><OrderDetail /></ProtectedRoute>
            </Route>
            <Route path="/customer/dashboard">
              <ProtectedRoute allowedRoles={["customer"]}><CustomerDashboard /></ProtectedRoute>
            </Route>

            <Route path="/seller/apply">
              <ProtectedRoute allowedRoles={["customer"]}><SellerApply /></ProtectedRoute>
            </Route>
            <Route path="/seller/application-status">
              <ProtectedRoute allowedRoles={["customer"]}><ApplicationStatus /></ProtectedRoute>
            </Route>

            <Route path="/seller/dashboard">
              <ProtectedRoute allowedRoles={["seller"]}><SellerDashboard /></ProtectedRoute>
            </Route>
            <Route path="/seller/products">
              <ProtectedRoute allowedRoles={["seller"]}><SellerProducts /></ProtectedRoute>
            </Route>
            <Route path="/seller/products/new">
              <ProtectedRoute allowedRoles={["seller"]}><NewProduct /></ProtectedRoute>
            </Route>
            <Route path="/seller/products/:id/edit">
              <ProtectedRoute allowedRoles={["seller"]}><EditProduct /></ProtectedRoute>
            </Route>
            <Route path="/seller/orders">
              <ProtectedRoute allowedRoles={["seller"]}><SellerOrders /></ProtectedRoute>
            </Route>
            <Route path="/seller/inventory">
              <ProtectedRoute allowedRoles={["seller"]}><Inventory /></ProtectedRoute>
            </Route>
            <Route path="/seller/messages">
              <ProtectedRoute allowedRoles={["seller"]}><SellerMessages /></ProtectedRoute>
            </Route>
            <Route path="/seller/store-settings">
              <ProtectedRoute allowedRoles={["seller"]}><SellerStoreSettings /></ProtectedRoute>
            </Route>

            <Route path="/store/:slug" component={StorePage} />
            <Route path="/messages">
              <ProtectedRoute allowedRoles={["customer"]}><MessagesPage /></ProtectedRoute>
            </Route>

            <Route path="/admin">
              <ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>
            </Route>
            <Route path="/admin/users">
              <ProtectedRoute allowedRoles={["admin"]}><AdminUsers /></ProtectedRoute>
            </Route>
            <Route path="/admin/products">
              <ProtectedRoute allowedRoles={["admin"]}><AdminProducts /></ProtectedRoute>
            </Route>
            <Route path="/admin/orders">
              <ProtectedRoute allowedRoles={["admin"]}><AdminOrders /></ProtectedRoute>
            </Route>
            <Route path="/admin/logs">
              <ProtectedRoute allowedRoles={["admin"]}><AdminLogs /></ProtectedRoute>
            </Route>
            <Route path="/admin/settings">
              <ProtectedRoute allowedRoles={["admin"]}><AdminSettings /></ProtectedRoute>
            </Route>
            <Route path="/admin/sellers">
              <ProtectedRoute allowedRoles={["admin"]}><AdminSellers /></ProtectedRoute>
            </Route>
            <Route path="/admin/analytics">
              <ProtectedRoute allowedRoles={["admin"]}><AdminAnalytics /></ProtectedRoute>
            </Route>

            {/* ── Info & Footer pages ──────────────────────────────── */}
            <Route path="/about" component={AboutPage} />
            <Route path="/about/story" component={StoryPage} />
            <Route path="/about/team" component={TeamPage} />
            <Route path="/contact" component={ContactPage} />

            <Route path="/seller/how-to-sell" component={HowToSellPage} />
            <Route path="/seller/terms" component={SellerTermsPage} />
            <Route path="/seller/center" component={SellerCenterPage} />
            <Route path="/seller/commission" component={CommissionPage} />
            <Route path="/seller/faq" component={SellerFaqPage} />

            <Route path="/shipping" component={ShippingPage} />
            <Route path="/shipping/nationwide" component={NationwidePage} />
            <Route path="/payment-methods" component={PaymentMethodsPage} />
            <Route path="/syano-guarantee" component={SyanoGuaranteePage} />
            <Route path="/loyalty" component={LoyaltyPage} />

            <Route path="/help" component={HelpPage} />
            <Route path="/privacy-policy" component={PrivacyPolicyPage} />
            <Route path="/terms-of-use" component={TermsOfUsePage} />
            <Route path="/returns-policy" component={ReturnsPolicyPage} />
            <Route path="/cookies" component={CookiesPage} />

            <Route component={NotFound} />
          </Switch>
        </PageTransition>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" attribute="class">
      <QueryClientProvider client={queryClient}>
        <CurrencyProvider>
          <AuthProvider>
            <GuestCartProvider>
            <NotificationProvider>
              <TooltipProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <Router />
                </WouterRouter>
                {/* Global notification overlays */}
                <NotificationToasts />
                <PushPermissionPrompt />
                <Toaster />
              </TooltipProvider>
            </NotificationProvider>
            </GuestCartProvider>
          </AuthProvider>
        </CurrencyProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
