# LLM 课程博客内容规划

## 写作原则

1. **每篇文章解决一个核心问题**，不要试图覆盖太多
2. **从直觉到数学**：先用类比和图示建立直觉，再给出推导
3. **原创分析 > 知识搬运**：每篇都要有"我的思考"部分
4. **代码验证**：关键结论用 toy example 验证
5. **诚实标注**：区分"论文的结论"和"我的猜测"
6. **中英文混合**：技术术语保留英文，解释用中文

## 发布节奏

- 目标：每 1-2 周一篇
- 质量 > 数量，宁可晚发也不要水文
- 每篇 2000-4000 字（不含代码）

---

## 系列一：Transformer 架构（4-5 篇）

### 01. Attention 到底在做什么 ✅ (已写)
- 核心问题：为什么是 QKV + 点积 + softmax？
- 标签：attention, transformer, 数学推导

### 02. Attention 的效率困境与解法
- 核心问题：O(n²) 从哪来？Flash Attention 怎么解决？
- 内容：IO-aware 算法、tiling、recomputation
- 标签：flash-attention, 效率, GPU

### 03. 位置编码：绝对 vs 旋转 vs ALiBi
- 核心问题：Transformer 为什么需要位置信息？各种方案的数学动机是什么？
- 重点推导 RoPE 的旋转矩阵构造
- 标签：位置编码, RoPE, ALiBi

### 04. Layer Norm, Residual, FFN：Transformer 的"胶水"
- 核心问题：这些看似简单的组件对训练稳定性有多关键？
- Pre-norm vs Post-norm, SwiGLU, DeepNorm
- 标签：normalization, 训练稳定性

### 05. Transformer 之外：SSM 与 Mamba
- 核心问题：能不能绕开 Attention 的 O(n²)？
- 从 S4 到 Mamba，选择性机制的数学
- 和之前我们对话中的 RNN vs SSM 对比呼应
- 标签：SSM, mamba, 状态空间模型

---

## 系列二：预训练（3-4 篇）

### 06. 语言模型的数学：从 n-gram 到 autoregressive LM
- 核心问题：$p(x_1, ..., x_n)$ 这个概率到底意味着什么？
- 交叉熵损失的信息论解释
- 标签：语言模型, 信息论, 预训练

### 07. Tokenization：BPE 到底在做什么
- 核心问题：为什么不直接用字符？为什么不用词？
- BPE、WordPiece、SentencePiece 的对比
- 标签：tokenizer, BPE

### 08. Scaling Laws：大力为什么能出奇迹
- 核心问题：Chinchilla 论文到底说了什么？
- Loss 和 compute/data/params 的幂律关系
- 标签：scaling-laws, chinchilla

### 09. 预训练的工程实践
- 核心问题：怎么在多卡上训练大模型？
- 数据并行、模型并行、Pipeline 并行、ZeRO
- 可以结合你在 A800 集群上的 GRPO 实战经验
- 标签：分布式训练, 并行策略

---

## 系列三：RLHF 与 Alignment（3-4 篇）

### 10. SFT：从预训练模型到 chatbot
- 核心问题：SFT 为什么有效？它改变了模型的什么？
- Instruction tuning 的数据构造
- 标签：SFT, instruction-tuning

### 11. RLHF 的数学：从 reward model 到 PPO
- 核心问题：为什么不能直接用人类反馈训练？为什么需要 RL？
- Bradley-Terry model, reward modeling, PPO 目标函数
- 标签：RLHF, PPO, reward-model

### 12. DPO 与 GRPO：绕开 reward model
- 核心问题：DPO 怎么把 RLHF 变成一个分类问题？
- DPO 的推导、GRPO 的 group relative 策略
- 结合你的 GRPO 训练实战经验，给出实际 training curve 分析
- 标签：DPO, GRPO, alignment

### 13. 安全与对齐的前沿
- Constitutional AI, RLAIF, 红队测试
- 标签：安全, constitutional-AI

---

## 系列四：推理与部署（2-3 篇）

### 14. KV Cache 与推理优化
- 核心问题：为什么 LLM 推理这么慢？KV cache 怎么加速？
- 标签：推理, KV-cache

### 15. 量化：INT8/INT4 是怎么回事
- 核心问题：精度降低为什么模型还能用？
- GPTQ, AWQ, GGUF
- 标签：量化, 部署

### 16. Speculative Decoding 与其他推理技巧
- 标签：推理加速

---

## 番外篇（灵活插入）

### E1. 论文阅读方法论
- 我是怎么读 ML 论文的
- 标签：方法论

### E2. 从 GRPO 训练中学到的 debug 经验
- 结合你的 MemAgent 项目经验
- 标签：实战, debug

### E3. AI4Math：LLM 能做数学吗？
- DeepSeek-Math, AlphaProof, DeepSeek-Prover-V2
- 和你的 PhD 研究方向直接相关
- 标签：AI4Math, 形式化证明

---

## 标签体系

### Categories (大分类，互斥)
- 架构
- 训练
- 对齐
- 推理部署
- 论文导读
- 方法论

### Tags (小标签，可多选)
- 技术概念：attention, transformer, SSM, mamba, RLHF, PPO, DPO, GRPO, ...
- 文章类型：数学推导, 代码实现, 实战经验, 论文导读
- 难度：入门, 进阶, 深入（可选，酌情使用）
