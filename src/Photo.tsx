import { useEffect, useRef, useState } from 'react'

export function Photo({ src, alt }: { src: string; alt: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const viewer = dialog.current
    const overflow = document.body.style.overflow
    viewer?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      viewer?.close()
      document.body.style.overflow = overflow
    }
  }, [open])

  return <>
    <button className="photo-preview" onClick={() => setOpen(true)} aria-label="Open full-size photo" aria-haspopup="dialog">
      <img src={src} alt={alt} loading="lazy" />
    </button>
    <dialog ref={dialog} className="photo-viewer" aria-label="Full-size photo" onClose={() => setOpen(false)} onClick={() => setOpen(false)}>
      {open && <button className="photo-close" aria-label="Close full-size photo" autoFocus>
        <img src={src} alt={alt} />
        <span>Click anywhere or press Esc to close</span>
      </button>}
    </dialog>
  </>
}
