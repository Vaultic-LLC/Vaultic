# Distributing Guide

### Preparation

1. Update the version in the package.json and forge.config.cjs
2. Change "main" in electron-app/package.json to `./dist/main/index.js`

### Windows

1. Make sure you are on a windows device and in the `electron-app` directory
2. Run `npm run make`
3. Once packaging succeeds, upload to Windows Store

### Mac

2. Make sure you are on a mac device and in the `electron-app` directory
3. Run `npm run make`
4. Once packaging succeeds, upload to Vaultic.org

### Both

1. Clear `dist` and `out` directories and run `npm run make:mac-zip`
2. Run `git tag {version}` and then `git push origin --tags`
3. Upload new packaged application to github under a new release that matches the new version
