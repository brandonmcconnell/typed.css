// Entry point for `@plugin "@typed-css/less";`. Less evaluates plugin files as
// CommonJS scripts, so this loads the ES module build with require(esm).
module.exports = require('./dist/index.js').default;
