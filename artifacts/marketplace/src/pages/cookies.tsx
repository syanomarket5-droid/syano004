import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";

const SECTIONS = ["what", "types", "use", "control", "updates", "contact"];

export default function CookiesPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  useSEO({
    title: t("cookies.seo_title"),
    description: t("cookies.seo_desc"),
    canonical: "/cookies",
  });

  return (
    <Layout>
      <div dir={isRtl ? "rtl" : "ltr"} style={{ background: "#050505", color: "#B8B8B8" }}>

        <section style={{ background: "#0F0F0F", borderBottom: "1px solid #262626" }}>
          <div className="container px-4 py-14 max-w-3xl mx-auto">
            <p className="text-xs font-medium mb-3" style={{ color: "#10B981" }}>{t("cookies.badge")}</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-4 leading-tight" style={{ color: "#F5F5F5" }}>
              {t("cookies.hero_title")}
            </h1>
            <p className="text-sm" style={{ color: "#8A8A8A" }}>{t("cookies.last_updated")}</p>
          </div>
        </section>

        <div className="container px-4 py-12 max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-10">
            <aside className="lg:w-56 flex-shrink-0">
              <div className="sticky top-6">
                <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#8A8A8A" }}>
                  {t("cookies.toc_title")}
                </p>
                <nav className="space-y-1">
                  {SECTIONS.map(s => (
                    <a key={s} href={`#ck-${s}`}
                      className="block py-1.5 text-sm transition-colors duration-150"
                      style={{ color: "#8A8A8A" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#10B981")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#8A8A8A")}
                    >
                      {t(`cookies.toc_${s}`)}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
            <div className="flex-1 min-w-0 space-y-10">
              <p className="text-sm leading-relaxed" style={{ color: "#8A8A8A" }}>{t("cookies.intro")}</p>
              {SECTIONS.map(s => (
                <section key={s} id={`ck-${s}`} className="scroll-mt-6">
                  <h2 className="text-lg font-bold mb-3" style={{ color: "#F5F5F5" }}>{t(`cookies.${s}_title`)}</h2>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#8A8A8A" }}>{t(`cookies.${s}_body`)}</p>
                </section>
              ))}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
