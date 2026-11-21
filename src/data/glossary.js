/**
 * SILICON GENESIS — Interactive Story Glossary & Module Encyclopedia Catalog
 *
 * Designed for complete CS beginners (knowledge = 0):
 *   1) Every technical term in Opening Prologue or Story Theater is tappable
 *      to open an everyday-language explanation card (with live animated diagrams
 *      whenever the term is a module, gate, physics element, or circuit structure!).
 *   2) Powers the '⚡ モジュール図鑑（動的図解付き）' tab inside the Encyclopedia modal.
 */

export const GLOSSARY_TERMS = {
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
    related: ['transistor', 'emp'],
  },
  insulator: {
    id: 'insulator',
    title: '絶縁層（絶縁体・ガラスの壁）',
    reading: 'Insulator / Oxide Layer',
    category: '物理・半導体',
    anim: 'mosfet_bridge',
    summary:
      'ガラスやゴム、プラスチックのように「電気をまったく通さない素材」のこと。隣り合う配線どうしが勝手に触れてショート（焼損）しないよう、電気の壁として仕切る大事な役割を持ちます。',
    analogy: '電線のまわりに巻かれているゴム被覆や、水を通さないガラスの仕切り板。',
    related: ['short_circuit', 'transistor', 'electrostatic'],
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
    anim: 'mosfet_bridge',
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
    anim: 'mosfet_bridge',
    summary:
      'シリコンに微量のホウ素を混ぜた半導体。電子がすこし足りない「プラス（Positive）の穴」が多く、左右をN型シリコンに挟まれると、普段は電子を通さない「見えない壁」になります。',
    analogy: '普段は通行止めになっている川幅。上に静電気をかけると橋が架かって渡れるようになる！',
    related: ['n_silicon', 'silicon', 'transistor'],
  },
  n_silicon: {
    id: 'n_silicon',
    title: 'N型シリコン',
    reading: 'N-Type Semiconductor',
    category: '物理・半導体',
    anim: 'mosfet_bridge',
    summary:
      'シリコンに微量のリンを混ぜた半導体。自由に動き回れるマイナスの電子（Negative）がたっぷり余っていて、電気を流すための「電子の池」の役割をします。',
    analogy: '電子がぎっしり待機している左右の貯水池。真ん中に橋が架かると一気に反対側へ渡り始める！',
    related: ['p_silicon', 'silicon', 'transistor'],
  },
  electrostatic: {
    id: 'electrostatic',
    title: '静電気（電界の引力）',
    reading: 'Electrostatic Force',
    category: '物理・半導体',
    anim: 'mosfet_bridge',
    summary:
      'プラスとマイナスが離れていても引き合う目に見えない力。下敷きで髪が逆立つのと同じ力で、金属にプラスの電気をかけると、ガラスの壁を隔てた下側へマイナスの電子をギュッと吸い寄せます。',
    analogy: 'ガラスの向こうにある砂鉄を、磁石でスッと引き寄せるような「触れないリモコン力」。',
    related: ['transistor', 'insulator'],
  },
  transistor: {
    id: 'transistor',
    title: 'MOSFETトランジスタ（じゃぐち）',
    reading: 'MOSFET Transistor',
    category: 'ACT 0 · 物理素子',
    act: 0,
    stageId: 'stage_00a',
    chipId: 'SW',
    pins: { inputs: ['いり', 'ひねり(Gate)'], outputs: ['でぐち'] },
    anim: 'mosfet_bridge',
    summary:
      '「動く部品ゼロ」で電気のON/OFFを切り替える超極小スイッチ。ひねり（ゲート）に1をかけるとガラスの下に電子の橋が架かって電気が流れ、0にすると遮断されます。人類史上もっとも大量に作られた人工物です。',
    analogy: '指でひねる代わりに「電気の信号」で開閉できる、顕微鏡サイズの電気のじゃぐち。',
    related: ['silicon', 'electrostatic', 'pullup', 'nand'],
  },
  short_circuit: {
    id: 'short_circuit',
    title: 'ショート（短絡）',
    reading: 'Short Circuit',
    category: '物理・電気回路',
    anim: 'short_spark',
    summary:
      '電池のプラス（高い電圧）と地面アース（0V）が、抵抗なしで太い線どうし直結してしまう事故。ブレーキのない大電流が一気に流れ、火花が散って部品が焼け切れてしまいます。',
    analogy: 'ダムの水門を全開にして細い町へそのまま流し込み、大洪水を起こしてしまう状態。',
    related: ['resistor', 'pullup', 'earth'],
  },
  resistor: {
    id: 'resistor',
    title: '抵抗器（ていこう）',
    reading: 'Resistor',
    category: '物理・電気回路',
    anim: 'short_spark',
    summary:
      'わざと電気を通しにくくした「細い道」の部品。電池と地面のあいだに挟むことで、電気が一気に暴走してショート（焼損）するのを防ぎ、電流を安全な量にコントロールします。',
    analogy: '太い水道管の途中に挟む「細いストロー」。水が勢いよく飛び出しすぎるのを防ぐブレーキ役。',
    related: ['short_circuit', 'earth', 'pullup'],
  },
  pullup: {
    id: 'pullup',
    title: 'プルアップ抵抗（はいすい）',
    reading: 'Pull-Up Resistor (PULL)',
    category: 'ACT 0 · 物理素子',
    act: 0,
    stageId: 'stage_00b',
    chipId: 'PULL',
    pins: { inputs: ['ぬけ(Drain)'], outputs: ['でぐち'] },
    anim: 'pullup_drain',
    summary:
      '電池側に電気を通しにくい「細い道（抵抗）」を挟んでおく知恵。普段は出力を1（5V）へ引っ張り上げつつ、下の排水スイッチが開いた瞬間だけショートさせず安全に0（0V）へ落とせます。',
    analogy: '細い蛇口から少しずつ水をためておき、底の大きな栓を抜いた瞬間だけ水圧をゼロにする水槽の仕組み。',
    related: ['resistor', 'short_circuit', 'earth', 'nand'],
  },
  earth: {
    id: 'earth',
    title: '地面アース（0V・接地）',
    reading: 'Ground / Earth (GND)',
    category: '物理・電気回路',
    anim: 'pullup_drain',
    summary:
      '電気の「基準となる高さ0（0ボルト）」であり、余った電気の逃げ場。ここへ道が開くと電圧がストンと0に落ち、デジタル回路の「0（OFF）」がはっきり決まります。',
    analogy: '水路でいう「海面（高さ0メートル）」。水は高いところから必ず海へ流れ落ちる。',
    related: ['pullup', 'short_circuit'],
  },
  nand: {
    id: 'nand',
    title: 'NANDゲート（ナンド）',
    reading: 'NOT-AND Gate',
    category: 'ACT 0 · 基本論理素子',
    act: 0,
    stageId: 'stage_00',
    chipId: 'NAND',
    pins: { inputs: ['A', 'B'], outputs: ['OUT'] },
    anim: 'nand_series',
    summary:
      '「AとBの両方が1のときだけ0、それ以外は全部1」を返すあまのじゃく部品。2個のトランジスタ（じゃぐち）を直列に並べてプルアップ抵抗（はいすい）へ繋ぐと誕生します。この1種類から全コンピュータが作れます！',
    analogy: 'たった1種類のブロックなのに、組み合わせ次第でお城も宇宙船もぜんぶ作れてしまう「魔法の万能レゴ」。',
    related: ['transistor', 'pullup', 'not_gate', 'apollo11'],
  },
  ic_chip: {
    id: 'ic_chip',
    title: 'ICチップ（集積回路）',
    reading: 'Integrated Circuit',
    category: 'ハードウェア',
    summary:
      'たくさんのトランジスタや論理回路を小さな1枚の箱にぎゅっと閉じ込めて、「中身を気にせず1個の部品として再利用」できるようにしたもの。この「部品化（抽象化）」のおかげで巨大なCPUも作れます。',
    analogy: '毎回バラバラの小麦粉から作るのではなく、「完成済みパーツ」として箱詰めして使い回す仕組み。',
    related: ['wafer_press', 'nand'],
  },
  not_gate: {
    id: 'not_gate',
    title: 'NOTゲート（インバーター）',
    reading: 'NOT Gate / Inverter',
    category: 'ACT I · 論理ゲート',
    act: 1,
    stageId: 'stage_01',
    chipId: 'NOT',
    pins: { inputs: ['IN'], outputs: ['OUT'] },
    anim: 'not_branch',
    summary:
      '入力をそのままひっくり返す最小の論理モジュール。0が入れば1、1が入れば0を出します。NANDの2つの入口（AとB）に同じ信号線を分岐してつなぐだけで完成します。',
    analogy: '「はい」と言われたら「いいえ」、「ON」なら「OFF」と必ず逆を返すあまのじゃく通訳。',
    related: ['nand', 'and_gate', 'or_gate'],
  },
  and_gate: {
    id: 'and_gate',
    title: 'ANDゲート（論理積）',
    reading: 'AND Gate',
    category: 'ACT I · 論理ゲート',
    act: 1,
    stageId: 'stage_02',
    chipId: 'AND',
    pins: { inputs: ['A', 'B'], outputs: ['OUT'] },
    anim: 'and_invert',
    summary:
      '「Aも1、かつBも1」のように、条件がぜんぶ揃ったときだけ1を出すモジュール。NANDの後ろにNOTをつないでひっくり返すと完成します。安全装置や二重ロックの基本です。',
    analogy: '銀行の金庫のように「2本のカギを同時に回したときだけ開く」二重チェック機構。',
    related: ['nand', 'not_gate', 'or_gate', 'shannon'],
  },
  or_gate: {
    id: 'or_gate',
    title: 'ORゲート（論理和）',
    reading: 'OR Gate',
    category: 'ACT I · 論理ゲート',
    act: 1,
    stageId: 'stage_03',
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
    anim: 'or_demorgan',
    summary:
      '「AでもBでもない（両方0）」の裏返しは「AかBのどちらか（OR）」になる、という論理の変換ルール。19世紀の数学者ド・モルガンが発見し、NANDだけでORを作る鍵になります。',
    analogy: '「雨も降ってない、かつ風も吹いてない」をひっくり返すと「雨か風のどちらかが来てる」になる言葉のパズル。',
    related: ['or_gate', 'nand'],
  },
  xor_gate: {
    id: 'xor_gate',
    title: 'XORゲート（排他的論理和）',
    reading: 'Exclusive-OR Gate',
    category: 'ACT I · 論理ゲート',
    act: 1,
    stageId: 'stage_04',
    chipId: 'XOR',
    pins: { inputs: ['A', 'B'], outputs: ['OUT'] },
    anim: 'xor_diff',
    summary:
      '2つの入力が「ちがう値（0と1、または1と0）」のときだけ1になり、同じ値なら0になるモジュール。「片方は1（OR）」かつ「両方1ではない（NAND）」をANDで合体させて作ります。',
    analogy: '階段の上と下にある照明スイッチ。また2進数の「1の位の足し算」そのものでもあります！',
    related: ['or_gate', 'and_gate', 'half_adder', 'alu'],
  },
  binary: {
    id: 'binary',
    title: '2進数（にしんすう）',
    reading: 'Binary Number System',
    category: '数学・計算',
    anim: 'half_adder',
    summary:
      '0と1のたった2つの数字だけであらゆる数を表す数え方。普段の10進数は「10」で桁が上がりますが、2進数は「2」で次の桁へくり上がります（0, 1, 10, 11, 100…）。右から1・2・4・8の位になります。',
    analogy: '指が10本ある人間は10進数、ON/OFFの2本しかない電気スイッチは2進数で数える！',
    related: ['bit', 'half_adder', 'twos_comp'],
  },
  half_adder: {
    id: 'half_adder',
    title: '半加算器（H_ADD）',
    reading: 'Half Adder',
    category: 'ACT II · 演算モジュール',
    act: 2,
    stageId: 'stage_05',
    chipId: 'HALF_ADDER',
    pins: { inputs: ['A', 'B'], outputs: ['SUM', 'CARRY'] },
    anim: 'half_adder',
    summary:
      '1ビットどうしの足し算「A＋B」をして、1の位（SUM＝XOR）と2の位へのくり上がり（CARRY＝AND）を出すモジュール。無生物の電気が初めて「算数」を始める記念すべき回路です。',
    analogy: '筆算の一番右の桁（1の位）だけを計算する小さな足し算係。',
    related: ['full_adder', 'binary', 'xor_gate', 'and_gate'],
  },
  full_adder: {
    id: 'full_adder',
    title: '全加算器（F_ADD）',
    reading: 'Full Adder',
    category: 'ACT II · 演算モジュール',
    act: 2,
    stageId: 'stage_06',
    chipId: 'FULL_ADDER',
    pins: { inputs: ['A', 'B', 'CIN'], outputs: ['SUM', 'COUT'] },
    anim: 'full_adder',
    summary:
      'A・Bに加えて「下の桁からのくり上がり（CIN）」も一緒に3つ足し、答え（SUM）と次の桁へのくり上がり（COUT）を出せる完全な1桁加算モジュール。半加算器2個とOR1個で組めます。',
    analogy: '下の位から渡された「くり上がりのバトン」を受け取って、次の位へ渡せる筆算のプロ。',
    related: ['half_adder', 'ripple_adder', 'or_gate'],
  },
  ripple_adder: {
    id: 'ripple_adder',
    title: '4ビット加算器（ADD_4B）',
    reading: '4-Bit Ripple-Carry Adder',
    category: 'ACT II · 演算モジュール',
    act: 2,
    stageId: 'stage_07',
    chipId: 'ADD_4BIT',
    pins: { inputs: ['A0..3', 'B0..3', 'CIN'], outputs: ['S0..3', 'COUT'] },
    anim: 'ripple_4bit',
    summary:
      '全加算器（F_ADD）を4個縦に並べて、1の位→2の位→4の位→8の位へとくり上がりを数珠つなぎにした多桁計算モジュール。0〜15どうしの足し算を一瞬でこなします。',
    analogy: 'ドミノ倒しやバケツリレーのように、隣の桁へ次々とくり上がりを運ぶ計算ライン。',
    related: ['full_adder', 'zuse', 'alu', 'program_counter'],
  },
  mux: {
    id: 'mux',
    title: 'マルチプレクサ（MUX）',
    reading: '2-to-1 Multiplexer',
    category: 'ACT III · 経路制御モジュール',
    act: 3,
    stageId: 'stage_08',
    chipId: 'MUX',
    pins: { inputs: ['D0', 'D1', 'SEL'], outputs: ['OUT'] },
    anim: 'mux_rail',
    summary:
      '切替信号（SEL）が0ならD0、1ならD1のデータを選んで出力へ流す「信号の進路切替モジュール」。プログラミングの「if（もし〜なら）」を電気回路で実現する要の部品です。',
    analogy: '線路のレバーをガチャンと倒して列車の行き先を切り替える、鉄道の「ポイント切替器」。',
    related: ['bus', 'register', 'and_gate', 'or_gate'],
  },
  bus: {
    id: 'bus',
    title: '4ビット切替バス（MUX_4B）',
    reading: '4-Bit Data Bus Multiplexer',
    category: 'ACT III · 経路制御モジュール',
    act: 3,
    stageId: 'stage_09',
    chipId: 'MUX_4BIT',
    pins: { inputs: ['A0..3', 'B0..3', 'SEL'], outputs: ['Y0..3'] },
    anim: 'data_bus_4bit',
    summary:
      '4本の信号線を1つの「束（バス）」にまとめて、4桁の数値AとBをSEL信号ひとつで丸ごと一気に切り替えるモジュール。レジスタやCPU内部の大動脈になります。',
    analogy: '1車線の小道ではなく、4車線の高速道路をまるごと切り替えてデータを一斉に運ぶ仕組み。',
    related: ['mux', 'bit', 'register', 'cpu'],
  },
  bit: {
    id: 'bit',
    title: 'ビット（bit）とビット幅',
    reading: 'Binary Digit (bit)',
    category: 'コンピュータ基礎',
    anim: 'data_bus_4bit',
    summary:
      '0か1の「たった1桁」の情報単位。4ビットなら 0〜15（16通り）、8ビットなら 0〜255（256通り）、64ビットなら約1844京通りもの数字を1回でまとめて計算できます！',
    analogy: '1個のランプで表せるON/OFFが「1ビット」。ランプの数が増えるほど表現できる数字が倍々で増える！',
    related: ['binary', 'bus', 'gigabyte'],
  },
  microprocessor: {
    id: 'microprocessor',
    title: 'マイクロプロセッサ',
    reading: 'Microprocessor (1971)',
    category: '歴史・ハードウェア',
    summary:
      '部屋いっぱいあった巨大なコンピュータの頭脳（CPU）を、たった1枚の小さなシリコンチップに収めた革命的部品。1971年の世界初マイクロプロセッサ「Intel 4004」も、このゲームと同じ4ビット幅でした！',
    analogy: '冷蔵庫サイズの計算機を、爪の先ほどの1枚のチップにギュッと縮めた技術革命。',
    related: ['cpu', 'bit', 'ic_chip'],
  },
  decoder: {
    id: 'decoder',
    title: '2→4デコーダ（DEC2_4）',
    reading: '2-to-4 Address Decoder',
    category: 'ACT III · 経路制御モジュール',
    act: 3,
    stageId: 'stage_10',
    chipId: 'DEC_2TO4',
    pins: { inputs: ['A0', 'A1'], outputs: ['Y0', 'Y1', 'Y2', 'Y3'] },
    anim: 'decoder_2to4',
    summary:
      '2ビットの番号（00=0番, 01=1番, 10=2番, 11=3番）を読み解いて、4本の出力線のうち対応する1本だけをONにする翻訳モジュール。メモリの番地指定やCPUの命令解読に使われます。',
    analogy: '番号札「2番」を見せると、4つの部屋のうち2号室の扉だけを自動でパッと開けてくれる案内係。',
    related: ['binary', 'not_gate', 'and_gate', 'cpu'],
  },
  feedback: {
    id: 'feedback',
    title: 'フィードバック（輪っか配線）',
    reading: 'Feedback Loop',
    category: '記憶・順序回路',
    anim: 'sr_latch_loop',
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
    chipId: 'SR_LATCH',
    pins: { inputs: ['S (セット)', 'R (リセット)'], outputs: ['Q', 'QN'] },
    anim: 'sr_latch_loop',
    summary:
      '2個のNANDをたすき掛けに繋いだ世界最小の記憶モジュール。S=1で「1」を記憶してS=0に戻しても光り続け、R=1で「0」にリセットされます。1918年に発見された全RAM・メモリの祖先です。',
    analogy: '一度倒すと反対から押し戻すまでそのまま傾き続ける「シーソー」のような記憶スイッチ。',
    related: ['feedback', 'd_latch', 'nand'],
  },
  d_latch: {
    id: 'd_latch',
    title: 'Dラッチ（D_LAT / 1ビット金庫）',
    reading: 'Data Latch / 1-Bit Memory Cell',
    category: 'ACT IV · 記憶モジュール',
    act: 4,
    stageId: 'stage_12',
    chipId: 'D_LATCH',
    pins: { inputs: ['D (データ)', 'WE (書込許可)'], outputs: ['Q'] },
    anim: 'd_latch_vault',
    summary:
      'SRラッチの前にANDの門番をつけた安全な1ビット記憶モジュール。WE=1のときだけデータDを保存し、WE=0の間は外の配線がノイズで揺れても中身Qを絶対に守ります。',
    analogy: '「保存ボタン(WE)」を押している間だけ中身を書き換えられる、カギ付きの1マス金庫。',
    related: ['sr_latch', 'gigabyte', 'd_ff'],
  },
  gigabyte: {
    id: 'gigabyte',
    title: '1ギガバイト（1GB）',
    reading: '1 Gigabyte ≈ 8.5 Billion Bits',
    category: 'コンピュータ基礎',
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
    anim: 'dff_airlock',
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
    chipId: 'D_FF',
    pins: { inputs: ['D', 'CLK'], outputs: ['Q'] },
    anim: 'dff_airlock',
    summary:
      'Dラッチを2つ直列につなぎ、前室（CLK=0で開）と後室（CLK=1で開）の扉を交互に開閉する二重エアロック構造。クロックが0→1へ立ち上がる「その一瞬」だけ値を取り込み、信号の筒抜け暴走を防ぎます。',
    analogy: '外扉を閉めてから内扉を開く「潜水艦の二重エアロック」で、1拍につき1回だけデータを通す仕組み。',
    related: ['clock', 'd_latch', 'register', 'ghz'],
  },
  ghz: {
    id: 'ghz',
    title: 'GHz（ギガヘルツ）',
    reading: 'Gigahertz (Billion Cycles / Sec)',
    category: 'コンピュータ基礎',
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
    chipId: 'REG_4BIT',
    pins: { inputs: ['D0..3', 'LOAD', 'CLK'], outputs: ['Q0..3'] },
    anim: 'reg_4bit',
    summary:
      'MUX_4BとD_FF×4を組み合わせ、4桁の数字（0〜15）を丸ごと保存・保持できるCPU直結の作業机モジュール。LOAD=1ならクロックで新データDを保存し、LOAD=0なら今の値Qを循環させて保持し続けます。',
    analogy: '遠くの倉庫（メインメモリ）まで取りに行かずに済む、CPUの手元にある超高速の作業机。',
    related: ['d_ff', 'bus', 'program_counter', 'cpu'],
  },
  twos_comp: {
    id: 'twos_comp',
    title: '2の補数（引き算を足し算にする魔法）',
    reading: "Two's Complement",
    category: '数学・計算',
    anim: 'alu_twos_comp',
    summary:
      '2進数の0と1を全部ひっくり返して「+1」すると、足し算器にそのまま入れるだけで「引き算」になる美しい数学トリック。4ビットなら「-2」は「+14」と同じ場所（16で1周する時計の針）を指します。',
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
    chipId: 'ALU_4BIT',
    pins: { inputs: ['A0..3', 'B0..3', 'SUB'], outputs: ['Y0..3', 'COUT'] },
    anim: 'alu_twos_comp',
    summary:
      'SUB=0なら足し算（A+B）、SUB=1なら2の補数で引き算（A−B）をこなすCPUの演算心臓モジュール。XOR×4でBを条件反転し、ADD_4BのCINにSUBを入れるだけで実現します。',
    analogy: 'CPUの中で足し算も引き算も1台でこなす「万能そろばん職人」。',
    related: ['twos_comp', 'ripple_adder', 'xor_gate', 'cpu'],
  },
  program_counter: {
    id: 'program_counter',
    title: 'プログラムカウンタ（PC_4B）',
    reading: '4-Bit Program Counter',
    category: 'ACT V · CPU中枢モジュール',
    act: 5,
    stageId: 'stage_16',
    chipId: 'PC_4BIT',
    pins: { inputs: ['J0..3', 'JMP', 'CLK'], outputs: ['Q0..3'] },
    anim: 'pc_loop',
    summary:
      '「今は何行目の命令を実行しているか」を記憶し、クロックごとにADD_4Bで自動+1して次の番地へ進み、JMP=1ならMUX_4Bで指定番地JへジャンプするCPUの司令塔モジュールです。',
    analogy: '楽譜を1小節ずつ指で追いかけ、リピート記号が来たら指定ページへ飛び移る指揮者の指。',
    related: ['register', 'ripple_adder', 'bus', 'cpu'],
  },
  cpu: {
    id: 'cpu',
    title: 'ARK-4 CPUコア（中央処理装置）',
    reading: 'Central Processing Unit (ARK-4)',
    category: 'ACT V · CPU中枢モジュール',
    act: 5,
    stageId: 'stage_17',
    chipId: 'ARK4_CORE',
    pins: { inputs: ['IMM0..3', 'OP', 'SET', 'WE', 'CLK'], outputs: ['ACC0..3'] },
    anim: 'ark4_cpu',
    summary:
      'ALU_4B（計算する手）・MUX_4B（道を選ぶ目）・REG_4B（覚える頭）をひとつのループに結んだコンピュータの頭脳本体！ LDI（代入）・ADD（加算）・SUB（減算）・NOP（保持）のプログラムを連続実行します。',
    analogy: 'たった1粒の砂と1個のNANDから組み上げた、命令を読んで自律的に考え動く「機械の頭脳」。',
    related: ['alu', 'bus', 'register', 'program_counter', 'neumann'],
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
  shannon: {
    id: 'shannon',
    title: 'クロード・シャノン',
    reading: 'Claude Shannon (1916–2001)',
    category: '歴史・人物',
    summary:
      '1937年、弱冠21歳の修士論文で「論理の数学（ブール代数）と電気スイッチ回路は完全に同じものだ」と証明した情報時代の父。この論文がデジタルコンピュータの扉を開きました。',
    analogy: '「電気のON/OFFで人間の論理思考をそのまま計算できる！」と最初に見抜いた天才。',
    related: ['and_gate', 'relay'],
  },
  zuse: {
    id: 'zuse',
    title: 'コンラート・ツーゼ',
    reading: 'Konrad Zuse (1910–1995)',
    category: '歴史・人物',
    summary:
      '1941年、ベルリンの自宅リビングでリレー部品を組み立て、世界初のプログラム制御・2進数計算機「Z3」を完成させたドイツの技術者。',
    analogy: '自宅の作業台から「2進数で動く自動計算機」を現実にした先駆者。',
    related: ['ripple_adder', 'binary', 'relay'],
  },
  neumann: {
    id: 'neumann',
    title: 'ジョン・フォン・ノイマン',
    reading: 'John von Neumann (1903–1957)',
    category: '歴史・人物',
    summary:
      '1945年に「プログラム（命令）とデータを同じメモリに置いてCPUが順に実行する」という現代コンピュータの基本設計（ノイマン型アーキテクチャ）をまとめた20世紀屈指の天才数学者。',
    analogy: '今のほぼすべてのPC・スマホの設計図の原点を作った「コンピュータの設計の父」。',
    related: ['cpu', 'twos_comp', 'program_counter'],
  },
};

/**
 * Ordered list of term IDs featured in the '⚡ モジュール図鑑（動的図解付き）' tab
 * inside the Encyclopedia modal, grouped naturally by Act.
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
  'bus',
  'decoder',
  // ACT IV: Memory & Clock
  'sr_latch',
  'd_latch',
  'd_ff',
  'register',
  // ACT V: ALU & CPU Core
  'alu',
  'program_counter',
  'cpu',
];

/**
 * Alias -> termId mapping table.
 * Sorted longest-first automatically so compound terms match cleanly before substrings.
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
  ['4ビット・マルチプレクサ', 'bus'],
  ['マルチプレクサ（MUX）', 'mux'],
  ['マルチプレクサ', 'mux'],
  ['MUX_4B', 'bus'],
  ['MUX', 'mux'],
  ['バス（Bus）', 'bus'],
  ['データバス', 'bus'],
  ['64ビット', 'bit'],
  ['32ビット', 'bit'],
  ['8ビット', 'bit'],
  ['4ビット', 'bit'],
  ['2ビット', 'bit'],
  ['1ビット・メモリセル', 'd_latch'],
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
  ['ARK-4 CPUコア', 'cpu'],
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
 * @param {string} text
 * @param {string|null} excludeTermId Optional termId to exclude (e.g. when rendering inside that term's own card)
 * @returns {Array<{ type: 'text'|'term', text: string, termId?: string }>}
 */
export function tokenizeGlossaryText(text, excludeTermId = null) {
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

export function hasGlossaryTerms(tokens) {
  return Array.isArray(tokens) && tokens.some((t) => t.type === 'term');
}
