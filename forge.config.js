const path = require('node:path');

module.exports = {
  packagerConfig: {
    asar: true,
    appBundleId: 'com.bigredflowers.nba2k26tracker',
    appCategoryType: 'public.app-category.sports',
    icon: path.join(__dirname, 'build', 'icon'),
    ignore: [
      /^\/android(?:\/|$)/,
      /^\/ios(?:\/|$)/,
      /^\/scripts(?:\/|$)/,
      /^\/\.claude(?:\/|$)/,
      /^\/node_modules\/@capacitor(?:\/|$)/,
      /^\/(?:\.gitignore|\.nvmrc|ARCHITECTURE\.md|PACKAGING\.md|capacitor\.config\.json|forge\.config\.js|package-lock\.json|supabase-cloud-sync\.sql)$/,
      /^\/(?:icon\.svg|manifest\.json|og-image\.png|sw\.js|nba2k26-[^/]+|qa-[^/]+)$/,
    ],
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: '2KBigRedFlowers',
        authors: '2KBigRedFlowers',
        description: 'NBA 2K26 build management, game tracking, and performance analytics',
        setupIcon: path.join(__dirname, 'build', 'icon.ico'),
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
      config: {},
    },
  ],
};
