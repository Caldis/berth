import { Head } from 'vite-react-ssg'

/** Renders a JSON-LD script tag into <head> for structured data / SEO. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <Head>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Head>
  )
}
