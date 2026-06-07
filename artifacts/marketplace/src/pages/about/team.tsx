import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";

interface TeamMember {
  initials: string;
  name: string;
  role: string;
  bio: string;
  color: string;
}

export default function TeamPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  useSEO({
    title: t("team.seo_title"),
    description: t("team.seo_desc"),
    canonical: "/about/team",
  });

  const members: TeamMember[] = [
    {
      initials: "AS",
      name: t("team.m1_name"),
      role: t("team.m1_role"),
      bio: t("team.m1_bio"),
      color: "#10B981",
    },
    {
      initials: "KA",
      name: t("team.m2_name"),
      role: t("team.m2_role"),
      bio: t("team.m2_bio"),
      color: "#3B82F6",
    },
    {
      initials: "LH",
      name: t("team.m3_name"),
      role: t("team.m3_role"),
      bio: t("team.m3_bio"),
      color: "#8B5CF6",
    },
    {
      initials: "RM",
      name: t("team.m4_name"),
      role: t("team.m4_role"),
      bio: t("team.m4_bio"),
      color: "#F59E0B",
    },
    {
      initials: "SB",
      name: t("team.m5_name"),
      role: t("team.m5_role"),
      bio: t("team.m5_bio"),
      color: "#EF4444",
    },
    {
      initials: "YN",
      name: t("team.m6_name"),
      role: t("team.m6_role"),
      bio: t("team.m6_bio"),
      color: "#06B6D4",
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
              {t("team.badge")}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight" style={{ color: "#F5F5F5" }}>
              {t("team.hero_title")}
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: "#8A8A8A" }}>
              {t("team.hero_desc")}
            </p>
          </div>
        </section>

        {/* Team grid */}
        <section>
          <div className="container px-4 py-14">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {members.map(({ initials, name, role, bio, color }) => (
                <div
                  key={name}
                  className="rounded-xl p-6"
                  style={{ background: "#0F0F0F", border: "1px solid #262626" }}
                >
                  {/* Avatar */}
                  <div
                    className="h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold mb-4"
                    style={{ background: color + "18", color }}
                  >
                    {initials}
                  </div>
                  <h3 className="font-bold text-[15px] mb-0.5" style={{ color: "#F5F5F5" }}>{name}</h3>
                  <p className="text-xs font-medium mb-3" style={{ color }}>{role}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#8A8A8A" }}>{bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Join us CTA */}
        <section style={{ background: "#0F0F0F", borderTop: "1px solid #262626" }}>
          <div className="container px-4 py-14 max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4" style={{ color: "#F5F5F5" }}>{t("team.join_title")}</h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: "#8A8A8A" }}>
              {t("team.join_desc")}
            </p>
            <a
              href="mailto:careers@syano.online"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-opacity duration-150 hover:opacity-80"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10B981" }}
            >
              {t("team.join_cta")}
            </a>
          </div>
        </section>

      </div>
    </Layout>
  );
}
