import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

function Accordion({ q, a }: FaqItem) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #262626" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-5 text-start gap-4"
      >
        <span className="font-medium text-sm leading-snug" style={{ color: "#F5F5F5" }}>{q}</span>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: "#8A8A8A" }}
        />
      </button>
      <div
        className={`overflow-hidden transition-[max-height,padding-bottom] duration-300 ease-in-out ${open ? "max-h-96 pb-5" : "max-h-0"}`}
      >
        <p className="text-sm leading-relaxed pe-8" style={{ color: "#8A8A8A" }}>{a}</p>
      </div>
    </div>
  );
}

export default function SellerFaqPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  useSEO({
    title: t("seller_faq.seo_title"),
    description: t("seller_faq.seo_desc"),
    canonical: "/seller/faq",
  });

  const faqs: FaqItem[] = Array.from({ length: 12 }, (_, i) => ({
    q: t(`seller_faq.q${i + 1}`),
    a: t(`seller_faq.a${i + 1}`),
  }));

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
              {t("seller_faq.badge")}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight" style={{ color: "#F5F5F5" }}>
              {t("seller_faq.hero_title")}
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: "#8A8A8A" }}>
              {t("seller_faq.hero_desc")}
            </p>
          </div>
        </section>

        {/* FAQ list */}
        <section>
          <div className="container px-4 py-12 max-w-3xl mx-auto">
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #262626", background: "#0F0F0F" }}>
              <div className="px-6">
                {faqs.map((faq) => (
                  <Accordion key={faq.q} {...faq} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Still need help */}
        <section style={{ background: "#0F0F0F", borderTop: "1px solid #262626" }}>
          <div className="container px-4 py-12 max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold mb-3" style={{ color: "#F5F5F5" }}>{t("seller_faq.contact_title")}</h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "#8A8A8A" }}>{t("seller_faq.contact_desc")}</p>
            <a
              href="mailto:sellers@syano.online"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-opacity duration-150 hover:opacity-80"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10B981" }}
            >
              {t("seller_faq.contact_btn")}
            </a>
          </div>
        </section>

      </div>
    </Layout>
  );
}
