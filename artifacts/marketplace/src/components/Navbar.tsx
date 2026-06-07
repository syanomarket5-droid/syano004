import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useGuestCart } from "@/contexts/GuestCartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  ShoppingCart, LogOut, LayoutDashboard, Search, X, Globe, Sun, Moon, DollarSign,
  Menu, Home, Package, ClipboardList, Warehouse, Clock, MessageCircle,
  Users, Store, BarChart2, ScrollText, Settings,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  useGetCart,
  getGetCartQueryKey,
} from "@workspace/api-client-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useTranslation } from "react-i18next";
import { applyDirection } from "@/i18n";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { useSearch } from "@/hooks/use-search";

/* ── MobileNavLink ─────────────────────────────────────────────────────────────
   Defined OUTSIDE Navbar so React sees the same component type across every
   render.  A component defined inside a render function gets a brand-new type
   on each render, forcing React to unmount every instance and remount from
   scratch — defeating memoization and causing unnecessary DOM thrash.
   ────────────────────────────────────────────────────────────────────────────── */
interface MobileNavLinkProps {
  href: string;
  icon: React.ElementType;
  label: string;
  location: string;
  onClose: () => void;
}

const MobileNavLink = React.memo(function MobileNavLink({
  href,
  icon: Icon,
  label,
  location,
  onClose,
}: MobileNavLinkProps) {
  return (
    <Link href={href} onClick={onClose}>
      <div
        className={cn(
          "flex items-center gap-3 px-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
          location === href || (href !== "/" && location.startsWith(href))
            ? "bg-primary/10 text-primary"
            : "text-foreground hover:bg-muted",
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {label}
      </div>
    </Link>
  );
});

export function Navbar() {
  const [location, navigate] = useLocation();
  const { user, logout, isAuthenticated, isCustomer, isSeller, isAdmin, isSellerApplicant } = useAuth();
  const { setTheme, theme } = useTheme();
  const { currency, setCurrency, symbol } = useCurrency();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [mobileMenuOpen,setMobileMenuOpen]= useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const searchRef       = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("syano_recent_searches") || "[]"); } catch { return []; }
  });

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const saveRecentSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== trimmed);
      const next = [trimmed, ...filtered].slice(0, 6);
      try { localStorage.setItem("syano_recent_searches", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try { localStorage.removeItem("syano_recent_searches"); } catch {}
  }, []);

  const removeRecentSearch = useCallback((q: string) => {
    setRecentSearches(prev => {
      const next = prev.filter(s => s !== q);
      try { localStorage.setItem("syano_recent_searches", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const { data: cart } = useGetCart({
    query: { queryKey: getGetCartQueryKey(), enabled: isCustomer },
  });
  const cartItemCount = cart?.itemCount || 0;
  const { guestTotal } = useGuestCart();
  const visibleCartCount = isAuthenticated ? cartItemCount : guestTotal;

  // Multilingual search — expandSearchQuery() bridges Arabic↔English synonyms;
  // /api/search uses pg_trgm for typo-tolerance within a script.
  const { results: suggestions, isLoading: searchLoading } = useSearch(debouncedSearch);

  const switchLanguage = (l: string) => { i18n.changeLanguage(l); applyDirection(l); };

  useEffect(() => { applyDirection(i18n.language); }, [i18n.language]);
  useEffect(() => { if (searchOpen && inputRef.current) inputRef.current.focus(); }, [searchOpen]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // Keep open if click is inside desktop search OR mobile search expandable
      const inDesktop = searchRef.current?.contains(target);
      const inMobile  = mobileSearchRef.current?.contains(target);
      if (!inDesktop && !inMobile) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
      const params = new URLSearchParams({ search: searchQuery.trim() });
      navigate(`/products?${params.toString()}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  }, [searchQuery, navigate]);

  const handleSuggestionClick = useCallback((productId: number, productName?: string) => {
    if (productName) saveRecentSearch(productName);
    navigate(`/products/${productId}`);
    setSearchOpen(false);
    setSearchQuery("");
  }, [navigate]);

  const isRtl = lang === "ar";

  const AUTH_PATHS = ["/login", "/register"];
  const isAuthPage = AUTH_PATHS.includes(location);

  const sellerLinks = useMemo(() => [
    { href: "/seller/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
    { href: "/seller/products",  icon: Package,         label: t("nav.products") },
    { href: "/seller/orders",    icon: ClipboardList,   label: t("nav.orders") },
    { href: "/seller/inventory", icon: Warehouse,       label: t("nav.inventory") },
  ], [t]);
  const customerLinks = useMemo(() => [
    { href: "/customer/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
    { href: "/orders",             icon: ClipboardList,   label: t("nav.orders") },
  ], [t]);
  const adminLinks = useMemo(() => [
    { href: "/admin",           icon: LayoutDashboard, label: t("admin.nav_dashboard") },
    { href: "/admin/users",     icon: Users,           label: t("admin.nav_users") },
    { href: "/admin/sellers",   icon: Store,           label: t("admin.nav_sellers") },
    { href: "/admin/products",  icon: Package,         label: t("admin.nav_products") },
    { href: "/admin/orders",    icon: ShoppingCart,    label: t("admin.nav_orders") },
    { href: "/admin/analytics", icon: BarChart2,       label: t("admin.nav_analytics") },
    { href: "/admin/logs",      icon: ScrollText,      label: t("admin.nav_logs") },
    { href: "/admin/settings",  icon: Settings,        label: t("admin.nav_settings") },
  ], [t]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      {/*
        ── Safe-area spacer ────────────────────────────────────────────────────
        This div MUST live outside <Sheet> so Radix UI's DOM wrapper never
        sits between the header element and the spacer.  Its height equals
        env(safe-area-inset-top) exactly, filling the notch / Dynamic Island /
        status-bar zone with the header's background.  The <Sheet> and all
        interactive icons render BELOW this spacer and are therefore always
        outside the camera cut-out on every device.
        ────────────────────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="w-full md:hidden"
        style={{ height: "env(safe-area-inset-top, 0px)" }}
      />

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>

        {/* ══ MOBILE NAV (< md) ══════════════════════════════════════════════
             Layout: [Logo + SYANO] ············ [Search · Notif · Cart · ☰]
             Pure justify-between flex — no absolute positioning, no hacks.
             The safe-area spacer above this bar guarantees the entire row
             sits below any notch, Dynamic Island, or punch-hole camera.    */}
        <div className="md:hidden flex h-[60px] items-center justify-between px-3 gap-2">

          {/* LEFT — brand: logo mark + wordmark */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 group focus:outline-none"
            aria-label="Syano home"
          >
            <img
              src="/syano-logo.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 object-contain
                         drop-shadow-[0_0_10px_rgba(16,185,129,0.75)]
                         group-hover:drop-shadow-[0_0_18px_rgba(16,185,129,1)]
                         transition-[filter] duration-200"
              loading="eager"
              decoding="async"
            />
            <span className="text-base font-black tracking-widest text-primary uppercase leading-none">
              SYANO
            </span>
          </Link>

          {/* RIGHT — all action icons grouped together (44×44px touch targets) */}
          <div className="flex items-center gap-0.5 shrink-0">
            {!isAuthPage && (
              <Button
                variant="ghost" size="icon" className="h-11 w-11"
                onClick={() => setSearchOpen(!searchOpen)}
              >
                <Search className="h-[1.1rem] w-[1.1rem]" />
              </Button>
            )}

            {isAuthenticated && <NotificationCenter />}

            {!isSeller && !isAdmin && (
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative h-11 w-11">
                  <ShoppingCart className="h-5 w-5" />
                  {visibleCartCount > 0 && (
                    <span className="absolute -top-1 -end-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {visibleCartCount}
                    </span>
                  )}
                </Button>
              </Link>
            )}

            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
          </div>
        </div>

        {/* ══ DESKTOP NAV (≥ md) ═════════════════════════════════════════════ */}
        <div className="container hidden md:flex h-16 items-center justify-between gap-3">

          {/* Left: Brand + desktop nav */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <img
                src="/syano-logo.png"
                alt="Syano"
                width={28}
                height={28}
                className="h-7 w-7 object-contain
                           drop-shadow-[0_0_8px_rgba(16,185,129,0.65)]
                           group-hover:drop-shadow-[0_0_14px_rgba(16,185,129,0.9)]
                           transition-[filter] duration-200"
                loading="eager"
                decoding="async"
              />
              <span className="text-xl font-black tracking-wide text-primary leading-none">
                {t("nav.brand")}
              </span>
            </Link>

            <nav className="flex gap-5 ms-2">
              {isSeller && sellerLinks.map((l) => (
                <Link key={l.href} href={l.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                  {l.label}
                </Link>
              ))}
              {isCustomer && customerLinks.map((l) => (
                <Link key={l.href} href={l.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                  {l.label}
                </Link>
              ))}
              {isCustomer && (
                <Link href="/messages"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t("nav.messages")}
                </Link>
              )}
            </nav>
          </div>

          {/* Center: Amazon-style Search
               IMPORTANT: searchRef wraps the entire search area (bar + dropdown).
               The inner bar has overflow-hidden for rounded corners; the dropdown
               is a sibling of the bar so it is NOT clipped. */}
          {!isAuthPage && <div ref={searchRef} className="relative flex flex-1 max-w-2xl">
            {/* Search bar — clean single-input design */}
            <div className="flex w-full items-stretch rounded-xl border bg-muted/30 overflow-hidden h-9 focus-within:bg-background focus-within:border-border transition-[background-color,border-color] duration-150">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder={t("nav.search_placeholder")}
                  className="border-0 rounded-none shadow-none h-9 ps-9 pe-8 bg-transparent focus-visible:ring-0"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={searchOpen && (debouncedSearch.length >= 2 || recentSearches.length > 0)}
                  aria-label={t("nav.search_placeholder")}
                />
                {searchQuery && (
                  <button type="button" onClick={() => { setSearchQuery(""); setSearchOpen(true); }}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </form>
            </div>
            {/* Dropdown — sibling of bar, not inside overflow-hidden, so it renders fully */}
            {searchOpen && (debouncedSearch.length >= 2 || recentSearches.length > 0) && (
              <div className="absolute top-full mt-1.5 start-0 end-0 bg-popover border rounded-xl shadow-lg z-50 overflow-hidden">
                {debouncedSearch.length >= 2 ? (
                  searchLoading && suggestions.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      {t("nav.searching")}
                    </div>
                  ) : !suggestions || suggestions.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">{t("products.no_found")}</div>
                  ) : (
                    <div className="py-1 max-h-72 overflow-y-auto">
                      {suggestions.slice(0, 6).map((p) => (
                        <button key={p.id} onClick={() => handleSuggestionClick(p.id, p.name)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-start">
                          {p.imageUrl && <img src={p.imageUrl} alt="" loading="lazy" className="h-9 w-9 rounded-md object-cover border shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.category}</div>
                          </div>
                          <div className="text-sm font-semibold text-primary shrink-0">{symbol}{p.finalPrice.toFixed(2)}</div>
                        </button>
                      ))}
                      <button onClick={handleSearchSubmit as any}
                        className="w-full px-3 py-2.5 text-sm text-primary font-medium hover:bg-muted/50 transition-colors border-t flex items-center gap-2">
                        <Search className="h-3.5 w-3.5" />
                        {t("nav.search_for", { query: debouncedSearch })}
                      </button>
                    </div>
                  )
                ) : recentSearches.length > 0 ? (
                  <div className="py-1">
                    <div className="flex items-center justify-between px-3 pt-2 pb-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {t("nav.recent_searches")}
                      </span>
                      <button onClick={clearRecentSearches} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {t("nav.clear_all")}
                      </button>
                    </div>
                    {recentSearches.map((s) => (
                      <div key={s} className="flex items-center group">
                        <button onClick={() => { setSearchQuery(s); setSearchOpen(true); }}
                          className="flex-1 flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors text-start">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{s}</span>
                        </button>
                        <button onClick={() => removeRecentSearch(s)}
                          className="px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>}

          {/* Right: Desktop controls */}
          <div className="flex items-center gap-1 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Globe className="h-[1.1rem] w-[1.1rem]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => switchLanguage("en")} className={lang === "en" ? "font-semibold text-primary" : ""}>
                  🇬🇧 {t("language.en")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchLanguage("ar")} className={lang === "ar" ? "font-semibold text-primary" : ""}>
                  🇸🇦 {t("language.ar")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" dir="ltr" className="h-9 px-2 font-medium text-xs gap-1 whitespace-nowrap shrink-0">
                  <span translate="no">{currency === "SYP" ? "ل.س" : "$"}</span>
                  <span className="hidden lg:inline" translate="no">{currency}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCurrency("USD")} className={currency === "USD" ? "font-semibold text-primary" : ""}>
                  $ {t("currency.usd")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrency("SYP")} className={currency === "SYP" ? "font-semibold text-primary" : ""}>
                  ل.س {t("currency.syp")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-[transform,opacity] duration-150 dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-[transform,opacity] duration-150 dark:rotate-0 dark:scale-100" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>{t("theme.light")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>{t("theme.dark")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>{t("theme.system")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <NotificationCenter />

            {!isSeller && !isAdmin && (
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative h-10 w-10">
                  <ShoppingCart className="h-5 w-5" />
                  {visibleCartCount > 0 && (
                    <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {visibleCartCount}
                    </span>
                  )}
                </Button>
              </Link>
            )}

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 rounded-full px-3 md:px-4 border border-border bg-card">
                    <span className="text-sm font-medium truncate max-w-[100px]">{user?.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground w-[200px] truncate" translate="no">{user?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={isSeller ? "/seller/dashboard" : "/customer/dashboard"}
                      className="cursor-pointer w-full flex items-center">
                      <LayoutDashboard className="me-2 h-4 w-4" />
                      <span>{t("nav.dashboard")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive cursor-pointer focus:text-destructive" onClick={logout}>
                    <LogOut className="me-2 h-4 w-4" />
                    <span>{t("nav.logout")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" className="h-9 px-4">{t("nav.login")}</Button>
                </Link>
                <Link href="/register">
                  <Button className="h-9 px-4">{t("nav.signup")}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ══ SHARED MOBILE DRAWER ═══════════════════════════════════════════ */}
        <SheetContent side={isRtl ? "right" : "left"} className="w-[min(300px,78vw)] p-0 flex flex-col" aria-describedby={undefined}>
          <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
          {/* Premium stacked brand header */}
          <div className="relative flex flex-col items-center justify-center pt-10 pb-7 border-b shrink-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/40 pointer-events-none" />
            <div className="absolute top-6 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full bg-primary/12 blur-2xl pointer-events-none" />
            <img
              src="/syano-logo.png"
              alt="Syano"
              width={72}
              height={72}
              className="relative z-10 h-[72px] w-[72px] object-contain drop-shadow-[0_0_20px_rgba(16,185,129,0.75)]"
              loading="eager"
              decoding="async"
            />
            <p className="relative z-10 mt-3 text-2xl font-black tracking-[0.28em] text-primary uppercase leading-none">
              {t("nav.brand").toUpperCase()}
            </p>
            <p className="relative z-10 mt-1.5 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              {t("nav.tagline")}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
            <MobileNavLink href="/" icon={Home} label={t("nav.home")} location={location} onClose={closeMobileMenu} />
            {isAdmin && adminLinks.map((l) => <MobileNavLink key={l.href} {...l} location={location} onClose={closeMobileMenu} />)}
            {isSeller && sellerLinks.map((l) => <MobileNavLink key={l.href} {...l} location={location} onClose={closeMobileMenu} />)}
            {isCustomer && customerLinks.map((l) => <MobileNavLink key={l.href} {...l} location={location} onClose={closeMobileMenu} />)}
            {isCustomer && (
              <MobileNavLink href="/cart" icon={ShoppingCart} label={t("nav.cart")} location={location} onClose={closeMobileMenu} />
            )}
            {isCustomer && (
              <MobileNavLink href="/messages" icon={MessageCircle} label={t("nav.messages")} location={location} onClose={closeMobileMenu} />
            )}
          </div>

          {/* ── Preferences section ────────────────────────────────────────────
               Each row uses the same sizing tokens as MobileNavLink:
                 min-h-[44px]  gap-3  px-3  h-5 w-5 icons  text-sm font-medium
               Toggle chips use py-0.5 so they never push the row past 44px.   */}
          <div className="px-3 py-2 border-t space-y-0.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1 pt-1">
              {t("nav.preferences")}
            </p>

            {/* Language */}
            <div className="grid [grid-template-columns:auto_1fr_auto] items-center gap-x-3 px-3 min-h-[44px] py-1">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{t("language.label")}</span>
              <div className="flex gap-1">
                {["en", "ar"].map((l) => (
                  <button key={l} onClick={() => switchLanguage(l)}
                    className={cn(
                      "px-2.5 py-0.5 rounded text-xs font-semibold transition-colors whitespace-nowrap",
                      lang === l
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >{l.toUpperCase()}</button>
                ))}
              </div>
            </div>

            {/* Currency */}
            <div className="grid [grid-template-columns:auto_1fr_auto] items-center gap-x-3 px-3 min-h-[44px] py-1">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{t("currency.label")}</span>
              <div className="flex gap-1">
                {["USD", "SYP"].map((c) => (
                  <button key={c} onClick={() => setCurrency(c as any)}
                    className={cn(
                      "px-2.5 py-0.5 rounded text-xs font-semibold transition-colors whitespace-nowrap",
                      currency === c
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >{c}</button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div className="grid [grid-template-columns:auto_1fr_auto] items-center gap-x-3 px-3 min-h-[44px] py-1">
              <Sun className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{t("theme.toggle")}</span>
              <div className="flex gap-1">
                {(["light", "dark", "system"] as const).map((tm) => (
                  <button key={tm} onClick={() => setTheme(tm)}
                    className={cn(
                      "px-2.5 py-0.5 rounded text-xs font-semibold capitalize transition-colors whitespace-nowrap",
                      theme === tm
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >{tm[0].toUpperCase()}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom auth — pb-safe-4 reserves space for home indicator on iPhone */}
          <div className="px-3 pb-safe-4 border-t pt-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate" translate="no">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 w-full px-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors min-h-[44px]"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 px-1">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full h-11">{t("nav.login")}</Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full h-11">{t("nav.signup")}</Button>
                </Link>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Search Expandable
           mobileSearchRef lets the document mousedown handler know when taps
           are inside this section — prevents it from closing before onClick fires */}
      {searchOpen && !isAuthPage && (
        <div ref={mobileSearchRef} className="md:hidden border-t px-4 py-3 bg-background">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("nav.search_placeholder")}
                className="ps-9 pe-10 h-11"
                autoFocus
              />
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                  className="absolute end-0 top-0 h-full w-10 flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
          {(debouncedSearch.length >= 2 || recentSearches.length > 0) && (
            <div className="mt-2 bg-popover border rounded-xl shadow-lg overflow-hidden">
              {debouncedSearch.length >= 2 ? (
                searchLoading && suggestions.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    {t("nav.searching")}
                  </div>
                ) : !suggestions || suggestions.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">{t("products.no_found")}</div>
                ) : (
                  <div className="py-1 max-h-60 overflow-y-auto">
                    {suggestions.slice(0, 5).map((p) => (
                      <button key={p.id} onClick={() => handleSuggestionClick(p.id, p.name)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 active:bg-muted transition-colors text-start">
                        {p.imageUrl && <img src={p.imageUrl} alt="" loading="lazy" className="h-9 w-9 rounded-md object-cover border shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.category}</div>
                        </div>
                        <div className="text-sm font-semibold text-primary shrink-0">{symbol}{p.finalPrice.toFixed(2)}</div>
                      </button>
                    ))}
                    <button onClick={handleSearchSubmit as any}
                      className="w-full px-3 py-3 text-sm text-primary font-medium hover:bg-muted/50 active:bg-muted transition-colors border-t flex items-center gap-2">
                      <Search className="h-3.5 w-3.5" />
                      {t("nav.search_for", { query: debouncedSearch })}
                    </button>
                  </div>
                )
              ) : recentSearches.length > 0 ? (
                <div className="py-1">
                  <div className="flex items-center justify-between px-3 pt-2 pb-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {t("nav.recent_searches")}
                    </span>
                    <button onClick={clearRecentSearches} className="text-xs text-muted-foreground hover:text-foreground">
                      {t("nav.clear_all")}
                    </button>
                  </div>
                  {recentSearches.map((s) => (
                    <button key={s} onClick={() => { setSearchQuery(s); setSearchOpen(true); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/50 active:bg-muted transition-colors text-start">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm">{s}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
