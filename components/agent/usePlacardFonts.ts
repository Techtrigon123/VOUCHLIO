"use client";

/*
 * The fonts the placard themes draw with, self-hosted from npm (@fontsource) so the placard pages
 * make no requests to Google. Only the weights the themes use are bundled, and only on the pages
 * that import this file. Family names match PLACARD_FONTS in lib/agent/documents.ts.
 */
import "@fontsource/bebas-neue/400.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/great-vibes/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/lato/700.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/quicksand/600.css";
import "@fontsource/quicksand/700.css";

/**
 * Kept as a hook so the placard pages don't change: the CSS imports above register the fonts,
 * and placardCanvas waits for them (document.fonts.load) before drawing.
 */
export function usePlacardFonts() {}
