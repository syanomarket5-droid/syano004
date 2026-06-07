import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { useTranslation } from "react-i18next";
import type { AuthResponse } from "@workspace/api-client-react";

function useRegisterSchema() {
  const { t } = useTranslation();
  return z.object({
    name: z.string().min(2, t("auth.name_min")),
    identifier: z
      .string()
      .min(1, t("auth.identifier_required"))
      .superRefine((val, ctx) => {
        if (val.includes("@")) {
          if (!z.string().email().safeParse(val).success) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("auth.email_invalid") });
          }
        } else {
          if (val.replace(/\D/g, "").length < 5) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("auth.phone_invalid") });
          }
        }
      }),
    password: z.string().min(8, t("auth.password_min")),
  });
}

type RegisterFormValues = { name: string; identifier: string; password: string };

export default function Register() {
  const [_, setLocation] = useLocation();
  const { login: setAuth } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const schema = useRegisterSchema();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", identifier: "", password: "" },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const identifier = values.identifier.trim();
      const isEmail = identifier.includes("@");
      const body: Record<string, unknown> = {
        name: values.name,
        password: values.password,
      };
      if (isEmail) body.email = identifier;
      else body.phone = identifier;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        const seconds = data.retryAfter ?? 60;
        throw new Error(t("auth.rate_limited", { seconds }));
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const code = err.error ?? "";
        const message =
          code === "Email already registered" ? t("auth.email_taken") :
          code === "Phone number already registered" ? t("auth.phone_taken") :
          err.message || t("auth.try_again");
        throw new Error(message);
      }

      const data = await res.json();
      toast({ title: t("auth.account_created") });

      if (data.pendingVerification) {
        const method = data.method ?? (identifier.includes("@") ? "email" : "phone");
        setLocation(`/verify?identifier=${encodeURIComponent(identifier)}&method=${method}`);
        return;
      }

      // Fallback: legacy full auth response
      if (data.token) {
        setAuth(data, rememberMe);
        setLocation("/");
      }
    } catch (err: any) {
      toast({ title: t("auth.reg_failed"), description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container flex-1 flex items-center justify-center py-12 md:py-16">
        <div className="w-full max-w-md bg-card border border-border p-7 md:p-8 rounded-2xl shadow-sm">
          <div className="text-center mb-7">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{t("auth.create_account")}</h1>
            <p className="text-muted-foreground mt-2 leading-relaxed">{t("auth.register_subtitle")}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.full_name")}</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" placeholder={t("auth.name_placeholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.identifier_label")}</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="username"
                        inputMode="email"
                        placeholder={t("auth.identifier_placeholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.password")}</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(!!v)}
                />
                <label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer select-none">
                  {t("auth.remember_me")}
                </label>
              </div>

              <Button type="submit" className="w-full h-11 text-sm font-semibold mt-1" disabled={isLoading}>
                {isLoading ? t("auth.creating") : t("auth.create_btn")}
              </Button>
            </form>
          </Form>

          <div className="mt-5 text-center text-sm">
            <span className="text-muted-foreground">{t("auth.have_account")} </span>
            <Link href="/login" className="text-primary hover:underline font-semibold whitespace-nowrap">
              {t("auth.login_link")}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
