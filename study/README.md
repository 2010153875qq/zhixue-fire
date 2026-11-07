# 智学消防 · 中级监控刷题

这是独立的静态学习网站。数据来自原项目及同一账号的 `zhixue/data/fire-bank.json`：41 道单选题，其中 28 道具有录屏整理的参考答案，13 道答案或题干不能确定。录屏参考答案尚未逐题独立核对现行标准，练习与模拟成绩仅供参考。缺失或存疑的题目均标记 `pending_review`，不自动判分；原资料未提供解析时明确显示“暂无解析”。当前没有真实多选、判断题及视频文件。

## iPhone Safari 更新题库

1. 用 Safari 打开 GitHub 仓库 `2010153875qq/zhixue-fire`，进入 `study/data/questions.json`，登录 GitHub 后点铅笔编辑。
2. 按已有格式增改 `questions` 数组，注意 JSON 的引号、逗号和括号；每题 `id` 必须唯一，原题 ID 尽量不要改，否则旧学习记录无法对应。
3. 提交到 `main` 分支。首次启用 GitHub Pages 时，在仓库 Settings → Pages 中选择 `Deploy from a branch`，分支 `main`、目录 `/ (root)`；后续提交后等待部署完成。
4. 打开 `https://2010153875qq.github.io/zhixue-fire/study/` 刷新并检查题量、题型、答案状态与解析。Sites 页面会优先读取这个 Pages 路径的题库；读取失败则显示其内置快照并提示。若曾通过页面导入本机题库，需到“管理”点“使用在线题库”。

如果 GitHub 提交后网页没有更新，在仓库 Actions 查看 Pages 工作流，再用 Safari 刷新重试。Sites 与 GitHub Pages 是不同地址，浏览器学习记录不会跨域自动同步；使用“管理 → 导出备份 / 恢复备份”迁移。

## 题库结构

数据位于 `data/questions.json`，模板见 `data/questions.template.json`。模板仅供填写，不是已核验题目。可整份 JSON 在页面“管理”导入本机；导入不会修改 GitHub，需要网上更新时仍应编辑 GitHub 文件。导入会检查格式、重复 ID、题型、选项和可判分答案。

```json
{
  "id": "fire-0001",
  "type": "multiple",
  "chapter": "消防设施",
  "question": "在核对来源后填写题干",
  "options": ["A. 选项一", "B. 选项二", "C. 选项三"],
  "answer": null,
  "answerStatus": "pending_review",
  "recordedAnswer": null,
  "explanation": "",
  "source": "填写来源或批次",
  "reviewNote": "答案未核验"
}
```

- `type`：单选 `single`、多选 `multiple`、判断 `judge`。
- `answerStatus`：`verified` 表示已经核验，可判分；`recorded` 表示原资料可计分的录屏参考答案，尚未独立复核，可作参考判分；`pending_review` 表示答案无法确认或题干存疑，不计分。不要把参考答案写成已核验。
- `answer`：可判分题填 `"A"` 或多选 `["A","C"]`；待复核题可填 `null`。判断题使用 A、B，与 `options` 顺序对应；省略判断题的选项时默认 A 正确、B 错误。
- `recordedAnswer`：仅用于保留不参与判分的原始记录，例如题干存疑的录屏答案。
- `explanation`：保留来源资料中的解析；没有时留空，不编造。
- `source`、`answerEvidence`、`reviewNote`：记录来源、答案依据和待核查问题。不要写入账号、密码、Cookie 或令牌。

## 添加视频与排查声音

将有权使用的视频上传到 `study/videos/`，确认是可直接播放的实际文件；在题库的 `videos` 数组添加：

```json
{"id":"lesson-01","title":"课程名称","path":"videos/lesson-01.mp4","status":"ready"}
```

页面使用带 `playsinline` 的原生播放器，不自动播放；在 iPhone 上手动点播放，并检查媒体音量、静音与蓝牙输出。视频打不开时，打开视频直链确认路径和文件存在，检查网络与格式；也可试“在新页面打开视频”。尚未上传时不添加假链接，或设置 `status` 为 `not_uploaded`。

朗读需要手动点题目下的“朗读”，使用 iPhone 的系统语音。若没有声音，先检查媒体音量、静音状态及蓝牙输出，再尝试系统设置中安装或启用中文语音。声音效果和能否播放需要在真实 iPhone 上确认。

## 学习记录与限制

进度、错题和本机导入的题库存储在当前浏览器。清除网站数据、换设备或换域名会导致记录不可见；请定期通过“管理”导出备份。模拟练习仅抽取 `verified` 和 `recorded` 题目，按参考答案计分，未答题计入总题数；错题按题型分类，只有用户手动移出才删除。题库不足时按可用数量出题，不假称完整考试。
