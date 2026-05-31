export function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-harbor font-display text-xl font-semibold text-white">
          B
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted">The page you&rsquo;re looking for doesn&rsquo;t exist.</p>
        <a href="/en/" className="btn-primary mt-6">
          Back to home
        </a>
      </div>
    </div>
  )
}
