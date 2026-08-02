# Surpasself Books

为 `surpasself.github.io/book/` 提供的个性化外文新书发现与月报页面。

## 产品原则

- 少而精：每月最多 4 本正式推荐，质量不足时可以为 0。
- 证据优先：作者背景、出版信息、内容描述与可核验来源必须齐全。
- 不把销量和星级当质量：它们只作为弱信号，不能单独让一本书入选。
- 显示反方意见：每本正式推荐都必须说明局限和不确定性。
- 合法链接：只提供出版社、试读、图书馆或购买页面，不抓取或分发盗版内容。
- 候选可审计：自动扫描到的书必须保留书名、分数、状态与未入选原因，不能只显示一个数字。

## 本地运行

```bash
python3 -m unittest discover -s tests -v
python3 -m bookscout --profile config/books_profile.json --output book/data/current.json
```

发现脚本仅使用 Python 标准库。它从 Open Library 公共接口抓取候选书与作品描述，用严格规则评分；如果本月达不到最低质量门槛，会保留上一期月报并把原因写入 `book/data/last-run.json`。

## 自动更新

`.github/workflows/monthly-books.yml` 在每月 1 日北京时间 09:00 运行，也支持手动触发。工作流会：

1. 扫描英语新书；
2. 去重并按偏好、证据、作者/出版社可信度和思想增量评分；
3. 仅在至少 2 本达到正式推荐门槛时更新月报；
4. 保存上月归档并提交生成的数据。

## 阅读记录

- `/book/` 支持按月份查看历史推荐；2026 年 8 月为第一期，新一期发布时会自动归档上一期。
- 每本正式推荐可标记阅读状态，并进入 `/book/review/` 记录 10 分评分、读后总评、原文摘录和自己的想法。
- 单条摘录可生成带书名、作者与位置的 PNG 分享图。
- 私人读书记录只保存在当前浏览器，不写入公开仓库；书评页提供 JSON 导出和恢复。
- `docs/book-access-guide.md` 是正版电子书、开放获取和图书馆渠道的实操指南。

## 目录

- `bookscout/`：发现、评分与月报生成逻辑。
- `config/books_profile.json`：从现有豆瓣书单提炼出的偏好与红线。
- `book/`：GitHub Pages 的独立 `/book/` 页面；与 `/voice/` 不共享产品界面或功能状态。
- `book/data/candidate-audit.json`：最近一次自动扫描的完整候选审计。
- `book/data/archive/index.json`：历史月报索引。
- `docs/book-access-guide.md`：合法阅读渠道实操指南。
- `tests/`：评分与数据契约测试。
