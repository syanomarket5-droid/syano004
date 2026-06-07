// @refresh reset
import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useGetPublicSettings, getGetPublicSettingsQueryKey } from "@workspace/api-client-react";

type Currency = "USD" | "SYP";
const DEFAULT_RATE = 14500;

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  format: (usdAmount: number) => string;
  symbol: string;
  exchangeRate: number;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem("marketplace_currency");
    return (saved === "SYP" || saved === "USD") ? saved : "USD";
  });

  const { data: settings } = useGetPublicSettings({
    query: { staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000, queryKey: getGetPublicSettingsQueryKey() },
  });
  const exchangeRate = (settings?.exchangeRate && settings.exchangeRate > 0)
    ? settings.exchangeRate
    : DEFAULT_RATE;

  const setCurrency = useCallback((c: Currency) => {
    localStorage.setItem("marketplace_currency", c);
    setCurrencyState(c);
  }, []);

  const format = useCallback(
    (usdAmount: number): string => {
      if (currency === "SYP") {
        const syp = usdAmount * exchangeRate;
        return `${syp.toLocaleString("en-US", { maximumFractionDigits: 0 })} ل.س`;
      }
      return `$${usdAmount.toFixed(2)}`;
    },
    [currency, exchangeRate]
  );

  const symbol = currency === "SYP" ? "ل.س" : "$";

  /* Memoize the context value so consumers only re-render when currency or
     exchange rate actually changes — not on every CurrencyProvider render. */
  const contextValue = useMemo<CurrencyContextValue>(
    () => ({ currency, setCurrency, format, symbol, exchangeRate }),
    [currency, setCurrency, format, symbol, exchangeRate]
  );

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
