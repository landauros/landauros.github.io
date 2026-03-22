---
title: "Attention 到底在做什么：从矩阵乘法到信息检索"
date: 2026-03-22
lastmod: 2026-03-22
draft: false
math: true
summary: "大多数 Attention 教程会告诉你 Q、K、V 的公式，但不会告诉你为什么要这样设计。本文从信息检索的视角重新推导 Attention，建立一个让你能自己发明 Attention 的直觉。"
description: "从信息检索的视角重新理解 Self-Attention 机制的设计动机和数学原理"

tags: ["attention", "transformer", "数学推导"]
categories: ["架构"]
series: ["BUAA-LLM-Course"]

author: "Landau"

cover:
  image: ""
  alt: ""
  caption: ""
  relative: false
  hidden: true

ShowToc: true
TocOpen: true
---

## 前言：公式之外的问题

如果你已经知道 Self-Attention 的公式：

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

那我想问你三个问题：

1. **为什么是 $QK^T$？** 为什么不是 $Q + K$，或者某个 MLP？
2. **为什么要除以 $\sqrt{d_k}$？** 不除会怎样？
3. **为什么用 softmax？** 用 ReLU 归一化行不行？

如果你能清楚回答这三个问题，这篇文章对你可能没有新东西。否则，请继续。

## 从一个简单的任务开始

假设你有一个句子 "The cat sat on the mat"，现在你站在 "sat" 这个词的视角，想要收集上下文信息来更好地理解 "sat" 在这个句子里的含义。

最朴素的做法是什么？**看看其他每个词，根据和我的"相关程度"来决定给多少注意力。**

这其实就是一个**软性信息检索（soft retrieval）**问题：
- 我有一个**查询（query）**：我想找什么样的上下文？
- 每个词都提供一个**键（key）**：我能提供什么样的上下文？
- 每个词还有一个**值（value）**：如果你选中了我，具体拿走的信息是什么。

Key 和 Value 的分离是一个非常精巧的设计——一个词用来"匹配"的特征和它实际"携带"的信息可以是不同的。

## 相似度：为什么是点积？

两个向量之间的相似度度量有很多选择。Attention 选择了**缩放点积（scaled dot-product）**：

$$\text{score}(q, k) = \frac{q \cdot k}{\sqrt{d_k}}$$

为什么不用别的？

| 度量 | 公式 | 问题 |
|------|------|------|
| 加性（Bahdanau） | $v^T \tanh(W_q q + W_k k)$ | 需要额外参数 $v, W_q, W_k$，计算慢 |
| 余弦相似度 | $\frac{q \cdot k}{\|q\| \|k\|}$ | 丢失了向量模长信息 |
| 缩放点积 | $\frac{q \cdot k}{\sqrt{d_k}}$ | 简单、快、可以用矩阵乘法加速 |

点积的核心优势是**计算效率**：$QK^T$ 是一个矩阵乘法，GPU 上跑得飞快。加性注意力需要对每一对 (q, k) 都过一遍 MLP，无法高效并行。

> **我的理解**：Attention 的设计哲学是"用最简单的相似度度量 + 大量数据和参数来弥补"。这和 kernel method 的思路正好相反。

## 缩放因子 $\sqrt{d_k}$：一个被低估的细节

为什么要除以 $\sqrt{d_k}$？Vaswani et al. 在原始论文里给了一个简短的解释，但值得展开：

假设 $q$ 和 $k$ 的每个分量都是均值为 0、方差为 1 的独立随机变量。那么它们的点积：

$$q \cdot k = \sum_{i=1}^{d_k} q_i k_i$$

每一项 $q_i k_i$ 的均值为 0，方差为 1（因为 $\text{Var}(q_i k_i) = E[q_i^2]E[k_i^2] = 1$）。

$d_k$ 个独立项求和后，总方差为 $d_k$。当 $d_k = 512$ 时，点积的标准差约为 $\sqrt{512} \approx 22.6$。

这意味着 softmax 的输入会出现很大的值，导致 softmax 的输出接近 one-hot（梯度接近零）。除以 $\sqrt{d_k}$ 把方差拉回 1，让 softmax 保持在"有意义的"温度范围内。

```python
import numpy as np

d_k = 512
q = np.random.randn(d_k)
k = np.random.randn(d_k)

raw_score = q @ k
scaled_score = raw_score / np.sqrt(d_k)

print(f"Raw dot product: {raw_score:.2f}")       # 通常在 -40 到 +40
print(f"Scaled:          {scaled_score:.2f}")     # 通常在 -2 到 +2
```

## Softmax 的角色：从分数到概率

softmax 做了两件事：
1. **归一化**：权重之和为 1，保证输出是加权平均
2. **锐化**：通过指数函数放大差异，让高分的键获得更多权重

$$\alpha_j = \frac{\exp(s_j)}{\sum_k \exp(s_k)}$$

一个值得思考的问题：**如果用 ReLU 归一化（$\alpha_j = \text{ReLU}(s_j) / \sum_k \text{ReLU}(s_k)$）会怎样？**

答案是可以，但行为不同——ReLU 归一化允许完全忽略某些位置（权重为 0），而 softmax 永远给每个位置一个正的权重。最近的研究（如 Flash Attention 的后续工作）正在探索这类替代方案。

## Multi-Head：为什么不是一个大 Attention？

Multi-head attention 将 $d$ 维空间拆成 $h$ 个子空间，每个头独立做 attention：

$$\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, ..., \text{head}_h) W^O$$

直觉：**不同的头可以关注不同类型的关系。** 实验观察表明，有些头专注于位置关系（前一个词、后一个词），有些头专注于语法关系（主语-动词），有些头专注于语义关系。

从参数量看，多头和单头是等价的（总参数一样）。多头的优势是**约束了表示的结构**——强制模型在多个独立的子空间里学习不同的注意力模式，这是一种隐式的正则化。

## 小结与预告

回到开头的三个问题：
- $QK^T$ 是因为点积是最高效的相似度度量，且 GPU 友好
- $\sqrt{d_k}$ 是为了控制 softmax 输入的方差，避免梯度消失
- softmax 提供了概率化的归一化，且通过指数函数锐化了注意力分布

下一篇我们会讨论 **Attention 的计算效率问题**——为什么它是 $O(n^2)$，Flash Attention 如何将其优化到接近线性的实际运行时间，以及 SSM/Mamba 如何从根本上绕开这个问题。

---

## 参考文献

1. Vaswani et al. "Attention Is All You Need." NeurIPS 2017.
2. Bahdanau et al. "Neural Machine Translation by Jointly Learning to Align and Translate." ICLR 2015.
3. Dao et al. "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness." NeurIPS 2022.

---

*如果这篇文章对你有帮助，或者你发现了错误，欢迎通过 [GitHub Issues](https://github.com/YOUR_GITHUB/YOUR_REPO/issues) 反馈。*
