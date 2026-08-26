module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // No manual reanimated/worklets plugin — babel-preset-expo adds it on SDK 54+.
  };
};
