import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Check, Languages } from 'lucide-react'
import { LANGS, LANG_LABELS, type Lang } from '@/lib/langs'
import { useLang } from '@/lib/useLang'
import { cn } from '@/lib/cn'

export function LanguageSwitcher() {
  const current = useLang()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function switchTo(l: Lang) {
    const parts = location.pathname.split('/')
    parts[1] = l
    try {
      localStorage.setItem('berth-lang', l)
    } catch {
      /* ignore */
    }
    navigate(parts.join('/') || `/${l}`)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Languages className="h-4 w-4" />
        <span>{LANG_LABELS[current]}</span>
      </button>
      {open && (
        <ul
          className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lift"
          role="listbox"
        >
          {LANGS.map((l) => (
            <li key={l}>
              <button
                onClick={() => switchTo(l)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-harbor-soft/50',
                  l === current ? 'text-ink' : 'text-muted',
                )}
              >
                {LANG_LABELS[l]}
                {l === current && <Check className="h-3.5 w-3.5 text-harbor" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
