import { useEffect } from "react";

/**
 * Custom hook to dynamically update the document title and meta description for SEO.
 * @param {string} title - Page title suffix (e.g., "Documents", "AI Tutor")
 * @param {string} [description] - Optional meta description for the specific page
 */
export function useDocumentTitle(title, description = null) {
  useEffect(() => {
    const prevTitle = document.title;
    const baseTitle = "StudyMate AI";

    document.title = title ? `${title} | ${baseTitle}` : `${baseTitle} — Intelligent Learning Companion`;

    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", description);
      }
    }

    return () => {
      document.title = prevTitle;
    };
  }, [title, description]);
}

export default useDocumentTitle;
