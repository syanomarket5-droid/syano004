import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { Banknote, CreditCard, Smartphone, ShieldCheck } from "lucide-react";

export default function PaymentMethodsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  useSEO({
    title: t("payment_methods.seo_title"),
    description: t("payment_methods.seo_desc"),
    canonical: "/payment-methods",
  });

  const methods = [
    {
      icon: <Banknote className="h-8 w-8" style={{ color: "#10B981" }} />,
      title: t("payment_methods.method1_title"),
      desc: t("payment_methods.method1_desc"),
      badge: t("payment_methods.available"),
      badgeColor: "#10B981",
    },
    {
      icon: <CreditCard className="h-8 w-8" style={{ color: "#8A8A8A" }} />,
      title: t("payment_methods.method2_title"),
      desc: t("payment_methods.method2_desc"),
      badge: t("payment_methods.coming_soon"),
      badgeColor: "#8A8A8A",
      dim: true,
    },
    {
      icon: <Smartphone className="h-8 w-8" style={{ color: "#8A8A8A" }} />,
      title: t("payment_methods.method3_title"),
      desc: t("payment_methods.method3_desc"),
      badge: t("payment_methods.coming_soon"),
      badgeColor: "#8A8A8A",
      dim: true,
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
              {t("payment_methods.badge")}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight" style={{ color: "#F5F5F5" }}>
              {t("payment_methods.hero_title")}
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: "#8A8A8A" }}>
              {t("payment_methods.hero_desc")}
            </p>
          </div>
        </section>

        {/* Methods */}
        <section style={{ borderBottom: "1px solid #262626" }}>
          <div className="container px-4 py-14 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {methods.map(({ icon, title, desc, badge, badgeColor, dim }) => (
                <div
                  key={title}
                  className="rounded-xl p-6"
                  style={{ background: "#0F0F0F", border: "1px solid #262626", opacity: dim ? 0.6 : 1 }}
                >
                  <div className="mb-5">{icon}</div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-[15px]" style={{ color: "#F5F5F5" }}>{title}</h3>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: badgeColor + "18", color: badgeColor }}
                    >
                      {badge}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#8A8A8A" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security note */}
        <section>
          <div className="container px-4 py-12 max-w-3xl mx-auto">
            <div className="rounded-xl p-6 flex items-start gap-5" style={{ background: "#0F0F0F", border: "1px solid #262626" }}>
              <ShieldCheck className="h-8 w-8 flex-shrink-0 mt-1" style={{ color: "#10B981" }} />
              <div>
                <h3 className="font-bold mb-2" style={{ color: "#F5F5F5" }}>{t("payment_methods.security_title")}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#8A8A8A" }}>{t("payment_methods.security_desc")}</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
}
