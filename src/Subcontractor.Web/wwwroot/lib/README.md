# UI Vendor Assets

This directory is reserved for locally hosted vendor assets used by Web UI modules.

When local asset mode is enabled in `appsettings.json` (`UiAssets:*:UseLocal=true`), the app expects the following files:

- DevExpress v24.1.6:
  - `wwwroot/lib/devexpress/24.1.6/css/dx.light.css`
  - `wwwroot/lib/devexpress/24.1.6/js/jquery.min.js`
  - `wwwroot/lib/devexpress/24.1.6/js/dx.all.js`
  - `wwwroot/lib/devexpress/24.1.6/js/localization/dx.messages.ru.js`
- SheetJS v0.18.5:
  - `wwwroot/lib/xlsx/0.18.5/xlsx.full.min.js`

Notes:

- Vendor binaries are not committed to this repository due to licensing/distribution constraints.
- Keep versions synchronized with `UiAssets:DevExpress:Version` and `UiAssets:SheetJs:Version` in `appsettings.json`.
