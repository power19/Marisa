// Top-level portal layout — no auth here; that lives in (protected)/layout.tsx
export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
