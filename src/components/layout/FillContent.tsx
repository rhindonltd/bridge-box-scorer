/**
 * Content region that lets its children own the full available height with no
 * scroll wrapper and no padding. Unlike {@link ScrollableContent} (which adds a
 * scrollable region + fade) and {@link CenteredContent} (which centres the
 * children), this is a bare growing flex column: children are expected to carry
 * their own `flex-1`/`min-h-0` and manage their own layout to fill the space.
 *
 * Used by full-screen, self-sizing flows such as the contract-entry wizard,
 * where each step renders grow-to-fill button grids and (sometimes) its own
 * footer button rather than a shared action bar.
 */
export function FillContent({ children }: { children: React.ReactNode }) {
  return <div className="relative flex-1 flex flex-col min-h-0">{children}</div>;
}
