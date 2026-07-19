export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  // Mismo marco tipo teléfono que (app)/layout.tsx, pero fuera del grupo (app)
  // para que el gate de onboarding del middleware no genere un loop de redirect.
  return (
    <div className="min-h-screen w-full bg-ink-deep">
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] bg-paper md:shadow-[0_0_60px_-10px_rgba(0,0,0,0.55)]">
        {children}
      </div>
    </div>
  );
}
