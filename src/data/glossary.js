/**
 * SILICON GENESIS — Interactive Story Glossary (Tappable Technical Terms)
 *
 * Designed for complete CS beginners (knowledge = 0):
 * Every technical term that appears in Opening Prologue or Story Theater
 * dialogue is gently highlighted and tappable to open an everyday-language
 * explanation card without advancing the story.
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
    related: ['relay', 'insulator'],
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
    summary:
      'ガラスやゴム、プラスチックのように「電気をまったく通さない素材」のこと。隣り合う配線どうしが勝手に触れてショート（焼損）しないよう、電気の壁として仕切る大事な役割を持ちます。',
    analogy: '電線のまわりに巻かれているゴム被覆や、水を通さないガラスの仕切り板。',
    related: ['short_circuit', 'transistor'],
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
    summary:
      'プラスとマイナスが離れていても引き合う目に見えない力。下敷きで髪が逆立つのと同じ力で、金属にプラスの電気をかけると、ガラスの壁を隔てた下側へマイナスの電子をギュッと吸い寄せます。',
    analogy: 'ガラスの向こうにある砂鉄を、磁石でスッと引き寄せるような「触れないリモコン力」。',
    related: ['transistor', 'insulator'],
  },
  transistor: {
    id: 'transistor',
    title: 'MOSFETトランジスタ',
    reading: 'MOSFET Transistor',
    category: '物理・半導体',
    summary:
      '「動く部品ゼロ」で電気のON/OFFを切り替える超極小スイッチ。1959年にベル研究所で発明され、1秒間に何十億回もパチパチ開閉できます。人類史上もっとも大量に作られた人工物です。',
    analogy: '指でひねる代わりに「電気の信号」で開閉できる、顕微鏡サイズの電気のじゃぐち。',
    related: ['silicon', 'electrostatic', 'pullup', 'nand'],
  },
  short_circuit: {
    id: 'short_circuit',
    title: 'ショート（短絡）',
    reading: 'Short Circuit',
    category: '物理・電気回路',
    summary:
      '電池のプラス（高い電圧）と地面アース（0V）が、抵抗なしで太い線どうし直結してしまう事故。ブレーキのない大電流が一気に流れ、火花が散って部品が焼け切れてしまいます。',
    analogy: 'ダムの水門を全開にして細い町へそのまま流し込み、大洪水を起こしてしまう状態。',
    related: ['pullup', 'earth'],
  },
  resistor: {
    id: 'resistor',
    title: '抵抗器（ていこう）',
    reading: 'Resistor',
    category: '物理・電気回路',
    summary:
      'わざと電気を通しにくくした「細い道」の部品。電池と地面のあいだに挟むことで、電気が一気に暴走してショート（焼損）するのを防ぎ、電流を安全な量にコントロールします。',
    analogy: '太い水道管の途中に挟む「細いストロー」。水が勢いよく飛び出しすぎるのを防ぐブレーキ役。',
    related: ['short_circuit', 'earth', 'pullup'],
  },
  pullup: {
    id: 'pullup',
    title: 'プルアップ抵抗（PULL）',
    reading: 'Pull-Up Resistor',
    category: '物理・電気回路',
    summary:
      '電池側に電気を通しにくい「細い道（抵抗）」を挟んでおく知恵。普段は出力を1（5V）へ引っ張り上げつつ、下の排水スイッチが開いた瞬間だけショートさせず安全に0（0V）へ落とせます。',
    analogy: '細い蛇口から少しずつ水をためておき、底の大きな栓を抜いた瞬間だけ水圧をゼロにする水槽の仕組み。',
    related: ['short_circuit', 'earth', 'nand'],
  },
  earth: {
    id: 'earth',
    title: '地面アース（0V・接地）',
    reading: 'Ground / Earth (GND)',
    category: '物理・電気回路',
    summary:
      '電気の「基準となる高さ0（0ボルト）」であり、余った電気の逃げ場。ここへ道が開くと電圧がストンと0に落ち、デジタル回路の「0（OFF）」がはっきり決まります。',
    analogy: '水路でいう「海面（高さ0メートル）」。水は高いところから必ず海へ流れ落ちる。',
    related: ['pullup', 'short_circuit'],
  },
  nand: {
    id: 'nand',
    title: 'NANDゲート（ナンド）',
    reading: 'NOT-AND Gate',
    category: '論理回路',
    summary:
      '「AとBの両方が1のときだけ0、それ以外は全部1」を返すあまのじゃく部品。驚くべきことに、この1種類の部品さえあれば NOT・AND・OR・足し算・メモリ・CPUまで世界中のすべての計算機が作れます（機能完全性）。',
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
    category: '論理回路',
    summary:
      '入力をそのままひっくり返す最小の論理部品。0が入れば1、1が入れば0を出します。NANDの2つの入口に同じ信号線をつなぐだけで誕生します。',
    analogy: '「はい」と言われたら「いいえ」、「ON」なら「OFF」と必ず逆を返すあまのじゃく通訳。',
    related: ['nand', 'and_gate'],
  },
  and_gate: {
    id: 'and_gate',
    title: 'ANDゲート（論理積）',
    reading: 'AND Gate',
    category: '論理回路',
    summary:
      '「Aも1、かつBも1」のように、条件がぜんぶ揃ったときだけ1を出す回路。NANDの後ろにNOTをつないでひっくり返すと完成します。安全装置や二重ロックの基本です。',
    analogy: '銀行の金庫のように「2本のカギを同時に回したときだけ開く」二重チェック機構。',
    related: ['nand', 'not_gate', 'shannon'],
  },
  or_gate: {
    id: 'or_gate',
    title: 'ORゲート（論理和）',
    reading: 'OR Gate',
    category: '論理回路',
    summary:
      '「AかBのどちらか片方でも1なら1（両方1でも1）」を返す回路。すべての入力が0のときだけ0になります。非常警報や合流回路に欠かせません。',
    analogy: '玄関と勝手口のどちらの呼び鈴を押してもチャイムが鳴る「どちらかスイッチ」。',
    related: ['demorgan', 'nand'],
  },
  demorgan: {
    id: 'demorgan',
    title: 'ド・モルガンの法則',
    reading: "De Morgan's Laws (1847)",
    category: '数学・歴史',
    summary:
      '「AでもBでもない（両方0）」の裏返しは「AかBのどちらか（OR）」になる、という論理の変換ルール。19世紀の数学者ド・モルガンが発見し、NANDだけでORを作る鍵になります。',
    analogy: '「雨も降ってない、かつ風も吹いてない」をひっくり返すと「雨か風のどちらかが来てる」になる言葉のパズル。',
    related: ['or_gate', 'nand'],
  },
  xor_gate: {
    id: 'xor_gate',
    title: 'XORゲート（排他的論理和）',
    reading: 'Exclusive-OR Gate',
    category: '論理回路',
    summary:
      '2つの入力が「ちがう値（0と1、または1と0）」のときだけ1になり、同じ値なら0になる回路。階段の上下スイッチと同じ動きで、2進数の足し算や暗号化の心臓部です。',
    analogy: '「どちらか1人だけ賛成ならOK、2人とも同じ意見ならキャンセル」という違い探しの達人。',
    related: ['half_adder', 'alu'],
  },
  binary: {
    id: 'binary',
    title: '2進数（にしんすう）',
    reading: 'Binary Number System',
    category: '数学・計算',
    summary:
      '0と1のたった2つの数字だけであらゆる数を表す数え方。普段の10進数は「10」で桁が上がりますが、2進数は「2」で次の桁へくり上がります（0, 1, 10, 11, 100…）。右から1・2・4・8の位になります。',
    analogy: '指が10本ある人間は10進数、ON/OFFの2本しかない電気スイッチは2進数で数える！',
    related: ['bit', 'half_adder', 'twos_comp'],
  },
  half_adder: {
    id: 'half_adder',
    title: '半加算器（Half Adder）',
    reading: 'Half Adder',
    category: '演算回路',
    summary:
      '1ビットどうしの足し算「A＋B」をして、1の位（SUM＝XOR）とくり上がり（CARRY＝AND）を出す回路。下の桁からのくり上がりを足す入口がないので「半」加算器と呼びます。',
    analogy: '筆算の一番右の桁（1の位）だけを計算する小さな足し算係。',
    related: ['full_adder', 'binary', 'xor_gate'],
  },
  full_adder: {
    id: 'full_adder',
    title: '全加算器（Full Adder）',
    reading: 'Full Adder',
    category: '演算回路',
    summary:
      'A・Bに加えて「下の桁からのくり上がり（CIN）」も一緒に足し、答え（SUM）と次の桁へのくり上がり（COUT）を出せる完全な1桁加算回路。横に並べるだけで何桁でも計算できます。',
    analogy: '下の位から渡された「くり上がりのバトン」を受け取って、次の位へ渡せる筆算のプロ。',
    related: ['half_adder', 'ripple_adder'],
  },
  ripple_adder: {
    id: 'ripple_adder',
    title: 'リップルキャリー加算器',
    reading: 'Ripple-Carry Adder',
    category: '演算回路',
    summary:
      '全加算器を4個・8個と横に並べてつないだ多桁の足し算回路。くり上がり（キャリー）が1の位から8の位へ波紋（リップル）のように伝わっていく姿から名付けられました。',
    analogy: 'ドミノ倒しやバケツリレーのように、隣の桁へ次々とくり上がりを運ぶ計算ライン。',
    related: ['full_adder', 'zuse', 'alu'],
  },
  mux: {
    id: 'mux',
    title: 'マルチプレクサ（MUX）',
    reading: 'Multiplexer / Data Selector',
    category: 'データ制御',
    summary:
      '切替信号（SEL）が0なら道0、1なら道1のデータを選んで出力へ流す「信号の進路切替器」。プログラミングの「if（もし〜なら）」を電気回路で実現する要の部品です。',
    analogy: '線路のレバーをガチャンと倒して列車の行き先を切り替える、鉄道の「ポイント切替器」。',
    related: ['bus', 'register'],
  },
  bus: {
    id: 'bus',
    title: 'バス（データバス）',
    reading: 'Data Bus',
    category: 'アーキテクチャ',
    summary:
      '複数本の信号線を1つの「束」にまとめて、大きな数字やデータを一気に運ぶコンピュータ内部の幹線道路。語源はたくさんの乗客をまとめて運ぶ「乗合バス（Omnibus）」です。',
    analogy: '1車線の細い小道ではなく、4車線・64車線でデータを一斉に運ぶ高速道路。',
    related: ['bit', 'mux', 'microprocessor'],
  },
  bit: {
    id: 'bit',
    title: 'ビット（bit）とビット幅',
    reading: 'Binary Digit (bit)',
    category: 'コンピュータ基礎',
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
    title: 'デコーダ（解読器）',
    reading: 'Decoder',
    category: 'データ制御',
    summary:
      '2進数の「番号（00, 01, 10, 11など）」を読み解いて、対応する1本の出力線だけをONにする翻訳回路。メモリの番地選びや、CPUが「足せ・引け」などの命令を理解するために大活躍します。',
    analogy: '番号札「2番」を見せると、4つの扉のうち2番の扉だけを自動でパッと開けてくれる案内係。',
    related: ['binary', 'cpu'],
  },
  feedback: {
    id: 'feedback',
    title: 'フィードバック（輪っか配線）',
    reading: 'Feedback Loop',
    category: '記憶・順序回路',
    summary:
      '回路の「出口」の線をぐるっと自分の「入口」へ戻す配線。これによって電気信号が輪の中を回り続け、入力スイッチから手を離しても過去の情報を覚え続けられるようになります。',
    analogy: '一度ささやいた言葉を2人でずっと言い合い続けることで、忘れないように記憶を保つ輪っか。',
    related: ['sr_latch', 'd_latch'],
  },
  sr_latch: {
    id: 'sr_latch',
    title: 'SRラッチ（双安定記憶回路）',
    reading: 'Set-Reset Latch (1918)',
    category: '記憶・順序回路',
    summary:
      '2個のNANDをたすき掛けに繋いだ世界最小のメモリ。S（セット）を一瞬押すと1を記憶し続け、R（リセット）を押すと0に戻ります。1918年に発見された全RAM・メモリの祖先です。',
    analogy: '一度倒すと反対から押し戻すまでそのまま傾き続ける「シーソー」のような記憶スイッチ。',
    related: ['feedback', 'd_latch'],
  },
  d_latch: {
    id: 'd_latch',
    title: 'Dラッチ（1ビット・メモリセル）',
    reading: 'Data Latch / 1-Bit Memory Cell',
    category: '記憶・順序回路',
    summary:
      'SRラッチに「書き込み許可（WE）」の門番をつけた安全な記憶金庫。WE=1のときだけ新しいデータDを保存し、WE=0の間は外の配線がノイズで揺れても中身を絶対に守ります。',
    analogy: '「保存ボタン」を押している間だけ中身を書き換えられる、カギ付きの1マス金庫。',
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
    reading: 'System Clock Signal',
    category: '同期・タイミング',
    summary:
      '0と1を一定のリズムで「ドクン、ドクン」と繰り返し送り続ける基準信号。回路じゅうの計算と記憶がバラバラに暴走しないよう、全員の歩調をピタッと揃えるオーケストラの指揮者です。',
    analogy: '運動会の行進で全員の足並みを揃える「イチ、ニ、イチ、ニ」のメトロノーム。',
    related: ['d_ff', 'ghz'],
  },
  d_ff: {
    id: 'd_ff',
    title: 'Dフリップフロップ（マスター・スレーブ型）',
    reading: 'Edge-Triggered D Flip-Flop',
    category: '記憶・順序回路',
    summary:
      'Dラッチを2つ直列につなぎ、前室と後室の扉を交互に開く二重エアロック構造。クロックが0→1へ立ち上がる「その一瞬」だけ値を取り込むため、出力を計算機へ戻しても暴走しません。',
    analogy: '外扉を閉めてから内扉を開く「潜水艦のエアロック」や「回転ドア」で、1拍につき1つだけ通す仕組み。',
    related: ['clock', 'd_latch', 'register'],
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
    title: 'レジスタ（CPU最速の作業机）',
    reading: 'CPU Register',
    category: 'アーキテクチャ',
    summary:
      'Dフリップフロップをビット幅ぶん並べて、4桁などの数字を丸ごと保存・保持できるCPU直結の超高速メモリ。計算途中の数字をすぐ手元に置いておくために使います。',
    analogy: '遠くの倉庫（メインメモリ）まで取りに行かずに済む、計算机のすぐ上にあるメモ帳。',
    related: ['d_ff', 'mux', 'cpu'],
  },
  twos_comp: {
    id: 'twos_comp',
    title: '2の補数（引き算を足し算にする魔法）',
    reading: "Two's Complement",
    category: '数学・計算',
    summary:
      '2進数の0と1を全部ひっくり返して「+1」すると、足し算器にそのまま入れるだけで「引き算」になる美しい数学トリック。4ビットなら「-2」は「+14」と同じ場所（時計の針の1周）を指します。',
    analogy: '12時間時計で「2時間戻す（-2）」ことと「10時間進める（+10）」ことが同じ針の位置になる仕組み！',
    related: ['alu', 'binary', 'neumann'],
  },
  alu: {
    id: 'alu',
    title: 'ALU（算術論理演算装置）',
    reading: 'Arithmetic Logic Unit',
    category: 'CPUコア',
    summary:
      '足し算・引き算・論理判定など、コンピュータのあらゆる「計算」を一手に引き受けるCPUの心臓部。あなたの作った4ビット加算器とXORで、足し算も引き算も1つの回路でこなせます。',
    analogy: 'CPUの中で実際にそろばんを弾いて答えを出す「計算の職人」。',
    related: ['twos_comp', 'ripple_adder', 'cpu'],
  },
  program_counter: {
    id: 'program_counter',
    title: 'プログラムカウンタ（PC）',
    reading: 'Program Counter',
    category: 'CPUコア',
    summary:
      '「今は何行目の命令を実行しているか」を覚え続け、クロックのたびに自動で+1して次の行へ進む司令塔。ジャンプ命令（JMP）で好きな行へ飛ぶことで、ループや条件分岐が実現します。',
    analogy: '楽譜の上を1小節ずつ指で追いかけ、リピート記号が来たら前のページへ戻る指揮者の指。',
    related: ['register', 'cpu'],
  },
  cpu: {
    id: 'cpu',
    title: 'CPU（中央処理装置）',
    reading: 'Central Processing Unit',
    category: 'CPUコア',
    summary:
      'ALU（計算する手）・MUX（道を選ぶ目）・レジスタ（覚える頭）・クロック（鼓動）・プログラムカウンタ（手順を読む指）をひとつに束ねた、コンピュータの頭脳そのものです！',
    analogy: 'たった1粒の砂と1個のNANDから組み上げた、命令を読んで自律的に考え動く「機械の頭脳」。',
    related: ['alu', 'register', 'program_counter', 'neumann'],
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
 * Alias -> termId mapping table.
 * Sorted longest-first automatically so compound terms (e.g. 'MOSFETトランジスタ',
 * 'P型シリコン', 'NANDゲート', '64ビット') match cleanly before shorter substrings.
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
  ['ADD_4B', 'ripple_adder'],
  ['4ビット・マルチプレクサ', 'mux'],
  ['マルチプレクサ（MUX）', 'mux'],
  ['マルチプレクサ', 'mux'],
  ['MUX_4B', 'mux'],
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
  ['デコーダ', 'decoder'],
  ['フィードバック', 'feedback'],
  ['SRラッチ', 'sr_latch'],
  ['Dラッチ（1ビット・メモリセル）', 'd_latch'],
  ['Dラッチ', 'd_latch'],
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
 * - Matches longest alias first (no overlapping or nested highlights).
 * - Prevents partial ASCII matches (e.g. won't highlight 'EMP' inside 'TEMP' or 'ALU' inside 'VALUE').
 * - Highlights only the first occurrence of each glossary entry per speech bubble
 *   to keep dialogue crisp and readable!
 *
 * @param {string} text
 * @returns {Array<{ type: 'text'|'term', text: string, termId?: string }>}
 */
export function tokenizeGlossaryText(text) {
  const str = String(text ?? '');
  if (!str) return [];

  const tokens = [];
  const seenTermIds = new Set();
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
