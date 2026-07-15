import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router doesn't reset scroll position between routes on its own. Without
 * this, navigating from a scrolled-down page (e.g. Dashboard with many panels)
 * to a shorter one (e.g. Rollup) leaves the window at its old scrollY — the
 * sidebar and content both appear to "jump" because you're still scrolled past
 * where the new, shorter page's content actually starts.
 */
export const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
};
