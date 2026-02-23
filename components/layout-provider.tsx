"use client";

import { MinimalLayoutManager } from "@/components/layout/minimal-layout-manager";
import React from "react";

export function LayoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MinimalLayoutManager>
      {children}
    </MinimalLayoutManager>
  );
}