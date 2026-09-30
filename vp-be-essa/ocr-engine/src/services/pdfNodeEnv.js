import { createRequire } from "module";
import { DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

const require = createRequire(import.meta.url);

if (globalThis.process && typeof globalThis.process.getBuiltinModule !== "function") {
  globalThis.process.getBuiltinModule = (id) =>
    require(id.startsWith("node:") ? id.slice(5) : id);
}

if (!globalThis.DOMMatrix) {
  globalThis.DOMMatrix = DOMMatrix;
}

if (!globalThis.ImageData) {
  globalThis.ImageData = ImageData;
}

if (!globalThis.Path2D) {
  globalThis.Path2D = Path2D;
}
