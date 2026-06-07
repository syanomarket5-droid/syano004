import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { ShieldCheck, Truck, Star, Users, ArrowRight, Zap } from "lucide-react";

export default function AboutPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  useSEO({
    title: t("about.seo_title"),
    description: t("about.seo_desc"),
    canonical: "/about",
  });

  const values = [
    {
      icon: <ShieldCheck className="h-6 w-6" style={{ color: "#10B981" }} />,
      title: t("about.value_trust_title"),
      desc: t("about.value_trust_desc"),
    },
    {
      icon: <Truck className="h-6 w-6" style={{ color: "#10B981" }} />,
      title: t("about.value_delivery_title"),
      desc: t("about.value_delivery_desc"),
    },
    {
      icon: <Star className="h-6 w-6" style={{ color: "#10B981" }} />,
      title: t("about.value_quality_title"),
      desc: t("about.value_quality_desc"),
    },
    {
      icon: <Users className="h-6 w-6" style={{ color: "#10B981" }} />,
      title: t("about.value_community_title"),
      desc: t("about.value_community_desc"),
    },
    {
      icon: <Zap className="h-6 w-6" style={{ color: "#10B981" }} />,
      title: t("about.value_speed_title"),
      desc: t("about.value_speed_desc"),
    },
  ];

  const stats = [
    { number: "500+", label: t("about.stat_sellers") },
    { number: "10K+", label: t("about.stat_products") },
    { number: "50K+", label: t("about.stat_customers") },
    { number: "4.8★", label: t("about.stat_rating") },
  ];

  return (
    <Layout>
      <div dir={isRtl ? "rtl" : "ltr"} style={{ background: "#050505", color: "#B8B8B8" }}>

        {/* Hero */}
        <section style={{ background: "#0F0F0F", borderBottom: "1px solid #262626" }}>
          <div className="container px-4 py-16 md:py-24 max-w-4xl mx-auto text-center">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-6"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10B981" }}
            >
              {t("about.badge")}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight" style={{ color: "#F5F5F5" }}>
              {t("about.hero_title")}
            </h1>
            <p className="text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: "#8A8A8A" }}>
              {t("about.hero_desc")}
            </p>
          </div>
        </section>

        {/* Stats */}
        <section style={{ borderBottom: "1px solid #262626" }}>
          <div className="container px-4 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map(({ number, label }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl sm:text-3xl font-extrabold mb-1" style={{ color: "#10B981" }}>{number}</p>
                  <p className="text-sm" style={{ color: "#8A8A8A" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission */}
        <section style={{ borderBottom: "1px solid #262626" }}>
          <div className="container px-4 py-14 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-5" style={{ color: "#F5F5F5" }}>{t("about.mission_title")}</h2>
            <p className="text-base leading-relaxed mb-4" style={{ color: "#8A8A8A" }}>
              {t("about.mission_p1")}
            </p>
            <p className="text-base leading-relaxed" style={{ color: "#8A8A8A" }}>
              {t("about.mission_p2")}
            </p>
          </div>
        </section>

        {/* Values */}
        <section style={{ background: "#0F0F0F", borderBottom: "1px solid #262626" }}>
          <div className="container px-4 py-14">
            <h2 className="text-2xl font-bold mb-10 text-center" style={{ color: "#F5F5F5" }}>{t("about.values_title")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {values.map(({ icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-xl p-6"
                  style={{ background: "#141414", border: "1px solid #262626" }}
                >
                  <div className="mb-4">{icon}</div>
                  <h3 className="font-semibold mb-2 text-[15px]" style={{ color: "#F5F5F5" }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#8A8A8A" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA links */}
        <section>
          <div className="container px-4 py-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/about/story">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm cursor-pointer transition-opacity duration-150 hover:opacity-80"
                style={{ background: "#141414", border: "1px solid #303030", color: "#F5F5F5" }}>
                {t("about.cta_story")} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <Link href="/about/team">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm cursor-pointer transition-opacity duration-150 hover:opacity-80"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10B981" }}>
                {t("about.cta_team")} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </section>

      </div>
    </Layout>
  );
}
