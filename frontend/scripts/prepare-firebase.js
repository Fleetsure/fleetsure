const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "../.next/server/app");
const staticSrc = path.join(__dirname, "../.next/static");
const publicSrc = path.join(__dirname, "../public");
const dest = path.join(__dirname, "../../public");

// Clean destination
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

// Copy HTML pages and assets from .next/server/app
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      // Only copy .html files and static assets (skip .rsc, .meta, .segments, .js.map, .nft.json)
      const ext = path.extname(entry.name);
      const skip = [".rsc", ".meta", ".segments", ".map", ".nft.json"];
      if (!skip.some((s) => entry.name.endsWith(s))) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

copyDir(src, dest);

// Copy _next/static (JS/CSS chunks) → public/_next/static
const nextStaticDest = path.join(dest, "_next", "static");
fs.mkdirSync(nextStaticDest, { recursive: true });
copyDir(staticSrc, nextStaticDest);

// Copy public/ assets (images, icons, etc.) → root of dest
if (fs.existsSync(publicSrc)) {
  copyDir(publicSrc, dest);
}

console.log("✓ Firebase public/ folder prepared at:", dest);
