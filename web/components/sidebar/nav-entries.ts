import { LEARNING_HUB } from '@/lib/learning-routes'
import { activeWorkspaceId, scopedUrl } from '@/lib/workspace-scope'
import {
  Bot,
  GraduationCap,
  HeartHandshake,
  House,
  LayoutGrid,
  ListTodo,
  PenLine,
  Settings,
  type LucideIcon,
} from 'lucide-react'

import type { Capability } from '@/lib/capability-routes'

export interface NavEntry {
  href: string
  label: string
  icon: LucideIcon
  tooltipKey?: string
  defaultCollapsed?: boolean
  /** Model capability this feature needs; locked when the user lacks it. */
  requires?: Capability
  /**
   * The page reads and writes content owned by the selected workspace.
   *
   * A link into such a page carries the active `dt_workspace`; without it the
   * destination silently falls back to the default workspace and shows an
   * empty library — the bug that made notebooks saved in Co-Writer invisible
   * on the Learning Space page. Account-level entries (Partners, Settings)
   * stay unscoped.
   */
  workspaceScoped?: boolean
  /**
   * Learning-account surfaces that may see this entry. Absent means the
   * entry is hidden whenever a learning policy is in effect (#1222).
   */
  surfaces?: readonly string[]
}

/**
 * The workspace features, in the order they ship in.
 *
 * This is the *default* arrangement, not the rendered one — a learner can
 * reorder these and fold the ones they don't use into "More"
 * (``lib/sidebar-layout.ts``). Adding an entry here places it for everyone,
 * including people who have already arranged their sidebar: it arrives next to
 * the neighbour it follows below rather than at the bottom of their list.
 */
export const PRIMARY_NAV: NavEntry[] = [
  {
    href: '/chat',
    label: 'Home',
    icon: House,
    tooltipKey: 'Home tooltip',
    requires: 'llm',
    surfaces: ['chat'],
  },
  {
    href: '/partners',
    label: 'Partners',
    icon: HeartHandshake,
    tooltipKey: 'Partners tooltip',
    requires: 'llm',
  },
  {
    href: LEARNING_HUB,
    label: 'Personalized Learning',
    icon: GraduationCap,
    tooltipKey: 'One tutor, your own way to learn.',
    surfaces: ['reading', 'chat', 'books'],
    workspaceScoped: true,
  },
  {
    href: '/space',
    label: 'Learning Space',
    icon: LayoutGrid,
    tooltipKey: 'Space tooltip',
    workspaceScoped: true,
  },
  {
    href: '/kanban',
    label: 'Task Board',
    icon: ListTodo,
    tooltipKey: 'kanban.intro',
    surfaces: ['chat'],
  },
  {
    href: '/co-writer',
    label: 'Co-Writer',
    icon: PenLine,
    tooltipKey: 'Co-Writer tooltip',
    requires: 'llm',
    defaultCollapsed: true,
    workspaceScoped: true,
  },
  {
    href: '/agents',
    label: 'My Agents',
    icon: Bot,
    tooltipKey: 'Agents tooltip',
    defaultCollapsed: true,
  },
]

export const SECONDARY_NAV: NavEntry[] = [{ href: '/settings', label: 'Settings', icon: Settings }]

export const DEFAULT_COLLAPSED_NAV = PRIMARY_NAV.filter(entry => entry.defaultCollapsed).map(
  entry => entry.href
)

export const PRIMARY_NAV_HREFS = PRIMARY_NAV.map(entry => entry.href)

export const NAV_BY_HREF = new Map(
  [...PRIMARY_NAV, ...SECONDARY_NAV].map(entry => [entry.href, entry])
)

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Where a module entry points, keeping the workspace the learner is already in.
 *
 * Only entries that own workspace-scoped data are rewritten: Partners and
 * Settings are account-level, and Task Board declares its own unscoped route
 * (``scopedUrl`` strips the parameter there). Cards into Co-Writer and
 * Personalized Learning must carry it, or a notebook saved from those pages
 * lands in the default workspace and disappears from the workspace it was
 * written in.
 */
export function navDestination(
  href: string,
  workspaceId = activeWorkspaceId(),
): string {
  if (!workspaceId || !NAV_BY_HREF.get(href)?.workspaceScoped) return href
  return scopedUrl(href, workspaceId)
}

/**
 * A learning policy hides every feature the account cannot call. Settings
 * stays, because the redacted page (theme, language) is still theirs.
 * ``allowedSurfaces === null`` means no policy: the full sidebar.
 */
export function navVisibleUnderPolicy(
  href: string,
  allowedSurfaces: readonly string[] | null,
): boolean {
  if (allowedSurfaces === null) return true
  if (href === '/settings') return true
  const surfaces = NAV_BY_HREF.get(href)?.surfaces
  if (!surfaces?.length) return false
  return surfaces.some(surface => allowedSurfaces.includes(surface))
}
