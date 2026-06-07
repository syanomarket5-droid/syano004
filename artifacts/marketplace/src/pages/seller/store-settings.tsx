import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Store, Save, ExternalLink, Image, Globe, Link2, MapPin, Phone, Mail, Palette } from "lucide-react";
import { Layout } from "@/components/Layout";
import { SellerNav } from "@/components/SellerNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSellerDashboardQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";

interface StoreData {
  storeName: string;
  storeNameAr: string;
  description: string;
  descriptionAr: string;
  storeSlug: string;
  city: string;
  storeLogo: string;
  storeBanner: string;
  accentColor: string;
  website: string;
  socialLinks: string;
  contactPhone: string;
  contactEmail: string;
}

const EMPTY: StoreData = {
  storeName: "", storeNameAr: "", description: "", descriptionAr: "",
  storeSlug: "", city: "", storeLogo: "", storeBanner: "",
  accentColor: "#10b981", website: "", socialLinks: "",
  contactPhone: "", contactEmail: "",
};

function FormSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 pb-1 border-b">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function SellerStoreSettingsPage() {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StoreData>(EMPTY);

  const set = (key: keyof StoreData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const setVal = (key: keyof StoreData, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${BASE_URL}/api/seller-applications/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setForm({
            storeName: data.storeName ?? "",
            storeNameAr: data.storeNameAr ?? "",
            description: data.description ?? "",
            descriptionAr: data.descriptionAr ?? "",
            storeSlug: data.storeSlug ?? "",
            city: data.city ?? "",
            storeLogo: data.storeLogo ?? "",
            storeBanner: data.storeBanner ?? "",
            accentColor: data.accentColor ?? "#10b981",
            website: data.website ?? "",
            socialLinks: data.socialLinks ?? "",
            contactPhone: data.contactPhone ?? data.phone ?? "",
            contactEmail: data.contactEmail ?? "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/sellers/store/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          storeName:        form.storeName        || undefined,
          storeNameAr:      form.storeNameAr      || undefined,
          storeDescription: form.description      || undefined,
          descriptionAr:    form.descriptionAr    || undefined,
          storeSlug:        form.storeSlug        || undefined,
          storeCity:        form.city             || undefined,
          storeLogo:        form.storeLogo        || undefined,
          storeBanner:      form.storeBanner      || undefined,
          accentColor:      form.accentColor      || undefined,
          website:          form.website          || undefined,
          socialLinks:      form.socialLinks      || undefined,
          contactPhone:     form.contactPhone     || undefined,
          contactEmail:     form.contactEmail     || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? t("store_settings.error"));
      }

      const updated = await res.json();

      setForm((prev) => ({
        ...prev,
        storeSlug: updated.storeSlug ?? prev.storeSlug,
        storeNameAr: updated.storeNameAr ?? prev.storeNameAr,
        descriptionAr: updated.descriptionAr ?? prev.descriptionAr,
        accentColor: updated.accentColor ?? prev.accentColor,
        website: updated.website ?? prev.website,
        socialLinks: updated.socialLinks ?? prev.socialLinks,
        contactPhone: updated.contactPhone ?? prev.contactPhone,
        contactEmail: updated.contactEmail ?? prev.contactEmail,
      }));

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetSellerDashboardQueryKey() }),
        queryClient.invalidateQueries({ predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey.some((k) =>
            typeof k === "string" && (k.includes("store") || k.includes("seller"))
          )
        }),
      ]);

      toast({ title: t("store_settings.saved") });
    } catch (e: any) {
      toast({ title: e.message ?? t("store_settings.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <SellerNav />
        <div className="container max-w-3xl mx-auto py-8 px-4 space-y-4">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </Layout>
    );
  }

  const hasSlug = Boolean(form.storeSlug);

  return (
    <Layout>
      <SellerNav />
      <div className="container max-w-3xl mx-auto py-6 px-4 space-y-5">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              {t("store_settings.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t("store_settings.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasSlug ? (
              <Link href={`/store/${form.storeSlug}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  {t("store_settings.view_public_store")}
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled className="gap-2 opacity-60">
                <ExternalLink className="h-4 w-4" />
                {t("store_settings.view_store_fallback")}
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? t("store_settings.saving") : t("store_settings.save")}
            </Button>
          </div>
        </div>

        {/* ── Store Identity ── */}
        <FormSection title={t("store_settings.identity_title")} icon={Store}>
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldRow label={t("store_settings.store_name_label")}>
              <Input value={form.storeName} onChange={set("storeName")}
                placeholder={t("store_settings.store_name_placeholder")} />
            </FieldRow>
            <FieldRow label={t("store_settings.store_name_ar_label")}>
              <Input value={form.storeNameAr} onChange={set("storeNameAr")} dir="rtl"
                placeholder={t("store_settings.store_name_ar_placeholder")} />
            </FieldRow>
          </div>

          <FieldRow label={t("store_settings.store_description_label")}>
            <Textarea value={form.description} onChange={set("description")} rows={3} className="resize-none"
              placeholder={t("store_settings.store_description_placeholder")} />
          </FieldRow>

          <FieldRow label={t("store_settings.store_description_ar_label")}>
            <Textarea value={form.descriptionAr} onChange={set("descriptionAr")} rows={3} className="resize-none" dir="rtl"
              placeholder={t("store_settings.store_description_ar_placeholder")} />
          </FieldRow>

          <div className="grid sm:grid-cols-2 gap-4">
            <FieldRow
              label={t("store_settings.store_slug_label")}
              hint={hasSlug ? t("store_settings.store_slug_hint", { slug: form.storeSlug }) : t("store_settings.no_slug_hint")}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">/store/</span>
                <Input
                  value={form.storeSlug}
                  onChange={(e) => setVal("storeSlug",
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
                  )}
                  placeholder={t("store_settings.store_slug_placeholder")}
                  className="flex-1"
                />
              </div>
            </FieldRow>

            <FieldRow label={t("store_settings.store_city_label")}>
              <div className="relative">
                <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input value={form.city} onChange={set("city")} className="ps-9"
                  placeholder={t("store_settings.store_city_placeholder")} />
              </div>
            </FieldRow>
          </div>
        </FormSection>

        {/* ── Branding ── */}
        <FormSection title={t("store_settings.branding_title")} icon={Image}>
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldRow label={t("store_settings.accent_color_label")} hint={t("store_settings.accent_color_hint")}>
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-lg border-2 border-border shrink-0 cursor-pointer overflow-hidden"
                  style={{ backgroundColor: form.accentColor || "#10b981" }}
                >
                  <input
                    type="color"
                    value={form.accentColor || "#10b981"}
                    onChange={(e) => setVal("accentColor", e.target.value)}
                    className="opacity-0 w-full h-full cursor-pointer"
                  />
                </div>
                <Input value={form.accentColor} onChange={set("accentColor")}
                  placeholder="#10b981" className="flex-1 font-mono text-sm" />
              </div>
            </FieldRow>
            <div />
          </div>

          <FieldRow label={t("store_settings.store_logo_label")} hint={t("store_settings.store_logo_hint")}>
            <div className="flex items-start gap-3">
              {form.storeLogo && (
                <div className="h-12 w-12 rounded-xl border overflow-hidden shrink-0">
                  <img src={form.storeLogo} alt="" className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
              <Input value={form.storeLogo} onChange={set("storeLogo")}
                placeholder={t("store_settings.store_logo_placeholder")} className="flex-1" />
            </div>
          </FieldRow>

          <FieldRow label={t("store_settings.store_banner_label")} hint={t("store_settings.store_banner_hint")}>
            {form.storeBanner && (
              <div className="w-full h-24 rounded-xl border overflow-hidden mb-2">
                <img src={form.storeBanner} alt="" className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
            <Input value={form.storeBanner} onChange={set("storeBanner")}
              placeholder={t("store_settings.store_banner_placeholder")} />
          </FieldRow>
        </FormSection>

        {/* ── Contact & Social ── */}
        <FormSection title={t("store_settings.contact_title")} icon={Link2}>
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldRow label={t("store_settings.contact_phone_label")}>
              <div className="relative">
                <Phone className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input value={form.contactPhone} onChange={set("contactPhone")} className="ps-9"
                  placeholder={t("store_settings.contact_phone_placeholder")} type="tel" />
              </div>
            </FieldRow>

            <FieldRow label={t("store_settings.contact_email_label")}>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input value={form.contactEmail} onChange={set("contactEmail")} className="ps-9"
                  placeholder={t("store_settings.contact_email_placeholder")} type="email" />
              </div>
            </FieldRow>
          </div>

          <FieldRow label={t("store_settings.website_label")}>
            <div className="relative">
              <Globe className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input value={form.website} onChange={set("website")} className="ps-9"
                placeholder={t("store_settings.website_placeholder")} type="url" />
            </div>
          </FieldRow>

          <FieldRow label={t("store_settings.social_links_label")} hint={t("store_settings.social_links_hint")}>
            <Textarea value={form.socialLinks} onChange={set("socialLinks")} rows={3} className="resize-none"
              placeholder={t("store_settings.social_links_placeholder")} />
          </FieldRow>
        </FormSection>

        {/* Bottom save */}
        <div className="flex justify-end pb-4">
          <Button onClick={handleSave} disabled={saving} className="gap-2 px-8">
            <Save className="h-4 w-4" />
            {saving ? t("store_settings.saving") : t("store_settings.save")}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
