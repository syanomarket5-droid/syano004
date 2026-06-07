import React, { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { MapPin, Mail, Phone } from "lucide-react";
import SOCIAL_LINKS from "@/config/socialLinks";

/* ─────────────────────────────────────────────────────────────────
   PALETTE (graphite / AMOLED — zero blue tint)
   bg-base    : #050505
   bg-surface : #0F0F0F
   bg-card    : #141414
   border     : #262626
   border-soft: #303030
   text-hi    : #F5F5F5
   text-mid   : #B8B8B8
   text-lo    : #8A8A8A
   accent     : #10B981
   accent-h   : #059669
   accent-glow: rgba(16,185,129,0.15)
───────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────
   Social brand SVG icons
───────────────────────────────────────────────────────────────── */
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
  </svg>
);
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.258 5.622ZM17.083 20.249h1.833L7.084 4.126H5.117Z" />
  </svg>
);
const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
);

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  fb: <FacebookIcon />,
  ig: <InstagramIcon />,
  x:  <XIcon />,
  tg: <TelegramIcon />,
  wa: <WhatsAppIcon />,
};

/* ─────────────────────────────────────────────────────────────────
   FooterColumn — mobile accordion, always-open on desktop
───────────────────────────────────────────────────────────────── */
interface ColProps {
  heading: string;
  links: { label: string; href: string }[];
  isRtl: boolean;
}

function FooterColumn({ heading, links, isRtl }: ColProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border-b last:border-b-0 md:border-none"
      style={{ borderColor: "#262626" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-4 md:cursor-default md:pointer-events-none md:py-0"
      >
        <p
          className="text-[13px] font-semibold leading-snug"
          style={{ color: "#F5F5F5", letterSpacing: "0.03em" }}
        >
          {heading}
        </p>

        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 shrink-0 transition-transform duration-200 md:hidden ${open ? "rotate-180" : ""}`}
          style={{ color: "#8A8A8A" }}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <ul
        className={[
          "overflow-hidden transition-[max-height,padding-bottom] duration-300 ease-in-out",
          open ? "max-h-80 pb-5" : "max-h-0",
          "md:max-h-none md:pb-0 md:mt-4",
        ].join(" ")}
      >
        {links.map(({ label, href }) => (
          <li key={label} className="mt-1 first:mt-0">
            <Link href={href}>
              <span
                className="group inline-flex items-center gap-2 text-[13px] leading-relaxed
                           cursor-pointer transition-colors duration-150 min-h-[40px]"
                style={{ color: "#8A8A8A" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLSpanElement).style.color = "#10B981";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLSpanElement).style.color = "#8A8A8A";
                }}
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className={`h-2.5 w-2.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${isRtl ? "rotate-180" : ""}`}
                  style={{ color: "#10B981" }}
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
                {label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main Footer
───────────────────────────────────────────────────────────────── */
export function Footer() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const dir = isRtl ? "rtl" : "ltr";

  const columns: ColProps[] = [
    {
      isRtl,
      heading: t("footer.col1_heading"),
      links: [
        { label: t("footer.col1_about"),   href: "/about" },
        { label: t("footer.col1_story"),   href: "/about/story" },
        { label: t("footer.col1_team"),    href: "/about/team" },
        { label: t("footer.col1_contact"), href: "/contact" },
      ],
    },
    {
      isRtl,
      heading: t("footer.col2_heading"),
      links: [
        { label: t("footer.col2_join"),       href: "/register" },
        { label: t("footer.col2_how"),        href: "/seller/how-to-sell" },
        { label: t("footer.col2_terms"),      href: "/seller/terms" },
        { label: t("footer.col2_center"),     href: "/seller/center" },
        { label: t("footer.col2_commission"), href: "/seller/commission" },
        { label: t("footer.col2_faq"),        href: "/seller/faq" },
      ],
    },
    {
      isRtl,
      heading: t("footer.col3_heading"),
      links: [
        { label: t("footer.col3_ship_aleppo"),   href: "/shipping" },
        { label: t("footer.col3_ship_national"), href: "/shipping/nationwide" },
        { label: t("footer.col3_payment"),       href: "/payment-methods" },
        { label: t("footer.col3_guarantee"),     href: "/syano-guarantee" },
        { label: t("footer.col3_loyalty"),       href: "/loyalty" },
        { label: t("footer.col3_deals"),         href: "/products" },
      ],
    },
    {
      isRtl,
      heading: t("footer.col4_heading"),
      links: [
        { label: t("footer.col4_help"),    href: "/help" },
        { label: t("footer.col4_track"),   href: "/orders" },
        { label: t("footer.col4_returns"), href: "/returns-policy" },
        { label: t("footer.col4_privacy"), href: "/privacy-policy" },
        { label: t("footer.col4_terms"),   href: "/terms-of-use" },
        { label: t("footer.col4_contact"), href: "/contact" },
      ],
    },
  ];

  const legalLinks = [
    { label: t("footer.legal_privacy"), href: "/privacy-policy" },
    { label: t("footer.legal_terms"),   href: "/terms-of-use" },
    { label: t("footer.legal_returns"), href: "/returns-policy" },
    { label: t("footer.legal_cookies"), href: "/cookies" },
  ];

  return (
    <footer
      dir={dir}
      className="mt-auto select-none"
      style={{ background: "#050505", color: "#B8B8B8" }}
    >

      {/* ════════════════════════════════════════════════════════════
          ZONE 1 — Brand + tagline + contact pills
      ════════════════════════════════════════════════════════════ */}
      <div style={{ background: "#0F0F0F", borderBottom: "1px solid #262626" }}>
        <div className="container px-4 py-10 md:py-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">

            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span
                  className="text-2xl font-extrabold tracking-tight leading-none"
                  style={{ color: "#F5F5F5" }}
                >
                  {isRtl ? "سيانو" : "Syano"}
                </span>
                <span
                  className="text-sm font-normal leading-none"
                  style={{ color: "#10B981" }}
                >
                  {isRtl ? "Syano" : "سيانو"}
                </span>
              </div>
              <p
                className="max-w-[300px] text-[13px] leading-relaxed"
                style={{ color: "#8A8A8A" }}
              >
                {t("footer.tagline")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                {
                  href: "mailto:syano.marketplace@gmail.com",
                  icon: <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: "#10B981" }} />,
                  label: "syano.marketplace@gmail.com",
                  external: false,
                },
                {
                  href: "https://chat.whatsapp.com/B7NFVFWglpX0OoLhFj9R2m",
                  icon: <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: "#10B981" }} />,
                  label: t("footer.contact_whatsapp"),
                  external: true,
                },
              ].map(({ href, icon, label, external }) => (
                <a
                  key={href}
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-[opacity,transform] duration-150"
                  style={{
                    border: "1px solid #303030",
                    background: "#141414",
                    color: "#B8B8B8",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.borderColor = "rgba(16,185,129,0.4)";
                    el.style.background = "rgba(16,185,129,0.08)";
                    el.style.color = "#10B981";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.borderColor = "#303030";
                    el.style.background = "#141414";
                    el.style.color = "#B8B8B8";
                  }}
                >
                  {icon}
                  {label}
                </a>
              ))}

              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs"
                style={{ border: "1px solid #262626", background: "#141414", color: "#8A8A8A" }}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "#10B981" }} />
                {t("footer.contact_location")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          ZONE 2 — 4-column links grid
      ════════════════════════════════════════════════════════════ */}
      <div className="container px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-x-12 md:gap-y-14 lg:grid-cols-4 lg:gap-x-16">
          {columns.map((col) => (
            <FooterColumn key={col.heading} {...col} />
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          ZONE 3 — Social icons
          Mobile  : label → icon row → tagline, all centred, stacked
          Desktop : label+icons left | tagline right, single row
      ════════════════════════════════════════════════════════════ */}
      <div style={{ borderTop: "1px solid #262626" }}>
        <div className="container px-4 py-8 sm:py-6">

          {/* ── Desktop layout (sm+): two-column spread ── */}
          <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-6">

            {/* Left: label + icons inline */}
            <div className="flex items-center gap-4">
              <span
                className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "#8A8A8A" }}
              >
                {t("footer.follow_us")}
              </span>
              {/* thin divider */}
              <span
                className="block h-4 w-px shrink-0"
                style={{ background: "#303030" }}
                aria-hidden="true"
              />
              <div className="flex items-center gap-3" role="list" aria-label="Social media links">
                {SOCIAL_LINKS.map(({ key, platform, href, hoverColor }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={platform}
                    title={platform}
                    role="listitem"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                               transition-[color,border-color,background] duration-150
                               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{
                      border: "1px solid #303030",
                      background: "#141414",
                      color: "#8A8A8A",
                      outlineColor: "#10B981",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.color = hoverColor;
                      el.style.borderColor = hoverColor + "55";
                      el.style.background = hoverColor + "12";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.color = "#8A8A8A";
                      el.style.borderColor = "#303030";
                      el.style.background = "#141414";
                    }}
                  >
                    {SOCIAL_ICONS[key]}
                  </a>
                ))}
              </div>
            </div>

            {/* Right: tagline */}
            <div className="flex shrink-0 items-center gap-2 text-[11px]" style={{ color: "#8A8A8A" }}>
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#10B981" }} aria-hidden="true" />
              <span className="whitespace-nowrap">{isRtl ? "سوق حلب الموثوق" : "Aleppo's Trusted Marketplace"}</span>
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#10B981" }} aria-hidden="true" />
            </div>
          </div>

          {/* ── Mobile layout (<sm): stacked, centred ── */}
          <div className="flex flex-col items-center gap-4 sm:hidden">

            {/* Label */}
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "#8A8A8A" }}
            >
              {t("footer.follow_us")}
            </span>

            {/* Icon row — always fits even at 320 px */}
            <div className="flex items-center gap-3" role="list" aria-label="Social media links">
              {SOCIAL_LINKS.map(({ key, platform, href, hoverColor }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={platform}
                  title={platform}
                  role="listitem"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full
                             transition-[color,border-color,background] duration-150
                             focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    border: "1px solid #303030",
                    background: "#141414",
                    color: "#8A8A8A",
                    outlineColor: "#10B981",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.color = hoverColor;
                    el.style.borderColor = hoverColor + "55";
                    el.style.background = hoverColor + "12";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.color = "#8A8A8A";
                    el.style.borderColor = "#303030";
                    el.style.background = "#141414";
                  }}
                >
                  {SOCIAL_ICONS[key]}
                </a>
              ))}
            </div>

            {/* Tagline — visible on mobile too */}
            <div className="flex items-center gap-2 text-[11px]" style={{ color: "#8A8A8A" }}>
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#10B981" }} aria-hidden="true" />
              <span>{isRtl ? "سوق حلب الموثوق" : "Aleppo's Trusted Marketplace"}</span>
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#10B981" }} aria-hidden="true" />
            </div>
          </div>

        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          ZONE 4 — Copyright bar (darkest)
      ════════════════════════════════════════════════════════════ */}
      <div style={{ background: "#050505", borderTop: "1px solid #1a1a1a" }}>
        <div className="container px-4 pb-safe-5 pt-5">
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">

            <div
              className={`space-y-1 text-center ${isRtl ? "md:text-right" : "md:text-left"}`}
            >
              <p className="text-[13px] font-medium" style={{ color: "#B8B8B8" }}>
                {t("footer.copyright")}
              </p>
              <p className="text-[11px]" style={{ color: "#8A8A8A" }}>
                {t("footer.rights")}
                <span className="mx-2" style={{ color: "#303030" }} aria-hidden="true">·</span>
                <span style={{ color: "#059669" }}>{t("footer.made_in")}</span>
                {" "}
                <span aria-hidden="true">🇸🇾</span>
              </p>
            </div>

            <nav aria-label="legal navigation">
              <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
                {legalLinks.map(({ label, href }, i) => (
                  <React.Fragment key={label}>
                    <Link href={href}>
                      <span
                        className="text-[11px] transition-colors duration-150 cursor-pointer"
                        style={{ color: "#8A8A8A" }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLSpanElement).style.color = "#B8B8B8")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLSpanElement).style.color = "#8A8A8A")
                        }
                      >
                        {label}
                      </span>
                    </Link>
                    {i < legalLinks.length - 1 && (
                      <span
                        className="text-[11px]"
                        style={{ color: "#303030" }}
                        aria-hidden="true"
                      >
                        |
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </div>

    </footer>
  );
}
