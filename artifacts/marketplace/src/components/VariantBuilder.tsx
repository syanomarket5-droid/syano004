import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Zap, ImageIcon, X, ChevronDown, ChevronUp, Copy, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

// ── Preset groups with quick-add values ───────────────────────────────────────
const PRESET_GROUPS: Array<{ name: string; nameAr: string; values: string[]; valuesAr: string[] }> = [
  { name: "Color",   nameAr: "اللون",  values: ["Black", "White", "Red", "Blue", "Green", "Yellow", "Gray", "Pink"],        valuesAr: ["أسود", "أبيض", "أحمر", "أزرق", "أخضر", "أصفر", "رمادي", "وردي"] },
  { name: "Size",    nameAr: "المقاس", values: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],                                  valuesAr: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] },
  { name: "Storage", nameAr: "السعة",  values: ["64GB", "128GB", "256GB", "512GB", "1TB"],                                   valuesAr: ["64GB", "128GB", "256GB", "512GB", "1TB"] },
  { name: "RAM",     nameAr: "الذاكرة",values: ["4GB", "6GB", "8GB", "12GB", "16GB", "32GB"],                               valuesAr: ["4GB", "6GB", "8GB", "12GB", "16GB", "32GB"] },
  { name: "Material",nameAr: "المادة", values: ["Cotton", "Polyester", "Leather", "Silk", "Wool", "Linen", "Denim"],         valuesAr: ["قطن", "بوليستر", "جلد", "حرير", "صوف", "كتان", "دنيم"] },
  { name: "Style",   nameAr: "الأسلوب",values: ["Classic", "Modern", "Sport", "Casual", "Formal"],                          valuesAr: ["كلاسيكي", "عصري", "رياضي", "كاجوال", "رسمي"] },
];

export interface AttributeGroup {
  id: string;
  name: string;
  values: string[];
}

export interface VariantRow {
  id: string;
  combination: { groupName: string; value: string }[];
  label: string;
  sku: string;
  price: number | null;
  compareAtPrice: number | null;
  barcode: string;
  weightGrams: number | null;
  stock: number;
  images: string[];
  active: boolean;
}

interface VariantBuilderProps {
  groups: AttributeGroup[];
  onGroupsChange: (groups: AttributeGroup[]) => void;
  variants: VariantRow[];
  onVariantsChange: (variants: VariantRow[]) => void;
  defaultStock?: number;
}

export function cartesianVariants(groups: AttributeGroup[], defaultStock = 0): VariantRow[] {
  const valid = groups.filter((g) => g.name.trim() && g.values.some((v) => v.trim()));
  if (valid.length === 0) return [];

  let result: { groupName: string; value: string }[][] = [[]];
  for (const group of valid) {
    const next: { groupName: string; value: string }[][] = [];
    for (const existing of result) {
      for (const value of group.values.filter((v) => v.trim())) {
        next.push([...existing, { groupName: group.name.trim(), value: value.trim() }]);
      }
    }
    result = next;
  }

  return result.map((combo, i) => ({
    id: `gen-${Date.now()}-${i}`,
    combination: combo,
    label: combo.map((c) => c.value).join(" / "),
    sku: "",
    price: null,
    compareAtPrice: null,
    barcode: "",
    weightGrams: null,
    stock: defaultStock,
    images: [],
    active: true,
  }));
}

export function buildVariantPayload(groups: AttributeGroup[], variants: VariantRow[]) {
  const validGroups = groups.filter((g) => g.name.trim() && g.values.some((v) => v.trim()));
  return {
    groups: validGroups.map((g) => ({
      name: g.name.trim(),
      options: g.values.filter((v) => v.trim()).map((v) => v.trim()),
    })),
    variants: variants.map((v) => ({
      options: v.combination
        .map((c) => {
          const gi = validGroups.findIndex((g) => g.name.trim() === c.groupName);
          const g = validGroups[gi];
          const oi = g ? g.values.filter((x) => x.trim()).findIndex((x) => x.trim() === c.value) : -1;
          return { groupIndex: gi, optionIndex: oi };
        })
        .filter((o) => o.groupIndex >= 0 && o.optionIndex >= 0),
      sku:            v.sku.trim() || undefined,
      price:          v.price != null && v.price > 0 ? v.price : undefined,
      compareAtPrice: v.compareAtPrice != null && v.compareAtPrice > 0 ? v.compareAtPrice : undefined,
      barcode:        v.barcode.trim() || undefined,
      weightGrams:    v.weightGrams != null && v.weightGrams > 0 ? v.weightGrams : undefined,
      stock:          Math.max(0, Math.round(v.stock)),
      images:         v.images.filter((u) => u.trim()),
      active:         v.active,
    })),
  };
}

function AddValueInput({ onAdd }: { onAdd: (v: string) => void }) {
  const [val, setVal] = useState("");
  const { t } = useTranslation();
  const submit = () => {
    const trimmed = val.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setVal("");
  };
  return (
    <div className="flex gap-1.5 mt-2">
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        placeholder={t("variants.value_placeholder", "e.g. Black, M, 128GB")}
        className="h-8 text-xs"
      />
      <Button type="button" size="sm" variant="secondary" className="h-8 px-3 text-xs shrink-0" onClick={submit}>
        {t("variants.add_value", "Add")}
      </Button>
    </div>
  );
}

function ImagesList({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const { t } = useTranslation();
  const addImage = () => { if (images.length < 8) onChange([...images, ""]); };
  const removeImage = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  const updateImage = (i: number, val: string) => {
    const next = [...images];
    next[i] = val;
    onChange(next);
  };
  return (
    <div className="space-y-1.5 pt-1">
      {images.map((url, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <div className="h-7 w-7 rounded border bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {url ? (
              <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <ImageIcon className="h-3 w-3 text-muted-foreground/40" />
            )}
          </div>
          <Input
            value={url}
            onChange={(e) => updateImage(i, e.target.value)}
            placeholder={t("variants.image_url_placeholder", "Image URL")}
            className="h-7 text-xs flex-1"
          />
          <button
            type="button"
            onClick={() => removeImage(i)}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {images.length < 8 && (
        <button
          type="button"
          onClick={addImage}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-1"
        >
          <Plus className="h-3 w-3" />
          {t("variants.add_image", "Add image URL")}
        </button>
      )}
    </div>
  );
}

export function VariantBuilder({ groups, onGroupsChange, variants, onVariantsChange, defaultStock = 0 }: VariantBuilderProps) {
  const { t } = useTranslation();
  const [expandedImages, setExpandedImages] = useState<Set<string>>(new Set());
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  const combinationCount = (() => {
    const valid = groups.filter((g) => g.name.trim() && g.values.some((v) => v.trim()));
    if (valid.length === 0) return 0;
    return valid.reduce((acc, g) => acc * g.values.filter((v) => v.trim()).length, 1);
  })();

  const addGroup = () => onGroupsChange([...groups, { id: `grp-${Date.now()}`, name: "", values: [] }]);
  const removeGroup = (id: string) => onGroupsChange(groups.filter((g) => g.id !== id));
  const updateGroupName = (id: string, name: string) => onGroupsChange(groups.map((g) => (g.id === id ? { ...g, name } : g)));
  const addValue = (id: string, value: string) =>
    onGroupsChange(groups.map((g) =>
      g.id === id && !g.values.map((v) => v.toLowerCase()).includes(value.toLowerCase())
        ? { ...g, values: [...g.values, value] }
        : g
    ));
  const removeValue = (id: string, value: string) =>
    onGroupsChange(groups.map((g) => (g.id === id ? { ...g, values: g.values.filter((v) => v !== value) } : g)));

  // Find preset matching a group's name (case-insensitive, checks both name and nameAr)
  const findPreset = (groupName: string) => {
    const lower = groupName.toLowerCase().trim();
    return PRESET_GROUPS.find(
      (p) => p.name.toLowerCase() === lower || p.nameAr === lower || p.nameAr === groupName.trim()
    ) ?? null;
  };

  // Add a preset group with its name pre-filled (no values yet — let seller choose)
  const addPresetGroup = (preset: typeof PRESET_GROUPS[0]) => {
    const alreadyExists = groups.some(
      (g) => g.name.toLowerCase() === preset.name.toLowerCase() || g.name === preset.nameAr
    );
    if (alreadyExists) return;
    onGroupsChange([...groups, { id: `grp-${Date.now()}`, name: preset.name, values: [] }]);
  };

  const generate = () => onVariantsChange(cartesianVariants(groups, defaultStock));

  const updateVariant = (variantId: string, field: keyof VariantRow, value: unknown) =>
    onVariantsChange(variants.map((v) => (v.id === variantId ? { ...v, [field]: value } : v)));

  const toggleImages = (id: string) => {
    setExpandedImages((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applyBulk = () => {
    onVariantsChange(
      variants.map((v) => ({
        ...v,
        ...(bulkPrice !== "" && !isNaN(parseFloat(bulkPrice)) ? { price: parseFloat(bulkPrice) } : {}),
        ...(bulkStock !== "" && !isNaN(parseInt(bulkStock)) ? { stock: parseInt(bulkStock) } : {}),
      }))
    );
  };

  const copyImagesToSameColor = (sourceVariant: VariantRow) => {
    if (groups.length === 0) return;
    const primaryValue = sourceVariant.combination[0]?.value;
    if (!primaryValue) return;
    onVariantsChange(
      variants.map((v) =>
        v.combination[0]?.value === primaryValue
          ? { ...v, images: [...sourceVariant.images] }
          : v
      )
    );
  };

  return (
    <div className="space-y-5">
      {/* Attribute Groups */}
      <div className="space-y-3">
        {groups.map((group, gIdx) => (
          <div key={group.id} className="border rounded-xl p-4 bg-muted/20 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0 w-6">{gIdx + 1}.</span>
                <div className="flex-1">
                  <Input
                    value={group.name}
                    onChange={(e) => updateGroupName(group.id, e.target.value)}
                    placeholder={t("variants.group_name_placeholder", "e.g. Color, Size, Storage")}
                    className="h-9 text-sm font-medium"
                  />
                  {gIdx === 0 && group.name.trim() && (
                    <p className="text-[10px] text-primary mt-1 ms-1">
                      ★ {t("variants.primary_group_hint", "Gallery images will switch when customers select this attribute")}
                    </p>
                  )}
                </div>
              </div>
              <Button
                type="button" variant="ghost" size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removeGroup(group.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {group.values.map((val) => (
                <Badge key={val} variant="secondary" className="gap-1 pe-1 text-xs font-medium">
                  {val}
                  <button
                    type="button"
                    onClick={() => removeValue(group.id, val)}
                    className="ms-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive p-0.5 transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
              {group.values.length === 0 && (
                <span className="text-xs text-muted-foreground italic">{t("variants.no_values", "No values yet")}</span>
              )}
            </div>

            {/* Preset value suggestions — appear when group name matches a known preset */}
            {(() => {
              const preset = findPreset(group.name);
              if (!preset) return null;
              const remaining = preset.values.filter(
                (v) => !group.values.map((x) => x.toLowerCase()).includes(v.toLowerCase())
              );
              if (remaining.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] font-medium text-muted-foreground self-center shrink-0">
                    {t("variants.quick_add", "Quick add:")}
                  </span>
                  {remaining.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => addValue(group.id, val)}
                      className="inline-flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full border border-dashed border-primary/40 text-primary hover:bg-primary/10 hover:border-primary transition-colors"
                    >
                      <Plus className="h-2.5 w-2.5" />
                      {val}
                    </button>
                  ))}
                </div>
              );
            })()}

            <AddValueInput onAdd={(v) => addValue(group.id, v)} />
          </div>
        ))}

        {/* Quick-add preset group chips — shown when no groups yet or fewer than 3 */}
        {groups.length < 3 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground shrink-0">
              <Sparkles className="h-3 w-3" />
              {t("variants.quick_preset", "Quick start:")}
            </span>
            {PRESET_GROUPS.filter(
              (p) => !groups.some(
                (g) => g.name.toLowerCase() === p.name.toLowerCase() || g.name === p.nameAr
              )
            ).map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => addPresetGroup(preset)}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/8 border border-primary/20 text-primary hover:bg-primary/15 hover:border-primary/40 transition-colors"
              >
                <Plus className="h-2.5 w-2.5 shrink-0" />
                {preset.name}
              </button>
            ))}
          </div>
        )}

        <Button type="button" variant="outline" size="sm" onClick={addGroup} className="gap-2 text-sm">
          <Plus className="h-3.5 w-3.5" />
          {t("variants.add_group", "Add Attribute")}
        </Button>
      </div>

      {/* Generate button */}
      {combinationCount > 0 && (
        <Button
          type="button"
          variant={variants.length > 0 ? "outline" : "default"}
          onClick={generate}
          className="gap-2 w-full sm:w-auto"
        >
          <Zap className="h-4 w-4" />
          {variants.length > 0
            ? t("variants.regenerate", "Regenerate Combinations")
            : t("variants.generate", "Generate {{count}} Combinations", { count: combinationCount })}
        </Button>
      )}

      {combinationCount === 0 && groups.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("variants.no_groups_hint", "Add at least one attribute with values to generate combinations.")}
        </p>
      )}

      {/* Variant rows */}
      {variants.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {t("variants.combinations_generated", "{{count}} Variant Combinations", { count: variants.length })}
            </p>
          </div>

          {/* Bulk apply bar */}
          {variants.length > 1 && (
            <div className="flex flex-wrap gap-2 items-center px-3 py-2.5 bg-muted/40 rounded-xl border border-dashed">
              <span className="text-xs font-semibold text-muted-foreground shrink-0">
                {t("variants.bulk_apply", "Apply to all:")}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">$</span>
                <Input
                  type="number" step="0.01" min="0"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  placeholder={t("variants.price", "Price")}
                  className="h-7 text-xs w-24"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{t("variants.stock", "Qty")}</span>
                <Input
                  type="number" min="0" step="1"
                  value={bulkStock}
                  onChange={(e) => setBulkStock(e.target.value)}
                  placeholder="0"
                  className="h-7 text-xs w-20"
                />
              </div>
              <Button type="button" size="sm" variant="secondary" className="h-7 px-3 text-xs" onClick={applyBulk}>
                {t("variants.apply_all", "Apply")}
              </Button>
            </div>
          )}

          <div className="rounded-xl border overflow-hidden">
            {/* Header */}
            <div className="hidden md:grid grid-cols-[1fr_110px_100px_100px_70px_48px] gap-2 px-4 py-2.5 bg-muted/50 border-b text-xs font-semibold text-muted-foreground">
              <span>{t("variants.variant_label", "Variant")}</span>
              <span>{t("variants.sku_col", "SKU")}</span>
              <span>{t("variants.price_col", "Price ($)")}</span>
              <span>{t("variants.compare_col", "Was ($)")}</span>
              <span>{t("variants.stock_col", "Stock")}</span>
              <span>{t("variants.active_col", "On")}</span>
            </div>

            <div className="divide-y">
              {variants.map((v) => {
                const imagesOpen = expandedImages.has(v.id);
                const imageCount = v.images.filter((u) => u.trim()).length;
                const showCopyColor = groups.length > 0 && imageCount > 0;
                return (
                  <div key={v.id} className="px-4 py-3 space-y-2">
                    {/* Main row */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_110px_100px_100px_70px_48px] gap-2 md:gap-2 items-center">
                      {/* Label + images toggle */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleImages(v.id)}
                          className="flex items-center gap-1.5 text-start flex-1 min-w-0"
                        >
                          <span className="text-sm font-semibold truncate">{v.label}</span>
                          <span className="shrink-0 flex items-center gap-0.5 text-[10px] text-primary font-medium">
                            <ImageIcon className="h-3 w-3" />
                            {imageCount > 0 ? imageCount : t("variants.add_photos", "Photos")}
                            {imagesOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </span>
                        </button>
                      </div>

                      {/* SKU */}
                      <Input
                        value={v.sku}
                        onChange={(e) => updateVariant(v.id, "sku", e.target.value)}
                        placeholder="SKU-001"
                        className="h-8 text-xs"
                      />

                      {/* Price (absolute) */}
                      <Input
                        type="number" step="0.01" min="0"
                        value={v.price ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : parseFloat(e.target.value) || null;
                          updateVariant(v.id, "price", val);
                        }}
                        placeholder={t("variants.price_inherit", "Base")}
                        className="h-8 text-xs"
                      />

                      {/* Compare-at price */}
                      <Input
                        type="number" step="0.01" min="0"
                        value={v.compareAtPrice ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : parseFloat(e.target.value) || null;
                          updateVariant(v.id, "compareAtPrice", val);
                        }}
                        placeholder={t("variants.compare_inherit", "—")}
                        className="h-8 text-xs"
                      />

                      {/* Stock */}
                      <Input
                        type="number" min="0" step="1"
                        value={v.stock}
                        onChange={(e) => updateVariant(v.id, "stock", parseInt(e.target.value) || 0)}
                        className="h-8 text-xs"
                      />

                      {/* Active toggle */}
                      <button
                        type="button"
                        onClick={() => updateVariant(v.id, "active", !v.active)}
                        className={`h-8 w-12 rounded-lg border text-xs font-semibold transition-colors shrink-0 ${
                          v.active
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {v.active ? "On" : "Off"}
                      </button>
                    </div>

                    {/* Expanded images section */}
                    {imagesOpen && (
                      <div className="ms-0 md:ms-[calc((100%+8px)*0)] bg-muted/30 rounded-lg p-3 space-y-2 border border-dashed">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground">
                            {t("variants.variant_images", "Variant Images")}
                            {groups[0]?.name && (
                              <span className="ms-1 font-normal">
                                — {t("variants.gallery_note", "Used for gallery when {{attr}} is selected", { attr: groups[0].name })}
                              </span>
                            )}
                          </p>
                          {showCopyColor && groups.length > 0 && (
                            <button
                              type="button"
                              onClick={() => copyImagesToSameColor(v)}
                              className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                              title={t("variants.copy_color_hint", "Copy these images to all variants with the same {{attr}}", { attr: groups[0]?.name || "color" })}
                            >
                              <Copy className="h-2.5 w-2.5" />
                              {t("variants.copy_to_same", "Copy to same {{attr}}", { attr: groups[0]?.name || "color" })}
                            </button>
                          )}
                        </div>
                        <ImagesList
                          images={v.images}
                          onChange={(imgs) => updateVariant(v.id, "images", imgs)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("variants.price_inherit_note", "Leave Price blank to use the base product price. 'Was' is the crossed-out original price.")}
          </p>
        </div>
      )}
    </div>
  );
}
