const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const jspdfBrowser = path.resolve(
  __dirname,
  "node_modules/jspdf/dist/jspdf.es.min.js",
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "jspdf" ||
    moduleName === "jspdf/dist/jspdf.es.min.js"
  ) {
    return { filePath: jspdfBrowser, type: "sourceFile" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.server = config.server ?? {};
const previousEnhance = config.server.enhanceMiddleware;

config.server.enhanceMiddleware = (middleware, server) => {
  const inner = previousEnhance
    ? previousEnhance(middleware, server)
    : middleware;

  return (req, res, next) => {
    const url = req.url ?? "";
    const pathname = url.split("?")[0] ?? "";

    if (
      req.method === "GET" &&
      pathname.length > 1 &&
      !pathname.includes(".") &&
      !pathname.startsWith("/assets") &&
      !pathname.startsWith("/_expo") &&
      !pathname.startsWith("/node_modules")
    ) {
      const query = url.includes("?") ? url.slice(url.indexOf("?")) : "";
      req.url = `/${query}`;
    }

    return inner(req, res, next);
  };
};

module.exports = config;
