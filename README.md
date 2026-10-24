# zhixue-fire

消防学习独立站的 GitHub Pages 初版，默认分支为 main。

目录：
- index.html：首页；含单选、多选、判断、错题记录、视频入口、批量导入入口。
- data/questions.json：线上实际读取的独立题库数据。
- data/import/questions.template.json：后续批量导入模板。
- videos/：后续 MP4 文件位置；当前为空。

题目状态：
- type 使用 single、multiple、judge。
- answerStatus 使用 verified（已经核验）或 pending_review（未核验或待复核）。
当前题库数组为空，避免把示例内容误当真实题目。

GitHub Pages：Settings → Pages → Deploy from a branch → main → / (root)。
发布后地址：https://2010153875qq.github.io/zhixue-fire/

与综合站 2010153875qq/zhixue 互链时，在综合站首页加入：
<a href="https://2010153875qq.github.io/zhixue-fire/">消防独立题库</a>
本仓库首页底部已加入返回综合站的相对链接。
