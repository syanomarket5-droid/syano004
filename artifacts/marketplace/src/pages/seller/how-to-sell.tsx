import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { UserPlus, Package, ShoppingCart, Banknote, ArrowRight, CheckCircle2 } from "lucide-react";
import { useSellerOnboarding } from "@/hooks/useSellerOnboarding";

export default function HowToSellPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const { handleOpenYourStore } = useSellerOnboarding();

  useSEO({
    title: t("how_to_sell.seo_title"),
    description: t("how_to_sell.seo_desc"),
    canonical: "/seller/how-to-sell",
  });

  const steps = [
    {
      num: "01",
      icon: <UserPlus className="h-6 w-6" style={{ color: "#10B981" }} />,
      title: t("how_to_sell.step1_title"),
      desc: t("how_to_sell.step1_desc"),
      details: [
        t("how_to_sell.step1_d1"),
        t("how_to_sell.step1_d2"),
        t("how_to_sell.step1_d3"),
      ],
    },
    {
      num: "02",
      icon: <Package className="h-6 w-6" style={{ color: "#10B981" }} />,
      title: t("how_to_sell.step2_title"),
      desc: t("how_to_sell.step2_desc"),
      details: [
        t("how_to_sell.step2_d1"),
        t("how_to_sell.step2_d2"),
        t("how_to_sell.step2_d3"),
      ],
    },
    {
      num: "03",
      icon: <ShoppingCart className="h-6 w-6" style={{ color: "#10B981" }} />,
      title: t("how_to_sell.step3_title"),
      desc: t("how_to_sell.step3_desc"),
      details: [
        t("how_to_sell.step3_d1"),
        t("how_to_sell.step3_d2"),
        t("how_to_sell.step3_d3"),
      ],
    },
    {
      num: "04",
      icon: <Banknote className="h-6 w-6" style={{ color: "#10B981" }} />,
      title: t("how_to_sell.step4_title"),
      desc: t("how_to_sell.step4_desc"),
      details: [
        t("how_to_sell.step4_d1"),
        t("how_to_sell.step4_d2"),
        t("how_to_sell.step4_d3"),
      ],
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
              {t("how_to_sell.badge")}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight" style={{ color: "#F5F5F5" }}>
              {t("how_to_sell.hero_title")}
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: "#8A8A8A" }}>
              {t("how_to_sell.hero_desc")}
            </p>
          </div>
        </section>

        {/* Steps */}
        <section>
          <div className="container px-4 py-14 max-w-4xl mx-auto">
            <div className="space-y-8">
              {steps.map(({ num, icon, title, desc, details }) => (
                <div
                  key={num}
                  className="rounded-xl p-6 md:p-8 flex flex-col sm:flex-row gap-6"
                  style={{ background: "#0F0F0F", border: "1px solid #262626" }}
                >
                  <div className="flex-shrink-0 flex items-start gap-4 sm:flex-col sm:items-center sm:w-20">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(16,185,129,0.1)" }}
                    >
                      {icon}
                    </div>
                    <span className="text-3xl font-extrabold sm:text-center" style={{ color: "#262626" }}>{num}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2" style={{ color: "#F5F5F5" }}>{title}</h3>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: "#8A8A8A" }}>{desc}</p>
                    <ul className="space-y-2">
                      {details.map((d) => (
                        <li key={d} className="flex items-start gap-2 text-sm" style={{ color: "#8A8A8A" }}>
                          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#10B981" }} />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: "#0F0F0F", borderTop: "1px solid #262626" }}>
          <div className="container px-4 py-14 max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4" style={{ color: "#F5F5F5" }}>{t("how_to_sell.cta_title")}</h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: "#8A8A8A" }}>{t("how_to_sell.cta_desc")}</p>
            <button onClick={handleOpenYourStore}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm cursor-pointer transition-opacity duration-150 hover:opacity-90"
              style={{ background: "#10B981", color: "#050505" }}>
              {t("how_to_sell.cta_btn")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

      </div>
    </Layout>
  );
}
