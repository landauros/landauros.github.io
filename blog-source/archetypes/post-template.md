---
title: "文章标题"
date: 2026-XX-XX
lastmod: 2026-XX-XX
draft: true
math: true
summary: "一两句话的摘要，会显示在文章列表里。要能让读者一眼判断这篇文章是否值得读。"
description: "SEO 描述"

# Taxonomy
tags: ["tag1", "tag2"]
categories: ["架构"]    # 架构 | 训练 | 对齐 | 推理部署 | 论文导读
series: ["BUAA-LLM-Course"]

author: "Landau"

# Cover image (optional)
cover:
  image: ""
  alt: ""
  caption: ""
  relative: true    # true if image is in the same directory as this post
  hidden: true

ShowToc: true
TocOpen: false
---

## 问题引入

<!-- 
  写作原则：
  1. 用一个具体的问题或矛盾开头，不要用"本文介绍了..."
  2. 让读者在前 3 段内知道"读完这篇文章我能获得什么"
-->

## 直觉

<!--
  先用类比、图示、伪代码建立直观理解
  这部分不需要严格，但需要准确
-->

## 数学推导

<!--
  给出严格的数学推导
  每一步都解释"为什么这样做"，不要只写公式变换
  
  LaTeX 示例：
  行内公式：$x^2 + y^2 = z^2$
  独立公式：
  $$\mathcal{L} = -\sum_{t} \log p(x_t | x_{<t})$$
-->

## 代码验证

<!--
  用简短的 Python 代码验证关键结论
  不需要完整的训练代码，一个 toy example 就够
-->

```python
# 示例代码
import torch
```

## 和其他方法的对比

<!--
  和相关的方法做对比，帮助读者建立知识网络
  用表格总结差异
-->

## 我的思考

<!--
  写你自己的理解和猜测
  明确标注哪些是论文里的结论，哪些是你的推测
  这部分是博客最有价值的地方——原创观点
-->

## 小结

<!--
  3-5 个 bullet points 总结核心 takeaway
  预告下一篇文章
-->

## 参考文献

1. Author et al. "Title." Venue Year.

---

*如果这篇文章对你有帮助，或者你发现了错误，欢迎通过 GitHub Issues 反馈。*
