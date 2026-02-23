import { LearningModule } from './types';

export const sampleModules: LearningModule[] = [
  {
    id: 'ta_intro',
    title: '技術分析入門',
    description: 'チャート分析の基礎を学びましょう',
    category: 'technical_analysis',
    difficulty: 'beginner',
    duration: 30,
    content: `
# 技術分析入門

## 1. ローソク足チャートとは

ローソク足チャートは、価格の変動を視覚的に表現するためのチャートです。以下の4つの価格情報を含みます：

- 始値（Open）
- 高値（High）
- 安値（Low）
- 終値（Close）

## 2. 基本的なローソク足パターン

### 陽線と陰線
- 陽線：終値 > 始値（価格が上がった）
- 陰線：終値 < 始値（価格が下がった）

### 代表的なローソク足パターン
- 丸坊主（始値=終値）
- トンカチ
- 逆トンカチ
- 十線

## 3. 代表的なテクニカル指標

### 移動平均線（MA）
- 単純移動平均（SMA）
- 指数平滑移動平均（EMA）

### RSI（Relative Strength Index）
- 70以上：買われすぎ
- 30以下：売られすぎ

## 4. サポートラインとレジスタンスライン

- サポート：価格が下落する際に支えるライン
- レジスタンス：価格が上昇する際に阻むライン
    `,
    prerequisites: [],
    objectives: [
      'ローソク足の読み方がわかる',
      '基本的なチャートパターンを認識できる',
      '移動平均線の使い方がわかる',
      'RSIの基本的な解釈ができる'
    ],
    quizzes: [
      {
        id: 'quiz_ta_1',
        question: 'RSIが70以上の場合、一般的に何を意味しますか？',
        options: [
          '売られすぎ',
          '買われすぎ',
          'トレンド転換',
          '横這い相場'
        ],
        correctAnswer: 1,
        explanation: 'RSIが70以上は買われすぎ状態を示し、反落の可能性があります。'
      }
    ],
    resources: [
      { title: 'ローソク足の基本', url: 'https://example.com/candlestick-basics', type: 'article' },
      { title: '移動平均線の使い方', url: 'https://example.com/moving-averages', type: 'video' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'rm_basics',
    title: 'リスク管理の基礎',
    description: '取引におけるリスク管理の重要性と基本手法',
    category: 'risk_management',
    difficulty: 'beginner',
    duration: 45,
    content: `
# リスク管理の基礎

## 1. リスク管理とは

リスク管理とは、投資や取引において損失を最小限に抑えるための戦略や手法です。

## 2. 基本的なリスク管理手法

### 1. ポ的損失額の設定
- 1取引当たりの損失を資産の2%未満に抑える

### 2. ストップロスの設定
- あらかじめ損切り価格を決めておく

### 3. ポ的ポジションサイズ
- 資産に応じてポジションサイズを調整

### 4. 分散投資
- 一つの銘柄に集中投資しない

## 3. リスコ指標

### シャープレシオ
- リスコ調整済みリターンを示す指標
- (リターン - 無リスクレート) / 標準偏差

### 最大ドローダウン
- ピークから最も下げた値段までの下落幅

## 4. リスコ管理の実践

### ポ的設定
- 損失許容度を明確にする
- 月間・年間の損失上限を設定

### リスコ管理ルールの文書化
- 自分の取引ルールを明文化する
- 守るべきルールを明確にする
    `,
    prerequisites: [],
    objectives: [
      'リスク管理の重要性を理解する',
      '基本的なリスク管理手法を説明できる',
      'シャープレシオの計算方法を理解する',
      '自分のリスク許容度を設定できる'
    ],
    quizzes: [
      {
        id: 'quiz_rm_1',
        question: '1取引当たりの損失を資産の何%未満に抑えるのが一般的ですか？',
        options: [
          '1%',
          '2%',
          '5%',
          '10%'
        ],
        correctAnswer: 1,
        explanation: '一般的には、1取引当たりの損失を資産の2%未満に抑えることが推奨されます。'
      }
    ],
    resources: [
      { title: 'リスク管理の基本原則', url: 'https://example.com/risk-management-principles', type: 'article' },
      { title: '最大ドローダウンの計算方法', url: 'https://example.com/max-drawdown', type: 'pdf' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];
