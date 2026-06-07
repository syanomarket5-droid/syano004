import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { Truck, Clock, MapPin, Package, CheckCircle2, ArrowRight } from "lucide-react";

export default function ShippingPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  useSEO({
    title: t("shipping.seo_title"),
    description: t("shipping.seo_desc"),
    canonical: "/shipping",
  });

  const features = [
    { icon: <Clock className="h-5 w-5" style={{ color: "#10B981" }} />, title: t("shipping.feat1_title"), desc: t("shipping.feat1_desc") },
    { icon: <MapPin className="h-5 w-5" style={{ color: "#10B981" }} />, title: t("shipping.feat2_title"), desc: t("shipping.feat2_desc") },
    { icon: <Package className="h-5 w-5" style={{ color: "#10B981" }} />, title: t("shipping.feat3_title"), desc: t("shipping.feat3_desc") },
    { icon: <Truck className="h-5 w-5" style={{ color: "#10B981" }} />, title: t("shipping.feat4_title"), desc: t("shipping.feat4_desc") },
  ];

  const zones = [
    { zone: t("shipping.zone1_name"), time: t("shipping.zone1_time"), fee: t("shipping.zone1_fee") },
    { zone: t("shipping.zone2_name"), time: t("shipping.zone2_time"), fee: t("shipping.zone2_fee") },
    { zone: t("shipping.zone3_name"), time: t("shipping.zone3_time"), fee: t("shipping.zone3_fee") },
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
              {t("shipping.badge")}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight" style={{ color: "#F5F5F5" }}>
              {t("shipping.hero_title")}
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: "#8A8A8A" }}>
              {t("shipping.hero_desc")}
            </p>
          </div>
        </section>

        {/* Features */}
        <section style={{ borderBottom: "1px solid #262626" }}>
          <div className="container px-4 py-14 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {features.map(({ icon, title, desc }) => (
                <div key={title} className="rounded-xl p-5 flex items-start gap-4" style={{ background: "#0F0F0F", border: "1px solid #262626" }}>
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.1)" }}>
                    {icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[14px] mb-1" style={{ color: "#F5F5F5" }}>{title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#8A8A8A" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Zone table */}
        <section style={{ borderBottom: "1px solid #262626" }}>
          <div className="container px-4 py-12 max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-6" style={{ color: "#F5F5F5" }}>{t("shipping.zones_title")}</h2>
            <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #262626" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#0F0F0F", borderBottom: "1px solid #262626" }}>
                    {[t("shipping.col_zone"), t("shipping.col_time"), t("shipping.col_fee")].map((h) => (
                      <th key={h} className="px-5 py-4 font-semibold text-start" style={{ color: "#F5F5F5" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zones.map(({ zone, time, fee }, i) => (
                    <tr key={zone} style={{ background: i % 2 === 0 ? "#050505" : "#080808", borderBottom: i < zones.length - 1 ? "1px solid #1a1a1a" : undefined }}>
                      <td className="px-5 py-4 font-medium" style={{ color: "#B8B8B8" }}>{zone}</td>
                      <td className="px-5 py-4" style={{ color: "#8A8A8A" }}>{time}</td>
                      <td className="px-5 py-4 font-semibold" style={{ color: "#10B981" }}>{fee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section style={{ borderBottom: "1px solid #262626" }}>
          <div className="container px-4 py-12 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-6" style={{ color: "#F5F5F5" }}>{t("shipping.how_title")}</h2>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="flex items-start gap-4">
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}
                  >
                    {n}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#8A8A8A" }}>
                    {t(`shipping.how_step${n}`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Nationwide CTA */}
        <section>
          <div className="container px-4 py-12 max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 rounded-xl" style={{ background: "#0F0F0F", border: "1px solid #262626" }}>
            <div>
              <h3 className="font-bold mb-1" style={{ color: "#F5F5F5" }}>{t("shipping.nationwide_cta_title")}</h3>
              <p className="text-sm" style={{ color: "#8A8A8A" }}>{t("shipping.nationwide_cta_desc")}</p>
            </div>
            <Link href="/shipping/nationwide">
              <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm cursor-pointer whitespace-nowrap transition-opacity duration-150 hover:opacity-80"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10B981" }}>
                {t("shipping.nationwide_cta_btn")} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </section>

      </div>
    </Layout>
  );
}
