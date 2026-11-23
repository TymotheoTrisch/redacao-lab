import type { ObjectDirective } from 'vue'

// Conteúdo já aparece normalmente quando o WebView não oferece animação ou observação.
let observer: IntersectionObserver | undefined
const observed = new Set<Element>()
export const vScrollReveal: ObjectDirective<HTMLElement> = {
  mounted(el) {
    if (!window.IntersectionObserver || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return
    observer ??= new IntersectionObserver(entries => {
      for (const {target,isIntersecting} of entries) {
        if (!isIntersecting || !observed.delete(target)) continue
        observer?.unobserve(target)
        target.classList.add('scroll-enter')
      }
    })
    observed.add(el)
    observer.observe(el)
  },
  unmounted(el) {
    if (observed.delete(el)) observer?.unobserve(el)
    if (!observed.size) {
      observer?.disconnect()
      observer=undefined
    }
  }
}
