import { createDescriboMainProfile } from "./lib.js";
import { ensureDir, writeJSON } from "fs-extra/esm";
import path from "path";

(async () => {
    await ensureDir("./types");

    let definitions = await createDescriboMainProfile();
    await writeJSON(path.join("types", "type-definitions.json"), definitions);
})();
