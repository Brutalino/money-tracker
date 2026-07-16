import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (children: React.ReactNode, props: IconProps) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
)

export const IconHome = (p: IconProps) =>
  base(
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </>,
    p
  )

export const IconList = (p: IconProps) =>
  base(
    <>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </>,
    p
  )

export const IconTarget = (p: IconProps) =>
  base(
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.5" />
    </>,
    p
  )

export const IconPiggy = (p: IconProps) =>
  base(
    <>
      <path d="M11 5a5 5 0 0 1 5 5v1h2l1 2-1 1h-1v1a3 3 0 0 1-2 2.83V19a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-.17a5 5 0 0 1-1-.1V19a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-1.5A5 5 0 0 1 5 13v-1a5 5 0 0 1 5-5z" />
      <circle cx="14" cy="10" r="0.6" fill="currentColor" />
    </>,
    p
  )

export const IconChart = (p: IconProps) =>
  base(
    <>
      <path d="M4 20V10" />
      <path d="M11 20V4" />
      <path d="M18 20v-7" />
      <path d="M2 20h20" />
    </>,
    p
  )

export const IconGear = (p: IconProps) =>
  base(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.35a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.65 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.65a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.35 9c.15.51.56.9 1.04 1.04l.09.02a2 2 0 0 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z" />
    </>,
    p
  )

export const IconPlus = (p: IconProps) =>
  base(
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>,
    p
  )

export const IconBack = (p: IconProps) =>
  base(
    <>
      <path d="M15 18l-6-6 6-6" />
    </>,
    p
  )

export const IconClose = (p: IconProps) =>
  base(
    <>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </>,
    p
  )

export const IconTrash = (p: IconProps) =>
  base(
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </>,
    p
  )

export const IconEdit = (p: IconProps) =>
  base(
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>,
    p
  )

export const IconSearch = (p: IconProps) =>
  base(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>,
    p
  )

export const IconChevronLeft = (p: IconProps) => base(<path d="M15 18l-6-6 6-6" />, p)
export const IconChevronRight = (p: IconProps) => base(<path d="M9 18l6-6-6-6" />, p)

export const IconCheck = (p: IconProps) => base(<path d="M20 6 9 17l-5-5" />, p)

export const IconDownload = (p: IconProps) =>
  base(
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </>,
    p
  )

export const IconUpload = (p: IconProps) =>
  base(
    <>
      <path d="M12 21V9" />
      <path d="m7 14 5-5 5 5" />
      <path d="M5 3h14" />
    </>,
    p
  )

export const IconRepeat = (p: IconProps) =>
  base(
    <>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </>,
    p
  )
