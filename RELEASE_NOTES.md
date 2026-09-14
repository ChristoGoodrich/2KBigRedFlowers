# 2KBigRedFlowers v1.1.0 NBA 2K27 Update

## 简体中文

本次更新把程序切换到 NBA 2K27，并把所有随 2K 新作变化的数据抽成可切换的赛年数据集。

### 主要变化

- 新增赛年数据层：徽章目录与档位阈值、属性分组与标签、位置权重、动画解锁阈值、
  赛季表全部移入按赛年划分的数据集（`nba2k-gamedata-2k26.js`、
  `nba2k-gamedata-2k27.js`），由 `nba2k-gamedata.js` 统一注册。默认使用最新赛年，
  在 `localStorage` 写入 `gamedata:year` 可钉到旧赛年。
- 新增 NBA 2K27 数据集：六大徽章分类（篮板与身体在本作拆开）、19 个新徽章名，
  以及已公布阈值的 5 个徽章。2K26 沿用但未经证实的条目标注为待确认，
  未公布的阈值留空而不是猜一个数字。
- 界面、分享图、报告标题、导出元数据与下载文件名跟随当前赛年，不再写死 2K26。
- 徽章编辑器会标出「解锁条件尚未公布」与「本作是否保留尚未确认」，
  避免空白的条件区被误读成「无要求」。
- 源码文件名与全局命名空间去掉年份（`nba2k26-*` → `nba2k-*`），
  以后换赛年只需新增一个数据文件。
- 修复赛季表越界：2K26 赛季表在 2026-08-06 之后失效，导致该日期之后的比赛
  无法归入任何赛季，且已结束的第 8 赛季会被当作当前赛季。
- 修复徽章档位判定：空的需求列表原本被当作「已满足」，
  会让阈值未知的徽章被直接判定为解锁到传奇档。

### 数据兼容性

现有的建模、比赛、球员记录、云端数据与已保存的云同步配置都不受影响。
Android / iOS 应用标识、Supabase 表名与云配置存储键沿用原名，
已安装的应用与云端数据不会失联。更名前安装的 PWA 与书签会自动跳转到新入口。

### 关于 2K27 数据的说明

2K27 共 53 个徽章（在 2K26 的 40 个基础上移除 6 个、新增 19 个），
官方未公布被移除的是哪 6 个。本版录入 52 个，逐条标注了来源与置信度；
目前只有 5 个徽章有公开的档位阈值。2K27 的传奇档不再由属性解锁，
改为通过 Synergy 与赛季进度获得，因此传奇档阈值按设计留空。
属性表、位置权重与动画阈值沿用 2K26 并在 `meta` 中标记为未核实。
拿到官方完整数据后，只需修改 `nba2k-gamedata-2k27.js` 一个文件。

### 下载内容

本次为源码版本发布，未附带预编译安装包。需要安装包请在对应平台自行构建：

- Windows：`npm run desktop:make:win`
- Android：`npm run android:apk`
- macOS：`npm run desktop:make:mac:unsigned`
- iOS：`npm run ios:sync` 后用 Xcode 构建

## English

This release moves the app to NBA 2K27 and extracts everything that changes with
a new 2K game into switchable per-year datasets.

### Highlights

- Added a game-year data layer. The badge catalog and tier thresholds, attribute
  groups and labels, position weights, animation unlock thresholds, and the
  season calendar now live in per-year datasets (`nba2k-gamedata-2k26.js`,
  `nba2k-gamedata-2k27.js`) registered through `nba2k-gamedata.js`. The newest
  year is active unless `localStorage` `gamedata:year` pins an older one.
- Added an NBA 2K27 dataset: the six shipped badge disciplines (Rebounding and
  Physicals are separate this year), the 19 new badge names, and the five badges
  with published tier thresholds. Entries carried over from 2K26 without
  confirmation are flagged, and unpublished thresholds are left empty rather
  than guessed.
- The shell, share-card artwork, report titles, export metadata, and download
  filenames follow the active game year instead of a hardcoded 2K26 label.
- The badge editor labels badges whose requirements are unpublished or whose
  presence in the current game is unconfirmed, so an empty requirement area is
  never read as "no requirement".
- Source filenames and global namespaces dropped the game year
  (`nba2k26-*` to `nba2k-*`), so next year's update is one new dataset file.
- Fixed the season calendar running out of range. The 2K26 table ended
  2026-08-06, so games logged after that date mapped to no season and the
  finished Season 8 was presented as current.
- Fixed badge tier evaluation treating an empty requirement list as satisfied,
  which would have unlocked every badge with unknown thresholds to Legend.

### Data compatibility

Existing builds, games, player records, cloud records, and saved cloud sync
credentials are unaffected. The Android and iOS application id, the Supabase
table name, and the cloud config storage key keep their original names so
installed apps and cloud data are not orphaned. PWAs and bookmarks installed
before the rename redirect to the new entry point.

### On the 2K27 data

2K27 ships 53 badges (40 in 2K26, minus 6 removed, plus 19 new), and 2K has not
named the six it removed. 52 are encoded here with per-entry sources and
confidence, and only five currently have published tier thresholds. Legend is no
longer attribute-gated in 2K27 — Synergy and season progression grant it — so
those tiers are intentionally empty. Attributes, position weights, and animation
thresholds are carried over from 2K26 and flagged unverified in `meta`. Filling
the gaps is a single-file change to `nba2k-gamedata-2k27.js`.

### Downloads

This is a source release with no prebuilt packages attached. Build for your
platform instead:

- Windows: `npm run desktop:make:win`
- Android: `npm run android:apk`
- macOS: `npm run desktop:make:mac:unsigned`
- iOS: `npm run ios:sync`, then build in Xcode
