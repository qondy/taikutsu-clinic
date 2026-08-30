// ============================================================
// 退屈クリニック — ルールベースの「処方」エンジン
// 外部AI APIは使わず、内蔵のナレッジ表だけで判定する。
//   knowhow … いま取り組んでいる対象を「再燃」させる具体策
//   newfun  … 隣接する「別の楽しみ」への方向転換
// ============================================================

import { PrescriptionKind } from './types';

export interface CategoryDef {
  key: string;
  label: string;
}

export interface CauseDef {
  key: string;
  label: string;
}

export interface Suggestion {
  text: string;
  reason: string;
  kind: PrescriptionKind;
}

interface Rule {
  /** 対象カテゴリ（空なら全カテゴリ） */
  categories: string[];
  /** 対象の飽き原因（空なら原因非依存。複数指定時はいずれか1つでも選択されていれば一致） */
  causes: string[];
  /** 大きいほど上位に出す */
  weight: number;
  suggestions: Suggestion[];
}

// ---- カテゴリ定義 -------------------------------------------------------
export const CATEGORIES: CategoryDef[] = [
  { key: 'hobby', label: '趣味・創作' },
  { key: 'exercise', label: '運動・スポーツ' },
  { key: 'study', label: '学び・勉強' },
  { key: 'work', label: '仕事・業務' },
  { key: 'habit', label: '習慣・ルーティン' },
  { key: 'community', label: '人づきあい・コミュニティ' },
  { key: 'collection', label: '収集・推し活' },
  { key: 'other', label: 'その他' },
];

// ---- 飽み原因タグ定義 -------------------------------------------------
export const CAUSES: CauseDef[] = [
  { key: 'too-easy', label: '簡単すぎる・物足りない' },
  { key: 'repetitive', label: '同じことの繰り返し' },
  { key: 'no-goal', label: '目標が見えない' },
  { key: 'slow-growth', label: '成長を感じない' },
  { key: 'lonely', label: 'ひとりで張り合いがない' },
  { key: 'no-time', label: '時間が取れず中途半端' },
  { key: 'lost-meaning', label: '何のためか分からなくなった' },
  { key: 'compare', label: '人と比べてしんどい' },
  { key: 'no-reward', label: '成果・ごほうびがない' },
];

export function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export function causeLabel(key: string): string {
  return CAUSES.find((c) => c.key === key)?.label ?? key;
}

export function kindLabel(kind: PrescriptionKind): string {
  return kind === 'knowhow' ? 'ノウハウ' : '別の楽しみ';
}

// ---- カテゴリ別ベースライン（原因を選ばなくても出る） ----------------
const CATEGORY_BASELINE: Rule[] = [
  {
    categories: ['hobby'], causes: [], weight: 5,
    suggestions: [
      { kind: 'knowhow', text: '「完成の定義」を下げて、1日15分・未完成でも人目に出すことを続ける', reason: '完璧主義が手を重くしている場合、出す頻度を上げると熱が戻りやすいため' },
      { kind: 'newfun', text: '作る側から「見せる側」に回る（展示・同人・SNS投稿・ライブ）締切を1つ作る', reason: '反応という新しい報酬が入り、マンネリが崩れるため' },
      { kind: 'newfun', text: '隣接ジャンルに1つだけ手を出す（イラスト→ZINE、ギター→作曲、写真→現像）', reason: '同じ土台のまま新鮮さだけを補給できるため' },
      { kind: 'newfun', text: '2週間は「鑑賞・研究する側」に回り、名作を10本浴びて引き出しを増やす', reason: 'インプット切れで飽きているケースが多いため' },
    ],
  },
  {
    categories: ['exercise'], causes: [], weight: 5,
    suggestions: [
      { kind: 'knowhow', text: 'メニューを4〜6週間ごとに組み替える。負荷・種目・回数のどれかを必ず動かす', reason: '身体が刺激に慣れると成果も気分も停滞するため' },
      { kind: 'newfun', text: '種目は変えず「場所」を変える（外ラン、山、プール、旅先ジム）', reason: '環境の新しさだけでも継続の動機は回復するため' },
      { kind: 'newfun', text: '記録会や大会に申し込んで締切を作る（5km大会、ボルダリングの級、オンライン記録会）', reason: '外部の締切があると練習に意味が戻るため' },
      { kind: 'newfun', text: 'ひとりトレを「誰かと」に変える（パートナー、クラブ、オンライン同時計測）', reason: '人がいると軽い緊張感と楽しさが加わるため' },
    ],
  },
  {
    categories: ['study'], causes: [], weight: 5,
    suggestions: [
      { kind: 'knowhow', text: '同じ範囲を別の教材で一周する（別の著者・動画・言語）', reason: '教材との相性で飽きているだけのことが多いため' },
      { kind: 'newfun', text: 'インプットからアウトプットへ回す（記事、LT、人に教える、問題を作る側）', reason: '使う場ができると学びに手応えが戻るため' },
      { kind: 'newfun', text: '学びを実物に変える小さなプロジェクトを1つ立てる（作る・出す・使う）', reason: '成果物があると勉強が手段になり、目的がはっきりするため' },
      { kind: 'newfun', text: '関連する隣の分野を1冊だけつまむ（統計→可視化、歴史→地政学）', reason: '視野が広がると本筋への興味も戻りやすいため' },
    ],
  },
  {
    categories: ['work'], causes: [], weight: 5,
    suggestions: [
      { kind: 'knowhow', text: '担当タスクの「型」を1つ作ってテンプレ化・自動化し、空いた余白で新しいことを試す', reason: 'ルーティンを圧縮すると、同じ仕事の中に挑戦の余地が生まれるため' },
      { kind: 'knowhow', text: '3ヶ月の小さな挑戦目標（新ツール導入、登壇、改善提案）を上司と握る', reason: '評価される形の目標があると惰性から抜けやすいため' },
      { kind: 'newfun', text: '普段関わらない工程・部署の人に、業務を1つ教わる', reason: '仕事の全体像が見えると自分の役割の意味が戻るため' },
      { kind: 'newfun', text: '社外の勉強会・副業・個人プロジェクトで同じスキルを別文脈で使う', reason: '同じ能力でも文脈が変わると新鮮に感じられるため' },
    ],
  },
  {
    categories: ['habit'], causes: [], weight: 5,
    suggestions: [
      { kind: 'knowhow', text: 'ハードルを半分にする（時間・量・回数）。「やめない」を最優先にする', reason: '飽きた習慣は完璧にやろうとするほど途切れるため' },
      { kind: 'knowhow', text: 'トリガー（いつ・どこで・何の後に）を1つに固定する', reason: '判断コストが減ると続ける負担が下がるため' },
      { kind: 'newfun', text: '同じ目的の別の手段に乗り換える（ランニング→自転車、日記→音声メモ）', reason: '目的を保ったまま手段を変えると飽きがリセットされるため' },
      { kind: 'newfun', text: '記録の見える化かごほうびをひも付ける（カレンダー、スタンプ、10回で◯◯）', reason: '進捗が見えると習慣そのものが楽しくなるため' },
    ],
  },
  {
    categories: ['community'], causes: [], weight: 5,
    suggestions: [
      { kind: 'knowhow', text: '関わる頻度を意図的に下げて「たまに行くと楽しい」距離に調整する', reason: '惰性の参加をやめると1回1回の価値が戻るため' },
      { kind: 'knowhow', text: '1対1の関係を1つだけ深める（今月ひとりとゆっくり話す）に集中する', reason: '広く浅い関わりに疲れているだけのことが多いため' },
      { kind: 'newfun', text: '参加者から運営・主催側に回ってみる（LT枠、もくもく会の幹事）', reason: '役割が変わると場との関わり方が新しくなるため' },
      { kind: 'newfun', text: '別のコミュニティを1つ覗いて、比較で今の場の良さを見直す', reason: '外を知ると、今いる場所への評価が更新されるため' },
    ],
  },
  {
    categories: ['collection'], causes: [], weight: 5,
    suggestions: [
      { kind: 'knowhow', text: '棚卸しして、手放し（売却・譲渡）も含めて「本当に好きな核」を絞る', reason: '量が増えすぎると1つずつの愛着が薄まるため' },
      { kind: 'knowhow', text: '予算・数の上限を決めて「厳選する楽しみ」に切り替える', reason: '制約があると1つの選択に熱が戻るため' },
      { kind: 'newfun', text: '集める対象から「使う・語る・見せる」へ（レビュー、展示、配信）', reason: '所有以外の楽しみ方を足すと関心が長持ちするため' },
      { kind: 'newfun', text: 'テーマを絞ったサブコレクションを新設し、縛りで遊ぶ', reason: '小さな新しいゲームを自分に課すと熱が再点火するため' },
    ],
  },
  {
    categories: ['other'], causes: [], weight: 5,
    suggestions: [
      { kind: 'knowhow', text: '続け方のハードルを半分にして、まず「やめない」を守る', reason: '飽きの初期はゼロにしないことが最優先のため' },
      { kind: 'knowhow', text: '4〜6週間ごとに、やり方のどこかを必ず1つ変える', reason: '同じ刺激が続くと脳が慣れて飽きるため' },
      { kind: 'newfun', text: 'それを「誰かと共有する/発表する」形に一度変えてみる', reason: '他者の反応という新しい要素で気分が変わるため' },
      { kind: 'newfun', text: '隣接する新しいことを1つだけ小さく試す', reason: '本筋を捨てずに新鮮さだけ補給できるため' },
    ],
  },
];

// ---- 飽き原因別ルール（カテゴリ非依存） -----------------------------
const CAUSE_RULES: Rule[] = [
  {
    categories: [], causes: ['too-easy'], weight: 20,
    suggestions: [
      { kind: 'knowhow', text: '難易度を一段上げる（速度・重量・制限時間・レベル・お題の縛りのどれか）', reason: '実力に対して負荷が低いと退屈は必ず来るため' },
      { kind: 'knowhow', text: '「人に教える／初心者を助ける」役割を持つ。簡単な内容でも発見が戻る', reason: '教える側に回ると同じ題材の解像度が上がるため' },
      { kind: 'newfun', text: '上位の資格・大会・コンテストなど、外部の高い基準に挑戦する', reason: '自分より高い物差しに触れると成長の余地が見えるため' },
    ],
  },
  {
    categories: [], causes: ['repetitive'], weight: 20,
    suggestions: [
      { kind: 'knowhow', text: '手順・道具・環境のどれか1つを毎回わざと変える（場所、時間帯、BGM、利き手）', reason: '小さな変化でも脳の「慣れ」がリセットされるため' },
      { kind: 'knowhow', text: '「縛りプレイ」を導入する（時間制限、道具制限、テーマ指定）', reason: '制約は新しいゲーム性を生み、単調さを消すため' },
      { kind: 'newfun', text: '同ジャンルの別スタイル・別流派に2週間だけ乗り換える', reason: '一度離れて戻ると本来の楽しさが再認識できるため' },
    ],
  },
  {
    categories: [], causes: ['no-goal'], weight: 20,
    suggestions: [
      { kind: 'knowhow', text: '3ヶ月後の「見せられる成果」を1つ決める（作品・記録・発表）', reason: 'ゴールがあると日々の行動に方向が生まれるため' },
      { kind: 'knowhow', text: '大きな目標を週単位のミニ目標3つに割る', reason: '達成感の間隔が短くなると飽きにくくなるため' },
      { kind: 'newfun', text: '締切のあるイベント（大会・提出・公開日）に先に申し込む', reason: '逃げられない締切が最も強い動機になるため' },
    ],
  },
  {
    categories: [], causes: ['slow-growth'], weight: 20,
    suggestions: [
      { kind: 'knowhow', text: '記録を取って「過去の自分」と比べる仕組みを作る（ログ、動画、before/after）', reason: '伸びは自覚しにくく、可視化すると停滞感が減るため' },
      { kind: 'knowhow', text: '一段上の人にフィードバックを1回もらう（レッスン、レビュー、添削）', reason: '独学の停滞は視点不足が原因のことが多いため' },
      { kind: 'knowhow', text: '基礎に2週間だけ戻る。伸び悩みは土台の穴であることが多い', reason: '土台を埋めると次の伸びしろが開くため' },
    ],
  },
  {
    categories: [], causes: ['lonely'], weight: 18,
    suggestions: [
      { kind: 'knowhow', text: '同じことをやる人をオンラインで1人見つけ、週1で進捗を共有する', reason: 'ゆるい相互報告があるだけで継続率が上がるため' },
      { kind: 'knowhow', text: 'SNSやブログで週1回、経過を公開して「ゆるい人目」を作る', reason: '見られている感覚が張り合いを生むため' },
      { kind: 'newfun', text: 'コミュニティ・サークル・大会に参加して「人がいる場」に持ち込む', reason: '孤独が原因なら環境ごと変えるのが早いため' },
    ],
  },
  {
    categories: [], causes: ['no-time'], weight: 18,
    suggestions: [
      { kind: 'knowhow', text: '「5分版」を用意して、忙しい日はそれだけやる', reason: 'ゼロの日を作らないことが再開のしやすさに直結するため' },
      { kind: 'knowhow', text: '週1回90分の固定枠を先に予定へ入れる', reason: '細切れより、まとまった1回のほうが満足度が高い場合が多いため' },
      { kind: 'knowhow', text: '準備・片付けを省ける状態で置いておく（出しっぱなし、道具のセット化）', reason: '着手の摩擦を減らすと限られた時間でも動けるため' },
    ],
  },
  {
    categories: [], causes: ['lost-meaning'], weight: 18,
    suggestions: [
      { kind: 'knowhow', text: '始めた頃に楽しかった瞬間を3つ書き出し、その要素だけ残す', reason: '目的が増えすぎて重くなっているケースが多いため' },
      { kind: 'knowhow', text: '「何のため」を一度手放し、目的なしで15分だけ触る日を作る', reason: '意味づけを外すと純粋な面白さが戻ることがあるため' },
      { kind: 'newfun', text: 'その活動を誰か・何かの役に立てる形に変える（贈る、教える、寄付、発表）', reason: '外向きの意味が加わると続ける理由が更新されるため' },
    ],
  },
  {
    categories: [], causes: ['compare'], weight: 16,
    suggestions: [
      { kind: 'knowhow', text: '比較対象が見える場所（SNS等）から2週間離れる', reason: '比較疲れは情報を断つのが最も効くため' },
      { kind: 'knowhow', text: '評価軸を「他人比」から「自分の前回比」に固定する', reason: '基準を自分に戻すと進歩を素直に喜べるため' },
      { kind: 'knowhow', text: '憧れの人を「敵」ではなく「教材」として1点だけ真似る', reason: '嫉妬を学習に変換すると前に進めるため' },
    ],
  },
  {
    categories: [], causes: ['no-reward'], weight: 16,
    suggestions: [
      { kind: 'knowhow', text: '小さなごほうびを回数にひも付ける（10回でこれ、1ヶ月続いたらあれ）', reason: '報酬の予感が行動のきっかけになるため' },
      { kind: 'knowhow', text: '成果が見えるダッシュボードを用意する（カレンダー、グラフ、スタンプ）', reason: '積み上げが目に見えると達成感が生まれるため' },
      { kind: 'newfun', text: '成果を発表・出品して「反応」という報酬が返る場に出す', reason: '外からの手応えは自分で作る報酬より強いため' },
    ],
  },
];

// ---- （カテゴリ × 原因）の追加ルール --------------------------------
const COMBO_RULES: Rule[] = [
  {
    categories: ['work'], causes: ['no-time'], weight: 24,
    suggestions: [
      { kind: 'knowhow', text: '新しい挑戦を「別枠」で持たず、いまの担当タスクの中に埋め込む形にする', reason: '業務時間内で回せないと挑戦は続かないため' },
    ],
  },
  {
    categories: ['hobby'], causes: ['lost-meaning'], weight: 24,
    suggestions: [
      { kind: 'newfun', text: 'いったん「作らない期間」を2週間置き、鑑賞だけして戻る日を先に決める', reason: '距離を取ると、なぜ好きだったかが輪郭を取り戻すため' },
    ],
  },
  {
    categories: ['exercise'], causes: ['slow-growth'], weight: 24,
    suggestions: [
      { kind: 'knowhow', text: '4週間の漸進的過負荷プランを紙に書き、毎回1つだけ数字を更新する', reason: '停滞期は計画的に負荷を足すと抜けやすいため' },
    ],
  },
  {
    categories: ['study'], causes: ['no-goal'], weight: 24,
    suggestions: [
      { kind: 'newfun', text: '学んだ範囲で作る小さな成果物（記事1本、ミニアプリ、要約スライド）を今週の締切で設定する', reason: '締切つきの出口があると勉強が目的に変わるため' },
    ],
  },
  {
    categories: ['habit'], causes: ['repetitive'], weight: 22,
    suggestions: [
      { kind: 'knowhow', text: '目的は変えずに手段を3種類用意し、曜日でローテーションする', reason: '単調さだけを消して習慣自体は維持できるため' },
    ],
  },
  {
    categories: ['collection'], causes: ['no-reward'], weight: 22,
    suggestions: [
      { kind: 'newfun', text: 'コレクションの一部を使ったレビュー・紹介を発信し、感想が返る場を作る', reason: '集めるだけでは得られない反応が報酬になるため' },
    ],
  },
];

const ALL_RULES: Rule[] = [...CATEGORY_BASELINE, ...CAUSE_RULES, ...COMBO_RULES];

// ---- エンジン本体 -------------------------------------------------------
function ruleMatches(rule: Rule, category: string, selectedCauses: string[]): boolean {
  const catOk = rule.categories.length === 0 || rule.categories.includes(category);
  const causeOk = rule.causes.length === 0 || rule.causes.some((c) => selectedCauses.includes(c));
  return catOk && causeOk;
}

/**
 * カテゴリと選択された飽き原因から、処方候補を返す。
 * - 原因が1つも選ばれていない場合は、カテゴリのベースラインのみ（最大4件）。
 * - 原因が選ばれている場合は、原因関連ルールを優先しつつベースラインで残り枠を埋める（最大6件）。
 * - knowhow と newfun が両方1件以上含まれるように最後に調整する。
 */
export function prescribe(category: string, selectedCauses: string[]): Suggestion[] {
  const matched = ALL_RULES.filter((r) => ruleMatches(r, category, selectedCauses));

  const ordered = matched
    .map((rule, idx) => ({ rule, idx }))
    .sort((a, b) => b.rule.weight - a.rule.weight || a.idx - b.idx)
    .map((x) => x.rule);

  const hasCauses = selectedCauses.length > 0;
  const cap = hasCauses ? 6 : 4;

  const out: Suggestion[] = [];
  const seen = new Set<string>();
  const push = (s: Suggestion): void => {
    if (seen.has(s.text) || out.length >= cap) return;
    seen.add(s.text);
    out.push(s);
  };

  // 原因由来（weightが高い）を先に詰める
  for (const rule of ordered) {
    if (hasCauses && rule.causes.length === 0) continue;
    rule.suggestions.forEach(push);
  }
  // 残り枠をカテゴリ・ベースラインで埋める
  for (const rule of ordered) {
    if (rule.causes.length !== 0) continue;
    rule.suggestions.forEach(push);
  }

  // knowhow / newfun の両方が入るように差し替え
  ensureBothKinds(out, ordered, seen);

  return out;
}

function ensureBothKinds(out: Suggestion[], ordered: Rule[], seen: Set<string>): void {
  const kinds: PrescriptionKind[] = ['knowhow', 'newfun'];
  for (const kind of kinds) {
    if (out.some((s) => s.kind === kind)) continue;
    const candidate = ordered
      .flatMap((r) => r.suggestions)
      .find((s) => s.kind === kind && !seen.has(s.text));
    if (!candidate || out.length === 0) continue;
    // 反対種別が2件以上あれば、その末尾を置き換える
    const replaceIdx = [...out].reverse().findIndex((s) => s.kind !== kind);
    if (replaceIdx === -1) continue;
    out[out.length - 1 - replaceIdx] = candidate;
    seen.add(candidate.text);
  }
}
