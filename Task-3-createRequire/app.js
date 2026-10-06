const myRequire = require("./myRequire");

const math = myRequire("./math");

console.log(math.add(10, 5));
console.log(math.subtract(10, 5));