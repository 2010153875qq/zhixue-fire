# zhixue-fire

消防学习独立站的 GitHub Pages 初版，默认分支为 main。

目录：
- index.html：首页；含单选、多选、判断、错题记录和视频入口。
- data/questions.json：线上实际读取的独立题库数据。
- data/import/questions.template.json：后续批量导入模板。
- videos/：后续 MP4 文件位置；当前为空。

题目状态：
- type 使用 single、multiple、judge。
- answerStatus 使用 verified（已经核验）或 pending_review（未核验或待复核）。
当前根目录题库收录 41 道录屏整理单选题，来自本仓库 `study/data/questions.json`，并与 `2010153875qq/zhixue/data/fire-bank.json` 核对题干、选项和录屏答案。28 道有录屏参考答案，另外 13 道答案或题干存疑（其中 1 道有录屏记录答案但题干存疑）。这些答案尚未逐题独立核验，根目录全部设为 `pending_review`，不自动判分；录屏答案保存在 `recordedAnswer`，并非正式答案。原有整理解析也需要核验。当前没有导入真实多选题、判断题和视频，不能当作完整 649 题。

首页只对 `answerStatus: "verified"` 且答案格式有效的题目判分；缺失状态、`recorded` 或答案格式不符合题型均按待复核处理。待复核题不会自动加入错题。错题记录保存在当前浏览器的 `zhixue-fire-wrong`，旧记录不会被删除；尚未核验的题目暂不显示为错题。

`study/` 是独立页面，读取自己的 `study/data/questions.json`；根目录题库与 `study/` 的题库不是同一个文件，后续更新时请注意同步核对。将题目标为 `verified` 前，应逐题核对题干、选项、答案及依据；不要猜测答案。

GitHub Pages：Settings → Pages → Deploy from a branch → main → / (root)。
发布后地址：https://2010153875qq.github.io/zhixue-fire/

与综合站 2010153875qq/zhixue 互链时，在综合站首页加入：
<a href="https://2010153875qq.github.io/zhixue-fire/">消防独立题库</a>
本仓库首页底部已加入返回综合站的相对链接。

