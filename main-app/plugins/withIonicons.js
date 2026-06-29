const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

module.exports = function withIonicons(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const fontsDir = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/assets/fonts"
      );
      fs.mkdirSync(fontsDir, { recursive: true });

      const src = path.join(
        config.modRequest.projectRoot,
        "node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"
      );
      const dest = path.join(fontsDir, "Ionicons.ttf");
      fs.copyFileSync(src, dest);
      console.log("[withIonicons] Copied Ionicons.ttf to Android assets/fonts");
      return config;
    },
  ]);
};
