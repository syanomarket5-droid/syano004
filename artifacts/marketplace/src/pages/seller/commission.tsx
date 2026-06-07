import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { Info } from "lucide-react";

interface CommRow {
  category: string;
  rate: string;
  example: string;
}

export default function CommissionPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  useSEO({
    title: t("commission.seo_title"),
    description: t("commission.seo_desc"),
    canonical: "/seller/commission",
  });

  const rows: CommRow[] = [
    { category: t("commission.cat_electronics"), rate: "5%", example: t("commission.ex_electronics") },
    { category: t("commission.cat_fashion"), rate: "8%", example: t("commission.ex_fashion") },
    { category: t("commission.cat_beauty"), rate: "7%", example: t("commission.ex_beauty") },
    { category: t("commission.cat_home"), rate: "6%", example: t("commission.ex_home") },
    { category: t("commission.cat_grocery"), rate: "4%", example: t("commission.ex_grocery") },
    { category: t("commission.cat_sports"), rate: "7%", example: t("commission.ex_sports") },
    { category: t("commission.cat_books"), rate: "5%", example: t("commission.ex_books") },
    { category: t("commission.cat_jewelry"), rate: "10%", example: t("commission.ex_jewelry") },
    { category: t("commission.cat_digital"), rate: "3%", example: t("commission.ex_digital") },
    { category: t("commission.cat_other"), rate: "6%", example: t("commission.ex_other") },
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
              {t("commission.badge")}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight" style={{ color: "#F5F5F5" }}>
              {t("commission.hero_title")}
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: "#8A8A8A" }}>
              {t("commission.hero_desc")}
            </p>
          </div>
        </section>

        {/* How it works */}
        <section style={{ borderBottom: "1px solid #262626" }}>
          <div className="container px-4 py-12 max-w-3xl mx-auto">
            <div className="rounded-xl p-5 flex items-start gap-4" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <Info className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "#10B981" }} />
              <p className="text-sm leading-relaxed" style={{ color: "#B8B8B8" }}>
                {t("commission.how_it_works")}
              </p>
            </div>
          </div>
        </section>

        {/* Commission table */}
        <section>
          <div className="container px-4 py-12 max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-6" style={{ color: "#F5F5F5" }}>{t("commission.table_title")}</h2>
            <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #262626" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#0F0F0F", borderBottom: "1px solid #262626" }}>
                    <th className="px-5 py-4 font-semibold text-start" style={{ color: "#F5F5F5" }}>
                      {t("commission.col_category")}
                    </th>
                    <th className="px-5 py-4 font-semibold text-start" style={{ color: "#F5F5F5" }}>
                      {t("commission.col_rate")}
                    </th>
                    <th className="px-5 py-4 font-semibold text-start hidden sm:table-cell" style={{ color: "#F5F5F5" }}>
                      {t("commission.col_example")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ category, rate, example }, i) => (
                    <tr
                      key={category}
                      style={{
                        background: i % 2 === 0 ? "#050505" : "#080808",
                        borderBottom: i < rows.length - 1 ? "1px solid #1a1a1a" : undefined,
                      }}
                    >
                      <td className="px-5 py-3.5 font-medium" style={{ color: "#B8B8B8" }}>{category}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-base" style={{ color: "#10B981" }}>{rate}</span>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell" style={{ color: "#8A8A8A" }}>{example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Example calculation */}
            <div className="mt-8 rounded-xl p-6" style={{ background: "#0F0F0F", border: "1px solid #262626" }}>
              <h3 className="font-bold mb-3" style={{ color: "#F5F5F5" }}>{t("commission.calc_title")}</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: "#8A8A8A" }}>{t("commission.calc_desc")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                {[
                  { label: t("commission.calc_price"), value: "$100" },
                  { label: t("commission.calc_comm"), value: "$5 (5%)" },
                  { label: t("commission.calc_earn"), value: "$95" },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center rounded-lg py-4 px-3" style={{ background: "#141414", border: "1px solid #262626" }}>
                    <p className="text-xs mb-1" style={{ color: "#8A8A8A" }}>{label}</p>
                    <p className="text-xl font-bold" style={{ color: "#10B981" }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
}
