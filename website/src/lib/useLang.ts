import { useLocation } from 'react-router-dom'
import { DEFAULT_LANG, isLang, type Lang } from './langs'

/** Derives the active language from the first path segment, e.g. /zh/knowledge -> 'zh'. */
export function useLang(): Lang {
  const segment = useLocation().pathname.split('/')[1]
  return isLang(segment) ? segment : DEFAULT_LANG
}
