import { createContext, useContext } from "react";

export type RequiredPermissionsGateState =
  | "idle"
  | "checking"
  | "granted"
  | "missing";

export interface RequiredPermissionsContextValue {
  state: RequiredPermissionsGateState;
  refresh: (reason?: string) => Promise<boolean>;
}

export const RequiredPermissionsContext =
  createContext<RequiredPermissionsContextValue | null>(null);

export function useRequiredPermissions() {
  const context = useContext(RequiredPermissionsContext);
  if (!context) {
    throw new Error("useRequiredPermissions must be used inside the root permission gate");
  }
  return context;
}