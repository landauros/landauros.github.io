---
title: "大模型基本概念"
date: 2026-03-22
lastmod: 2026-03-22
draft: false
math: true
summary: "介绍大语言模型的核心概念、发展历程和基本原理"
description: "大语言模型基础知识入门"
tags: ["transformer", "预训练", "tokenizer"]
categories: ["架构"]
series: ["BUAA-LLM-Course"]
author: "Landau"
ShowToc: true
TocOpen: false
---
## 什么是大语言模型

LLM : Large Language Model

首先是语言模型，核心在自然语言处理，其次是大参数量，随着参数量的上升会涌现出很多美妙的事物，而且有着Scale Up的特点。其基于神经网络，通常使用自监督学习方法基于大量无标注数据进行训练。（需要大量的网络知识数据，无标注，网络自己去表征识别学习）
这里举例：
开源模型：Qwen3-8B : B是billion，所以80亿参数

语言模型目标：建模自然语言的概率分布
我爱吃  ? 
看到前三个字，我们会在脑海中浮现出后一个词可能是什么，这就是对概率分别的建模，我们可以这样理解语言模型在做什么。
我 是 小明
我 是 猴子
我 是 小明
我 吃 苹果

当你看到第一个字是我，下来你觉得会是？ -> 是 
当你看到 我是之后，下来会是 -> 小明

数学化建模：
给一个词汇表$V$，概率分布$P(w_1,w_2,....w_n)$表示词序列$w_1w_2....w_n$作为一个句子出现的概率。我们有归一化条件：$\sum _{w_1w_2...w_n \in V^{+}}P(w_1w_2...w_n) = 1$。注意这里的$V^{+} = V^1 \cup V^{2} \cup ... V^{n}\cup...$并且 $V^{*} = V^{+}\cup \set{\epsilon}$。

## 发展历程

<!-- 从 RNN 到 Transformer 的演进 -->

## 核心组件

### Tokenizer

<!-- 文本如何转换为模型输入 -->

### Transformer 架构

<!-- 编码器-解码器结构 -->

### 预训练与微调

<!-- 预训练目标、下游任务适配 -->

## 关键概念

### 参数量与模型规模

<!-- 7B、13B、70B 等规模的含义 -->

### 上下文窗口

<!-- Context Length 的作用 -->

### 涌现能力

<!-- Emergent Abilities -->

## 我的思考

<!-- 你对大模型的理解和思考 -->

## 小结

<!-- 总结要点 -->

## 参考文献

1. Vaswani et al. "Attention is All You Need." *NeurIPS* 2017.
2. Brown et al. "Language Models are Few-Shot Learners." *NeurIPS* 2020.

---

*如果这篇文章对你有帮助，或者你发现了错误，欢迎通过 GitHub Issues 反馈。*
