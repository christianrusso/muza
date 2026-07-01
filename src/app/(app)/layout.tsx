export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[430px] bg-paper">{children}</div>
  );
}
