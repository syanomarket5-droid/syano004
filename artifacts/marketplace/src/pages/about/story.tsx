import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";

interface TimelineEvent {
  year: string;
  title: string;
  desc: string;
}

export default function StoryPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  useSEO({
    title: t("story.seo_title"),
    description: t("story.seo_desc"),
    canonical: "/about/story",
  });

  const events: TimelineEvent[] = [
    { year: "2022", title: t("story.ev1_title"), desc: t("story.ev1_desc") },
    { year: "2023", title: t("story.ev2_title"), desc: t("story.ev2_desc") },
    { year: "2024", title: t("story.ev3_title"), desc: t("story.ev3_desc") },
    { year: "2025", title: t("story.ev4_title"), desc: t("story.ev4_desc") },
    { year: "2026", title: t("story.ev5_title"), desc: t("story.ev5_desc") },
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
              {t("story.badge")}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight" style={{ color: "#F5F5F5" }}>
              {t("story.hero_title")}
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: "#8A8A8A" }}>
              {t("story.hero_desc")}
            </p>
          </div>
        </section>

        {/* Intro */}
        <section style={{ borderBottom: "1px solid #262626" }}>
          <div className="container px-4 py-12 max-w-3xl mx-auto">
            <p className="text-base leading-relaxed mb-4" style={{ color: "#8A8A8A" }}>
              {t("story.intro_p1")}
            </p>
            <p className="text-base leading-relaxed" style={{ color: "#8A8A8A" }}>
              {t("story.intro_p2")}
            </p>
          </div>
        </section>

        {/* Timeline */}
        <section>
          <div className="container px-4 py-14 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-12 text-center" style={{ color: "#F5F5F5" }}>
              {t("story.timeline_title")}
            </h2>
            <div className="relative">
              {/* Vertical line */}
              <div
                className={`absolute top-0 bottom-0 w-px ${isRtl ? "right-0 mr-6 md:mr-0 md:right-1/2" : "left-6 md:left-1/2"}`}
                style={{ background: "#262626" }}
                aria-hidden="true"
              />
              <div className="space-y-10">
                {events.map(({ year, title, desc }, i) => (
                  <div key={year} className={`relative flex ${isRtl ? "flex-row-reverse" : ""} items-start gap-8 md:gap-0`}>
                    {/* Desktop: alternating sides */}
                    <div className={`hidden md:block md:w-1/2 ${i % 2 === 0 ? (isRtl ? "pl-12" : "pr-12 text-right") : (isRtl ? "pr-12 text-right" : "pl-12")}`}>
                      {(i % 2 === 0) !== isRtl && (
                        <div>
                          <span className="text-xs font-bold tracking-widest" style={{ color: "#10B981" }}>{year}</span>
                          <h3 className="text-base font-semibold mt-1 mb-1" style={{ color: "#F5F5F5" }}>{title}</h3>
                          <p className="text-sm leading-relaxed" style={{ color: "#8A8A8A" }}>{desc}</p>
                        </div>
                      )}
                    </div>

                    {/* Center dot */}
                    <div className="relative z-10 flex-shrink-0 md:absolute md:left-1/2 md:-translate-x-1/2">
                      <div className="h-4 w-4 rounded-full border-2 ms-4 md:ms-0" style={{ background: "#10B981", borderColor: "#050505" }} />
                    </div>

                    <div className={`md:w-1/2 ${i % 2 === 0 ? (isRtl ? "pr-12 text-right" : "pl-0 md:pl-12") : (isRtl ? "pl-12" : "pr-12 md:text-right")}`}>
                      {/* Mobile always shows here; desktop alternates */}
                      <div className="md:hidden">
                        <span className="text-xs font-bold tracking-widest" style={{ color: "#10B981" }}>{year}</span>
                        <h3 className="text-base font-semibold mt-1 mb-1" style={{ color: "#F5F5F5" }}>{title}</h3>
                        <p className="text-sm leading-relaxed" style={{ color: "#8A8A8A" }}>{desc}</p>
                      </div>
                      <div className="hidden md:block">
                        {(i % 2 !== 0) !== isRtl && (
                          <div>
                            <span className="text-xs font-bold tracking-widest" style={{ color: "#10B981" }}>{year}</span>
                            <h3 className="text-base font-semibold mt-1 mb-1" style={{ color: "#F5F5F5" }}>{title}</h3>
                            <p className="text-sm leading-relaxed" style={{ color: "#8A8A8A" }}>{desc}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Vision */}
        <section style={{ background: "#0F0F0F", borderTop: "1px solid #262626" }}>
          <div className="container px-4 py-14 max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-5" style={{ color: "#F5F5F5" }}>{t("story.vision_title")}</h2>
            <p className="text-base leading-relaxed" style={{ color: "#8A8A8A" }}>
              {t("story.vision_desc")}
            </p>
          </div>
        </section>

      </div>
    </Layout>
  );
}
