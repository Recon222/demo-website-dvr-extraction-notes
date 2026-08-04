// Preview for Logo — the Case-File crosshair mark: a rounded navy-gradient tile
// with a carolina crosshair and a glowing gold center dot. Its only prop is the
// pixel size, so the cells sweep the sizes it ships at: footer (28), header/
// default (34), and a hero-scale mark (64) — proving the crosshair + glow stay
// proportioned as it scales.
import { Logo } from 'open-pro-next'

export function Default() {
  return <Logo />
}

export function Large() {
  return <Logo size={64} />
}

export function Small() {
  return <Logo size={28} />
}
