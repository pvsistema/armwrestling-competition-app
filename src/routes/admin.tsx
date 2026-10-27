import { createFileRoute } from "@tanstack/react-router";
import ClientShell from "@/components/ClientShell";
import Admin from "@/pages/Admin";

export const Route = createFileRoute("/admin")({
  ssr: false,
  pendingComponent: ClientShell,
  component: Admin,
});
