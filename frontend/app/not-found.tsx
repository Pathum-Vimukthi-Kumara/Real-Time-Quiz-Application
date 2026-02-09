import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-emerald-500/25 blur-[120px]" />
        <div className="absolute top-10 right-[-10%] h-80 w-80 rounded-full bg-cyan-500/20 blur-[140px]" />
      </div>

      <div className="glass-card p-12 max-w-md text-center relative z-10">
        <div className="mb-6">
          <h1 className="text-9xl font-bold text-gradient mb-4">404</h1>
          <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
          <p className="text-slate-400">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/" className="btn btn-primary">
            Go to Home
          </Link>
          <Link href="/host" className="btn btn-secondary">
            Host a Game
          </Link>
        </div>
      </div>
    </main>
  );
}
