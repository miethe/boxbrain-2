import { AppShell } from "@/components/shell";
import { MySelectionProvider } from "@/components/selection";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <MySelectionProvider>
      <AppShell>{children}</AppShell>
    </MySelectionProvider>
  );
}
