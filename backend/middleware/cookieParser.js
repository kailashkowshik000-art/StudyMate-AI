/**
 * StudyMate AI — Zero-Dependency Cookie Parser Middleware (Phase 8.2)
 * Robustly parses incoming Cookie headers into req.cookies object
 */

export const cookieParser = (req, res, next) => {
  if (req.cookies && typeof req.cookies === "object") {
    return next();
  }

  const cookieHeader = req.headers.cookie;
  req.cookies = {};

  if (!cookieHeader || typeof cookieHeader !== "string") {
    return next();
  }

  const pairs = cookieHeader.split(";");
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].trim();
    if (!pair) continue;

    const equalIndex = pair.indexOf("=");
    if (equalIndex === -1) continue;

    const key = pair.slice(0, equalIndex).trim();
    let val = pair.slice(equalIndex + 1).trim();

    // Remove wrapping quotes if present
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }

    try {
      req.cookies[key] = decodeURIComponent(val);
    } catch {
      req.cookies[key] = val;
    }
  }

  next();
};

export default cookieParser;
