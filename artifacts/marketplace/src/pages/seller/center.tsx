import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { Package, Percent, HelpCircle, FileText, ArrowRight, BarChart3 } from "lucide-react";
import { useSellerOnboarding } from "@/hooks/useSellerOnboarding";

export default function SellerCenterPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const { handleOpenYourStore } = useSellerOnboarding();

  useSEO({
    title: t("seller_center.seo_title"),
    description: t("seller_center.seo_desc"),
    canonical: "/seller/center",
  });

  const resources = [
    {
      icon: <Package className="h-6 w-6" style={{ color: "#10B981" }} />,
      title: t("seller_center.res_how_title"),
      desc: t("seller_center.res_how_desc"),
      href: "/seller/how-to-sell",
    },
    {
      icon: <Percent className="h-6 w-6" style={{ color: "#3B82F6" }} />,
      title: t("seller_center.res_commission_title"),
      desc: t("seller_center.res_commission_desc"),
      href: "/seller/commission",
      iconBg: "rgba(59,130,246,0.1)",
    },
    {
      icon: <FileText className="h-6 w-6" style={{ color: "#8B5CF6" }} />,
      title: t("seller_center.res_terms_title"),
      desc: t("seller_center.res_terms_desc"),
      href: "/seller/terms",
      iconBg: "rgba(139,92,246,0.1)",
    },
    {
      icon: <HelpCircle className="h-6 w-6" style={{ color: "#F59E0B" }} />,
      title: t("seller_center.res_faq_title"),
      desc: t("seller_center.res_faq_desc"),
      href: "/seller/faq",
      iconBg: "rgba(245,158,11,0.1)",
    },
    {
      icon: <BarChart3 className="h-6 w-6" style={{ color: "#06B6D4" }} />,
      title: t("seller_center.res_dashboard_title"),
      desc: t("seller_center.res_dashboard_desc"),
      href: "/seller/dashboard",
      iconBg: "rgba(6,182,212,0.1)",
    },
  ];

  return (
    <Layout>
      <div dir={isRtl ? "rtl" : "ltr"} style={{ background: "#050505", color: "#B8B8B8" }}>

        {/* Hero */}
        <section style={{ background: "#0F0F0F", borderBottom: "1px solid #262626" }}>
          <div className="container px-4 py-16 md:py-20 max-w-3xl mx-auto text-center">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-6"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10B981" }}
            >
              {t("seller_center.badge")}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight" style={{ color: "#F5F5F5" }}>
              {t("seller_center.hero_title")}
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: "#8A8A8A" }}>
              {t("seller_center.hero_desc")}
            </p>
          </div>
        </section>

        {/* Resources grid */}
        <section>
          <div className="container px-4 py-14">
            <h2 className="text-xl font-bold mb-8 text-center" style={{ color: "#F5F5F5" }}>
              {t("seller_center.resources_title")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {resources.map(({ icon, title, desc, href, iconBg }) => (
                <Link key={href} href={href}>
                  <div
                    className="rounded-xl p-6 h-full cursor-pointer transition-[border-color] duration-150"
                    style={{ background: "#0F0F0F", border: "1px solid #262626" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(16,185,129,0.3)")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "#262626")}
                  >
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: iconBg || "rgba(16,185,129,0.1)" }}
                    >
                      {icon}
                    </div>
                    <h3 className="font-semibold text-[15px] mb-2" style={{ color: "#F5F5F5" }}>{title}</h3>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: "#8A8A8A" }}>{desc}</p>
                    <div className="flex items-center gap-1 text-xs font-medium" style={{ color: "#10B981" }}>
                      {t("seller_center.go")} <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Apply CTA */}
        <section style={{ background: "#0F0F0F", borderTop: "1px solid #262626" }}>
          <div className="container px-4 py-14 max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4" style={{ color: "#F5F5F5" }}>{t("seller_center.cta_title")}</h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: "#8A8A8A" }}>{t("seller_center.cta_desc")}</p>
            <button onClick={handleOpenYourStore}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm cursor-pointer transition-opacity duration-150 hover:opacity-90"
              style={{ background: "#10B981", color: "#050505" }}>
              {t("seller_center.cta_btn")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

      </div>
    </Layout>
  );
}
