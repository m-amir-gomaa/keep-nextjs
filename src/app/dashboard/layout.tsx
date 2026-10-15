import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ClientLayout from "./ClientLayout";

export default async function DashboardServerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return <ClientLayout>{children}</ClientLayout>;
}
