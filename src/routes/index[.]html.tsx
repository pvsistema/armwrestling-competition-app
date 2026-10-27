import { createFileRoute } from "@tanstack/react-router";
import ClientShell from "@/components/ClientShell";
import HomeEntry from "@/components/HomeEntry";

export const Route = createFileRoute("/index.html")({
  ssr: false,
  pendingComponent: ClientShell,
  component: HomeEntry,
});
