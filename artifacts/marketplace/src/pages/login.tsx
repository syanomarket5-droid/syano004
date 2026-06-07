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

function useLoginSchema() {
  const { t } = useTranslation();
  return z.object({
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
    password: z.string().min(1, t("auth.password")),
  });
}

type LoginFormValues = { identifier: string; password: string };

export default function Login() {
  const [_, setLocation] = useLocation();
  const { login: setAuth } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const schema = useLoginSchema();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const identifier = values.identifier.trim();
      const isEmail = identifier.includes("@");
      const body = {
        ...(isEmail ? { email: identifier } : { phone: identifier }),
        password: values.password,
      };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        const seconds = data.retryAfter ?? 60;
        throw new Error(t("auth.rate_limited", { seconds }));
      }

      if (res.status === 403) {
        const data = await res.json();
        if (data.verified === false) {
          const method = data.method ?? (isEmail ? "email" : "phone");
          setLocation(`/verify?identifier=${encodeURIComponent(identifier)}&method=${method}`);
          return;
        }
        if (data.error === "ACCOUNT_SUSPENDED") {
          toast({
            title: t("auth.suspended_title"),
            description: t("auth.suspended_desc"),
            variant: "destructive",
          });
          setTimeout(() => setLocation("/account-suspended"), 1200);
          return;
        }
        throw new Error(data.message || t("auth.invalid_credentials"));
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const code = err.error ?? "";
        const message =
          code === "USER_NOT_FOUND"
            ? t("auth.no_account_found")
            : code === "INVALID_PASSWORD"
            ? t("auth.incorrect_password")
            : err.message || t("auth.invalid_credentials");
        throw new Error(message);
      }

      const data: AuthResponse = await res.json();
      setAuth(data, rememberMe);
      toast({ title: t("auth.login_success") });

      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("redirect");

      if (data.user.role === "admin") setLocation("/admin");
      else if (data.user.role === "seller") setLocation("/seller/dashboard");
      else setLocation(redirectTo || "/");
    } catch (err: any) {
      toast({ title: t("auth.login_failed"), description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container flex-1 flex items-center justify-center py-12 md:py-16">
        <div className="w-full max-w-md bg-card border border-border p-7 md:p-8 rounded-2xl shadow-sm">
          <div className="text-center mb-7">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{t("auth.welcome_back")}</h1>
            <p className="text-muted-foreground mt-2 leading-relaxed">{t("auth.login_subtitle")}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <Input type="password" autoComplete="current-password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(v) => setRememberMe(!!v)}
                  />
                  <label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer select-none">
                    {t("auth.remember_me")}
                  </label>
                </div>
                <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  {t("auth.forgot_password")}
                </Link>
              </div>

              <Button type="submit" className="w-full h-11 text-sm font-semibold mt-1" disabled={isLoading}>
                {isLoading ? t("auth.logging_in") : t("auth.login_btn")}
              </Button>
            </form>
          </Form>

          <div className="mt-5 text-center text-sm">
            <span className="text-muted-foreground">{t("auth.no_account")} </span>
            <Link href="/register" className="text-primary hover:underline font-semibold">
              {t("auth.signup_link")}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
