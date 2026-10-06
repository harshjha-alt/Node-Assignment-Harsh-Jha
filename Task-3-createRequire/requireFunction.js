const fs = require("fs");
const path = require("path");

const cache = {};

function requireFunction(filePath) {

    // 1. File ka absolute path
    const fullPath = path.resolve(filePath + ".js");

    // 2. Check if already loaded
    if (cache[fullPath]) {
        return cache[fullPath].exports;
    }

    // 3. File read karo
    const code = fs.readFileSync(fullPath, "utf-8");

    // 4. Module object banao
    const module = {
        exports: {}
    };

    // 5. Cache mein daalo
    cache[fullPath] = module;

    // 6. Code ko function ke andar run karo
    const wrapper = new Function(
        "module",
        "exports",
        "require",
        code
    );

    // 7. File execute karo
    wrapper(
        module,
        module.exports,
        myRequire
    );

    // 8. module.exports return karo
    return module.exports;
}

module.exports = requireFunction;