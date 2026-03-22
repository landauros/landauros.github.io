# LLM Notes Blog

大模型课程学习博客 —— Hugo + PaperMod + GitHub Pages

## Quick Start

### 1. 安装 Hugo

```bash
# macOS
brew install hugo

# Linux (Debian/Ubuntu)
sudo apt install hugo
# 或者下载最新 extended 版本：
# https://github.com/gohugoio/hugo/releases

# 验证
hugo version  # 需要 extended 版本
```

### 2. 初始化项目

```bash
# 克隆这个 repo（如果是从 scaffold 开始）
git clone <your-repo-url>
cd <repo-name>

# 添加 PaperMod 主题
git submodule add --depth=1 https://github.com/adityatelange/hugo-PaperMod.git themes/PaperMod

# 本地预览
hugo server -D
# 打开 http://localhost:1313
```

### 3. 写新文章

```bash
# 方法 1：复制模板
cp archetypes/post-template.md content/posts/my-new-post/index.md
# 编辑 index.md，修改 front matter 和内容

# 方法 2：Hugo 命令
hugo new posts/my-new-post/index.md
```

文章目录结构：
```
content/posts/my-new-post/
├── index.md          # 文章正文
├── cover.png         # 封面图（可选）
└── images/           # 文章内图片
    ├── fig1.png
    └── fig2.png
```

在文章中引用图片：`![描述](images/fig1.png)`

### 4. 发布

```bash
git add .
git commit -m "new post: my-new-post"
git push origin main
# GitHub Actions 自动构建和部署
```

### 5. GitHub Pages 配置

1. 在 GitHub 仓库 Settings → Pages
2. Source 选择 "GitHub Actions"
3. 推送到 main 分支后自动部署

## 项目结构

```
.
├── hugo.yaml                    # Hugo 配置
├── CONTENT_PLAN.md             # 内容规划
├── archetypes/
│   └── post-template.md        # 文章模板
├── content/
│   ├── about.md                # 关于页面
│   ├── search.md               # 搜索页面
│   ├── series/
│   │   └── _index.md           # 系列索引
│   └── posts/
│       └── 01-attention-mechanism/
│           └── index.md        # 示例文章
├── layouts/
│   └── partials/
│       └── extend_head.html    # KaTeX 数学渲染
├── static/                     # 静态资源（favicon, avatar 等）
├── themes/
│   └── PaperMod/              # 主题（git submodule）
└── .github/
    └── workflows/
        └── deploy.yml          # 自动部署
```

## 数学公式

已配置 KaTeX，直接在 Markdown 中使用：

- 行内公式：`$E = mc^2$`
- 独立公式：
  ```
  $$
  \mathcal{L} = -\sum_{t} \log p(x_t | x_{<t})
  $$
  ```

## Tips

- `draft: true` 的文章不会发布，本地用 `hugo server -D` 可以预览
- 文章的 `series: ["BUAA-LLM-Course"]` 会自动归入系列页面
- 图片放在文章同目录下，用相对路径引用
- 修改 `hugo.yaml` 中的 `socialIcons` 和 `homeInfoParams` 为你自己的信息
