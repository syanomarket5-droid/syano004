import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

type Role = "customer" | "seller" | "admin";

/**
 * Determines whether a user role satisfies the allowed-roles requirement.
 * Sellers inherit all customer permissions (they are approved customers who can also sell).
 */
function canAccess(userRole: Role, allowedRoles: Role[]): boolean {
  if (allowedRoles.includes(userRole)) return true;
  if (userRole === "seller" && allowedRoles.includes("customer")) return true;
  return false;
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: Role[];
}) {
  const { isAuthenticated, user, isSeller, isAdmin } = useAuth();
  const [_, setLocation] = useLocation();

  const allowed = !allowedRoles || !user?.role || canAccess(user.role as Role, allowedRoles);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    if (!allowed) {
      if (isAdmin) setLocation("/admin");
      else if (isSeller) setLocation("/seller/dashboard");
      else setLocation("/customer/dashboard");
    }
  }, [isAuthenticated, allowed, setLocation, isSeller, isAdmin]);

  if (!isAuthenticated) return null;
  if (!allowed) return null;

  return <>{children}</>;
}
