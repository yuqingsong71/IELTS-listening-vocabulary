"""为词表添加词频信息
使用 wordfreq 库（基于 Wikipedia, SUBTLEX, news, books, web, Twitter, Reddit 等多源语料库）
获取 zipf 词频，并标注频段。论文中可引用 wordfreq 的数据来源语料库。
"""
import pandas as pd
from pathlib import Path
from wordfreq import word_frequency, zipf_frequency

BASE = Path(r"D:\论文发表\第一篇时间序列LPM word spelling单词测试\单词测试\merged")

# 1. 读取名词 CSV
df = pd.read_csv(BASE / "词性_n_名词.csv")
print(f"共 {len(df)} 个名词条目")
print(f"原难度分布:\n{df['难度'].value_counts().sort_index()}")

# 2. 取单词/词组列
words = df["单词/词组"].astype(str).str.strip().tolist()

# 3. 词频查询函数
def get_freqs(word):
    parts = word.lower().split()
    if len(parts) == 1:
        z = round(zipf_frequency(parts[0], "en", wordlist="best"), 3)
    else:
        # 词组：各组成词取平均 zipf
        vals = [zipf_frequency(p, "en", "best") for p in parts]
        z = round(sum(vals) / len(vals), 3)

    # raw frequency (per million)
    if len(parts) == 1:
        fpm = round(word_frequency(parts[0], "en", wordlist="best") * 1_000_000, 2)
    else:
        fpm_vals = [word_frequency(p, "en", "best") for p in parts]
        fpm = round(sum(fpm_vals) / len(fpm_vals) * 1_000_000, 2)

    return {"zipf": z, "freq_per_million": fpm}

# 4. 批量查询
print("正在查询词频...")
freq_data = [get_freqs(w) for w in words]

# 5. 合并
df_freq = pd.DataFrame(freq_data)
df_out = pd.concat([df, df_freq], axis=1)

# 6. 频段标注
# 参考 Nation (2012) BNC/COCA 千词级频段的大致映射:
#   zipf >= 5.0 -> 1K (前1000词族)
#   zipf >= 4.5 -> 2K
#   zipf >= 4.0 -> 3K
#   zipf >= 3.5 -> 4K
#   zipf >= 3.0 -> 5K
#   zipf <  3.0 -> 低频 (outside 5K)
def classify_band(z):
    if z >= 5.0:
        return "1K (高频)"
    elif z >= 4.5:
        return "2K"
    elif z >= 4.0:
        return "3K"
    elif z >= 3.5:
        return "4K"
    elif z >= 3.0:
        return "5K"
    else:
        return ">5K (低频)"

df_out["频段"] = df_out["zipf"].apply(classify_band)

# 7. 排序：高频在前
df_out = df_out.sort_values("zipf", ascending=False).reset_index(drop=True)

# 8. 输出
out_csv = BASE / "名词词表_带词频.csv"
out_xlsx = BASE / "名词词表_带词频.xlsx"

df_out.to_csv(out_csv, index=False, encoding="utf-8-sig")
df_out.to_excel(out_xlsx, index=False)

print(f"\n========== 完成 ==========")
print(f"输出文件:")
print(f"  CSV : {out_csv}")
print(f"  XLSX: {out_xlsx}")
print(f"\n频段分布 (基于 zipf 词频):")
print(df_out["频段"].value_counts().sort_index())
print(f"\n词频 (zipf) 统计:")
print(df_out["zipf"].describe())

# 对比：原难度 vs 词频频段
print(f"\n========== 原难度 vs 词频频段 交叉表 ==========")
cross = pd.crosstab(df_out["难度"], df_out["频段"])
print(cross)

# 计算原难度与 zipf 的相关系数
corr = df_out["难度"].corr(df_out["zipf"])
print(f"\n原难度 vs zipf 词频的 Pearson r = {corr:.3f}")
print("(负相关 = 原难度数值越大词频越低，说明原来的难度标注与词频有一定一致性)")
