import { createDescriboMainProfile, createDescriboContext } from "./lib.js";
import { ensureDir, writeJSON } from "fs-extra/esm";
import path from "path";

(async () => {
    await ensureDir("./types");

    const definitions = await createDescriboMainProfile();
    await writeJSON(path.join("types", "type-definitions.json"), definitions);

    const context = await createDescriboContext();
    await ensureDir(path.join("./context", context.version));
    await writeJSON(path.join("./context", context.version, "context.jsonld"), context);
})();
