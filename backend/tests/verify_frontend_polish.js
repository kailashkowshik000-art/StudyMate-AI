/**
 * StudyMate AI — Phase 8.6 Production UI Polish, Error Handling, Branding & SEO Verification Suite
 * Validates:
 * 1. Public Assets & Vector Branding: favicon.svg presence, valid SVG format, and color palette
 * 2. Search Engine Crawler Directives: robots.txt structure, permitted public routes, disallowed authenticated paths
 * 3. Canonical Sitemap: sitemap.xml schema compliance, public route indexation, changefreq, priority values
 * 4. Document Metadata & Social Graph: index.html Open Graph, Twitter cards, SEO keywords, viewport, theme-color
 * 5. Dynamic Document Title & Meta Description: useDocumentTitle hook, consistent branding suffix
 * 6. React Error Boundary Architecture: ErrorBoundary.jsx getDerivedStateFromError, fallback UI, dev details redaction
 * 7. Dedicated Error Pages: NotFound (404), Forbidden (403), ServerError (500) navigation and accessibility
 * 8. API Client Network Error Normalization: isNetworkError, isForbidden, isServerError, trace sanitization, custom events
 * 9. Production Marketing & Showcase: Landing.jsx hero, 4-format support (.pdf, .docx, .pptx, .txt), RAG demo, CTAs
 * 10. Intelligent Routing Architecture: router.jsx errorElement, RootRoute auth awareness, 403/500/404 fallbacks
 * 11. Core Application Pages Title Audit: useDocumentTitle integration across all student-facing routes
 * 12. Workspace Integrity & File Preservation: uploads directory verified intact without loss
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const frontendDir = path.join(rootDir, "frontend");
const backendDir = path.join(rootDir, "backend");

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    if (details) console.log(`         ${details}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    if (details) console.error(`         ${details}`);
    failedTests++;
  }
}

console.log("\n=======================================================================");
console.log("   STUDYMATE AI — PHASE 8.6 PRODUCTION UI, BRANDING & SEO TEST SUITE   ");
console.log("=======================================================================\n");

// SECTION 1: PUBLIC ASSETS & VECTOR BRANDING
console.log("--- 1. Vector Branding & Favicon ---");
const faviconPath = path.join(frontendDir, "public/favicon.svg");
assert(fs.existsSync(faviconPath), "Branded favicon.svg exists in frontend/public");
if (fs.existsSync(faviconPath)) {
  const svgContent = fs.readFileSync(faviconPath, "utf-8");
  assert(svgContent.includes("<svg") && svgContent.includes("</svg>"), "favicon.svg is a well-formed SVG element");
  assert(svgContent.includes("#4f46e5") || svgContent.includes("#6366f1") || svgContent.includes("indigo"), "favicon.svg incorporates brand indigo palette");
  assert(svgContent.includes("<path") || svgContent.includes("<polygon"), "favicon.svg contains vector glyph geometry");
}

// SECTION 2: ROBOTS.TXT DIRECTIVES
console.log("\n--- 2. Robots.txt Crawler Directives ---");
const robotsPath = path.join(frontendDir, "public/robots.txt");
assert(fs.existsSync(robotsPath), "robots.txt exists in frontend/public");
if (fs.existsSync(robotsPath)) {
  const robotsContent = fs.readFileSync(robotsPath, "utf-8");
  assert(robotsContent.includes("User-agent: *"), "robots.txt declares universal user-agent rule");
  assert(robotsContent.includes("Allow: /"), "robots.txt allows crawling public site");
  assert(robotsContent.includes("Disallow: /dashboard"), "robots.txt shields private student dashboard from indexation");
  assert(robotsContent.includes("Disallow: /documents"), "robots.txt shields student documents from indexation");
  assert(robotsContent.includes("Disallow: /api/"), "robots.txt shields backend API endpoints from crawlers");
  assert(robotsContent.includes("Disallow: /uploads/"), "robots.txt blocks direct crawler access to upload assets");
  assert(robotsContent.includes("Sitemap:"), "robots.txt references canonical sitemap.xml");
}

// SECTION 3: SITEMAP.XML CANONICAL STRUCTURE
console.log("\n--- 3. Sitemap.xml Search Index ---");
const sitemapPath = path.join(frontendDir, "public/sitemap.xml");
assert(fs.existsSync(sitemapPath), "sitemap.xml exists in frontend/public");
if (fs.existsSync(sitemapPath)) {
  const sitemapContent = fs.readFileSync(sitemapPath, "utf-8");
  assert(sitemapContent.includes("http://www.sitemaps.org/schemas/sitemap/0.9"), "sitemap.xml conforms to sitemaps.org schema");
  assert(sitemapContent.includes("<loc>https://studymate.ai/</loc>"), "sitemap indexes root URL");
  assert(sitemapContent.includes("<loc>https://studymate.ai/landing</loc>"), "sitemap indexes public landing page");
  assert(sitemapContent.includes("<loc>https://studymate.ai/login</loc>"), "sitemap indexes sign-in portal");
  assert(sitemapContent.includes("<loc>https://studymate.ai/help</loc>"), "sitemap indexes public Help & FAQ");
  assert(sitemapContent.includes("<loc>https://studymate.ai/privacy</loc>"), "sitemap indexes privacy policy");
  assert(!sitemapContent.includes("/dashboard"), "sitemap strictly excludes private /dashboard");
  assert(!sitemapContent.includes("/documents"), "sitemap strictly excludes private /documents");
  assert(sitemapContent.includes("<priority>1.0</priority>"), "sitemap specifies highest priority for home URL");
}

// SECTION 4: HTML METADATA & OPEN GRAPH / TWITTER CARDS
console.log("\n--- 4. HTML Metadata & Social Cards ---");
const indexPath = path.join(frontendDir, "index.html");
assert(fs.existsSync(indexPath), "frontend/index.html exists");
if (fs.existsSync(indexPath)) {
  const indexHtml = fs.readFileSync(indexPath, "utf-8");
  assert(indexHtml.includes('href="/favicon.svg"'), "index.html links to branded /favicon.svg");
  assert(indexHtml.includes('<meta name="description"'), "index.html defines SEO meta description");
  assert(indexHtml.includes('<meta name="keywords"'), "index.html defines academic learning keywords");
  assert(indexHtml.includes('<meta name="theme-color" content="#4f46e5"'), "index.html sets browser theme-color to brand indigo");
  assert(indexHtml.includes('property="og:title"'), "index.html includes Open Graph title for social sharing");
  assert(indexHtml.includes('property="og:description"'), "index.html includes Open Graph description");
  assert(indexHtml.includes('property="og:type" content="website"'), "index.html defines Open Graph website type");
  assert(indexHtml.includes('name="twitter:card"'), "index.html defines Twitter card format");
  assert(indexHtml.includes('name="twitter:title"'), "index.html defines Twitter card title");
}

// SECTION 5: DYNAMIC TITLE HOOK
console.log("\n--- 5. Dynamic Document Title Hook ---");
const titleHookPath = path.join(frontendDir, "src/hooks/useDocumentTitle.js");
assert(fs.existsSync(titleHookPath), "useDocumentTitle.js exists");
if (fs.existsSync(titleHookPath)) {
  const hookContent = fs.readFileSync(titleHookPath, "utf-8");
  assert(hookContent.includes("document.title"), "Hook updates browser document.title");
  assert(hookContent.includes("StudyMate AI"), "Hook formats title with StudyMate AI branding");
  assert(hookContent.includes('meta[name="description"]'), "Hook optionally updates meta description");
}

// SECTION 6: REACT ERROR BOUNDARY ARCHITECTURE
console.log("\n--- 6. React Error Boundary Component ---");
const errorBoundaryPath = path.join(frontendDir, "src/components/common/ErrorBoundary.jsx");
assert(fs.existsSync(errorBoundaryPath), "ErrorBoundary.jsx exists in frontend/src/components/common");
if (fs.existsSync(errorBoundaryPath)) {
  const ebContent = fs.readFileSync(errorBoundaryPath, "utf-8");
  assert(ebContent.includes("getDerivedStateFromError"), "ErrorBoundary implements getDerivedStateFromError");
  assert(ebContent.includes("componentDidCatch"), "ErrorBoundary implements componentDidCatch logging");
  assert(ebContent.includes("Something went wrong"), "ErrorBoundary renders friendly student-facing headline");
  assert(ebContent.includes("Try Again") || ebContent.includes("handleReset"), "ErrorBoundary provides state recovery action");
  assert(ebContent.includes("/dashboard"), "ErrorBoundary includes navigation back to safe dashboard");
  assert(ebContent.includes("sanitizedMessage"), "ErrorBoundary protects production users from raw system traces");
}

// SECTION 7: DEDICATED ERROR PAGES
console.log("\n--- 7. Dedicated Error Pages (404, 403, 500) ---");
const notFoundPath = path.join(frontendDir, "src/pages/NotFound.jsx");
const forbiddenPath = path.join(frontendDir, "src/pages/Forbidden.jsx");
const serverErrorPath = path.join(frontendDir, "src/pages/ServerError.jsx");

assert(fs.existsSync(notFoundPath), "NotFound.jsx (404) exists in frontend/src/pages");
if (fs.existsSync(notFoundPath)) {
  const nfContent = fs.readFileSync(notFoundPath, "utf-8");
  assert(nfContent.includes("Page Not Found"), "NotFound.jsx displays friendly 404 message");
  assert(nfContent.includes("/dashboard"), "NotFound.jsx provides dashboard navigation link");
  assert(nfContent.includes("useDocumentTitle"), "NotFound.jsx sets dynamic document title");
}

assert(fs.existsSync(forbiddenPath), "Forbidden.jsx (403) exists in frontend/src/pages");
if (fs.existsSync(forbiddenPath)) {
  const fbContent = fs.readFileSync(forbiddenPath, "utf-8");
  assert(fbContent.includes("Access Restricted") || fbContent.includes("403"), "Forbidden.jsx explains restricted access");
  assert(fbContent.includes("/login"), "Forbidden.jsx provides re-authentication switch link");
  assert(fbContent.includes("useDocumentTitle"), "Forbidden.jsx sets dynamic document title");
}

assert(fs.existsSync(serverErrorPath), "ServerError.jsx (500) exists in frontend/src/pages");
if (fs.existsSync(serverErrorPath)) {
  const seContent = fs.readFileSync(serverErrorPath, "utf-8");
  assert(seContent.includes("Server Under Pressure") || seContent.includes("500"), "ServerError.jsx displays server recovery guidance");
  assert(seContent.includes("reload") || seContent.includes("Reload"), "ServerError.jsx includes page reload trigger");
  assert(seContent.includes("useDocumentTitle"), "ServerError.jsx sets dynamic document title");
}

// SECTION 8: API ERROR NORMALIZATION & NETWORK RESILIENCE
console.log("\n--- 8. API Client Error Normalization ---");
const apiPath = path.join(frontendDir, "src/services/api.js");
assert(fs.existsSync(apiPath), "api.js exists in frontend/src/services");
if (fs.existsSync(apiPath)) {
  const apiContent = fs.readFileSync(apiPath, "utf-8");
  assert(apiContent.includes("error.isNetworkError = true"), "api.js flags offline/network connection failures");
  assert(apiContent.includes("studymate:network-error"), "api.js broadcasts studymate:network-error custom event");
  assert(apiContent.includes("error.isForbidden = true"), "api.js tags 403 Forbidden responses");
  assert(apiContent.includes("error.isServerError = true"), "api.js tags 500+ Server Error responses");
  assert(apiContent.includes("Sanitize any raw server traces"), "api.js sanitizes sensitive database or server errors");
}

// SECTION 9: LANDING PAGE & MARKETING SHOWCASE
console.log("\n--- 9. Public Landing Page & Supported Formats ---");
const landingPath = path.join(frontendDir, "src/pages/Landing.jsx");
assert(fs.existsSync(landingPath), "Landing.jsx exists in frontend/src/pages");
if (fs.existsSync(landingPath)) {
  const landingContent = fs.readFileSync(landingPath, "utf-8");
  assert(landingContent.includes("PDF Documents") && landingContent.includes(".pdf"), "Landing page highlights PDF document support");
  assert(landingContent.includes("Microsoft Word") && landingContent.includes(".docx"), "Landing page highlights DOCX document support");
  assert(landingContent.includes("PowerPoint") && landingContent.includes(".pptx"), "Landing page highlights PPTX slide support");
  assert(landingContent.includes("Plain Text") && landingContent.includes(".txt"), "Landing page highlights TXT document support");
  assert(landingContent.includes("AI Tutor"), "Landing page highlights 24/7 conversational AI Tutor");
  assert(landingContent.includes("Spaced Repetition Flashcards"), "Landing page highlights flashcard retention");
  assert(landingContent.includes("Get Started Free") || landingContent.includes("Start Studying Free"), "Landing page includes student registration CTAs");
  assert(landingContent.includes("/privacy") && landingContent.includes("/terms"), "Landing page links to privacy and terms");
}

// SECTION 10: ROUTER ERROR HANDLING & SMART ROOT
console.log("\n--- 10. Router Configuration & Error Handling ---");
const routerPath = path.join(frontendDir, "src/router.jsx");
assert(fs.existsSync(routerPath), "router.jsx exists in frontend/src");
if (fs.existsSync(routerPath)) {
  const routerContent = fs.readFileSync(routerPath, "utf-8");
  assert(routerContent.includes("errorElement: <ErrorBoundary />"), "router defines ErrorBoundary as top errorElement");
  assert(routerContent.includes("RootRoute"), "router defines RootRoute smart visitor/authenticated resolution");
  assert(routerContent.includes('path: "landing"'), "router provides public /landing route");
  assert(routerContent.includes('path: "403"'), "router provides dedicated /403 route");
  assert(routerContent.includes('path: "500"'), "router provides dedicated /500 route");
  assert(routerContent.includes('path: "*"') && routerContent.includes("NotFound"), "router maps unknown wildcard routes to NotFound component");
}

// SECTION 11: APPLICATION PAGES USE DOCUMENT TITLE AUDIT
console.log("\n--- 11. Core Student Pages Document Title Audit ---");
const pagesToCheck = [
  { name: "Login", path: "src/pages/Login.jsx", title: "Sign In" },
  { name: "Register", path: "src/pages/Register.jsx", title: "Create Account" },
  { name: "ForgotPassword", path: "src/pages/ForgotPassword.jsx", title: "Forgot Password" },
  { name: "ResetPassword", path: "src/pages/ResetPassword.jsx", title: "Reset Password" },
  { name: "VerifyEmail", path: "src/pages/VerifyEmail.jsx", title: "Verify Email" },
  { name: "Dashboard", path: "src/pages/Dashboard.jsx", title: "Dashboard" },
  { name: "Documents", path: "src/pages/Documents.jsx", title: "Documents" },
  { name: "Chat", path: "src/pages/Chat.jsx", title: "AI Tutor" },
  { name: "Summary", path: "src/pages/Summary.jsx", title: "Study Notes & Summaries" },
  { name: "Quiz", path: "src/pages/Quiz.jsx", title: "Quizzes & Practice Exams" },
  { name: "Flashcards", path: "src/pages/Flashcards.jsx", title: "Flashcards" },
  { name: "Progress", path: "src/pages/Progress.jsx", title: "Analytics & Progress" },
  { name: "Settings", path: "src/pages/Settings.jsx", title: "Account Settings" },
  { name: "Help", path: "src/pages/Help.jsx", title: "Help Center & FAQ" },
  { name: "Contact", path: "src/pages/Contact.jsx", title: "Contact Support" },
  { name: "PrivacyPolicy", path: "src/pages/PrivacyPolicy.jsx", title: "Privacy Policy" },
  { name: "TermsOfService", path: "src/pages/TermsOfService.jsx", title: "Terms of Service" },
];

for (const p of pagesToCheck) {
  const fullPath = path.join(frontendDir, p.path);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf-8");
    const hasHook = content.includes("useDocumentTitle");
    assert(hasHook, `${p.name} incorporates useDocumentTitle for dynamic tab naming`);
  } else {
    assert(false, `${p.name} exists at ${p.path}`);
  }
}

// SECTION 12: PRESERVATION GUARANTEE
console.log("\n--- 12. Workspace Integrity & Storage Preservation ---");
const uploadsDir = path.join(backendDir, "uploads");
if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir).filter((f) => !f.startsWith("."));
  assert(files.length >= 29, `Physical uploads intact in backend/uploads (${files.length} verified files preserved)`);
} else {
  assert(false, "Uploads directory exists");
}

console.log("\n=======================================================================");
console.log(`TOTAL TESTS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log("=======================================================================\n");

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
