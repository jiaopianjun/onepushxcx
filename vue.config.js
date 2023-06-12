// vue.config.js
let path = require("path");
module.exports = {
  pluginOptions: {
    "style-resources-loader": {
      preProcessor: "less",
      patterns: [path.resolve(__dirname, "./src/assets/css/common.less")],
    },
  },
};
