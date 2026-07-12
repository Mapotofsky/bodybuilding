# IronLog 品牌资源

本目录是 IronLog 应用图标和开屏资源的唯一源目录。Android 原生目录中的图标与开屏文件均由这里的源文件生成，不应直接作为长期修改入口。

## 源文件

- `icon-only.png`
  完整的传统应用图标。

- `icon-foreground.png`
  Android 自适应图标的透明前景图层。

- `icon-background.png`
  Android 自适应图标的不透明背景图层。

- `splash.png`
  浅色开屏源图。

- `splash-dark.png`
  深色开屏源图。

## 生成资源

在 `frontend` 目录执行：

```powershell
npm run assets:android
```

生成的 Android 文件位于：

```text
android/app/src/main/res
```

不要手动修改生成目录中的图标和开屏文件。请修改本目录的源文件后重新生成。

## 尺寸要求

- 图标：`1024 × 1024` 或更大。
- 开屏图：`2732 × 2732` 或更大。

当前资源尺寸：

- 三个图标文件：`1024 × 1024`。
- 两个开屏文件：`2732 × 2732`。
