import { createFileRoute } from "@tanstack/react-router";
import ClientShell from "@/components/ClientShell";
import Cabinet from "@/pages/Cabinet";

export const Route = createFileRoute("/cabinet")({
  ssr: false,
  pendingComponent: ClientShell,
  component: Cabinet,
});
