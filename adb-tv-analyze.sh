#!/bin/bash

echo "=== ADB 脚本 - TV 界面分析"危险关系"播放源数量 ==="
echo ""
echo "💡 重要提示：请在 TV 上手动操作以下步骤"
echo ""

PACKAGE_NAME="com.guozhi.onetv"

# 清除日志
echo "=== 1. 清除旧日志 ==="
adb logcat -c
echo "✅ 日志已清除"
echo ""

echo "=== 2. TV 操作步骤 ==="
echo ""
echo "请在 TV 上按以下步骤操作："
echo ""
echo "步骤 1: 从主页面进入"热门剧集"页面"
echo "  - 使用遥控器导航到"热门剧集"卡片并点击"
echo ""
echo "步骤 2: 在热门剧集列表中找到"危险关系"剧集"
echo "  - 使用遥控器上下导航找到"危险关系"（2026年版）"
echo "  - 点击进入剧集详情"
echo ""
echo "步骤 3: 在详情页面点击播放按钮"
echo "  - 进入播放页面"
echo ""
echo "步骤 4: 查看视频源选择器"
echo "  - 记录视频源数量"
echo ""
echo "步骤 5: 观察视频源是否重复"
echo "  - 记录重复的视频源"
echo ""

echo "=== 3. 等待 TV 操作完成 ==="
echo "等待 10 秒..."
sleep 10
echo ""

# 捕获完整日志
echo "=== 4. 捕获完整日志 ==="
adb logcat -d > /tmp/dangerous_liaisons_tv_log.txt
echo "✅ 日志已保存到: /tmp/dangerous_liaisons_tv_log.txt"
echo ""

# 分析日志
echo "=== 5. 分析日志 ==="
echo ""

echo "--- 5.1 包含"危险关系"的日志 ---"
grep -i "危险关系" /tmp/dangerous_liaisons_tv_log.txt | tail -50
echo ""

echo "--- 5.2 包含"MATCHING"的日志（关键！去重逻辑） ---"
grep -i "MATCHING" /tmp/dangerous_liaisons_tv_log.txt | tail -100
echo ""

echo "--- 5.3 包含"source"的日志（关键！视频源） ---"
grep -i "source" /tmp/dangerous_liaisons_tv_log.txt | tail -100
echo ""

echo "--- 5.4 包含"episode"的日志 ---"
grep -i "episode" /tmp/dangerous_liaisons_tv_log.txt | tail -50
echo ""

echo "--- 5.5 包含"detailStore"的日志（关键！store 处理） ---"
grep -i "detailStore" /tmp/dangerous_liaisons_tv_log.txt | tail -100
echo ""

echo "--- 5.6 包含"searchVideo"的日志（关键！API 调用） ---"
grep -i "searchVideo" /tmp/dangerous_liaisons_tv_log.txt | tail -100
echo ""

echo "--- 5.7 包含"After"的日志（关键！数量变化） ---"
grep -i "After" /tmp/dangerous_liaisons_tv_log.txt | tail -100
echo ""

echo "--- 5.8 包含"Before"的日志（关键！数量变化） ---"
grep -i "Before" /tmp/dangerous_liaisons_tv_log.txt | tail -100
echo ""

echo "--- 5.9 包含"dedup"的日志（关键！去重） ---"
grep -i "dedup" /tmp/dangerous_liaisons_tv_log.txt | tail -50
echo ""

echo "--- 5.10 包含"unique"的日志（关键！唯一键） ---"
grep -i "unique" /tmp/dangerous_liaisons_tv_log.txt | tail -50
echo ""

echo "--- 5.11 包含"result"的日志（关键！结果） ---"
grep -i "result" /tmp/dangerous_liaisons_tv_log.txt | tail -100
echo ""

# 检查是否有错误
echo "=== 6. 检查错误日志 ==="
ERROR_COUNT=$(grep -i "error\|exception\|fatal\|Already read\|Cannot read" /tmp/dangerous_liaisons_tv_log.txt | wc -l)
echo "错误日志数量: $ERROR_COUNT"
if [ $ERROR_COUNT -gt 0 ]; then
    echo "最近的错误日志:"
    grep -i "error\|exception\|fatal\|Already read\|Cannot read" /tmp/dangerous_liaisons_tv_log.txt | tail -50
fi
echo ""

# 检查性能日志
echo "=== 7. 检查性能日志 ==="
grep -i "PERF" /tmp/dangerous_liaisons_tv_log.txt | tail -50
echo ""

# 检查 API 调用
echo "=== 8. 检查 API 调用 ==="
grep -i "api/search" /tmp/dangerous_liaisons_tv_log.txt | tail -50
echo ""

# 检查当前 Activity
echo "=== 9. 检查当前页面状态 ==="
CURRENT_ACTIVITY=$(adb shell dumpsys window | grep -A 1 "mCurrentFocus" | grep -o "com.guozhi.onetv/[^ }]*" | head -1)
echo "当前 Activity: $CURRENT_ACTIVITY"
echo ""

echo "=== 分析完成 ==="
echo ""
echo "💡 关键日志文件:"
echo "   完整日志: /tmp/dangerous_liaisons_tv_log.txt"
echo ""
echo "💡 重点关注:"
echo "   1. MATCHING 日志（去重逻辑）"
echo "   2. detailStore 日志（store 处理）"
echo "   3. searchVideo 日志（API 调用）"
echo "   4. Before/After 日志（数量变化）"
echo ""
echo "💡 如果需要重新捕获日志，请在 TV 上重复操作后运行:"
echo "   adb logcat -d > /tmp/dangerous_liaisons_tv_log.txt"
echo ""
echo "💡 然后运行以下命令查看实时日志:"
echo "   adb logcat | grep -i 'MATCHING\|source\|episode\|detailStore'"
