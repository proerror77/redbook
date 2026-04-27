# post-to-xhs Skill 使用指南

> 当前状态：legacy alias / historical guide。
> 当前 Codex 环境没有独立 `post-to-xhs/SKILL.md`，小红书图文优先使用 `/baoyu-xhs-images`，视频、数据、搜索、评论等站点操作使用全局 `RedBookSkills`。统一入口表见 `docs/reference/skills-manifest.md`。

## 功能概述

`/post-to-xhs` skill 提供小红书内容发布和数据分析功能，基于 Chrome CDP 自动化。

## 核心功能

### 1. 发布图文内容

**适用场景**：已有图片，需要快速发布

```bash
# 使用图片 URL
/post-to-xhs --title "标题" --content "正文" --image-urls "URL1" "URL2"

# 使用本地图片
/post-to-xhs --title "标题" --content "正文" --images "/path/to/img1.jpg" "/path/to/img2.jpg"
```

**话题标签**：
- 在正文最后一行添加 `#标签1 #标签2 #标签3`
- 脚本会自动识别并逐个输入
- 建议 1-10 个标签

**标题规则**：
- 长度 ≤ 38（中文/标点计 2，英文/数字计 1）
- 超长会被截断

### 2. 发布视频内容

**适用场景**：发布短视频

```bash
# 使用本地视频
/post-to-xhs --title "标题" --content "正文" --video "/path/to/video.mp4"

# 使用视频 URL
/post-to-xhs --title "标题" --content "正文" --video-url "https://example.com/video.mp4"
```

### 3. 搜索笔记

**适用场景**：查找竞品内容、分析热门话题

```bash
# 基础搜索
/post-to-xhs search-feeds --keyword "春招"

# 带筛选搜索
/post-to-xhs search-feeds --keyword "春招" --sort-by 最新 --note-type 图文
```

**输出内容**：
- 推荐关键词（搜索框下拉）
- 笔记列表（ID、标题、作者、点赞数等）

### 4. 获取笔记详情

**适用场景**：深度分析某篇笔记

```bash
/post-to-xhs get-feed-detail --feed-id "笔记ID" --xsec-token "TOKEN"
```

**输出内容**：
- 笔记完整信息
- 评论数据
- 互动数据

### 5. 发表评论

**适用场景**：互动引流、建立联系

```bash
# 直接传评论
/post-to-xhs post-comment-to-feed --feed-id "ID" --xsec-token "TOKEN" --content "评论内容"

# 使用文件（适合长评论）
/post-to-xhs post-comment-to-feed --feed-id "ID" --xsec-token "TOKEN" --content-file "/path/to/comment.txt"
```

### 6. 内容数据分析

**适用场景**：复盘数据、优化策略

```bash
# 查看数据表
/post-to-xhs content-data

# 导出 CSV
/post-to-xhs content-data --csv-file "/path/to/data.csv"
```

**数据指标**：
- 曝光量、观看量
- 封面点击率
- 点赞、评论、收藏
- 涨粉数、分享数
- 人均观看时长、弹幕数

### 7. 评论通知

**适用场景**：查看谁评论了你

```bash
/post-to-xhs get-notification-mentions
```

## 多账号管理

### 添加账号

```bash
/post-to-xhs add-account work --alias "工作号"
```

### 登录账号

```bash
/post-to-xhs --account work login
```

### 使用指定账号发布

```bash
/post-to-xhs --account work --title "标题" --content "正文" --images "图片"
```

### 切换账号

```bash
/post-to-xhs switch-account
```

### 查看所有账号

```bash
/post-to-xhs list-accounts
```

## 与 baoyu-xhs-images 的区别

| 功能 | `/baoyu-xhs-images` | `/post-to-xhs` |
|------|---------------------|----------------|
| 图文生成 | ✅ 10 种风格 x 8 种布局 | ❌ 不支持 |
| 图文发布 | ✅ 包含发布功能 | ✅ 纯发布 |
| 视频发布 | ❌ 不支持 | ✅ 支持 |
| 多账号 | ❌ 不支持 | ✅ 支持 |
| 数据分析 | ❌ 不支持 | ✅ 支持 |
| 搜索笔记 | ❌ 不支持 | ✅ 支持 |
| 评论互动 | ❌ 不支持 | ✅ 支持 |

## 推荐使用策略

1. **图文内容**：优先用 `/baoyu-xhs-images`（视觉效果更好）
2. **视频内容**：用 `RedBookSkills`
3. **多账号发布**：用 `RedBookSkills`
4. **数据分析**：用 `RedBookSkills`
5. **竞品分析**：用 `RedBookSkills` 搜索 + 详情

## 注意事项

1. **首次使用需登录**：
   ```bash
   /post-to-xhs login
   ```
   会打开浏览器扫码登录

2. **登录状态缓存**：
   - 默认缓存 12 小时
   - 到期后自动重新校验

3. **无头模式**：
   - 默认使用无头模式（后台运行）
   - 如需查看过程，去掉 `--headless` 参数

4. **远程 CDP**：
   - 支持连接远程 Chrome
   - 使用 `--host` 和 `--port` 参数

5. **文件路径**：
   - 必须使用绝对路径
   - 禁止使用相对路径

## 常见问题

### Q: 发布失败怎么办？
A: 检查登录状态 `/post-to-xhs check-login`，如未登录重新扫码

### Q: 图片下载失败？
A: 改用本地图片，或检查图片 URL 是否有防盗链

### Q: 标题被截断？
A: 检查标题长度，中文/标点计 2，英文/数字计 1，总长 ≤ 38

### Q: 视频上传慢？
A: 视频需要等待处理完成，耐心等待或使用有窗口模式查看进度

## 技术细节

- **实现方式**：Chrome DevTools Protocol (CDP)
- **浏览器**：Google Chrome
- **依赖**：`requests`, `websockets`
- **配置目录**：`~/.claude/skills/post-to-xhs/config/`
- **账号数据**：`~/.claude/skills/post-to-xhs/config/accounts.json`
