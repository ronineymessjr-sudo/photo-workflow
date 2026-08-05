# PhotoAtelier SEO 站长操作清单

代码侧的 canonical、robots、sitemap、结构化数据、专题内容和发布检查由项目构建完成。以下操作必须由站点所有者在对应平台完成，不能在代码中伪造。

## Google Search Console

1. 添加 `https://photoatelier.pages.dev/` URL 前缀资源；绑定自有域名后，优先再添加域名资源。
2. 使用平台提供的 HTML 标签或 DNS TXT 完成验证。
3. 提交 `https://photoatelier.pages.dev/sitemap.xml`。
4. 分别检查首页、英文首页、指南页的 URL 状态并请求首次编入索引。
5. 一到两周后检查“网页索引”和“效果”，不要用 `site:` 搜索数量代替 Search Console 数据。

## Bing Webmaster Tools

1. 可从 Google Search Console 导入已验证站点，或单独验证。
2. 提交同一个 sitemap。
3. 检查抓取错误、重复 canonical 和被排除页面。

## 统计

1. 优先启用 Cloudflare Web Analytics，或配置 GA4。
2. 统计只记录页面、来源、设备和转化事件，不采集方案正文、图片、笔记或本地路径。
3. 需要跟踪的核心事件：进入工作台、生成预选方案、保存正式方案、提交反馈。
4. 未取得实际站点令牌前，不向仓库写入占位统计 ID。

## 自有域名

`pages.dev` 可以用于测试和收录，但正式传播建议绑定独立域名。绑定后需要同步更新 canonical、hreflang、Open Graph、sitemap、Search Console 和 Bing 配置，并保留旧域名到新域名的一对一重定向。
