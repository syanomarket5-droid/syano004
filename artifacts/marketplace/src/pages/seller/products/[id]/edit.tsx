import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useUpdateProduct,
  useGetProduct,
  getListProductsQueryKey,
  getGetProductQueryKey,
  getGetSellerDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Plus, Trash2, ImageIcon, Tag, Layers } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  VariantBuilder,
  buildVariantPayload,
  type AttributeGroup,
  type VariantRow,
} from "@/components/VariantBuilder";

function isValidUrl(str: string): boolean {
  try { new URL(str); return true; } catch { return false; }
}

export default function EditProduct() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const { token } = useAuth();
  const { format } = useCurrency();
  const [discountPct, setDiscountPct] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [pricingError, setPricingError] = useState<string | null>(null);

  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  // Variant state
  const [variantsEnabled, setVariantsEnabled] = useState(false);
  const [variantGroups, setVariantGroups] = useState<AttributeGroup[]>([]);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const productSchema = z.object({
    name: z.string().min(2, t("seller_products.name_min")),
    description: z.string().min(10, t("seller_products.desc_min")),
    price: z.coerce.number().min(0.01, t("seller_products.price_min")),
    category: z.string().min(2, t("seller_products.category_min")),
    imageUrl: z.string().url(t("seller_products.url_invalid")).optional().or(z.literal("")),
  });

  type ProductFormValues = z.infer<typeof productSchema>;

  const { data: product, isLoading } = useGetProduct(id, {
    query: { queryKey: getGetProductQueryKey(id), enabled: !!id }
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", description: "", price: 0, category: "", imageUrl: "" },
  });

  useEffect(() => {
    if (!product) return;

    form.reset({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      imageUrl: product.imageUrl || "",
    });
    setGalleryUrls(product.imageUrls ?? []);
    const dp = product.discountPercent ?? 0;
    setDiscountPct(dp);
    setSalePrice(parseFloat((product.price * (1 - dp / 100)).toFixed(2)));

    // Load existing variants
    const apiGroups = (product as any).variantGroups ?? [];
    if (apiGroups.length > 0) {
      setVariantsEnabled(true);
      const builderGroups: AttributeGroup[] = apiGroups.map((g: any) => ({
        id: `grp-${g.id}`,
        name: g.name,
        values: (g.options ?? []).map((o: any) => o.value),
      }));
      setVariantGroups(builderGroups);

      const apiVariants = (product as any).variants ?? [];
      const builderRows: VariantRow[] = apiVariants.map((v: any) => ({
        id: `var-${v.id}`,
        combination: (v.options ?? []).map((o: any) => ({ groupName: o.groupName, value: o.value })),
        label: v.label,
        sku: v.sku ?? "",
        price: v.price ?? null,
        compareAtPrice: v.compareAtPrice ?? null,
        barcode: v.barcode ?? "",
        weightGrams: v.weightGrams ?? null,
        stock: v.stock,
        images: (v.images ?? []).map((i: any) => (typeof i === "string" ? i : i?.url)).filter(Boolean),
        active: v.active,
      }));
      setVariantRows(builderRows);
    }
  }, [product?.id]);

  const updateProduct = useUpdateProduct();

  const addGalleryUrl = () => { if (galleryUrls.length < 5) setGalleryUrls([...galleryUrls, ""]); };
  const removeGalleryUrl = (i: number) => setGalleryUrls(galleryUrls.filter((_, idx) => idx !== i));
  const updateGalleryUrl = (i: number, val: string) => {
    const next = [...galleryUrls]; next[i] = val; setGalleryUrls(next);
  };

  const onSubmit = async (data: ProductFormValues) => {
    if (pricingError) { toast({ title: pricingError, variant: "destructive" }); return; }
    setIsSaving(true);
    try {
      const cleanGallery = galleryUrls.filter((u) => u.trim() !== "" && isValidUrl(u));
      const payload = {
        ...data,
        imageUrl: data.imageUrl || null,
        imageUrls: cleanGallery.length > 0 ? cleanGallery : null,
      };

      await updateProduct.mutateAsync({ id, data: payload as any });

      // Save discount
      const discResp = await fetch(`/api/products/${id}/discount`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ discountPercent: discountPct > 0 ? discountPct : null }),
      });
      if (!discResp.ok) {
        const err = await discResp.json().catch(() => ({}));
        toast({ title: t("seller_products.discount_update_failed"), description: err.message ?? `Status ${discResp.status}`, variant: "destructive" });
        return;
      }

      // Save variants
      if (variantsEnabled && variantGroups.length > 0 && variantRows.length > 0) {
        const vPayload = buildVariantPayload(variantGroups, variantRows);
        const vResp = await fetch(`/api/products/${id}/variants/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
          body: JSON.stringify(vPayload),
        });
        if (!vResp.ok) {
          const err = await vResp.json().catch(() => ({}));
          toast({ title: t("variants.save_failed", "Failed to save variants"), description: err.error ?? "", variant: "destructive" });
          return;
        }
      } else if (!variantsEnabled) {
        // Clear all variants when toggled off
        await fetch(`/api/products/${id}/variants`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token ?? ""}` },
        });
      }

      toast({ title: t("seller_products.updated") });
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getGetSellerDashboardQueryKey() });
      setLocation("/seller/products");
    } catch (err: any) {
      toast({ title: t("seller_products.update_failed"), description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const BackIcon = isRtl ? ChevronRight : ChevronLeft;

  if (isLoading) {
    return <Layout><div className="container py-12 text-muted-foreground">{t("common.loading")}</div></Layout>;
  }

  return (
    <Layout>
      <div className="container py-8 max-w-2xl">
        <Link href="/seller/products" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <BackIcon className="h-4 w-4 me-1" />
          {t("seller_products.back")}
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 sm:mb-8">{t("seller_products.edit_title")}</h1>

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Product Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("seller_products.product_name")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Pricing trio */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-xl border">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">{t("seller_products.pricing_section_title")}</p>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">{t("seller_products.pricing_section_desc")}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("seller_products.original_price_label")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number" step="0.01" min="0"
                            {...field}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              field.onChange(val);
                              setSalePrice(parseFloat((val * (1 - discountPct / 100)).toFixed(2)));
                              setPricingError(null);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">{t("seller_products.sale_price_label")}</label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={salePrice || ""}
                      className={pricingError ? "border-destructive" : ""}
                      onChange={(e) => {
                        const sp = parseFloat(e.target.value) || 0;
                        setSalePrice(sp);
                        const orig = form.getValues("price");
                        if (orig > 0 && sp > orig) {
                          setPricingError(t("seller_products.sale_exceeds_original"));
                          setDiscountPct(0);
                        } else {
                          setPricingError(null);
                          if (orig > 0) setDiscountPct(Math.min(90, Math.max(0, parseFloat(((1 - sp / orig) * 100).toFixed(1)))));
                        }
                      }}
                    />
                    {pricingError && <p className="text-xs text-destructive">{pricingError}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">{t("seller_products.discount_pct_label")}</label>
                    <div className="relative">
                      <Input
                        type="number" step="0.1" min="0" max="90"
                        value={discountPct || ""}
                        placeholder="0"
                        className="pe-8"
                        onChange={(e) => {
                          const dp = Math.min(90, Math.max(0, parseFloat(e.target.value) || 0));
                          setDiscountPct(dp);
                          setSalePrice(parseFloat((form.getValues("price") * (1 - dp / 100)).toFixed(2)));
                          setPricingError(null);
                        }}
                      />
                      <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t("seller_products.discount_pct_hint")}</p>
                  </div>
                </div>

                {discountPct > 0 && (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-lg">
                    <Tag className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      {t("seller_products.price_preview_on_sale", {
                        price: format(salePrice),
                        percent: Number.isInteger(discountPct) ? discountPct : discountPct.toFixed(1),
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Stock (read-only) */}
              <div className="space-y-2">
                <p className="text-sm font-medium leading-none text-muted-foreground">{t("seller_products.stock_col")}</p>
                <div className="h-10 px-3 py-2 border rounded-md bg-muted/30 text-muted-foreground flex items-center gap-2">
                  <span className="font-medium text-foreground">{product?.stock}</span>
                  <span className="text-xs">{t("seller_products.stock_managed")}</span>
                </div>
              </div>

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("seller_products.category")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("seller_products.description")}</FormLabel>
                    <FormControl><Textarea className="min-h-[120px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Images */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-xl border">
                <div className="flex items-center gap-2 mb-1">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">{t("seller_products.images_section")}</p>
                </div>

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("seller_products.cover_image")}</FormLabel>
                      <div className="flex gap-3 items-start">
                        <div className="h-14 w-14 rounded-xl border bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {field.value && isValidUrl(field.value) ? (
                            <img src={field.value} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                          )}
                        </div>
                        <FormControl><Input {...field} /></FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t("seller_products.gallery_label")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("seller_products.gallery_desc")}</p>
                    </div>
                    {galleryUrls.length < 5 && (
                      <Button type="button" variant="outline" size="sm" onClick={addGalleryUrl} className="shrink-0">
                        <Plus className="h-3.5 w-3.5 me-1.5" />
                        {t("seller_products.add_image")}
                      </Button>
                    )}
                  </div>

                  {galleryUrls.length === 0 && (
                    <div
                      className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-5 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                      onClick={addGalleryUrl}
                    >
                      <Plus className="h-5 w-5 text-muted-foreground/40 mx-auto mb-1.5" />
                      <p className="text-sm text-muted-foreground">{t("seller_products.add_gallery_prompt")}</p>
                    </div>
                  )}

                  {galleryUrls.map((url, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="h-10 w-10 rounded-lg border bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {url && isValidUrl(url) ? (
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </div>
                      <Input
                        placeholder={t("seller_products.image_url_placeholder")}
                        value={url}
                        onChange={(e) => updateGalleryUrl(index, e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button" variant="ghost" size="icon"
                        onClick={() => removeGalleryUrl(index)}
                        className="shrink-0 h-10 w-10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Variants section */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-xl border">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Layers className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">{t("variants.section_title", "Product Variants")}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{t("variants.section_desc", "Add sizes, colors, or other options that buyers can choose from.")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVariantsEnabled((p) => !p)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 mt-0.5 ${variantsEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${variantsEnabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                {variantsEnabled && (
                  <VariantBuilder
                    groups={variantGroups}
                    onGroupsChange={setVariantGroups}
                    variants={variantRows}
                    onVariantsChange={setVariantRows}
                  />
                )}

                {variantsEnabled && variantRows.length > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    {t("variants.stock_note", "Note: The stock field above is updated automatically from per-variant stock.")}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-4 border-t gap-4">
                <Link href="/seller/products">
                  <Button variant="outline" type="button">{t("seller_products.cancel_btn")}</Button>
                </Link>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? t("seller_products.saving") : t("seller_products.save_btn")}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
}
