const path = require('path');

module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: [
      path.join(__dirname, 'dist', 'assets'),
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'respira_web',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: 'electron/main.ts',
            config: 'vite.config.electron.mts',
            target: 'main',
          },
          {
            entry: 'electron/preload.ts',
            config: 'vite.config.electron.mts',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.config.mts',
          },
        ],
      },
    },
  ],
};
