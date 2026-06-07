import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { Mail, Phone, MapPin, MessageSquare, Store } from "lucide-react";

export default function ContactPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  useSEO({
    title: t("contact.seo_title"),
    description: t("contact.seo_desc"),
    canonical: "/contact",
  });

  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = t("contact.err_name");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = t("contact.err_email");
    if (!form.subject.trim()) e.subject = t("contact.err_subject");
    if (!form.message.trim() || form.message.trim().length < 10) e.message = t("contact.err_message");
    return e;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitted(true);
  }

  const channels = [
    {
      icon: <Mail className="h-5 w-5" style={{ color: "#10B981" }} />,
      label: t("contact.ch_email"),
      value: "hello@syano.online",
      href: "mailto:hello@syano.online",
      external: false,
    },
    {
      icon: <Phone className="h-5 w-5" style={{ color: "#10B981" }} />,
      label: t("contact.ch_whatsapp"),
      value: "+963 999 999 999",
      href: "https://wa.me/963999999999",
      external: true,
    },
    {
      icon: <MapPin className="h-5 w-5" style={{ color: "#10B981" }} />,
      label: t("contact.ch_location"),
      value: t("contact.ch_location_value"),
      href: null,
      external: false,
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
              {t("contact.badge")}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight" style={{ color: "#F5F5F5" }}>
              {t("contact.hero_title")}
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: "#8A8A8A" }}>
              {t("contact.hero_desc")}
            </p>
          </div>
        </section>

        <div className="container px-4 py-14 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* Left — contact channels */}
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold mb-5" style={{ color: "#F5F5F5" }}>{t("contact.channels_title")}</h2>
                <div className="space-y-4">
                  {channels.map(({ icon, label, value, href, external }) => (
                    <div key={label} className="rounded-xl p-4 flex items-start gap-4" style={{ background: "#0F0F0F", border: "1px solid #262626" }}>
                      <div className="mt-0.5 flex-shrink-0">{icon}</div>
                      <div>
                        <p className="text-xs font-medium mb-0.5" style={{ color: "#8A8A8A" }}>{label}</p>
                        {href ? (
                          <a
                            href={href}
                            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                            className="text-sm font-medium transition-colors duration-150"
                            style={{ color: "#F5F5F5" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#10B981")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#F5F5F5")}
                          >
                            {value}
                          </a>
                        ) : (
                          <p className="text-sm font-medium" style={{ color: "#F5F5F5" }}>{value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seller support */}
              <div className="rounded-xl p-5" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Store className="h-4 w-4" style={{ color: "#10B981" }} />
                  <p className="text-sm font-semibold" style={{ color: "#10B981" }}>{t("contact.seller_support_title")}</p>
                </div>
                <p className="text-sm leading-relaxed mb-3" style={{ color: "#8A8A8A" }}>
                  {t("contact.seller_support_desc")}
                </p>
                <a
                  href="mailto:sellers@syano.online"
                  className="text-sm font-medium transition-colors duration-150"
                  style={{ color: "#10B981" }}
                >
                  sellers@syano.online
                </a>
              </div>
            </div>

            {/* Right — form */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-bold mb-6" style={{ color: "#F5F5F5" }}>{t("contact.form_title")}</h2>

              {submitted ? (
                <div className="rounded-xl p-5 sm:p-8 text-center" style={{ background: "#0F0F0F", border: "1px solid #262626" }}>
                  <MessageSquare className="h-12 w-12 mx-auto mb-4" style={{ color: "#10B981" }} />
                  <h3 className="text-lg font-bold mb-2" style={{ color: "#F5F5F5" }}>{t("contact.success_title")}</h3>
                  <p className="text-sm" style={{ color: "#8A8A8A" }}>{t("contact.success_desc")}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {(["name", "email", "subject"] as const).map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: "#B8B8B8" }}>
                        {t(`contact.field_${field}`)}
                      </label>
                      <input
                        type={field === "email" ? "email" : "text"}
                        value={form[field]}
                        onChange={e => { setForm(f => ({ ...f, [field]: e.target.value })); setErrors(er => ({ ...er, [field]: "" })); }}
                        placeholder={t(`contact.placeholder_${field}`)}
                        className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 transition-colors duration-150"
                        style={{
                          background: "#0F0F0F",
                          border: `1px solid ${errors[field] ? "#EF4444" : "#303030"}`,
                          color: "#F5F5F5",
                        }}
                        onFocus={e => { if (!errors[field]) e.currentTarget.style.borderColor = "#10B981"; }}
                        onBlur={e => { if (!errors[field]) e.currentTarget.style.borderColor = "#303030"; }}
                      />
                      {errors[field] && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{errors[field]}</p>}
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "#B8B8B8" }}>
                      {t("contact.field_message")}
                    </label>
                    <textarea
                      rows={5}
                      value={form.message}
                      onChange={e => { setForm(f => ({ ...f, message: e.target.value })); setErrors(er => ({ ...er, message: "" })); }}
                      placeholder={t("contact.placeholder_message")}
                      className="w-full rounded-lg px-4 py-2.5 text-sm outline-none resize-none transition-colors duration-150"
                      style={{
                        background: "#0F0F0F",
                        border: `1px solid ${errors.message ? "#EF4444" : "#303030"}`,
                        color: "#F5F5F5",
                      }}
                      onFocus={e => { if (!errors.message) e.currentTarget.style.borderColor = "#10B981"; }}
                      onBlur={e => { if (!errors.message) e.currentTarget.style.borderColor = "#303030"; }}
                    />
                    {errors.message && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{errors.message}</p>}
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-lg font-semibold text-sm transition-opacity duration-150 hover:opacity-90"
                    style={{ background: "#10B981", color: "#050505" }}
                  >
                    {t("contact.submit_btn")}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
