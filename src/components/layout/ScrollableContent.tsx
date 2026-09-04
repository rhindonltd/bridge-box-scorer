import React, { useRef } from "react";

function useHasMoreBelow(ref: React.RefObject<HTMLElement | null>) {
  const [hasMore, setHasMore] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    /* v8 ignore next -- ref is always attached before this effect runs, so the null guard is unreachable in practice */
    if (!element) return;

    const update = () => {
      setHasMore(
        element.scrollHeight - element.scrollTop > element.clientHeight + 1,
      );
    };

    update();
    element.addEventListener("scroll", update);

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [ref]);

  return hasMore;
}

export function ScrollableContent({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMoreBelow = useHasMoreBelow(scrollRef);

  return (
    <div className="relative flex-1 min-h-0">
      <div ref={scrollRef} className={`h-full overflow-y-auto`}>
        {children}
      </div>

      {hasMoreBelow && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      )}
    </div>
  );
}
