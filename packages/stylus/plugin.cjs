// Entry point for `use("@typed-css/stylus")` in .styl files and for CommonJS
// consumers. Stylus requires plugins synchronously, so this loads the ES module
// build with require(esm).
module.exports = require('./dist/index.js').default;
