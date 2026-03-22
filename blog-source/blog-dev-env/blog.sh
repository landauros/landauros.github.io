#!/bin/bash
# blog.sh — Quick commands for blog management
# Usage: ./blog.sh [command] [args]

BLOG_DIR="$(cd "$(dirname "$0")" && pwd)"

case "$1" in

  new)
    # Create a new post: ./blog.sh new "my-post-title"
    if [ -z "$2" ]; then
      echo "Usage: ./blog.sh new <post-slug>"
      echo "Example: ./blog.sh new attention-mechanism"
      exit 1
    fi
    SLUG="$2"
    POST_DIR="$BLOG_DIR/content/posts/$SLUG"
    mkdir -p "$POST_DIR/images"

    cat > "$POST_DIR/index.md" << 'TEMPLATE'
---
title: "TITLE_PLACEHOLDER"
date: DATE_PLACEHOLDER
lastmod: DATE_PLACEHOLDER
draft: true
math: true
summary: ""
description: ""
tags: []
categories: []
series: ["BUAA-LLM-Course"]
author: "Landau"
ShowToc: true
TocOpen: false
---

## 问题引入

## 直觉

## 数学推导

## 代码验证

```python

```

## 我的思考

## 小结

## 参考文献

1.

---

*如果这篇文章对你有帮助，或者你发现了错误，欢迎通过 GitHub Issues 反馈。*
TEMPLATE

    # Replace placeholders
    TODAY=$(date +%Y-%m-%d)
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/DATE_PLACEHOLDER/$TODAY/g" "$POST_DIR/index.md"
      sed -i '' "s/TITLE_PLACEHOLDER/$SLUG/g" "$POST_DIR/index.md"
    else
      sed -i "s/DATE_PLACEHOLDER/$TODAY/g" "$POST_DIR/index.md"
      sed -i "s/TITLE_PLACEHOLDER/$SLUG/g" "$POST_DIR/index.md"
    fi

    echo "Created: $POST_DIR/index.md"
    echo "Edit the title and start writing!"
    ;;

  serve)
    # Start local dev server: ./blog.sh serve
    echo "Starting Hugo dev server..."
    echo "Open http://localhost:1313/llm-note/"
    cd "$BLOG_DIR" && hugo server -D --navigateToChanged --bind 0.0.0.0
    ;;

  build)
    # Build the site: ./blog.sh build
    cd "$BLOG_DIR" && hugo --gc --minify
    echo "Built to ./public/"
    ;;

  publish)
    # Set a draft post to published: ./blog.sh publish <post-slug>
    if [ -z "$2" ]; then
      echo "Usage: ./blog.sh publish <post-slug>"
      exit 1
    fi
    FILE="$BLOG_DIR/content/posts/$2/index.md"
    if [ ! -f "$FILE" ]; then
      echo "Post not found: $FILE"
      exit 1
    fi
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' 's/draft: true/draft: false/' "$FILE"
    else
      sed -i 's/draft: true/draft: false/' "$FILE"
    fi
    echo "Published: $2"
    ;;

  push)
    # Git add, commit, push: ./blog.sh push "commit message"
    MSG="${2:-update blog}"
    cd "$BLOG_DIR" && git add -A && git commit -m "$MSG" && git push origin main
    echo "Pushed to GitHub. Deployment will start automatically."
    ;;

  drafts)
    # List all draft posts
    echo "Draft posts:"
    grep -rl "draft: true" "$BLOG_DIR/content/posts/" 2>/dev/null | while read f; do
      title=$(grep "^title:" "$f" | head -1 | sed 's/title: *"*//;s/"*$//')
      echo "  - $title  ($f)"
    done
    ;;

  *)
    echo "Blog management tool"
    echo ""
    echo "Commands:"
    echo "  new <slug>        Create a new draft post"
    echo "  serve             Start local dev server"
    echo "  build             Build the site"
    echo "  publish <slug>    Mark a draft as published"
    echo "  push \"message\"    Git commit and push"
    echo "  drafts            List all draft posts"
    ;;
esac
