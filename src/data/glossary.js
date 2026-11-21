/**
 * SILICON GENESIS — Progression-Aware Story Glossary & Module Encyclopedia Catalog
 *
 * Progression Locking Philosophy:
 *   - Basic world/story/physics/math vocabulary needed to understand the current conversation
 *     is unlocked when the player reaches that stage (and NEVER contains puzzle solution diagrams).
 *   - Modules and CS concepts that have an acquisition path (clearing a stage) are STRICTLY LOCKED
 *     until the player clears that stage, preventing any spoilers or puzzle-answer leaks!
 */

import { isStageUnlocked } from '../state/storage.js';

export const GLOSSARY_TERMS = {
  // =========================================================================
  // WORLD & PROLOGUE VOCABULARY (No puzzle answers, unlocked from start)
  // =========================================================================
  emp: {
    id: 'emp',
    title: 'EMP（電磁パルス）',
    reading: 'Electromagnetic Pulse',
    category: '世界観・物理',
    summary:
      '核爆発や大規模な太陽フレアなどで発生する、超強力な電磁波の波。電子機器の細かい配線に一瞬でとてつもない電流を流し込み、コンピュータやスマホを丸ごと焼き壊してしまう現象です。',
    analogy: '細い水道管にダム1個分の水圧を一気に流し込んで、管を破裂させるようなもの。',
    related: ['relay', 'insulator', 'short_circuit'],
  },
  relay: {
    id: 'relay',
    title: 'リレー（電磁スイッチ）',
    reading: 'Electromagnetic Relay',
    category: '物理・歴史',
    summary:
      '電気を流すと電磁石が金属のレバーを「カチッ」と引っ張って別の回路をつなぐ、昔ながらの物理スイッチ。大きくて遅いぶん頑丈なので、最先端チップが全滅したEMPでも生き残りました。',
    analogy: 'ハコの正体でもある、古いエレベーターや鉄道信号機で使われていた頑丈な「鉄のパチパチスイッチ」。',
    related: ['emp', 'transistor'],
  },
  insulator: {
    id: 'insulator',
    title: '絶縁層（絶縁体・ガラスの壁）',
    reading: 'Insulator / Oxide Layer',
    category: '物理・半導体',
    summary:
      'ガラスやゴム、プラスチックのように「電気をまったく通さない素材」のこと。隣り合う配線どうしが勝手に触れて焼損しないよう、電気の壁として仕切る大事な役割を持ちます。',
    analogy: '電線のまわりに巻かれているゴム被覆や、水を通さないガラスの仕切り板。',
    related: ['silicon', 'electrostatic', 'transistor'],
  },
  wafer_press: {
    id: 'wafer_press',
    title: 'チップ焼付け機（露光機）',
    reading: 'Photolithography Machine',
    category: '半導体製造',
    summary:
      '1枚の設計図（原板）に光を当てて、シリコンの板に何千・何万もの同じ電子回路を一気にコピー印刷する機械。本物の半導体工場でもこの原理でチップを量産しています。',
    analogy: '1枚のハンコ（原板）さえ彫ってしまえば、あとはポンポン何千枚でも複製できる「光のスタンプ機」。',
    related: ['silicon', 'nand', 'ic_chip'],
  },
  silicon: {
    id: 'silicon',
    title: 'シリコン（ケイ素）',
    reading: 'Silicon (Si)',
    category: '物理・半導体',
    summary:
      '実は海岸の砂や水晶にたっぷり含まれている身近な元素。普段は電気を通しにくいのに、ほんの少し別の元素を混ぜるだけで「条件つきで電気を通す（半導体）」に化ける、コンピュータ文明の主役です。',
    analogy: 'ただの「砂」を極限までピカピカに精製して作る、電子の運動場。',
    related: ['p_silicon', 'n_silicon', 'transistor'],
  },
  p_silicon: {
    id: 'p_silicon',
    title: 'P型シリコン',
    reading: 'P-Type Semiconductor',
    category: '物理・半導体',
    unlockReachedStage: 'stage_00a',
    unlockLabel: 'STAGE 00-A 到達',
    summary:
      'シリコンに微量のホウ素などを混ぜた半導体。マイナスの電子がすこし足りない「プラス（Positive）の空席」が多い性質を持ち、そのままでは自由な電子が通り抜けにくい状態になっています。',
    analogy: '電子が飛び石のように渡るための「空席」が空いている半導体素材。',
    related: ['n_silicon', 'silicon', 'electrostatic', 'transistor'],
  },
  n_silicon: {
    id: 'n_silicon',
    title: 'N型シリコン',
    reading: 'N-Type Semiconductor',
    category: '物理・半導体',
    unlockReachedStage: 'stage_00a',
    unlockLabel: 'STAGE 00-A 到達',
    summary:
      'シリコンに微量のリンなどを混ぜた半導体。自由に動き回れるマイナスの電子（Negative）がたっぷり余っている性質を持ち、電気をよく通します。',
    analogy: '今にも走り出せる電子たちがぎっしり待機している半導体素材。',
    related: ['p_silicon', 'silicon', 'transistor'],
  },
  electrostatic: {
    id: 'electrostatic',
    title: '静電気（電界の引力）',
    reading: 'Electrostatic Force',
    category: '物理・半導体',
    unlockReachedStage: 'stage_00a',
    unlockLabel: 'STAGE 00-A 到達',
    summary:
      'プラスとマイナスの電気が離れていても引き合う目に見えない力。下敷きで髪が逆立つのと同じ原理で、直接触れ合わなくても絶縁体越しに電子を引き寄せることができます。',
    analogy: '板の向こうにある砂鉄を、磁石でスッと引き寄せるような「触れない引力」。',
    related: ['insulator', 'p_silicon', 'transistor'],
  },
  resistor: {
    id: 'resistor',
    title: '抵抗器（ていこう）',
    reading: 'Resistor',
    category: '物理・電気回路',
    summary:
      'わざと電気を通しにくくした「細い道」の部品。回路の途中に挟むことで、電流が一気に流れすぎるのを抑え、安全な量にコントロールする役割を持ちます。',
    analogy: '太い水道管の途中に挟む「細いストロー」。水が勢いよく飛び出しすぎるのを防ぐブレーキ役。',
    related: ['short_circuit', 'earth', 'pullup'],
  },
  short_circuit: {
    id: 'short_circuit',
    title: 'ショート（短絡）',
    reading: 'Short Circuit',
    category: 'ACT 0 · 電気物理',
    act: 0,
    unlockClearedStage: 'stage_00b',
    unlockLabel: 'STAGE 00-B クリア',
    codexIds: ['pullup_resistor'],
    anim: 'short_spark',
    summary:
      '電池のプラス（高い電圧）と地面アース（0V）が、抵抗なしで太い線どうし直結してしまう事故。ブレーキのない大電流が一気に流れ、火花が散って部品が焼け切れてしまいます。',
    analogy: 'ダムの水門を全開にして細い町へそのまま流し込み、大洪水を起こしてしまう状態。',
    related: ['resistor', 'earth', 'pullup'],
  },
  earth: {
    id: 'earth',
    title: '地面アース（0V・接地）',
    reading: 'Ground / Earth (GND)',
    category: '物理・電気回路',
    unlockReachedStage: 'stage_00b',
    unlockLabel: 'STAGE 00-B 到達',
    summary:
      '電気の「基準となる高さ0（0ボルト）」であり、余った電気の逃げ場。ここへ道が開くと電圧がストンと0に落ち、デジタル回路の「0（OFF）」がはっきり決まります。',
    analogy: '水路でいう「海面（高さ0メートル）」。水は高いところから必ず海へ流れ落ちる。',
    related: ['resistor', 'short_circuit', 'pullup'],
  },
  apollo11: {
    id: 'apollo11',
    title: 'アポロ11号（誘導コンピュータ AGC）',
    reading: 'Apollo Guidance Computer (1969)',
    category: '歴史・人物',
    summary:
      '1969年に人類を月面へ着陸させた宇宙船のコンピュータ。実はNANDの双子である「NORゲート」たった1種類を約5,600個組み合わせただけで、地球から38万kmの軌道を計算し切りました！',
    analogy: 'シンプルな基本パーツだけでも、正しく積み上げれば人類を月まで運べることの証明。',
    related: ['nand'],
  },
  cpu: {
    id: 'cpu',
    title: 'CPU（中央処理装置）',
    reading: 'Central Processing Unit',
    category: 'コンピュータ基礎',
    summary:
      'コンピュータの中で「計算」「判断」「記憶の読み書き」「命令の実行」をまとめて指揮する頭脳装置のこと。アーク7では壊れたエーテル9に代わる新しい4ビットCPU『ARK-4』をゼロから創り上げます。',
    analogy: '人間でいう「脳みそ」。最初はたった1個のスイッチから始まり、少しずつ知性を獲得していく。',
    related: ['nand', 'ark4_cpu'],
  },

  // =========================================================================
  // ACT 0 — PHYSICAL MODULES (Unlocked upon clearing each ACT 0 stage!)
  // =========================================================================
  transistor: {
    id: 'transistor',
    title: 'MOSFETトランジスタ（じゃぐち）',
    reading: 'MOSFET Transistor',
    category: 'ACT 0 · 物理素子',
    act: 0,
    stageId: 'stage_00a',
    unlockClearedStage: 'stage_00a',
    unlockLabel: 'STAGE 00-A クリア',
    codexIds: ['mosfet_physics', 'transistor_nand'],
    chipId: 'SW',
    pins: { inputs: ['いり', 'ひねり(Gate)'], outputs: ['でぐち'] },
    anim: 'mosfet_bridge',
    summary:
      '「動く部品ゼロ」で電気のON/OFFを切り替える超極小スイッチ。P型シリコン土台の左右にN型シリコンを埋め、ガラスの壁の上に金属ゲートを乗せた構造です。ゲートに1をかけると電子の橋が架かって導通します。',
    analogy: '指でひねる代わりに「電気の信号」で開閉できる、顕微鏡サイズの電気のじゃぐち。',
    related: ['silicon', 'p_silicon', 'n_silicon', 'electrostatic', 'pullup', 'nand'],
  },
  pullup: {
    id: 'pullup',
    title: 'プルアップ抵抗（はいすい）',
    reading: 'Pull-Up Resistor (PULL)',
    category: 'ACT 0 · 物理素子',
    act: 0,
    stageId: 'stage_00b',
    unlockClearedStage: 'stage_00b',
    unlockLabel: 'STAGE 00-B クリア',
    codexIds: ['pullup_resistor', 'transistor_nand'],
    chipId: 'PULL',
    pins: { inputs: ['ぬけ(Drain)'], outputs: ['でぐち'] },
    anim: 'pullup_drain',
    summary:
      '電池側に電気を通しにくい「細い道（抵抗）」を挟んでおく回路。普段は出力を1（5V）へ引っ張り上げつつ、下の排水スイッチが開いた瞬間だけショートさせず安全に0（0V）へ落とせます。',
    analogy: '細い蛇口から少しずつ水をためておき、底の大きな栓を抜いた瞬間だけ水圧をゼロにする水槽の仕組み。',
    related: ['resistor', 'short_circuit', 'earth', 'transistor', 'nand'],
  },
  nand: {
    id: 'nand',
    title: 'NANDゲート（ナンド）',
    reading: 'NOT-AND Gate',
    category: 'ACT 0 · 基本論理素子',
    act: 0,
    stageId: 'stage_00',
    // Word meaning is readable from Prologue, but full module diagram unlocks on Stage 00-C clear!
    unlockClearedStageForDiagram: 'stage_00',
    unlockLabel: 'STAGE 00-C クリア',
    codexIds: ['transistor_nand', 'nand_origin'],
    chipId: 'NAND',
    pins: { inputs: ['A', 'B'], outputs: ['OUT'] },
    anim: 'nand_series',
    preClearSummary:
      '「AとBの両方が1のときだけ0、それ以外は全部1」を返すあまのじゃく素子。驚くべきことに、この1種類の部品さえあれば、足し算も記憶もCPUも世界中のすべての計算機を作り出せます（機能完全性）。',
    summary:
      '「AとBの両方が1のときだけ0、それ以外は全部1」を返す万能論理素子。電源（でんち）から2個のトランジスタ（じゃぐち）を直列に通してプルアップ抵抗（はいすい）へ繋ぐことで物理的に誕生します。',
    analogy: 'たった1種類のブロックなのに、組み合わせ次第でお城も宇宙船もぜんぶ作れてしまう「魔法の万能レゴ」。',
    related: ['transistor', 'pullup', 'not_gate', 'apollo11'],
  },

  // =========================================================================
  // ACT I — BASIC LOGIC GATES (Strictly locked until each stage is CLEARED!)
  // =========================================================================
  not_gate: {
    id: 'not_gate',
    title: 'NOTゲート（インバーター）',
    reading: 'NOT Gate / Inverter',
    category: 'ACT I · 論理ゲート',
    act: 1,
    stageId: 'stage_01',
    unlockClearedStage: 'stage_01',
    unlockLabel: 'STAGE 01 クリア',
    codexIds: ['not_gate', 'nand_origin'],
    chipId: 'NOT',
    pins: { inputs: ['IN'], outputs: ['OUT'] },
    anim: 'not_branch',
    summary:
      '入力をそのままひっくり返す最小の論理モジュール。0が入れば1、1が入れば0を出します。NANDの2つの入口（AとB）に同じ信号線を分岐してつなぐだけで完成します。',
    analogy: '「はい」と言われたら「いいえ」、「ON」なら「OFF」と必ず逆を返すあまのじゃく通訳。',
    related: ['nand', 'ic_chip', 'and_gate', 'or_gate'],
  },
  ic_chip: {
    id: 'ic_chip',
    title: 'ICチップ（集積回路）',
    reading: 'Integrated Circuit',
    category: 'ハードウェア',
    unlockClearedStage: 'stage_01',
    unlockLabel: 'STAGE 01 クリア',
    summary:
      'たくさんのトランジスタや論理回路を小さな1枚の箱にぎゅっと閉じ込めて、「中身を気にせず1個の部品として再利用」できるようにしたもの。この「部品化（抽象化）」のおかげで巨大なCPUも作れます。',
    analogy: '毎回バラバラの小麦粉から作るのではなく、「完成済みパーツ」として箱詰めして使い回す仕組み。',
    related: ['wafer_press', 'nand', 'not_gate'],
  },
  and_gate: {
    id: 'and_gate',
    title: 'ANDゲート（論理積）',
    reading: 'AND Gate',
    category: 'ACT I · 論理ゲート',
    act: 1,
    stageId: 'stage_02',
    unlockClearedStage: 'stage_02',
    unlockLabel: 'STAGE 02 クリア',
    codexIds: ['and_gate'],
    chipId: 'AND',
    pins: { inputs: ['A', 'B'], outputs: ['OUT'] },
    anim: 'and_invert',
    summary:
      '「Aも1、かつBも1」のように、条件がぜんぶ揃ったときだけ1を出すモジュール。NANDの後ろにNOTをつないでひっくり返すと完成します。安全装置や二重ロックの基本です。',
    analogy: '銀行の金庫のように「2本のカギを同時に回したときだけ開く」二重チェック機構。',
    related: ['nand', 'not_gate', 'shannon', 'or_gate'],
  },
  shannon: {
    id: 'shannon',
    title: 'クロード・シャノン',
    reading: 'Claude Shannon (1916–2001)',
    category: '歴史・人物',
    unlockClearedStage: 'stage_02',
    unlockLabel: 'STAGE 02 クリア',
    summary:
      '1937年、弱冠21歳の修士論文で「論理の数学（ブール代数）と電気スイッチ回路は完全に同じものだ」と証明した情報時代の父。この論文がデジタルコンピュータの扉を開きました。',
    analogy: '「電気のON/OFFで人間の論理思考をそのまま計算できる！」と最初に見抜いた天才。',
    related: ['and_gate', 'relay'],
  },
  or_gate: {
    id: 'or_gate',
    title: 'ORゲート（論理和）',
    reading: 'OR Gate',
    category: 'ACT I · 論理ゲート',
    act: 1,
    stageId: 'stage_03',
    unlockClearedStage: 'stage_03',
    unlockLabel: 'STAGE 03 クリア',
    codexIds: ['or_demorgan'],
    chipId: 'OR',
    pins: { inputs: ['A', 'B'], outputs: ['OUT'] },
    anim: 'or_demorgan',
    summary:
      '「AかBのどちらか片方でも1なら1（両方1でも1）」を返すモジュール。入口AとBをそれぞれNOTで反転させてからNANDへ入れる（ド・モルガンの法則）ことで完成します。',
    analogy: '玄関と勝手口のどちらの呼び鈴を押してもチャイムが鳴る「どちらかスイッチ」。',
    related: ['demorgan', 'nand', 'not_gate', 'xor_gate'],
  },
  demorgan: {
    id: 'demorgan',
    title: 'ド・モルガンの法則',
    reading: "De Morgan's Laws (1847)",
    category: '数学・歴史',
    unlockClearedStage: 'stage_03',
    unlockLabel: 'STAGE 03 クリア',
    anim: 'or_demorgan',
    summary:
      '「AでもBでもない（両方0）」の裏返しは「AかBのどちらか（OR）」になる、という論理の変換ルール。19世紀の数学者ド・モルガンが発見し、NANDだけでORを作る鍵になります。',
    analogy: '「雨も降ってない、かつ風も吹いてない」をひっくり返すと「雨か風のどちらかが来てる」になる言葉のパズル。',
    related: ['or_gate', 'nand', 'not_gate'],
  },
  xor_gate: {
    id: 'xor_gate',
    title: 'XORゲート（排他的論理和）',
    reading: 'Exclusive-OR Gate',
    category: 'ACT I · 論理ゲート',
    act: 1,
    stageId: 'stage_04',
    unlockClearedStage: 'stage_04',
    unlockLabel: 'STAGE 04 クリア',
    codexIds: ['xor_gate'],
    chipId: 'XOR',
    pins: { inputs: ['A', 'B'], outputs: ['OUT'] },
    anim: 'xor_diff',
    summary:
      '2つの入力が「ちがう値（0と1、または1と0）」のときだけ1になり、同じ値なら0になるモジュール。「片方は1（OR）」かつ「両方1ではない（NAND）」をANDで合体させて作ります。',
    analogy: '階段の上と下にある照明スイッチ。また2進数の「1の位の足し算」そのものでもあります！',
    related: ['or_gate', 'and_gate', 'nand', 'half_adder'],
  },

  // =========================================================================
  // ACT II — BINARY & ADDERS
  // =========================================================================
  binary: {
    id: 'binary',
    title: '2進数（にしんすう）',
    reading: 'Binary Number System',
    category: '数学・計算',
    unlockReachedStage: 'stage_05',
    unlockLabel: 'STAGE 05 到達',
    summary:
      '0と1のたった2つの数字だけであらゆる数を表す数え方。普段の10進数は「10」で桁が上がりますが、2進数は「2」で次の桁へくり上がります（0=00, 1=01, 2=10, 3=11, 4=100…）。右から1・2・4・8の位になります。',
    analogy: '指が10本ある人間は10進数、ON/OFFの2種類しかない電気スイッチは2進数で数える！',
    related: ['half_adder', 'bit', 'twos_comp'],
  },
  half_adder: {
    id: 'half_adder',
    title: '半加算器（H_ADD）',
    reading: 'Half Adder',
    category: 'ACT II · 演算モジュール',
    act: 2,
    stageId: 'stage_05',
    unlockClearedStage: 'stage_05',
    unlockLabel: 'STAGE 05 クリア',
    codexIds: ['half_adder_binary'],
    chipId: 'HALF_ADDER',
    pins: { inputs: ['A', 'B'], outputs: ['SUM', 'CARRY'] },
    anim: 'half_adder',
    summary:
      '1ビットどうしの足し算「A＋B」をして、1の位（SUM＝XOR）と2の位へのくり上がり（CARRY＝AND）を出すモジュール。無生物の電気が初めて「算数」を始める記念すべき回路です。',
    analogy: '筆算の一番右の桁（1の位）だけを計算する小さな足し算係。',
    related: ['binary', 'xor_gate', 'and_gate', 'full_adder'],
  },
  full_adder: {
    id: 'full_adder',
    title: '全加算器（F_ADD）',
    reading: 'Full Adder',
    category: 'ACT II · 演算モジュール',
    act: 2,
    stageId: 'stage_06',
    unlockClearedStage: 'stage_06',
    unlockLabel: 'STAGE 06 クリア',
    codexIds: ['full_adder'],
    chipId: 'FULL_ADDER',
    pins: { inputs: ['A', 'B', 'CIN'], outputs: ['SUM', 'COUT'] },
    anim: 'full_adder',
    summary:
      'A・Bに加えて「下の桁からのくり上がり（CIN）」も一緒に3つ足し、答え（SUM）と次の桁へのくり上がり（COUT）を出せる完全な1桁加算モジュール。半加算器2個とOR1個で組めます。',
    analogy: '下の位から渡された「くり上がりのバトン」を受け取って、次の位へ渡せる筆算のプロ。',
    related: ['half_adder', 'or_gate', 'ripple_adder'],
  },
  ripple_adder: {
    id: 'ripple_adder',
    title: '4ビット加算器（ADD_4B）',
    reading: '4-Bit Ripple-Carry Adder',
    category: 'ACT II · 演算モジュール',
    act: 2,
    stageId: 'stage_07',
    unlockClearedStage: 'stage_07',
    unlockLabel: 'STAGE 07 クリア',
    codexIds: ['ripple_adder'],
    chipId: 'ADD_4BIT',
    pins: { inputs: ['A0..3', 'B0..3', 'CIN'], outputs: ['S0..3', 'COUT'] },
    anim: 'ripple_4bit',
    summary:
      '全加算器（F_ADD）を4個縦に並べて、1の位→2の位→4の位→8の位へとくり上がりを数珠つなぎにした多桁計算モジュール。0〜15どうしの足し算を一瞬でこなします。',
    analogy: 'ドミノ倒しやバケツリレーのように、隣の桁へ次々とくり上がりを運ぶ計算ライン。',
    related: ['full_adder', 'zuse', 'alu', 'program_counter'],
  },
  zuse: {
    id: 'zuse',
    title: 'コンラート・ツーゼ',
    reading: 'Konrad Zuse (1910–1995)',
    category: '歴史・人物',
    unlockClearedStage: 'stage_07',
    unlockLabel: 'STAGE 07 クリア',
    summary:
      '1941年、ベルリンの自宅リビングでリレー部品を組み立て、世界初のプログラム制御・2進数計算機「Z3」を完成させたドイツの技術者。',
    analogy: '自宅の作業台から「2進数で動く自動計算機」を現実にした先駆者。',
    related: ['ripple_adder', 'binary', 'relay'],
  },

  // =========================================================================
  // ACT III — ROUTING, BUS & DECODER
  // =========================================================================
  mux: {
    id: 'mux',
    title: 'マルチプレクサ（MUX）',
    reading: '2-to-1 Multiplexer',
    category: 'ACT III · 経路制御モジュール',
    act: 3,
    stageId: 'stage_08',
    unlockClearedStage: 'stage_08',
    unlockLabel: 'STAGE 08 クリア',
    codexIds: ['mux_selector'],
    chipId: 'MUX',
    pins: { inputs: ['D0', 'D1', 'SEL'], outputs: ['OUT'] },
    anim: 'mux_rail',
    summary:
      '切替信号（SEL）が0ならD0、1ならD1のデータを選んで出力へ流す「信号の進路切替モジュール」。ANDの門番2個とNOT、ORを組み合わせて「もし〜なら」を電気回路で実現します。',
    analogy: '線路のレバーをガチャンと倒して列車の行き先を切り替える、鉄道の「ポイント切替器」。',
    related: ['and_gate', 'or_gate', 'not_gate', 'mux_4bit'],
  },
  bus: {
    id: 'bus',
    title: 'バス（データバス）',
    reading: 'Data Bus',
    category: 'アーキテクチャ基礎',
    unlockReachedStage: 'stage_09',
    unlockLabel: 'STAGE 09 到達',
    summary:
      '複数本の信号線を1つの「束」にまとめて、大きな数字やデータを一気に運ぶコンピュータ内部の幹線道路。語源はたくさんの乗客をまとめて運ぶ「乗合バス（Omnibus）」です。',
    analogy: '1車線の細い小道ではなく、4車線・64車線でデータを一斉に運ぶ高速道路。',
    related: ['bit', 'microprocessor', 'mux_4bit'],
  },
  bit: {
    id: 'bit',
    title: 'ビット（bit）とビット幅',
    reading: 'Binary Digit (bit)',
    category: 'コンピュータ基礎',
    unlockReachedStage: 'stage_09',
    unlockLabel: 'STAGE 09 到達',
    summary:
      '0か1の「たった1桁」の情報単位。4ビットなら 0〜15（16通り）、8ビットなら 0〜255（256通り）、64ビットなら約1844京通りもの数字を1回でまとめて扱えます！',
    analogy: '1個のランプで表せるON/OFFが「1ビット」。ランプの数が増えるほど表現できる数字が倍々で増える！',
    related: ['binary', 'bus', 'microprocessor', 'gigabyte'],
  },
  microprocessor: {
    id: 'microprocessor',
    title: 'マイクロプロセッサ',
    reading: 'Microprocessor (1971)',
    category: '歴史・ハードウェア',
    unlockReachedStage: 'stage_09',
    unlockLabel: 'STAGE 09 到達',
    summary:
      '部屋いっぱいあった巨大なコンピュータの頭脳（CPU）を、たった1枚の小さなシリコンチップに収めた革命的部品。1971年の世界初マイクロプロセッサ「Intel 4004」も、このゲームと同じ4ビット幅でした！',
    analogy: '冷蔵庫サイズの計算機を、爪の先ほどの1枚のチップにギュッと縮めた技術革命。',
    related: ['cpu', 'bit', 'ic_chip'],
  },
  mux_4bit: {
    id: 'mux_4bit',
    title: '4ビット切替バス（MUX_4B）',
    reading: '4-Bit Data Bus Multiplexer',
    category: 'ACT III · 経路制御モジュール',
    act: 3,
    stageId: 'stage_09',
    unlockClearedStage: 'stage_09',
    unlockLabel: 'STAGE 09 クリア',
    codexIds: ['data_bus'],
    chipId: 'MUX_4BIT',
    pins: { inputs: ['A0..3', 'B0..3', 'SEL'], outputs: ['Y0..3'] },
    anim: 'data_bus_4bit',
    summary:
      'MUXを4個並べて共通のSELで束ね、4桁の数値AとBを丸ごと一気に切り替えるバスモジュール。レジスタやCPU内部の大動脈になります。',
    analogy: '4車線の高速道路の本線とバイパスを、レバー1本で一斉に切り替える巨大ジャンクション。',
    related: ['mux', 'bus', 'bit', 'register'],
  },
  decoder: {
    id: 'decoder',
    title: '2→4デコーダ（DEC2_4）',
    reading: '2-to-4 Address Decoder',
    category: 'ACT III · 経路制御モジュール',
    act: 3,
    stageId: 'stage_10',
    unlockClearedStage: 'stage_10',
    unlockLabel: 'STAGE 10 クリア',
    codexIds: ['decoder'],
    chipId: 'DEC_2TO4',
    pins: { inputs: ['A0', 'A1'], outputs: ['Y0', 'Y1', 'Y2', 'Y3'] },
    anim: 'decoder_2to4',
    summary:
      '2ビットの番号（0番:A0=0,A1=0 ／ 1番:A0=1,A1=0 ／ 2番:A0=0,A1=1 ／ 3番:A0=1,A1=1）を読み解いて、4本の出力線のうち対応する1本だけをONにする翻訳モジュール。NOT2個とAND4個で全4パターンを判定します。',
    analogy: '番号札「2番」を見せると、4つの部屋のうち2号室の扉だけを自動でパッと開けてくれる案内係。',
    related: ['binary', 'not_gate', 'and_gate'],
  },

  // =========================================================================
  // ACT IV — MEMORY & CLOCK
  // =========================================================================
  feedback: {
    id: 'feedback',
    title: 'フィードバック（輪っか配線）',
    reading: 'Feedback Loop',
    category: '記憶・順序回路',
    unlockReachedStage: 'stage_11',
    unlockLabel: 'STAGE 11 到達',
    summary:
      '回路の「出口」の線をぐるっと自分の「入口」へ戻す配線。これによって電気信号が輪の中を回り続け、入力スイッチから手を離しても過去の情報を覚え続けられるようになります。',
    analogy: '一度ささやいた言葉を2人でずっと言い合い続けることで、忘れないように記憶を保つ輪っか。',
    related: ['sr_latch', 'd_latch'],
  },
  sr_latch: {
    id: 'sr_latch',
    title: 'SRラッチ（SR_LAT）',
    reading: 'Set-Reset Latch (1918)',
    category: 'ACT IV · 記憶モジュール',
    act: 4,
    stageId: 'stage_11',
    unlockClearedStage: 'stage_11',
    unlockLabel: 'STAGE 11 クリア',
    codexIds: ['sr_latch'],
    chipId: 'SR_LATCH',
    pins: { inputs: ['S (セット)', 'R (リセット)'], outputs: ['Q', 'QN'] },
    anim: 'sr_latch_loop',
    summary:
      '2個のNANDの出力をお互いの入口へたすき掛けに戻した世界最小の記憶モジュール。S=1で「1」を記憶してS=0に戻しても保持し続け、R=1で「0」にリセットされます。1918年に発見された全メモリの祖先です。',
    analogy: '一度倒すと反対から押し戻すまでそのまま傾き続ける「シーソー」のような記憶スイッチ。',
    related: ['feedback', 'nand', 'd_latch'],
  },
  d_latch: {
    id: 'd_latch',
    title: 'Dラッチ（D_LAT / 1ビット金庫）',
    reading: 'Data Latch / 1-Bit Memory Cell',
    category: 'ACT IV · 記憶モジュール',
    act: 4,
    stageId: 'stage_12',
    unlockClearedStage: 'stage_12',
    unlockLabel: 'STAGE 12 クリア',
    codexIds: ['d_latch'],
    chipId: 'D_LATCH',
    pins: { inputs: ['D (データ)', 'WE (書込許可)'], outputs: ['Q'] },
    anim: 'd_latch_vault',
    summary:
      'SRラッチの前にANDの門番2個とNOTをつけた安全な1ビット記憶モジュール。WE=1のときだけデータDを保存し、WE=0の間は外の配線がノイズで揺れても中身Qを絶対に守ります。',
    analogy: '「保存ボタン(WE)」を押している間だけ中身を書き換えられる、カギ付きの1マス金庫。',
    related: ['sr_latch', 'and_gate', 'gigabyte', 'd_ff'],
  },
  gigabyte: {
    id: 'gigabyte',
    title: '1ギガバイト（1GB）',
    reading: '1 Gigabyte ≈ 8.5 Billion Bits',
    category: 'コンピュータ基礎',
    unlockClearedStage: 'stage_12',
    unlockLabel: 'STAGE 12 クリア',
    summary:
      '8ビット＝1バイトの約10億倍（正確には約85億9千万ビット！）。かつてのスマホやPCのメモリは、あなたが作った「1ビット金庫（Dラッチ）」が何十億個も整然と並んだ巨大なロッカー室です。',
    analogy: '1マスに0か1しか入らない小さなコインロッカーを、地球の人口と同じ数だけズラッと並べた倉庫。',
    related: ['bit', 'd_latch'],
  },
  clock: {
    id: 'clock',
    title: 'クロック（心臓の鼓動）',
    reading: 'System Clock Signal (CLK)',
    category: '同期・タイミング',
    unlockReachedStage: 'stage_13',
    unlockLabel: 'STAGE 13 到達',
    summary:
      '0と1を一定のリズムで「ドクン、ドクン」と繰り返し送り続ける基準信号。回路じゅうの計算と記憶がバラバラに暴走しないよう、全員の歩調をピタッと揃えるオーケストラの指揮者です。',
    analogy: '運動会の行進で全員の足並みを揃える「イチ、ニ、イチ、ニ」のメトロノーム。',
    related: ['d_ff', 'ghz', 'program_counter'],
  },
  d_ff: {
    id: 'd_ff',
    title: 'Dフリップフロップ（D_FF）',
    reading: 'Edge-Triggered D Flip-Flop',
    category: 'ACT IV · 記憶モジュール',
    act: 4,
    stageId: 'stage_13',
    unlockClearedStage: 'stage_13',
    unlockLabel: 'STAGE 13 クリア',
    codexIds: ['d_ff_clock'],
    chipId: 'D_FF',
    pins: { inputs: ['D', 'CLK'], outputs: ['Q'] },
    anim: 'dff_airlock',
    summary:
      'Dラッチを2つ直列につなぎ、前室（CLK=0で開）と後室（CLK=1で開）の扉を交互に開閉する二重エアロック構造。クロックが0→1へ立ち上がる「その一瞬」だけ値を取り込み、信号の筒抜け暴走を防ぎます。',
    analogy: '外扉を閉めてから内扉を開く「潜水艦の二重エアロック」で、1拍につき1回だけデータを通す仕組み。',
    related: ['clock', 'd_latch', 'ghz', 'register'],
  },
  ghz: {
    id: 'ghz',
    title: 'GHz（ギガヘルツ）',
    reading: 'Gigahertz (Billion Cycles / Sec)',
    category: 'コンピュータ基礎',
    unlockClearedStage: 'stage_13',
    unlockLabel: 'STAGE 13 クリア',
    summary:
      '1秒間にクロックの鼓動を何回打てるかを表す速さの単位。「1GHz」は1秒間に10億回、「3GHz」ならなんと1秒間に30億回も「計算して記憶を更新する」ステップを繰り返しています！',
    analogy: '人間の心臓は1秒に約1回（1Hz）。戦前のスマホCPUはその30億倍の超高速で脈打っていた！',
    related: ['clock', 'd_ff'],
  },
  register: {
    id: 'register',
    title: '4ビット・レジスタ（REG_4B）',
    reading: '4-Bit CPU Register',
    category: 'ACT IV · 記憶モジュール',
    act: 4,
    stageId: 'stage_14',
    unlockClearedStage: 'stage_14',
    unlockLabel: 'STAGE 14 クリア',
    codexIds: ['register_4bit'],
    chipId: 'REG_4BIT',
    pins: { inputs: ['D0..3', 'LOAD', 'CLK'], outputs: ['Q0..3'] },
    anim: 'reg_4bit',
    summary:
      'MUX_4BとD_FF×4を組み合わせ、4桁の数字（0〜15）を丸ごと保存・保持できるCPU直結の作業机モジュール。LOAD=1ならクロックで新データDを保存し、LOAD=0なら今の値Qを循環させて保持し続けます。',
    analogy: '遠くの倉庫（メインメモリ）まで取りに行かずに済む、CPUの手元にある超高速の作業机。',
    related: ['d_ff', 'mux_4bit', 'program_counter', 'ark4_cpu'],
  },

  // =========================================================================
  // ACT V — ALU, PROGRAM COUNTER & ARK-4 CPU CORE
  // =========================================================================
  twos_comp: {
    id: 'twos_comp',
    title: '2の補数（引き算の数学原理）',
    reading: "Two's Complement",
    category: '数学・計算',
    unlockClearedStage: 'stage_15',
    unlockLabel: 'STAGE 15 クリア',
    summary:
      '2進数の0と1を全部ひっくり返して「+1」すると、足し算器にそのまま入れるだけで「引き算」になる美しい数学原理。4ビット（16で1周する時計）では「-2」は「+14 (1110)」と同じ場所を指します。',
    analogy: '12時間時計で「2時間戻す（-2）」ことと「10時間進める（+10）」ことが同じ針の位置になる仕組み！',
    related: ['alu', 'binary', 'neumann'],
  },
  alu: {
    id: 'alu',
    title: '4ビット加減算ALU（ALU_4B）',
    reading: 'Arithmetic Logic Unit',
    category: 'ACT V · CPU中枢モジュール',
    act: 5,
    stageId: 'stage_15',
    unlockClearedStage: 'stage_15',
    unlockLabel: 'STAGE 15 クリア',
    codexIds: ['alu_twos_comp'],
    chipId: 'ALU_4BIT',
    pins: { inputs: ['A0..3', 'B0..3', 'SUB'], outputs: ['Y0..3', 'COUT'] },
    anim: 'alu_twos_comp',
    summary:
      'SUB=0なら足し算（A+B）、SUB=1なら2の補数で引き算（A−B）をこなすCPUの演算心臓モジュール。XOR×4でBを条件反転し、ADD_4BのCINにSUBを入れるだけで実現します。',
    analogy: 'CPUの中で足し算も引き算も1台でこなす「万能そろばん職人」。',
    related: ['twos_comp', 'ripple_adder', 'xor_gate', 'neumann', 'ark4_cpu'],
  },
  neumann: {
    id: 'neumann',
    title: 'ジョン・フォン・ノイマン',
    reading: 'John von Neumann (1903–1957)',
    category: '歴史・人物',
    unlockClearedStage: 'stage_15',
    unlockLabel: 'STAGE 15 クリア',
    summary:
      '1945年に「プログラム（命令）とデータを同じメモリに置いてCPUが順に実行する」という現代コンピュータの基本設計（ノイマン型アーキテクチャ）をまとめた20世紀屈指の天才数学者。',
    analogy: '戦前のPC・スマホからAETHER-IX、そしてARK-4まで、あらゆるコンピュータの設計図の原点を作った「コンピュータ設計の父」。',
    related: ['alu', 'twos_comp', 'ark4_cpu'],
  },
  program_counter: {
    id: 'program_counter',
    title: 'プログラムカウンタ（PC_4B）',
    reading: '4-Bit Program Counter',
    category: 'ACT V · CPU中枢モジュール',
    act: 5,
    stageId: 'stage_16',
    unlockClearedStage: 'stage_16',
    unlockLabel: 'STAGE 16 クリア',
    codexIds: ['program_counter'],
    chipId: 'PC_4BIT',
    pins: { inputs: ['J0..3', 'JMP', 'CLK'], outputs: ['Q0..3'] },
    anim: 'pc_loop',
    summary:
      '「今は何行目の命令を実行しているか」を記憶し、クロックごとにADD_4Bで自動+1して次の番地へ進み、JMP=1ならMUX_4Bで指定番地JへジャンプするCPUの司令塔モジュールです。',
    analogy: '楽譜を1小節ずつ指で追いかけ、リピート記号が来たら指定ページへ飛び移る指揮者の指。',
    related: ['register', 'ripple_adder', 'mux_4bit', 'ark4_cpu'],
  },
  ark4_cpu: {
    id: 'ark4_cpu',
    title: 'ARK-4 CPUコア（中枢回路）',
    reading: 'ARK-4 Accumulator CPU Core',
    category: 'ACT V · CPU中枢モジュール',
    act: 5,
    stageId: 'stage_17',
    unlockClearedStage: 'stage_17',
    unlockLabel: 'STAGE 17 クリア',
    codexIds: ['ark4_cpu'],
    chipId: 'ARK4_CORE',
    pins: { inputs: ['IMM0..3', 'OP', 'SET', 'WE', 'CLK'], outputs: ['ACC0..3'] },
    anim: 'ark4_cpu',
    summary:
      'ALU_4B（計算する手）・MUX_4B（道を選ぶ目）・REG_4B（覚える頭）をひとつのループに結んだアーク7の新中枢コア！ LDI（代入）・ADD（加算）・SUB（減算）・NOP（保持）のプログラムを連続実行します。',
    analogy: 'たった1粒の砂と1個のNANDから組み上げた、命令を読んで自律的に考え動く「機械の頭脳」。',
    related: ['alu', 'mux_4bit', 'register', 'program_counter', 'ark4_sys'],
  },

  // =========================================================================
  // CHAPTER II (ACT VI & ACT VII) — AUTONOMOUS VON NEUMANN PC & ASSEMBLY
  // =========================================================================
  zero_flag: {
    id: 'zero_flag',
    title: '4ビット・ゼロ検知器（ZERO_4B）',
    reading: '4-Bit Zero Flag Detector (NOR4)',
    category: 'ACT VI · 分岐・命令制御モジュール',
    act: 6,
    stageId: 'stage_18',
    unlockClearedStage: 'stage_18',
    unlockLabel: 'STAGE 18 クリア',
    codexIds: ['zero_flag_branch'],
    chipId: 'ZERO_4BIT',
    pins: { inputs: ['A0..3'], outputs: ['Z'] },
    anim: 'zero_flag_4b',
    summary:
      '4ビットの数値（A0..A3）がすべて0（0000）になった瞬間だけ Z=1 を出力し、1本でも1があれば Z=0 を返す検知モジュール。OR×3で全ビットをまとめ、最後にNOTで反転して作ります。ALUの引き算（A−B）と組み合わせることで「2つの数が一致した（差が0）」ことを見抜くCPUの『目』になります。',
    analogy: '気圧差やカウントダウンの残り時間が「ぴったりゼロ」になった瞬間だけ青ランプを灯す確認センサー。',
    related: ['or_gate', 'not_gate', 'alu', 'cond_pc'],
  },
  conditional_branch: {
    id: 'conditional_branch',
    title: '条件分岐（if文・JZジャンプ）',
    reading: 'Conditional Branch / Jump if Zero',
    category: 'コンピュータ科学基礎',
    unlockReachedStage: 'stage_19',
    unlockLabel: 'STAGE 19 到達',
    summary:
      '「もし今の計算結果が0なら指定番地へ飛び、0でなければ次の行へ進む」という、状況に応じてプログラムの進む道を変える仕組み。プログラミングの if文 や whileループ はすべてこの条件分岐回路から生まれています。',
    analogy: '「まだ氷が溶けていない（温度≠0）なら加熱へ戻り、溶け切った（温度＝0）ならハッチ開門へ進む」という自動判断！',
    related: ['zero_flag', 'cond_pc', 'program_counter', 'assembly'],
  },
  cond_pc: {
    id: 'cond_pc',
    title: '条件分岐カウンタ（COND_PC）',
    reading: 'Conditional Branch Program Counter',
    category: 'ACT VI · 分岐・命令制御モジュール',
    act: 6,
    stageId: 'stage_19',
    unlockClearedStage: 'stage_19',
    unlockLabel: 'STAGE 19 クリア',
    codexIds: ['zero_flag_branch'],
    chipId: 'COND_PC',
    pins: { inputs: ['V0..3', 'J0..3', 'BR', 'CLK'], outputs: ['PC0..3'] },
    anim: 'cond_branch_pc',
    summary:
      'ZERO_4B（ゼロ検知の目）と AND と PC_4B（手順カウンタ）を合体させた自律司令塔モジュール。普段はクロックごとに「+1」ずつ次の行へ進みますが、分岐命令（BR=1）のときに計算結果 V がちょうど 0（Z=1）であれば、自動で指定番地 J へジャンプ（JZ）します！',
    analogy: '「もし結果が0なら○番地へ飛べ！」という条件つきジャンプ命令（if文・ループ）を判断して実行する司令塔。',
    related: ['zero_flag', 'program_counter', 'and_gate', 'conditional_branch', 'ark4_sys'],
  },
  machine_code: {
    id: 'machine_code',
    title: '機械語（マシン語 / オペコード）',
    reading: 'Machine Code / Opcode',
    category: 'アーキテクチャ・言語',
    unlockReachedStage: 'stage_20',
    unlockLabel: 'STAGE 20 到達',
    summary:
      'CPUに直接命令を伝えるための「0と1の番号」。ARK-4では2ビットの命令番号（00＝代入, 01＝加算, 10＝減算, 11＝ゼロなら飛べ）と4ビットの数値を合わせたビット列が機械語になり、これを命令デコーダ（INST_DEC）が翻訳してCPUを動かします。',
    analogy: '食堂の厨房へ「00番＝カレー、01番＝スープ」と番号札で注文を伝える仕組み。',
    related: ['inst_dec', 'assembly', 'decoder'],
  },
  inst_dec: {
    id: 'inst_dec',
    title: 'アセンブリ命令デコーダ（INST_DEC）',
    reading: 'Instruction Decoder',
    category: 'ACT VI · 分岐・命令制御モジュール',
    act: 6,
    stageId: 'stage_20',
    unlockClearedStage: 'stage_20',
    unlockLabel: 'STAGE 20 クリア',
    codexIds: ['machine_code_asm'],
    chipId: 'INST_DEC',
    pins: { inputs: ['I0', 'I1'], outputs: ['OP', 'SET', 'WE', 'BR'] },
    anim: 'inst_decoder',
    summary:
      '水耕栽培室で作った DEC2_4 と NOT を組み合わせ、2ビットの命令番号（00=LDI, 01=ADD, 10=SUB, 11=JZ）をCPUの4本の制御レバー（OP・SET・WE・BR）へ一発翻訳する通訳モジュール。0と1の機械語とアセンブリ言語を物理回路へ直結する要です。',
    analogy: '「ADD（足せ）」という一言の命令を聞いて、CPU内部の4本のレバーを正しい組み合わせにガチャンと一斉セットしてくれる通訳係。',
    related: ['decoder', 'machine_code', 'assembly', 'ark4_cpu', 'ark4_sys'],
  },
  ark4_sys: {
    id: 'ark4_sys',
    title: 'ノイマン型自律計算機（ARK4_SYS）',
    reading: 'Complete Von Neumann Computer Core',
    category: 'ACT VI · 分岐・命令制御モジュール',
    act: 6,
    stageId: 'stage_21',
    unlockClearedStage: 'stage_21',
    unlockLabel: 'STAGE 21 クリア',
    codexIds: ['von_neumann_complete'],
    chipId: 'ARK4_SYS',
    pins: { inputs: ['I0..1', 'IMM0..3', 'CLK'], outputs: ['ACC0..3', 'PC0..3'] },
    anim: 'ark4_von_neumann',
    summary:
      'INST_DEC（命令を翻訳する耳）・ARK4_CPU（計算して覚える頭脳）・COND_PC（結果が0か見て次の番地を決める足）の3大マイモジュールを1枚のボード上で統合した完全体ノイマン型コンピュータ！ 内部で280個以上のNANDが一斉に連動し、プログラムを自律実行します。',
    analogy: '人間がいちいちレバーを動かさなくても、プログラム（命令表）を1行ずつ自分で読んで判断し続ける完全自律の電算機！',
    related: ['inst_dec', 'ark4_cpu', 'cond_pc', 'assembly'],
  },
  assembly: {
    id: 'assembly',
    title: 'アセンブリ言語（LDI / ADD / SUB / JZ）',
    reading: 'Assembly Language & Software',
    category: 'ACT VII · ソフトウェア＆プログラム',
    act: 7,
    stageId: 'stage_22',
    unlockClearedStage: 'stage_22',
    unlockLabel: 'STAGE 22 クリア',
    codexIds: ['machine_code_asm', 'software_algorithm'],
    chipId: 'ASM_PROG',
    pins: { inputs: ['ROM命令表 (0〜4番地)'], outputs: ['ACC (演算結果)', 'PC (実行番地)'] },
    anim: 'asm_program_flow',
    summary:
      '0と1の機械語（00, 01, 10, 11）に、人間が読める名前「LDI（代入）・ADD（加算）・SUB（減算）・JZ（0ならジャンプ）」を1対1で対応させたプログラミング言語。ハードウェアの配線を1本も変えずに、命令の並び（ソフトウェア）だけで掛け算も自動ハッチ開門も実現します！',
    analogy: '完成したオルゴール本体（ハードウェア）はそのままに、差し替えるだけでどんな曲でも奏でられる「楽譜シート（ソフトウェア）」。',
    related: ['inst_dec', 'ark4_sys', 'machine_code', 'algorithm_loop'],
  },
  algorithm_loop: {
    id: 'algorithm_loop',
    title: 'ループとアルゴリズム（ソフトの知恵）',
    reading: 'Loops & Algorithms',
    category: 'コンピュータ科学基礎',
    unlockReachedStage: 'stage_23',
    unlockLabel: 'STAGE 23 到達',
    summary:
      'ハードウェア（ALU）に「足し算」と「引き算」しかなくても、命令の組み合わせと繰り返し（ループ・条件分岐 JZ）によって「掛け算（3×4＝3+3+3+3）」や「自動カウントダウン制御」を実現する手順の知恵。ハードの限界をソフトで超える計算機科学の真髄です。',
    analogy: '掛け算ボタンのない電卓でも、「＋3」を4回繰り返す手順（レシピ）を書けば掛け算ができる仕組み！',
    related: ['assembly', 'conditional_branch', 'ark4_sys'],
  },
};

/**
 * Ordered list of module IDs featured in the '⚡ モジュール図鑑（動的図解付き）' tab.
 * Every module here is unlocked ONLY when its acquisition stage is cleared!
 */
export const MODULE_ENCYCLOPEDIA_IDS = [
  // ACT 0: Physical & Silicon Foundation
  'transistor',
  'pullup',
  'short_circuit',
  'nand',
  // ACT I: Logic Gates
  'not_gate',
  'and_gate',
  'or_gate',
  'xor_gate',
  // ACT II: Binary Arithmetic
  'half_adder',
  'full_adder',
  'ripple_adder',
  // ACT III: Routing & Bus
  'mux',
  'mux_4bit',
  'decoder',
  // ACT IV: Memory & Clock
  'sr_latch',
  'd_latch',
  'd_ff',
  'register',
  // ACT V: ALU & CPU Core
  'alu',
  'program_counter',
  'ark4_cpu',
  // ACT VI: Conditional Branch, Instruction Decoder & Complete Von Neumann System
  'zero_flag',
  'cond_pc',
  'inst_dec',
  'ark4_sys',
  // ACT VII: Assembly Language & Software
  'assembly',
];

/**
 * Checks whether a glossary explanation can appear as an active link in the CURRENT dialogue line.
 * - Terms with `unlockClearedStage`: ONLY unlocked after that stage is cleared!
 * - Terms with `unlockReachedStage`: unlocked once that stage is reached/unlocked.
 * - Basic story vocabulary terms: unlocked when they appear in the dialogue line being read!
 */
export function isGlossaryTermLinkableInLine(termId, save = null) {
  const term = GLOSSARY_TERMS[termId];
  if (!term) return false;
  if (!save) return true;
  const cleared = Array.isArray(save.clearedStages) ? save.clearedStages : [];
  if (term.unlockClearedStage) {
    return cleared.includes(term.unlockClearedStage);
  }
  if (term.unlockReachedStage) {
    return cleared.includes(term.unlockReachedStage) || isStageUnlocked(save, term.unlockReachedStage);
  }
  return true;
}

/**
 * Checks whether a glossary explanation is unlocked in Related Links / Popover Navigation.
 * - Stage-clear modules & post-clear solution concepts (`term.unlockClearedStage`) are
 *   STRICTLY LOCKED until the player clears that stage (so puzzle answers are never spoiled!).
 * - Story & background vocabulary terms for stages the player has already reached
 *   (`emp`, `relay`, `insulator`, `silicon`, `p_silicon`, `n_silicon`, etc.) are freely
 *   browsable via related links while reading the story!
 */
export function isGlossaryTermUnlocked(termId, save = null) {
  return isGlossaryTermLinkableInLine(termId, save);
}

/**
 * Checks whether a term's live circuit diagram (`anim`) is unlocked.
 */
export function isGlossaryDiagramUnlocked(termId, save = null) {
  const term = GLOSSARY_TERMS[termId];
  if (!term || !term.anim) return false;
  if (!save) return true;
  if (!isGlossaryTermUnlocked(termId, save)) return false;
  const cleared = Array.isArray(save.clearedStages) ? save.clearedStages : [];
  if (term.unlockClearedStageForDiagram) {
    return cleared.includes(term.unlockClearedStageForDiagram);
  }
  return true;
}

/**
 * Checks whether a module card in the '⚡ モジュール図鑑' tab is unlocked.
 * In the Module Encyclopedia, every module requires its stage to be CLEARED!
 */
export function isModuleEncyclopediaUnlocked(termId, save = null) {
  const term = GLOSSARY_TERMS[termId];
  if (!term) return false;
  if (!save) return true;
  const cleared = Array.isArray(save.clearedStages) ? save.clearedStages : [];
  const reqStage = term.unlockClearedStage || term.unlockClearedStageForDiagram || term.stageId;
  if (reqStage) {
    return cleared.includes(reqStage);
  }
  return isGlossaryTermUnlocked(termId, save);
}

/**
 * Alias -> termId mapping table.
 */
const TERM_ALIASES = [
  ['電磁パルス（EMP）', 'emp'],
  ['電磁パルス', 'emp'],
  ['EMP', 'emp'],
  ['リレー', 'relay'],
  ['絶縁層', 'insulator'],
  ['ガラスの壁', 'insulator'],
  ['チップ焼付け機', 'wafer_press'],
  ['焼付け機', 'wafer_press'],
  ['P型シリコン', 'p_silicon'],
  ['N型シリコン', 'n_silicon'],
  ['MOSFETトランジスタ', 'transistor'],
  ['トランジスタ', 'transistor'],
  ['シリコン板', 'silicon'],
  ['シリコン', 'silicon'],
  ['静電気', 'electrostatic'],
  ['ショート', 'short_circuit'],
  ['プルアップ抵抗（PULL）', 'pullup'],
  ['プルアップ抵抗', 'pullup'],
  ['ていこう', 'resistor'],
  ['抵抗器', 'resistor'],
  ['抵抗', 'resistor'],
  ['地面アース', 'earth'],
  ['アース0', 'earth'],
  ['アース', 'earth'],
  ['NANDゲート', 'nand'],
  ['NAND（ナンド）', 'nand'],
  ['NAND', 'nand'],
  ['ICチップ', 'ic_chip'],
  ['NOTゲート（インバーター）', 'not_gate'],
  ['NOTゲート', 'not_gate'],
  ['NOT', 'not_gate'],
  ['ANDゲート（論理積）', 'and_gate'],
  ['ANDゲート', 'and_gate'],
  ['AND', 'and_gate'],
  ['ORゲート（論理和）', 'or_gate'],
  ['ORゲート', 'or_gate'],
  ['OR', 'or_gate'],
  ['ド・モルガンの法則', 'demorgan'],
  ['ド・モルガン', 'demorgan'],
  ['XORゲート（排他的論理和）', 'xor_gate'],
  ['XORゲート', 'xor_gate'],
  ['XOR', 'xor_gate'],
  ['2進数', 'binary'],
  ['半加算器（Half Adder）', 'half_adder'],
  ['半加算器', 'half_adder'],
  ['H_ADD', 'half_adder'],
  ['全加算器（Full Adder）', 'full_adder'],
  ['全加算器', 'full_adder'],
  ['F_ADD', 'full_adder'],
  ['リップルキャリー加算器', 'ripple_adder'],
  ['4ビット加算器', 'ripple_adder'],
  ['ADD_4B', 'ripple_adder'],
  ['4ビット・マルチプレクサ', 'mux_4bit'],
  ['4ビット切替バス', 'mux_4bit'],
  ['MUX_4B', 'mux_4bit'],
  ['マルチプレクサ（MUX）', 'mux'],
  ['マルチプレクサ', 'mux'],
  ['MUX', 'mux'],
  ['バス（Bus）', 'bus'],
  ['データバス', 'bus'],
  ['64ビット', 'bit'],
  ['32ビット', 'bit'],
  ['8ビット', 'bit'],
  ['4ビット', 'bit'],
  ['2ビット', 'bit'],
  ['1ビット・メモリセル', 'd_latch'],
  ['1ビット金庫', 'd_latch'],
  ['1ビット', 'bit'],
  ['マイクロプロセッサ', 'microprocessor'],
  ['2→4デコーダ', 'decoder'],
  ['デコーダ', 'decoder'],
  ['フィードバック', 'feedback'],
  ['SRラッチ', 'sr_latch'],
  ['SR_LAT', 'sr_latch'],
  ['Dラッチ（1ビット・メモリセル）', 'd_latch'],
  ['Dラッチ', 'd_latch'],
  ['D_LAT', 'd_latch'],
  ['1ギガバイト', 'gigabyte'],
  ['Dフリップフロップ（マスター・スレーブ型）', 'd_ff'],
  ['Dフリップフロップ', 'd_ff'],
  ['D_FF', 'd_ff'],
  ['クロック', 'clock'],
  ['3GHz', 'ghz'],
  ['GHz', 'ghz'],
  ['4ビット・レジスタ', 'register'],
  ['レジスタ', 'register'],
  ['REG_4B', 'register'],
  ['2の補数', 'twos_comp'],
  ['ALU（算術論理演算装置）', 'alu'],
  ['ALU_4B', 'alu'],
  ['ALU', 'alu'],
  ['プログラムカウンタ（PC）', 'program_counter'],
  ['プログラムカウンタ', 'program_counter'],
  ['PC_4B', 'program_counter'],
  ['ARK-4 CPUコア', 'ark4_cpu'],
  ['ARK4_CPU', 'ark4_cpu'],
  ['4ビット・ゼロ検知器', 'zero_flag'],
  ['ゼロ検知器', 'zero_flag'],
  ['ゼロフラグ', 'zero_flag'],
  ['ZERO_4B', 'zero_flag'],
  ['条件分岐カウンタ', 'cond_pc'],
  ['COND_PC', 'cond_pc'],
  ['条件分岐', 'conditional_branch'],
  ['命令デコーダ', 'inst_dec'],
  ['INST_DEC', 'inst_dec'],
  ['機械語', 'machine_code'],
  ['マシン語', 'machine_code'],
  ['オペコード', 'machine_code'],
  ['ノイマン型自律計算機', 'ark4_sys'],
  ['ARK4_SYS', 'ark4_sys'],
  ['アセンブリ言語', 'assembly'],
  ['アセンブリ', 'assembly'],
  ['アルゴリズム', 'algorithm_loop'],
  ['CPU', 'cpu'],
  ['アポロ11号', 'apollo11'],
  ['クロード・シャノン', 'shannon'],
  ['コンラート・ツーゼ', 'zuse'],
  ['フォン・ノイマン', 'neumann'],
];

const SORTED_ALIASES = [...TERM_ALIASES].sort((a, b) => b[0].length - a[0].length);
const ALIAS_MAP = new Map(SORTED_ALIASES);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isAsciiWord(ch) {
  return ch ? /[A-Za-z0-9_]/.test(ch) : false;
}

const COMBINED_PATTERN = new RegExp(
  SORTED_ALIASES.map(([alias]) => escapeRegex(alias)).join('|'),
  'g'
);

/**
 * Splits a dialogue string into plain-text and tappable-glossary tokens.
 * When `save` is provided, unacquired terms (`!isGlossaryTermUnlocked(termId, save)`)
 * are NOT turned into links so unacquired explanations/solutions stay locked!
 *
 * @param {string} text
 * @param {string|null} excludeTermId
 * @param {object|null} save
 * @returns {Array<{ type: 'text'|'term', text: string, termId?: string }>}
 */
export function tokenizeGlossaryText(text, excludeTermId = null, save = null) {
  const str = String(text ?? '');
  if (!str) return [];

  const tokens = [];
  const seenTermIds = new Set();
  if (excludeTermId) seenTermIds.add(excludeTermId);
  let lastIdx = 0;

  COMBINED_PATTERN.lastIndex = 0;
  let match;
  while ((match = COMBINED_PATTERN.exec(str)) !== null) {
    const matchedText = match[0];
    const start = match.index;
    const end = start + matchedText.length;
    const termId = ALIAS_MAP.get(matchedText);

    if (!termId || seenTermIds.has(termId)) continue;
    // Prevent matching 'リレー' (Electromechanical Relay) inside 'バトンリレー' or 'バケツリレー'
    if (matchedText === 'リレー' && start >= 3) {
      const prev3 = str.slice(start - 3, start);
      if (prev3 === 'バトン' || prev3 === 'バケツ') continue;
    }
    if (save && !isGlossaryTermLinkableInLine(termId, save)) continue;

    // ASCII boundary guard for aliases starting/ending with ASCII alphanumerics
    const startsAscii = isAsciiWord(matchedText[0]);
    const endsAscii = isAsciiWord(matchedText[matchedText.length - 1]);
    if (startsAscii && start > 0 && isAsciiWord(str[start - 1])) continue;
    if (endsAscii && end < str.length && isAsciiWord(str[end])) continue;

    if (start > lastIdx) {
      tokens.push({ type: 'text', text: str.slice(lastIdx, start) });
    }
    tokens.push({ type: 'term', text: matchedText, termId });
    seenTermIds.add(termId);
    lastIdx = end;
  }

  if (lastIdx < str.length) {
    tokens.push({ type: 'text', text: str.slice(lastIdx) });
  }

  return tokens;
}

export function getGlossaryTerm(termId) {
  return GLOSSARY_TERMS[termId] || null;
}

const CHIP_TO_TERM_FALLBACK = {
  SW: 'transistor',
  SW_FORGED: 'transistor',
  PULL: 'pullup',
  PULL_FORGED: 'pullup',
  CONST_0: 'earth',
  CONST_1: 'pullup',
  GND: 'earth',
  N_SILICON: 'n_silicon',
  P_SILICON: 'p_silicon',
  INSULATOR: 'insulator',
  METAL_GATE: 'transistor',
  RESISTOR: 'pullup',
  VCC: 'pullup',
  DRAIN_SW: 'transistor',
};

/**
 * Finds the glossary/module entry corresponding to a workbench chip ID or physics part ID.
 */
export function getGlossaryTermForChip(chipId) {
  if (!chipId) return null;
  if (String(chipId).startsWith('ASM_')) return GLOSSARY_TERMS.assembly || null;
  for (const term of Object.values(GLOSSARY_TERMS)) {
    if (term.chipId === chipId) return term;
  }
  const fallbackId = CHIP_TO_TERM_FALLBACK[chipId];
  return fallbackId ? GLOSSARY_TERMS[fallbackId] || null : null;
}

/**
 * Returns all module terms in MODULE_ENCYCLOPEDIA_IDS that link to a given CS History codexId.
 */
export function getModulesForCodexId(codexId) {
  if (!codexId) return [];
  return MODULE_ENCYCLOPEDIA_IDS.map((id) => GLOSSARY_TERMS[id]).filter(
    (term) => term && Array.isArray(term.codexIds) && term.codexIds.includes(codexId)
  );
}

export function hasGlossaryTerms(tokens) {
  return Array.isArray(tokens) && tokens.some((t) => t.type === 'term');
}

/**
 * Collects all linkable term IDs from an array of text strings for position-aware unlocking.
 */
export function collectTermIdsFromTexts(texts, save = null) {
  const set = new Set();
  for (const txt of texts) {
    if (!txt) continue;
    for (const tok of tokenizeGlossaryText(txt, null, save)) {
      if (tok.type === 'term' && tok.termId) set.add(tok.termId);
    }
  }
  return set;
}
