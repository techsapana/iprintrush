/** Scroll viewport to the top of the product customization block (after step change). */
export function scrollCustomizationSectionIntoView(sectionRef) {
  if (typeof window === 'undefined') return;

  const scrollToSection = () => {
    const el = sectionRef?.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

  // Run after React paint and again after layout settles (shorter step content).
  requestAnimationFrame(() => {
    requestAnimationFrame(scrollToSection);
  });
  window.setTimeout(scrollToSection, 120);
}
