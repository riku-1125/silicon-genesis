/**
 * SILICON GENESIS — 17-Stage Bottom-Up Campaign (5 Acts)
 * Every stage builds strictly from NAND + custom chips the player has already forged.
 */

function bits4(n) {
  const v = ((n % 16) + 16) % 16;
  return [v & 1, (v >> 1) & 1, (v >> 2) & 1, (v >> 3) & 1];
}

function add4Case(a, b, cin) {
  const sum = a + b + cin;
  return {
    label: `${a} + ${b}${cin ? ' + 1' : ''} = ${sum}`,
    input: [...bits4(a), ...bits4(b), cin],
    expected: [...bits4(sum & 15), sum >= 16 ? 1 : 0],
  };
}

function mux4Case(a, b, sel) {
  const res = sel ? b : a;
  return {
    label: `A=${a}, B=${b}, SEL=${sel} → ${res}`,
    input: [...bits4(a), ...bits4(b), sel],
    expected: bits4(res),
  };
}

function alu4Case(a, b, sub) {
  if (sub === 0) {
    const sum = a + b;
    return {
      label: `加算 ${a} + ${b} = ${sum & 15}${sum >= 16 ? ' (桁溢れ)' : ''}`,
      input: [...bits4(a), ...bits4(b), 0],
      expected: [...bits4(sum & 15), sum >= 16 ? 1 : 0],
    };
  }
  const diff = a + ((~b) & 15) + 1;
  return {
    label: `減算 ${a} − ${b} = ${a >= b ? a - b : `${diff & 15} (負数)`}`,
    input: [...bits4(a), ...bits4(b), 1],
    expected: [...bits4(diff & 15), diff >= 16 ? 1 : 0],
  };
}

// Helper for clocked 2-phase rising-edge steps (setup CLK=0 -> rising edge CLK=1)
function reg4Cycle(label, dVal, load, expectedQ) {
  const dBits = bits4(dVal);
  return {
    label,
    displayInput: [...dBits, load, 1],
    phases: [
      [...dBits, load, 0], // Setup while CLK=0
      [...dBits, load, 1], // Rising edge CLK=0->1
    ],
    expected: bits4(expectedQ),
  };
}

function pc4Cycle(label, jVal, jmp, expectedQ) {
  const jBits = bits4(jVal);
  return {
    label,
    displayInput: [...jBits, jmp, 1],
    phases: [
      [...jBits, jmp, 0],
      [...jBits, jmp, 1],
    ],
    expected: bits4(expectedQ),
  };
}

function ark4Cycle(label, immVal, op, setFlag, we, expectedAcc) {
  const immBits = bits4(immVal);
  return {
    label,
    displayInput: [...immBits, op, setFlag, we, 1],
    phases: [
      [...immBits, op, setFlag, we, 0],
      [...immBits, op, setFlag, we, 1],
    ],
    expected: bits4(expectedAcc),
  };
}

function condPcCycle(label, vVal, jVal, br, expectedPc) {
  const vBits = bits4(vVal);
  const jBits = bits4(jVal);
  return {
    label,
    displayInput: [...vBits, ...jBits, br, 1],
    phases: [
      [...vBits, ...jBits, br, 0],
      [...vBits, ...jBits, br, 1],
    ],
    expected: bits4(expectedPc),
  };
}

function ark4SysCycle(label, i0, i1, immVal, expectedAcc, expectedPc) {
  const immBits = bits4(immVal);
  return {
    label,
    displayInput: [i0, i1, ...immBits, 1],
    phases: [
      [i0, i1, ...immBits, 0],
      [i0, i1, ...immBits, 1],
    ],
    expected: [...bits4(expectedAcc), ...bits4(expectedPc)],
  };
}

export const ACTS = [
  { id: 0, roman: 'ACT 0', title: '物理から論理へ', subtitle: 'シリコン・抵抗・NANDの誕生', color: '#ffbe6b', chapter: 1 },
  { id: 1, roman: 'ACT I', title: 'スイッチと約束の言葉', subtitle: '論理ゲートの誕生', color: '#e69b42', chapter: 1 },
  { id: 2, roman: 'ACT II', title: '電気で「数える」奇跡', subtitle: '2進数と加算器', color: '#45c79e', chapter: 1 },
  { id: 3, roman: 'ACT III', title: '道を選び、切り替える', subtitle: 'バスとルーティング', color: '#4ea8de', chapter: 1 },
  { id: 4, roman: 'ACT IV', title: '電気に「記憶」を宿す', subtitle: 'フィードバックとクロック', color: '#b57edc', chapter: 1 },
  { id: 5, roman: 'ACT V', title: '文明の再起動', subtitle: 'ALU・PC・自作CPUコア', color: '#f26b5e', chapter: 1 },
  { id: 6, roman: 'ACT VI', title: '第二章：言葉を理解する機械', subtitle: '条件分岐・機械語・ノイマン型統合', color: '#56ccf2', chapter: 2 },
  { id: 7, roman: 'ACT VII', title: '第二章：青空へのプログラム', subtitle: 'アセンブリ言語と地上大ハッチ開門', color: '#6fcf97', chapter: 2 },
];

export const STAGES = [
  // =========================================================================
  // ACT 0 — FROM SILICON PHYSICS TO NAND GATE
  // =========================================================================
  {
    id: 'stage_00a',
    number: -2,
    act: 0,
    code: '00-A',
    kind: 'physics_transistor',
    title: '砂から「じゃぐち」を創れ',
    revealedTitle: 'MOSFETトランジスタ（電気スイッチ）',
    scene: 'machinery',
    storyBgm: 'crisis',
    widget: 'silicon_lab',
    mode: 'physics',
    incidentBrief: {
      where: 'B4 地熱発電区画・工作台',
      trouble: '地熱発電炉の冷却弁を直すための「電子スイッチ」がEMPで全滅している',
      condition: 'N型シリコン×2・ガラスの壁・金属ひねりを組み、ひねり=1 のときだけ電気を通せ！',
      shortRule: '4つの枠に材料を入れ、ひねり=1 で電子の橋が架かる「じゃぐち」を創れ！',
      stakes: '非常冷却弁を組むための第1部品（トランジスタ）を手に入れる',
    },
    inputs: ['ひねり'],
    outputs: ['でぐち'],
    pinHelp: {
      inputs: ['いり（左）：電気の入口', 'ひねり（上）：ここに1をかけると下に電子の橋が架かる！'],
      outputs: ['でぐち（右）：橋が架かったときだけ電気が流れ出る'],
    },
    physicsParts: [
      {
        id: 'N_SILICON',
        name: 'N型シリコン',
        meta: '電子たっぷり',
        color: '#2c8a7b',
        accent: '#52e3b6',
        rule: '左右のポケットに配置！ 電子がたくさん詰まったシリコン（左=いり、右=でぐち）',
        descJa: '砂（ケイ素）に微量のリンを混ぜた半導体。電気が流れる粒（電子）がたっぷり入っています。左右のポケット（いり・でぐち）に埋め込みます。',
      },
      {
        id: 'INSULATOR',
        name: 'ガラスの壁',
        meta: '電気を通さない',
        color: '#4f7ea8',
        accent: '#9bd2ff',
        rule: '中央の土台の上に配置！ 金属とシリコンがショートしないよう仕切る薄い壁',
        descJa: '二酸化ケイ素（ガラス）の超薄い膜。電気は通さないけれど、上からの「引き寄せる力（静電気）」だけは通します！',
      },
      {
        id: 'GATE_METAL',
        name: '金属ひねり',
        meta: '電子を引き寄せる',
        color: '#c97828',
        accent: '#ffd166',
        rule: '一番上のスロットに配置！ ここに1を入れると電子を吸い寄せて橋を架ける！',
        descJa: '制御スイッチ（ひねり）につながる金属板。1（プラス電気）をかけると、下の土台に電子の橋を架けて左右をつなぎます。',
      },
    ],
    plainGoal: '土台（P型シリコン）の上に【N型シリコン×2】【ガラスの壁】【金属ひねり】を組み立てて、電気で開閉する「じゃぐち（トランジスタ）」を完成させよう！',
    beginnerNote:
      'まずは4つの空き枠に材料をハメてみよう！ 組み立てが終わったら、盤面上の「ひねり」スイッチを 0 ↔ 1 で切り替えて、青い電子の橋が架かる瞬間を観察してから「▶ テスト実行」を押そう！',
    introDialogue: [
      {
        speaker: 'mina',
        text: '見て、ここがさっき話したB4の地熱発電炉！ 火山岩盤の蒸気でタービンを回して、シェルター中の照明と空気清浄機の電気を作ってるの。',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: 'エーテル9が止まったせいで、今は冷却水を自動調整する制御弁が焼けて外れちゃってる……！ 予備電力まで落ちたら、チップ焼付け機も空気清浄機も全部止まっちゃう！',
      },
      {
        speaker: 'kagari',
        text: '落ち着けミナ！ 冷却弁を直すにはまず、電気信号だけでパチパチ開閉できる「電気のじゃぐち」が必要だ。──だが42年前のEMPと長い年月で、予備の電子スイッチ部品はとうに尽きてしまった。',
      },
      {
        speaker: 'mina',
        text: 'えっ！？ じゃあどうするの！？ バネや歯車で手作業のスイッチを作るの？',
      },
      {
        speaker: 'kagari',
        text: 'いや、もっと凄いものがある。ここにあるのは「砂」から精製したシリコン板だ。動く部品を1つも使わず、静電気の力だけで電子の橋を架けたり消したりできる魔法の「じゃぐち」を、材料から創るぞ！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '博士の物理メモ 1 / 3',
          title: '🧪 N型シリコン（電子の池）',
          diagram: '[ N型 ] ━━ (通れないP型の壁) ━━ [ N型 ]',
          rule: '左右のポケットに「N型シリコン」を埋め込む。真ん中のP型が壁になり、普段は電気が渡れない！',
          accent: '#52e3b6',
        },
        text: 'まず土台は「P型シリコン」という電子が通りにくい壁だ。その左右のポケットに、電子がたっぷり詰まった【N型シリコン】を埋め込む。このままでは真ん中に阻まれて電気は渡れない。',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '博士の物理メモ 2 / 3（動く図解・タップで切替）',
          title: '🧊 ガラスの壁 ＆ 🔶 金属ひねり',
          anim: 'mosfet_bridge',
          rule: '真ん中に「ガラスの壁」、その上に「金属ひねり」を乗せる。静電気で電子の橋が架かるぞ！',
          accent: '#ffd166',
        },
        text: 'そこで真ん中に薄い【ガラスの壁】を敷き、一番上に【金属ひねり】を乗せるんだ！ 金属に「1」をかけると、ガラス越しに電子が吸い寄せられて“光の橋”が架かり、左から右へ電気がドッと流れ出す！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: '博士の物理メモ 3 / 3（組み立て手順）',
          title: '材料をタップして4つの枠にハメよう',
          diagram: '下の材料をタップ → 光る空き枠をタップ（2回タップで自動配置もOK）',
          rule: '組み立てたら「ひねり」ボタンを触って電子の橋を確認 → 右下の「▶テスト実行」を押せ！',
          accent: '#ffbe6b',
        },
        text: '『まずは4つの枠を埋めて「じゃぐち」を完成させろ。完成したら実際にひねりスイッチを押して、電子が橋を渡る瞬間を目で確かめてみろ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'うわっ……！！ バネも歯車もないのに、上の「ひねり」を 1 にした瞬間だけ、ガラスの下に青い電子の橋がスーッと伸びて電気が流れた！！ 魔法みたい！！',
      },
      {
        speaker: 'kagari',
        text: 'それこそが旧文明の最小細胞──【MOSFETトランジスタ】だ！ 1959年にベル研究所で発明され、かつての地上──戦前のスマホ1台の中には、この小さなスイッチが数百億個も詰め込まれていたんだよ！',
      },
      {
        speaker: 'kagari',
        text: 'よし、【じゃぐち（トランジスタ）】の製法はマスターした！ 次はもう1つの必須部品──「電気を安全に地面へ逃がして 1 を 0 に落とす」ための【はいすい】を創りに行こう！',
      },
    ],
    hints: [
      '【考え方】左右のくぼみ2箇所に「N型シリコン」、中央の薄い段に「ガラスの壁」、一番上に「金属ひねり」を配置します！',
      '【操作のコツ】下のパレットにある部品を1回タップすると置ける枠が光ります。もう1回タップすれば自動で正しい枠へ置けます！',
      '【仕上げ】4箇所すべて置けたら、盤面上の「ひねり」スイッチを 0 と 1 で試して電子の橋を確認し、右下の「▶ テスト実行」を押そう！',
    ],
    tests: [
      { label: 'ひねり=0 → 橋が消えて遮断 (でぐち=0)', input: [0], expected: [0] },
      { label: 'ひねり=1 → 電子の橋が開通！ (でぐち=1)', input: [1], expected: [1] },
    ],
    rewardChip: {
      id: 'SW_FORGED',
      name: 'じゃぐち',
      shortName: 'SW',
      titleJa: 'じゃぐち（MOSFETトランジスタ）',
      descJa: 'N型/P型シリコンとゲート電極から創った、電子の橋で開閉する物理スイッチ。',
      color: '#a85f24',
      accent: '#ffbe6b',
      inputs: ['いり', 'ひねり'],
      outputs: ['でぐち'],
      isLabReward: true,
    },
    codexUnlock: ['mosfet_physics'],
  },

  {
    id: 'stage_00b',
    number: -1,
    act: 0,
    code: '00-B',
    kind: 'physics_pullup',
    title: '電気の抜け道「はいすい」を創れ',
    revealedTitle: 'プルアップ抵抗回路（PULL）',
    scene: 'machinery',
    storyBgm: 'crisis',
    widget: 'pullup_lab',
    mode: 'physics',
    incidentBrief: {
      where: 'B4 地熱発電区画・実験台',
      trouble: '冷却弁は「ふだん 1（通水）、条件が揃ったときだけ 0（停止）」にしたいが、電池と地面を直結するとショートして燃えてしまう！',
      condition: '上に「ていこう」、下に「ぬけスイッチ」を入れ、ぬけ=0→1(5V)、ぬけ=1→0(0V) を安全に作れ！',
      shortRule: 'ショートを防ぎつつ「ぬけ=0→1(5V) / ぬけ=1→0(0V)」になる「はいすい」を創れ！',
      stakes: '安全に信号を反転させる第2部品（プルアップ抵抗）を完成させる',
    },
    inputs: ['ぬけ'],
    outputs: ['でぐち'],
    pinHelp: {
      inputs: ['ぬけ（下）：1にすると地面（アース）への排水口が開く！'],
      outputs: ['でぐち（右）：ふだんは1（5V）、地面へ抜けた瞬間だけ0（0V）'],
    },
    physicsParts: [
      {
        id: 'WIRE',
        name: 'ただの導線',
        meta: '太いパイプ',
        color: '#5c6b7a',
        accent: '#b8c8d8',
        rule: '電気をそのまま通す太いパイプ。でも上にこれを入れると地面に直結してショート！',
        descJa: '電気をほとんど邪魔せず通す太い銅線。上にもこれを入れて底を開くと、電池と地面が直結して火花（ショート）が起きます！',
      },
      {
        id: 'RESISTOR',
        name: 'ていこう',
        meta: '細いパイプ',
        color: '#2e6a82',
        accent: '#7cd4f5',
        rule: '上側スロットに配置！ 電気の流れを細く絞ってショートを防ぎつつ、普段は1を保つ！',
        descJa: '電気を通しにくい細い道（抵抗器）。普段はランプを5V(1)に光らせつつ、下が開いたときは安全に0V(0)へ落としてくれます。',
      },
      {
        id: 'DRAIN_VALVE',
        name: 'ぬけスイッチ',
        meta: '地面への出口',
        color: '#a85f24',
        accent: '#ffbe6b',
        rule: '下側スロットに配置！ ぬけ=1 で地面（アース 0V）へ電気を逃がす出口！',
        descJa: '「ぬけ」の信号が1のときだけ開き、溜まった電気を地面（アース 0V）へ一気に流し落とす排水スイッチ。',
      },
    ],
    plainGoal: '上側と下側の2つの枠に正しい部品を入れて、ショートさせずに「ふだんは 1、ぬけ=1 で地面へ抜けて 0」になる【はいすい】回路を完成させよう！',
    beginnerNote:
      'あえて上側に「ただの導線」を入れて試してみるのも大歓迎！ なぜ「ていこう（細いパイプ）」が必要なのかが火花で一発で分かるよ！',
    introDialogue: [
      {
        speaker: 'mina',
        text: '地熱発電炉の温度計、もう黄色ゾーンに入ってる……急がなきゃ！ さっき創った「じゃぐち（トランジスタ）」は、ひねりが 1 のときに電気が流れる仕組みだったよね？',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: 'でも冷却弁って、万が一センサーが故障しても水が止まらないように【普段はずっと 1（通水）で、安全条件が揃ったときだけ 0（停止）に落とす】仕組みじゃないとダメなの！ どうやったら逆にできるの？',
      },
      {
        speaker: 'kagari',
        text: 'いいところに気づいたね！ 電気の世界で「普段は 1、スイッチが開いたら安全に 0 へ落とす」には、ちょっとした物理のトリックが必要なんだ。',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '実験：もし導線だけで繋ぐと…？',
          title: '⚡ 電池と地面を直結するとショート！',
          diagram: '電池(+5V) ━━━ 太い線 ━━━ 地面(0V) ⇒ 💥 火花で焼損！',
          rule: '抵抗なしで電池と地面をつなぐと電気が暴走してしまう！ だから上に「細いパイプ」が必要。',
          accent: '#ff6b6b',
        },
        text: 'もし電池(1)と地面(0)を「ただの導線」で直結して底を開けると、電気が一気に暴走して火花が散ってしまう（ショート）。',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '解決の鍵：細い道のワザ（動く図解・タップで切替）',
          title: '💧 上を「細い道（ていこう）」にする！',
          anim: 'pullup_drain',
          rule: '下が閉じてれば水圧が溜まって 1(5V)！ 下が開けばショートせず地面へ抜けて安全に 0(0V)！',
          accent: '#7cd4f5',
        },
        text: 'そこで上側を電気の通りにくい細い道【ていこう】、下側を広い排水口【ぬけスイッチ】にするんだ！ 下が閉じていれば水圧が溜まって「1」、下が開けば一気に地面へ抜けて安全に「0」になるよ！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: '物理ラボ実験',
          title: '上と下の枠に部品を入れて試せ！',
          diagram: 'あえて上に「ただの導線」を入れてショートを観察してもOKだぞ',
          rule: '正しい組み合わせで ぬけ=0(5V→1) と ぬけ=1(0V→0) を確認したら「▶テスト実行」を押せ！',
          accent: '#ffb84d',
        },
        text: '『さあ実験台で確かめてみろ。上側と下側の2枠に部品をはめて、下の「ぬけ」スイッチをパチパチ切り替えて電圧計の変化を観察しろ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'おお〜！！ 上に「ていこう」を入れただけでショートがピタッと止まって、ぬけ=0 で 5V(1)、ぬけ=1 でスッと 0V(0) に落ちた！ これなら仕組みがスッキリわかるよ！',
      },
      {
        speaker: 'kagari',
        text: 'お見事！！ これが電子回路の超基本テクニック【プルアップ抵抗（PULL）】だ！ 普段は抵抗で上（1）へ引っ張り上げておき、下のスイッチが開いたときだけ安全に 0 へ落とす魔法の仕組みだよ。',
      },
      {
        speaker: 'kagari',
        text: 'これで【じゃぐち（トランジスタ）】も【はいすい（プルアップ抵抗）】も、仕組みごと全部君のものになった！ さあ次はいよいよ、この2つを組み合わせて非常発電炉を救う【NAND】を創り出そう！',
      },
    ],
    hints: [
      '【考え方】上側（電池と出力ランプの間）に「ていこう」、下側（出力ランプと地面アースの間）に「ぬけスイッチ」を配置します！',
      '【なぜ？】上側が「ただの導線」だと、ぬけ=1 にした瞬間に電池と地面が直結してショートエラーになります。「ていこう」が安全装置かつ反転の要です！',
      '【仕上げ】上に「ていこう」、下に「ぬけスイッチ」を置いたら、「▶ テスト実行」を押してクリアしよう！',
    ],
    tests: [
      { label: 'ぬけ=0（底閉じ）→ 電圧5V溜まる (でぐち=1)', input: [0], expected: [1] },
      { label: 'ぬけ=1（底開き）→ 安全に地面へ抜ける (でぐち=0)', input: [1], expected: [0] },
    ],
    rewardChip: {
      id: 'PULL_FORGED',
      name: 'はいすい',
      shortName: 'PULL',
      titleJa: 'はいすい（プルアップ抵抗回路）',
      descJa: '抵抗器と接地スイッチで、ショートを防ぎつつ普段1・抜けると0を実現する回路。',
      color: '#2e6a82',
      accent: '#7cd4f5',
      inputs: ['ぬけ'],
      outputs: ['でぐち'],
      isLabReward: true,
    },
    codexUnlock: ['pullup_resistor'],
  },

  {
    id: 'stage_00',
    number: 0,
    act: 0,
    code: '00-C',
    title: '非常冷却弁を繋げ──NANDの誕生',
    revealedTitle: 'NANDゲート（物理トランジスタ原板）',
    scene: 'machinery',
    storyBgm: 'crisis',
    widget: 'nand_forge',
    mode: 'combinational',
    incidentBrief: {
      where: 'B4 地熱発電炉・冷却制御弁',
      trouble: '冷却弁の制御回路が焼損！ 炉が冷え切る前に水が止まると発電炉が暴走し、全電力が失われる',
      condition: 'A(安全停止) と B(冷却完了) が「両方=1」のときだけ 0（停止）／それ以外は全部 1（通水）',
      shortRule: 'AとBが両方1のときだけ 0（停止）、他はすべて 1（通水）にする安全弁を組め！',
      stakes: '発電炉を救い、同時にB4焼付け機のマスター原板【NAND】を完成させる',
    },
    inputs: ['A', 'B'],
    outputs: ['OUT'],
    pinHelp: {
      inputs: ['A: 炉心・安全停止スイッチ（1=停止済）', 'B: 冷却完了センサー（1=十分冷えた）'],
      outputs: ['OUT: 冷却水バルブ（1=通水し続ける / 両方1のときだけ 0=閉じる）'],
    },
    allowedPrimitives: ['CONST_1', 'SW', 'PULL'],
    allowedCustomChips: [],
    plainGoal: '【でんち】【じゃぐち×2】【はいすい】を繋いで、AとBが両方1のときだけ 0（水停止）、それ以外は 1（通水）になる安全弁を組もう！',
    beginnerNote:
      '【水のホースでイメージ！】でんち(1) → じゃぐち①(ひねり=A) → じゃぐち②(ひねり=B) とまっすぐ一列につないで「はいすい」の『ぬけ』へ繋ぐと、AとBの両方の蛇口が開いた瞬間だけ電気が地面へ抜けて OUT=0 になります！',
    introDialogue: [
      {
        speaker: 'kagari',
        text: 'よし！ 00-Aで砂から創った【じゃぐち（トランジスタ）】と、00-Bでショートを防いで組んだ【はいすい（プルアップ抵抗）】──ついに必要な物理部品がぜんぶ手元にそろったぞ！',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: '地熱発電炉の予備冷却タンク、あと数分で限界だよ……！ 冷却弁の条件をおさらいするね：【普段はずっと 1（流しっぱなし）】。止めて（0）いいのは──「A：炉心の安全停止」と「B：冷却完了センサー」の【両方が同時に 1 になったときだけ】！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'おさらい：3つの物理部品',
          title: '🔋でんち ／ 🚰じゃぐち ／ 🕳はいすい',
          diagram: '🔋でんち(常に1) ／ 🚰じゃぐち(ひねり=1で通す) ／ 🕳はいすい(ぬけ=1で0へ落とす)',
          rule: 'さっき創った2部品＋電源【でんち】で「両方1のときだけ0」の原板【NAND】を組もう！',
          accent: '#ffd166',
        },
        text: 'まさに「両方1のときだけ 0、それ以外は全部 1」──B4焼付け機のマスター原板【NAND】とまったく同じ条件だ！ ここからは本格的な「回路配線ボード」の出番だよ。さっき創った部品に電源の【でんち】を足して繋ごう！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '全体のつなぎ方イメージ（動く図解・タップで切替）',
          title: '2個の「じゃぐち」をまっすぐ一列に！',
          anim: 'nand_series',
          rule: 'AとBの“両方”が開いた瞬間だけ「はいすい」に電気が届いて 0 になる！',
          accent: '#52e3b6',
        },
        text: 'ひらめいたかい？ 【でんち】から2個の【じゃぐち】をまっすぐ一列につないで【はいすい】の「ぬけ」へ流せば──AとBの両方の蛇口が開いたときだけ電気が地面へ抜けて 0、それ以外は全部 1 になる！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: '配線ボードの操作ガイド',
          title: 'タップだけで回路が組める',
          diagram: '部品を2回タップで自動配置 ／ 丸いピン同士をタップ（またはドラッグ）で配線',
          rule: '迷ったら下の「💡ヒント」や部品の「i」ボタンをいつでも見ていいぞ！',
          accent: '#ffb84d',
        },
        text: '『ここから本格的な配線モードだ。下の部品をポンポンと2回押すと盤面に置ける。あとは丸いピン同士をタップして線を繋げ！ 組み終わったら右下の「▶テスト実行」を押せ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '……冷却圧が安定、非常発電炉が持ちこたえた！！ AとBの両方が開いた瞬間だけピタッと弁が閉じたよ！ すごい、B4のチップ焼付け機にも本電力が来た！！',
      },
      {
        speaker: 'kagari',
        text: 'やったぞ、見習い君！！ 砂から創ったトランジスタ2個とプルアップ抵抗1個が、いま目の前で「考えて判断する」最初の論理素子──【NANDゲート】として目覚めた瞬間だ！',
      },
      {
        speaker: 'kagari',
        text: '君が組み上げたこの回路を、B4焼付け機のマスター原板にセットしたよ！ もう1個ずつ物理部品から手組みする必要はない──ここからは量産した【NAND】チップだけを積み上げて、人類の頭脳をゼロから復活させるぞ！',
      },
    ],
    hints: [
      '【考え方】でんち(1) の電気を、2つの「じゃぐち」をまっすぐ一列に通して「はいすい」の『ぬけ』へ届けます！ 片方でも 0 なら途中で止まり、はいすいは OUT=1（通水）を守ります。',
      '【構成】でんち ×1、じゃぐち ×2、はいすい ×1（合計4個）を左から右へ並べます。',
      '【手順】1) でんち(1) → じゃぐち①の「いり」、左の A → じゃぐち①の「ひねり」。 2) じゃぐち①の「でぐち」→ じゃぐち②の「いり」、左の B → じゃぐち②の「ひねり」。 3) じゃぐち②の「でぐち」→ はいすいの「ぬけ」、はいすいの「でぐち」→ 右の OUT！',
    ],
    tests: [
      { label: '未停止・未冷却 (0, 0) → 冷却水を流せ！(OUT=1)', input: [0, 0], expected: [1] },
      { label: '未停止・冷却済 (0, 1) → 炉稼働中！流せ！(OUT=1)', input: [0, 1], expected: [1] },
      { label: '停止済・未冷却 (1, 0) → まだ熱い！流せ！(OUT=1)', input: [1, 0], expected: [1] },
      { label: '停止済・冷却済 (1, 1) → 安全確認！弁を閉じる(OUT=0)', input: [1, 1], expected: [0] },
    ],
    rewardChip: {
      id: 'NAND',
      name: 'NAND',
      shortName: 'NAND',
      titleJa: 'NANDゲート（物理原板）',
      descJa: '非常発電炉を救い、B4焼付け機の原板となった2スイッチ＋プルアップ抵抗のNAND素子。',
      color: '#c97828',
      accent: '#ffb347',
    },
    codexUnlock: ['transistor_nand', 'nand_origin'],
  },

  // =========================================================================
  // ACT I — FOUNDATIONS OF LOGIC
  // =========================================================================
  {
    id: 'stage_01',
    number: 1,
    act: 1,
    code: '01',
    title: '逆転スイッチを直せ',
    revealedTitle: 'NOTゲート（インバーター）',
    scene: 'machinery',
    storyBgm: 'crisis',
    widget: 'air_scrubber',
    mode: 'combinational',
    incidentBrief: {
      where: '地下3区 居住デッキ・空気清浄プラント',
      trouble: '応急配線が逆さま！ 空気正常(1)のときに警報が鳴り、酸欠危険(0)のときに黙ってしまう',
      condition: 'IN=0（危険）→ OUT=1（警報ON） ／ IN=1（正常）→ OUT=0（静穏）',
      shortRule: '0を1に、1を0へひっくり返す「逆転スイッチ」を NAND 1個で組め！',
      stakes: '地下3区の家族と子どもたちの空気監視を正常化する',
    },
    inputs: ['IN'],
    outputs: ['OUT'],
    pinHelp: {
      inputs: ['IN: 酸素センサー（1=正常 / 0=危険）'],
      outputs: ['OUT: 警報ブザー（0=静か / 1=危険を知らせる）'],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: [],
    plainGoal: '入力 IN が 1 のときは 0、0 のときは 1 を出す「逆転スイッチ」を作ろう。',
    beginnerNote:
      'ここから量産できるようになった【NAND】チップ1個だけで組めます！ NANDは「AとBの両方が1のときだけ 0、それ以外は全部 1」を返します。',
    introDialogue: [
      {
        speaker: 'mina',
        text: '発電炉が安定してホッとしたのも束の間……次は地下3区の居住デッキだよ。あそこは家族や子どもたちが2段ベッドで眠る部屋で、窓が1つもないから、石灰フィルターで二酸化炭素を吸い取る【空気清浄機】が命綱なの。',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: 'さっき応急バイパスを繋いだんだけど、信号の向きが逆になっちゃって……！ 空気が正常（1）なときに警報サイレンが鳴り響いて子どもたちが怯えてるし、本当に酸欠（0）になっても警報が鳴らないの！',
      },
      {
        speaker: 'kagari',
        text: 'なるほど、「1が来たら0、0が来たら1」へひっくり返す回路が間に1枚ほしいわけだね。──いよいよさっき君が原板を創った【NAND】チップの初仕事だ！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '目標の動き（動く図解・タップで切替）',
          title: '🔄 0 を 1 に、1 を 0 へひっくり返す！',
          anim: 'goal_not',
          rule: 'NAND は「両方0なら1」「両方1なら0」を返す。1本の入力線をどう繋げば逆転できるかな？',
          accent: '#52e3b6',
        },
        text: '覚えてるかい？ NANDは「入口AとB、両方が1のときだけ0」「両方が0のときは1」を返す。……手元にある入力 IN は1本だけだが、1つのピンから2本へ線を分岐させることもできるよ！',
      },
      {
        speaker: 'hako',
        text: '『下のパレットから NAND を置いて試してみろ。迷ったら下の「💡ヒント」を段階的に開けるぞ。完成した回路は今後ずっと使えるカスタムチップとして登録される！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '……止まった！ 警報が正常に戻って、空気清浄ファンが回り始めたよ！ すごい、本当に直っちゃった！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：NOTゲート',
          title: '🔀 1本を A と B 両方へ分岐して反転！',
          anim: 'not_branch',
          rule: 'あなたが発見した内部構造を【⚡モジュール図鑑】に登録しました！',
          accent: '#52e3b6',
        },
        text: '見事だ！ たった1個のあまのじゃく部品の2つの入口に、同じ線を突っ込んだんだね。今きみが作ったこの「逆転スイッチ」、計算機の世界では【NOTゲート（インバーター）】と呼ぶんだ。',
      },
      {
        speaker: 'kagari',
        text: 'しかも、作った回路はそのまま小さなICチップに焼き付けて保存したよ。次からは自分の作った「NOTチップ」を部品として使える。さあ、ゼロから文明を組み上げよう！',
      },
    ],
    hints: [
      '【考え方】NANDは「両方1なら0」「両方0なら1」を返します。もしAとBに“まったく同じ値”を入れたらどうなるでしょう？',
      '【構成】使う部品は NAND たった1個だけです！ 左の IN 端子から、2本の線を分岐してつなげられます。',
      '【手順】1) NANDを1個置く → 2) IN を NAND の A につなぐ → 3) もういちど IN を NAND の B につなぐ → 4) NAND の OUT を右の OUT につなぐ！',
    ],
    tests: [
      { label: 'センサー危険 (0) → 警報ON (1)', input: [0], expected: [1] },
      { label: 'センサー正常 (1) → 警報OFF (0)', input: [1], expected: [0] },
    ],
    rewardChip: {
      id: 'NOT',
      name: 'NOT',
      shortName: 'NOT',
      titleJa: 'NOTゲート（反転）',
      descJa: '0を1に、1を0にひっくり返す自作チップ。',
      color: '#2c8a7b',
      accent: '#52e3b6',
    },
    codexUnlock: ['nand_origin', 'not_gate'],
  },

  {
    id: 'stage_02',
    number: 2,
    act: 1,
    code: '02',
    title: '二重ロックの隔壁',
    revealedTitle: 'ANDゲート（論理積）',
    scene: 'shelter_hub',
    storyBgm: 'story',
    widget: 'bulkhead',
    mode: 'combinational',
    incidentBrief: {
      where: '地下貯水区画・汚染防止エアロック隔壁',
      trouble: '隔壁ロックが壊れて開けられない！ だが片方の条件だけで開くと隣の崩落坑道から汚染空気が逆流する',
      condition: 'A(管理官の鍵) と B(気圧安全センサー) の「両方=1」のときだけ OUT=1（開錠）',
      shortRule: 'AとBの両方が 1 のときだけ 1 を出す「同時確認ロック」を組め！',
      stakes: '汚染を防ぎつつ118人分の飲料水タンクへ安全に入る',
    },
    inputs: ['A', 'B'],
    outputs: ['OUT'],
    pinHelp: {
      inputs: ['A: 管理官の鍵（1=解除）', 'B: 気圧安全センサー（1=安全）'],
      outputs: ['OUT: 隔壁ロック解除（両方1のときだけ 1）'],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT'],
    plainGoal: 'AとB、両方が 1 のときだけ 1 になる「同時確認スイッチ」を作ろう。',
    beginnerNote:
      'さっき自分で作った NOT チップがパレットに追加されました！ NANDとNOTを組み合わせると……？',
    introDialogue: [
      {
        speaker: 'mina',
        text: '3区の空気清浄機が静かになって、子どもたちも安心したみたい！ ……次は地下の【貯水タンク区画】だよ。岩盤を400メートルかけて濾過された、アーク7唯一の飲み水がある部屋なの。',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: 'ただ、貯水室の隣は昔の崩落坑道につながっていて、気圧が下がると汚染粉じんが流れ込む危険があるの。だから重い鉄の隔壁は【「A：私の鍵」と「B：気圧安全センサー」の両方が同時に 1 のときだけ開く】二重ロックにしないと絶対に開けられないんだ！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '目標の動き（動く図解・タップで切替）',
          title: '🔐 A と B の「両方が 1」のときだけ開錠(1)！',
          anim: 'goal_and',
          rule: 'NAND（「両方1のときだけ0」）と、さっき自作した部品をどう組み合わせれば「両方1のときだけ1」になるだろう？',
          accent: '#52e3b6',
        },
        text: 'ふむ、今度は「両方1のときだけ 1」だね！ ちょっと前の NAND と比べてごらん。NAND は「両方1のときだけ 0、それ以外は 1」──ほら、ほしい答えとちょうど真逆じゃないかい？',
      },
      {
        speaker: 'hako',
        text: '『さっき自分で作って登録した【NOT】チップがもうパレットに入っているぞ！ どう繋げば真逆を素直にできるか考えてみろ』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'ガチャン……よし、二重ロックが完璧に噛み合った！ これで安心して貯水区画へ入れる！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：ANDゲート',
          title: '🔄 NAND の出力を NOT で反転！',
          anim: 'and_invert',
          rule: 'あなたが発見した内部構造を【⚡モジュール図鑑】に登録しました！',
          accent: '#52e3b6',
        },
        text: 'おめでとう！ 「AかつB」を判定するこの回路が【ANDゲート（論理積）】だ。1937年、21歳の天才クロード・シャノンが「電気スイッチで論理が計算できる」と世界に示したときの基本ピースだよ。',
      },
    ],
    hints: [
      '【考え方】NANDの出力は「1, 1, 1, 0」。今ほしい出力は「0, 0, 0, 1」。つまりNANDの出力をそのまま反転させればOK！',
      '【構成】NAND を1個、さっき作った NOT を1個、直列につなぎます。',
      '【手順】A と B を NAND につなぎ、NAND の出力を NOT の入力へ、NOT の出力を OUT へつなぐ！',
    ],
    tests: [
      { label: '鍵0・安全0 → 施錠(0)', input: [0, 0], expected: [0] },
      { label: '鍵0・安全1 → 施錠(0)', input: [0, 1], expected: [0] },
      { label: '鍵1・安全0 → 施錠(0)', input: [1, 0], expected: [0] },
      { label: '鍵1・安全1 → 解除(1)', input: [1, 1], expected: [1] },
    ],
    rewardChip: {
      id: 'AND',
      name: 'AND',
      shortName: 'AND',
      titleJa: 'ANDゲート（論理積）',
      descJa: 'AとBが両方とも1のときだけ1を出す自作チップ。',
      color: '#2c8a7b',
      accent: '#52e3b6',
    },
    codexUnlock: ['and_gate'],
  },

  {
    id: 'stage_03',
    number: 3,
    act: 1,
    code: '03',
    title: '南北センサー非常網',
    revealedTitle: 'ORゲート（論理和）',
    scene: 'machinery',
    storyBgm: 'crisis',
    widget: 'alarm_grid',
    mode: 'combinational',
    incidentBrief: {
      where: '中央配電室・北側＆南側ケーブルラック',
      trouble: '42年前の古い銅線被覆が傷み、南北どちらのラックから煙が出ても気づけない無防備状態！',
      condition: '北(A)か南(B)、どちらか片方でも 1（または両方1）なら OUT=1（火災サイレン）',
      shortRule: 'AかB、どちらか片方でも 1 なら 1 を出す「どちらかスイッチ」を組め！',
      stakes: '密閉空間の地下シェルターで最も致命的な火災を早期検知する',
    },
    inputs: ['A', 'B'],
    outputs: ['OUT'],
    pinHelp: {
      inputs: ['A: 北側 煙センサー', 'B: 南側 煙センサー'],
      outputs: ['OUT: 非常サイレン（どちらか片方でも1なら 1）'],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT', 'AND'],
    plainGoal: 'AかB、どちらか片方でも 1（または両方 1）なら 1 を出す回路を作ろう。',
    beginnerNote:
      'ちょっとパズルらしくなってきたぞ！「いつ 0 になるべきか？」を逆から考えてみるとひらめくかも。',
    introDialogue: [
      {
        speaker: 'mina',
        text: '貯水室へ無事に入れたよ、ありがとう！ ……でも今、配電室を見回ってきたら少し焦げ臭い匂いがしたの。2052年から使い続けてる古いケーブル束が、南北2つの棚に分かれて走ってるんだよね。',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: '密閉された地下シェルターで一番怖いのは火事なの！ 煙センサーを北側（A）と南側（B）に付けたから、【どちらか片方でも煙（1）を検知したら──もちろん両方でも──すぐサイレン（1）が鳴る】ように繋ぎたいんだ！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '目標の動き（動く図解・タップで切替）',
          title: '🚨 片方でも 1 なら警報(1) ／ 両方 0 だけ静穏(0)',
          anim: 'goal_or',
          rule: 'ヒント：「いつ 0 になるか？」に注目しよう。両方 0 のときだけ 0 にしたいなら……？',
          accent: '#52e3b6',
        },
        text: 'ふふ、ここは最初の頭脳戦だね！ NANDは「両方が1のときだけ 0」になる。じゃあ今回ほしい回路は「両方が“0”のときだけ 0」にしたい──どうすれば NAND でそれを判定できるかな？',
      },
      {
        speaker: 'hako',
        text: '『真っ向から考えて詰まったら、「入口側をひっくり返す」か「出口側をひっくり返す」かを試してみろ。困ったら下の「💡ヒント」もあるぞ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '北側テストOK、南側テストOK！ これで火災の見落としはなくなるね！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：ORゲート',
          title: '🔄 先に NOT で反転してから NAND へ！',
          anim: 'or_demorgan',
          rule: 'ド・モルガンの法則による内部構造を【⚡モジュール図鑑】に登録しました！',
          accent: '#52e3b6',
        },
        text: 'ブラボー！ 君はいま自力で【ORゲート（論理和）】を作り、同時に19世紀の大数学者ド・モルガンが見つけた「ド・モルガンの法則」を体で発見したんだ！',
      },
      {
        speaker: 'kagari',
        text: 'これで NOT・AND・OR の論理三銃士がそろった。アポロ11号が月へ飛んだコンピュータも、この仕組みの延長線上にあるんだよ！',
      },
    ],
    hints: [
      '【考え方】OUTが0になるのは「A=0 かつ B=0」のときだけ。AとBを先に NOT で反転すると、その瞬間だけ両方「1」になります！',
      '【構成】NOT を2個、NAND を1個使います。',
      '【手順】A → NOT① → NANDのAへ。B → NOT② → NANDのBへ。NANDの出力を OUT へつなごう！',
    ],
    tests: [
      { label: '北0・南0 → 異常なし(0)', input: [0, 0], expected: [0] },
      { label: '北0・南1 → サイレン(1)', input: [0, 1], expected: [1] },
      { label: '北1・南0 → サイレン(1)', input: [1, 0], expected: [1] },
      { label: '北1・南1 → サイレン(1)', input: [1, 1], expected: [1] },
    ],
    rewardChip: {
      id: 'OR',
      name: 'OR',
      shortName: 'OR',
      titleJa: 'ORゲート（論理和）',
      descJa: 'AかBの少なくとも一方が1なら1を出す自作チップ。',
      color: '#2c8a7b',
      accent: '#52e3b6',
    },
    codexUnlock: ['or_demorgan'],
  },

  {
    id: 'stage_04',
    number: 4,
    act: 1,
    code: '04',
    title: '階段のふたつのスイッチ',
    revealedTitle: 'XORゲート（排他的論理和）',
    scene: 'shelter_hub',
    storyBgm: 'story',
    widget: 'corridor_lamp',
    mode: 'combinational',
    incidentBrief: {
      where: '地下3区居住デッキ〜B4作業室 連絡階段',
      trouble: '夜勤の整備員や子どもが通る急な鉄階段が真っ暗！ 上下どちらのスイッチでも点灯／消灯を切り替えたい',
      condition: '上(A)と下(B)のスイッチが「ちがう状態（0と1／1と0）」のときだけ OUT=1（点灯）',
      shortRule: 'AとBが「ちがう値」のときだけ 1、同じ値なら 0 にする回路を組め！',
      stakes: '真っ暗な地下階段の安全を取り戻し、次の「足し算回路」の鍵を手に入れる',
    },
    inputs: ['A', 'B'],
    outputs: ['OUT'],
    pinHelp: {
      inputs: ['A: 地下3区（上）スイッチ', 'B: 地下4階（下）スイッチ'],
      outputs: ['OUT: 階段照明（AとBが違うときだけ 1）'],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT', 'AND', 'OR'],
    plainGoal: 'AとBが「ちがう値（0と1、または1と0）」のときだけ 1 を出す回路を作ろう。',
    beginnerNote:
      'ORだと「両方1」のときも光ってしまう。そこから「両方1」のケースだけ除外するには、どのチップを組み合わせればいい？',
    introDialogue: [
      {
        speaker: 'mina',
        text: '配電室の火災報知機もバッチリ復旧したよ！ ちょっと一息……と言いたいところだけど、居住区とB4作業場をつなぐ急な鉄階段、今は照明が切れて真っ暗なの。さっき工具箱を抱えた整備員さんが足を滑らせかけちゃって……。',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: '上でパチッと点けて、下に降りたら下のスイッチで消せるようにしたいんだ。つまり【上(A)と下(B)のスイッチが「ちがう向き」のときだけ点いて、同じ向きなら消える】照明回路がほしいの！',
      },
      {
        speaker: 'kagari',
        text: 'おっ、きたきた！ これ、一見ただの階段スイッチに見えるだろう？ でも実は、次の章で「電気に足し算をさせる」ための決定的なピースなんだよ！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: '目標の動き（動く図解・タップで切替）',
          title: '💡 A と B が「ちがう値」のときだけ点灯(1)！',
          anim: 'goal_xor',
          rule: 'OR だと「両方1」のときも点いてしまう。「両方1のケースだけ除外する」には、どの自作チップを組み合わせる？',
          accent: '#52e3b6',
        },
        text: '『これまでに自作した OR・AND・NOT と基本の NAND が使える。OR と比べると「両方1のときだけ消したい」わけだな……じっくり考えてみろ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'わっ、上で点けて下で消せる！ 暗い地下階段が少しだけ昔のマンションみたいに明るくなったね。',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：XORゲート',
          title: '💡「片方は1(OR)」かつ「両方禁止(NAND)」！',
          anim: 'xor_diff',
          rule: 'あなたが発見した内部構造を【⚡モジュール図鑑】に登録しました！',
          accent: '#52e3b6',
        },
        text: 'これが計算機科学のアイドル、【XORゲート（排他的論理和）】だ！「違いを見抜く」この回路は、足し算にも、暗号化にも、データ修復にも使われる万能スターなんだよ。',
      },
    ],
    hints: [
      '【考え方】「少なくとも片方が1 (OR)」であり、かつ「両方が1ではない (NAND)」ときだけ1になります！',
      '【構成】OR を1個、NAND を1個、AND を1個（合計3個）でスッキリ組めます！',
      '【手順】A,Bを OR と NAND の両方につなぐ → ORの出力とNANDの出力を AND に入れる → ANDの出力を OUT へ！',
    ],
    tests: [
      { label: 'A=0, B=0（同じ）→ 0', input: [0, 0], expected: [0] },
      { label: 'A=0, B=1（ちがう）→ 1', input: [0, 1], expected: [1] },
      { label: 'A=1, B=0（ちがう）→ 1', input: [1, 0], expected: [1] },
      { label: 'A=1, B=1（同じ）→ 0', input: [1, 1], expected: [0] },
    ],
    rewardChip: {
      id: 'XOR',
      name: 'XOR',
      shortName: 'XOR',
      titleJa: 'XORゲート（排他的論理和）',
      descJa: 'AとBが異なる値のときだけ1を出す自作チップ。',
      color: '#2c8a7b',
      accent: '#52e3b6',
    },
    codexUnlock: ['xor_gate'],
  },

  // =========================================================================
  // ACT II — BINARY ARITHMETIC
  // =========================================================================
  {
    id: 'stage_05',
    number: 5,
    act: 2,
    code: '05',
    title: '電気で「1+1」を数えろ',
    revealedTitle: '半加算器（H_ADD）',
    scene: 'shelter_hub',
    storyBgm: 'story',
    widget: 'ration_counter',
    mode: 'combinational',
    incidentBrief: {
      where: '中央配給カウンター・浄水集計盤',
      trouble: '夕方6時の配給集計を紙と懐中電灯で手計算しており、118人分の水の分配ミスが続発している！',
      condition: 'A + B の答えを「SUM(1の位)」と「CARRY(2の位=くり上がり)」の2ランプで表せ！',
      shortRule: 'A+B の足し算（1+1=くり上がり1, 1の位0）を2つのチップで組め！',
      stakes: '無生物の電気に「算数」をさせ、公平な水配給の第一歩を切り開く',
    },
    inputs: ['A', 'B'],
    outputs: ['SUM', 'CARRY'],
    pinHelp: {
      inputs: ['A: 水タンクA（0か1）', 'B: 水タンクB（0か1）'],
      outputs: ['SUM: 1の位', 'CARRY: 2の位（くり上がり）'],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR'],
    plainGoal: 'A + B の足し算結果を、1の位（SUM）と くり上がり（CARRY）の2つのランプで表そう！',
    beginnerNote:
      'ランプ1個では「2」を表せないので、2になったら左の桁（CARRY）へくり上げます（2進数で 1+1 = 10）。SUMとCARRY、それぞれの表をよ〜く見ると……？',
    introDialogue: [
      {
        speaker: 'mina',
        text: 'もうすぐ夕方6時──アーク7で一番にぎやかな【配給の時間】だよ。118人が金属の水筒を持って並んで、1日分の飲み水とスープを受け取るんだ。',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: 'でもエーテル9が止まってから、各区画の水の在庫を紙に書いて懐中電灯で手計算してるの……。みんな疲れ切ってて計算ミスが増えてるし、1人ぶん足りなくなったら大騒ぎになっちゃう。ねぇ博士、スイッチの組み合わせで本当に「足し算」ってできるの！？',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '目標の動き：2進数の足し算（動く図解）',
          title: '🔢 1 + 1 = 10（くり上がり 1、1の位 0）',
          anim: 'goal_half_adder',
          rule: '1の位（SUM）が1になる条件と、2の位（CARRY）が1になる条件を、それぞれ自作チップと見比べてごらん！',
          accent: '#5ce0a8',
        },
        text: '歴史的な瞬間だぞ、見習い君！ スイッチは0と1しかないから「2」になったら桁を1つ上げる──これが【2進数】だ。0+0=00、0+1=01、1+0=01、そして 1+1=10（くり上がり1、1の位0）！',
      },
      {
        speaker: 'kagari',
        text: '1の位（SUM）と、2の位のくり上がり（CARRY）の答えを見比べてごらん。……なんと、君がこれまでに作ったチップ2個を並べるだけで完成してしまうんだよ！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '……待って、ランプが光った！ 1と1を入れたら、くり上がりランプが点いて「2」になった！ 電気が本当に足し算をしたよ……すごい！！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：半加算器',
          title: '🔢 1の位は XOR、くり上がりは AND！',
          anim: 'half_adder',
          rule: 'あなたが発見した内部構造を【⚡モジュール図鑑】に登録しました！',
          accent: '#5ce0a8',
        },
        text: 'これぞ計算機の原点【半加算器（Half Adder）】！ 1の位がXOR、くり上がりがAND。たった2個の論理ゲートが、無生物の金属に「算数」の魂を吹き込んだ瞬間だ！',
      },
    ],
    hints: [
      '【考え方】SUM（1の位）の答えは 0, 1, 1, 0 —— これってまさに XOR の結果と同じ！ CARRY（くり上がり）は 0, 0, 0, 1 —— これは？',
      '【構成】XOR を1個、AND を1個、並列に置くだけです！',
      '【手順】AとBを XOR につないで出力を SUM へ。同じく AとB を AND につないで出力を CARRY へ！',
    ],
    tests: [
      { label: '0 + 0 = 0 (桁上り0, 1の位0)', input: [0, 0], expected: [0, 0] },
      { label: '0 + 1 = 1 (桁上り0, 1の位1)', input: [0, 1], expected: [1, 0] },
      { label: '1 + 0 = 1 (桁上り0, 1の位1)', input: [1, 0], expected: [1, 0] },
      { label: '1 + 1 = 2 (桁上り1, 1の位0)', input: [1, 1], expected: [0, 1] },
    ],
    rewardChip: {
      id: 'HALF_ADDER',
      name: 'H_ADD',
      shortName: 'HA',
      titleJa: '半加算器（Half Adder）',
      descJa: '2つの1ビット数 A+B を計算し、SUMとCARRYを出す自作チップ。',
      color: '#2b7a5b',
      accent: '#5ce0a8',
    },
    codexUnlock: ['half_adder_binary'],
  },

  {
    id: 'stage_06',
    number: 6,
    act: 2,
    code: '06',
    title: 'くり上がりのバトンリレー',
    revealedTitle: '全加算器（F_ADD）',
    scene: 'shelter_hub',
    storyBgm: 'story',
    widget: 'ration_counter',
    mode: 'combinational',
    incidentBrief: {
      where: '中央配給カウンター・多桁集計モジュール',
      trouble: '1桁の足し算（半加算器）だけでは、下の桁から上がってくる「くり上がり(CIN)」を足せない！',
      condition: 'A + B + CIN（最大3）を計算し、今の桁(SUM)と次の桁へのくり上がり(COUT)を出せ！',
      shortRule: 'A+B+CIN の3つを足し算する「完全1桁加算器」を H_ADD×2＋OR で組め！',
      stakes: '何桁でも横に繋いで大きな配給数を計算できる万能部品を作る',
    },
    inputs: ['A', 'B', 'CIN'],
    outputs: ['SUM', 'COUT'],
    pinHelp: {
      inputs: ['A: 入力A', 'B: 入力B', 'CIN: 下の桁からのくり上がり'],
      outputs: ['SUM: この桁の答え', 'COUT: 上の桁へのくり上がり'],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER'],
    plainGoal: 'A + B + CIN の3つを足し算し、この桁の答え（SUM）と次へのくり上がり（COUT）を出そう！',
    beginnerNote:
      '3つの足し算は、まず「A + B」を半加算器で足し、その答えに「+ CIN」をもう1個の半加算器で足せばOK！ くり上がりはどうまとめる？',
    introDialogue: [
      {
        speaker: 'mina',
        text: 'すごいよ、1桁の足し算ランプが動いたのを見て、配給係のおばちゃんたちが拍手してた！ ……でもね、実際のアーク7の水の配給は1桁じゃとても足りないの。',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: '筆算を思い出すと、2桁目からは「下の桁から上がってくるくり上がり（CIN）」も一緒に足さないと計算が合わないよね？ 3つ（A・B・CIN）を同時に足せる回路って作れるのかな？',
      },
      {
        speaker: 'kagari',
        text: 'するどいぞミナ！ さっきのが「半」加算器だった理由はそこにある。下の桁からのくり上がり（CIN）まで含めて3つ同時に足せる完全版を作ろう！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: '目標の動き：3つの1ビット加算（動く図解）',
          title: '🏃 A + B + CIN（最大3）を足し算せよ！',
          anim: 'goal_full_adder',
          rule: '3つの数を一度に足せないなら、「まず2つを足して、その答えにもう1つを足す」二段構えを考えてみろ！',
          accent: '#5ce0a8',
        },
        text: '『さっき自作した H_ADD（半加算器）がパレットに入っているぞ。3つの数を2段階に分けて足したとき、くり上がり（COUT）がいつ1になるか考えてみろ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：全加算器',
          title: '🏃 H_ADD×2 ＋ OR で完全1桁加算！',
          anim: 'full_adder',
          rule: 'あなたが発見した内部構造を【⚡モジュール図鑑】に登録しました！',
          accent: '#5ce0a8',
        },
        text: '完璧だ！【全加算器（Full Adder）】の完成だよ！ これ1個を部品として保存してしまえば、あとは横に並べるだけで4桁でも、64桁でも計算できるようになる！',
      },
      {
        speaker: 'mina',
        text: '小さな部品を組み合わせて大きな部品を作って、またそれを次の部品にする……なんだかレゴブロックみたいでワクワクしてきた！',
      },
    ],
    hints: [
      '【考え方】まず H_ADD① で A+B を計算（答えs1, くり上がりc1）。次に H_ADD② で s1+CIN を計算（最終SUM, くり上がりc2）。',
      '【構成】H_ADD を2個、OR を1個使います。c1 と c2 のどちらか一方でも 1 なら、最終くり上がり COUT は 1！',
      '【手順】A,B → H_ADD①(SUM→H_ADD②.A, CARRY→OR.A)。CIN → H_ADD②.B。H_ADD②.SUM → SUM。H_ADD②.CARRY → OR.B。OR.OUT → COUT！',
    ],
    tests: [
      { label: '0+0+0 = 0', input: [0, 0, 0], expected: [0, 0] },
      { label: '0+0+1 = 1', input: [0, 0, 1], expected: [1, 0] },
      { label: '0+1+0 = 1', input: [0, 1, 0], expected: [1, 0] },
      { label: '0+1+1 = 2', input: [0, 1, 1], expected: [0, 1] },
      { label: '1+0+0 = 1', input: [1, 0, 0], expected: [1, 0] },
      { label: '1+0+1 = 2', input: [1, 0, 1], expected: [0, 1] },
      { label: '1+1+0 = 2', input: [1, 1, 0], expected: [0, 1] },
      { label: '1+1+1 = 3', input: [1, 1, 1], expected: [1, 1] },
    ],
    rewardChip: {
      id: 'FULL_ADDER',
      name: 'F_ADD',
      shortName: 'FA',
      titleJa: '全加算器（Full Adder）',
      descJa: 'A+B+CINの3つを足し、SUMとCOUTを出す1桁完全加算チップ。',
      color: '#2b7a5b',
      accent: '#5ce0a8',
    },
    codexUnlock: ['full_adder'],
  },

  {
    id: 'stage_07',
    number: 7,
    act: 2,
    code: '07',
    title: '配給計算機・4ビット加算',
    revealedTitle: '4ビット加算器（ADD_4B）',
    scene: 'shelter_hub',
    storyBgm: 'story',
    widget: 'ration_terminal',
    mode: 'combinational',
    incidentBrief: {
      where: '中央配給カウンター・本館集計ターミナル',
      trouble: '第1区（9L）と第2区（7L）を1桁ずつの集計器で足したところ、桁あふれが正しく伝わらず配給数が狂ってしまった！',
      condition: '4桁の数 A(0〜15) ＋ B(0〜15) ＋ CIN を全512通り誤差なく計算し、答え S0..S3 と桁溢れ COUT を出せ！',
      shortRule: '4桁の入力 A0..3・B0..3 と CIN から、各桁の合計 S0..3 と最終桁あふれ COUT を導く回路を設計せよ！',
      stakes: '118人の配給管理ターミナルを完全復旧させる',
    },
    exhaustiveCheck: 'add4_512',
    inputs: ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', 'CIN'],
    outputs: ['S0', 'S1', 'S2', 'S3', 'COUT'],
    pinGroups: {
      inputs: [
        { label: 'A', indices: [0, 1, 2, 3] },
        { label: 'B', indices: [4, 5, 6, 7] },
      ],
      outputs: [{ label: 'SUM', indices: [0, 1, 2, 3] }],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER'],
    plainGoal: '4桁の2進数 A(0〜15) と B(0〜15) と CIN を足し算し、全512通りで正しい S0..S3 と COUT を出す計算機を組もう！',
    beginnerNote:
      'A0は「1の位」、A1は「2の位」、A2は「4の位」、A3は「8の位」です。仕様書（📋仕様）で入出力ピンを確認し、詰まったときは段階ヒント（💡ヒント）を開いてみよう！',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: '見習いさん、配給カウンターでトラブル発生だよ！ 夕方6時の配給で第1区の「9リットル」と第2区の「7リットル」を足したら、1桁ずつのバラバラ集計器だと桁あふれして合計がめちゃくちゃになっちゃったの！ カウンターの前で配給係のおばちゃんも3区の子どもたちも待ってるのに……！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: 'ハコ信号観測：4ビット加算の入出力仕様（動く図解）',
          title: '📟 A(4桁) ＋ B(4桁) ＋ CIN ➔ S(4桁) ＋ 桁溢れ COUT',
          anim: 'goal_add4',
          rule: '入力は A0〜A3（1・2・4・8の位）と B0〜B3、および最下位の CIN。出力は合計 S0〜S3 と、15を超えたときの COUT だ！',
          accent: '#5ce0a8',
        },
        text: '『現場の信号線を観測したぞ。入力は4桁の A0〜A3 と B0〜B3、それに予備のくり上がり CIN だ。下の位で発生したくり上がりをどうやって上の位へ渡し、最後に16の位（COUT）へ抜くか──お前の手で配線してみろ！』',
      },
      {
        speaker: 'kagari',
        text: '筆算と同じで、1つの桁のくり上がり配線が1本でも抜けると特定の数の組み合わせだけで計算が狂ってしまう。今回は代表テストに加えて全512通りすべてを検査するから、迷ったら下の「💡ヒント」を段階的に開いてごらん！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '5+3=8、9+7=16（COUT=1）、15+15+1=31……全512通り、1つも誤差なしで一瞬で出た！！ おばちゃんたちも「これで配給の列がスイスイ進むよ！」って大喜びしてる！ ありがとう、見習いさん！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：4ビット加算器',
          title: '🪜 F_ADD×4 のくり上がりバトンリレー（リップルキャリー）！',
          anim: 'ripple_4bit',
          rule: '1・2・4・8の位に F_ADD を4個並べ、COUT を次の桁の CIN へつなぐ内部構造を図鑑に登録しました！',
          accent: '#5ce0a8',
        },
        text: '1941年、コンラート・ツーゼが世界初のプログラム計算機Z3を動かしたときと同じ構造だ。下の位から上の位へくり上がりが波紋（リップル）のように伝わるから【リップルキャリー加算器】と呼ぶんだよ。',
      },
    ],
    hints: [
      '【考え方】4つの桁（0, 1, 2, 3）それぞれに F_ADD を1個ずつ割り当て、くり上がり（COUT → 次のCIN）を縦につなげます。',
      '【構成】F_ADD を4個縦に並べます！',
      '【手順】F_ADD0(A0, B0, CIN)→S0, c0 / F_ADD1(A1, B1, c0)→S1, c1 / F_ADD2(A2, B2, c1)→S2, c2 / F_ADD3(A3, B3, c2)→S3, COUT！',
    ],
    tests: [
      add4Case(0, 0, 0),
      add4Case(1, 1, 0),
      add4Case(5, 3, 0),
      add4Case(7, 8, 0),
      add4Case(9, 6, 0),
      add4Case(12, 7, 0),
      add4Case(15, 1, 0),
      add4Case(15, 15, 1),
      add4Case(6, 5, 1),
    ],
    rewardChip: {
      id: 'ADD_4BIT',
      name: 'ADD_4B',
      shortName: 'ADD4',
      titleJa: '4ビット加算器',
      descJa: '4ビット数 A+B+CIN を計算する多桁加算ユニット。',
      color: '#2b7a5b',
      accent: '#5ce0a8',
    },
    codexUnlock: ['ripple_adder'],
  },

  // =========================================================================
  // ACT III — DATA ROUTING & DECISIONS
  // =========================================================================
  {
    id: 'stage_08',
    number: 8,
    act: 3,
    code: '08',
    title: '配管ルート切替器',
    revealedTitle: 'マルチプレクサ（2→1 MUX）',
    scene: 'machinery',
    storyBgm: 'story',
    widget: 'pipe_mux',
    mode: 'combinational',
    incidentBrief: {
      where: 'B4 浄水プラント・2系統モニター盤',
      trouble: '主タンク(D0)と予備井戸(D1)の2系統があるのにモニターが1台しかない！ 毎回ケーブルを抜き差ししている',
      condition: '切替スイッチ SEL=0 なら D0 を出力 ／ SEL=1 なら D1 を出力せよ！',
      shortRule: 'SEL=0 で D0、SEL=1 で D1 を選んで通す切替器（MUX）を組め！',
      stakes: 'レバー1本で2つの水源の異常を瞬時に監視できるようにする',
    },
    inputs: ['D0', 'D1', 'SEL'],
    outputs: ['OUT'],
    pinHelp: {
      inputs: ['D0: 主タンク信号', 'D1: 予備井戸信号', 'SEL: 切替レバー（0ならD0 / 1ならD1）'],
      outputs: ['OUT: モニターへ送る選択信号'],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT'],
    plainGoal: 'SEL=0 のときは D0 をそのまま出し、SEL=1 のときは D1 をそのまま出す「進路切替器」を作ろう。',
    beginnerNote:
      'ANDゲートは「片方が1のときだけもう片方を通す門番」として使えます！ D0用の門番とD1用の門番を並べてORで合流させよう。',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: '配給カウンターが大助かりだって喜んでたよ！ ……さて次はB4の浄水プラント。予備の地下井戸をつないだんだけど、監視モニターが1台しかないの。切替レバー（SEL）が 0 なら主タンク(D0)、1 なら予備井戸(D1)の信号が映るようにしたいんだ！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '目標の動き：電気のポイント切替（動く図解）',
          title: '🛤 SEL=0 なら D0、SEL=1 なら D1 を通す！',
          anim: 'mux_rail',
          rule: 'D0用の「門番」とD1用の「門番」を並べて、選ばれた方だけを通すにはどの論理ゲートが使えるだろう？',
          accent: '#6ec3ff',
        },
        text: 'ここで「計算」から「判断・選択」のフェーズへ進もう！ プログラミングでいう『もし〜ならこっち』を電気回路で作るんだ。これまでに作った論理ゲートで「片方だけ通す門番」を作ってみよう！',
      },
      {
        speaker: 'hako',
        text: '『SELが 0 のときだけ開く門番と、SELが 1 のときだけ開く門番の2つを用意して、最後に1本の線へ合流させればいい。迷ったら「💡ヒント」を見ろ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'レバーひとつで主タンクと予備井戸がスパッと切り替わる！ すごく分かりやすい！',
      },
      {
        speaker: 'kagari',
        text: 'これが【マルチプレクサ（MUX）】だ！ 信号線のポイント切替器だね。CPUの中では、何十ものデータ候補から「今使う1本」を選ぶ交通整理の主役になるんだよ。',
      },
    ],
    hints: [
      '【考え方】「D0 かつ (NOT SEL)」または「D1 かつ SEL」を式にすると、SEL=0でD0、SEL=1でD1だけが出ます！',
      '【構成】NOT を1個、AND を2個、OR を1個使います。',
      '【手順】SEL → NOT → AND①のBへ（AND①のAにはD0）。D1とSEL → AND②。AND①とAND②の出力を OR へつないで OUT！',
    ],
    tests: [
      { label: 'SEL=0: D0=0, D1=0 → D0(0)', input: [0, 0, 0], expected: [0] },
      { label: 'SEL=0: D0=0, D1=1 → D0(0)', input: [0, 1, 0], expected: [0] },
      { label: 'SEL=0: D0=1, D1=0 → D0(1)', input: [1, 0, 0], expected: [1] },
      { label: 'SEL=0: D0=1, D1=1 → D0(1)', input: [1, 1, 0], expected: [1] },
      { label: 'SEL=1: D0=0, D1=0 → D1(0)', input: [0, 0, 1], expected: [0] },
      { label: 'SEL=1: D0=0, D1=1 → D1(1)', input: [0, 1, 1], expected: [1] },
      { label: 'SEL=1: D0=1, D1=0 → D1(0)', input: [1, 0, 1], expected: [0] },
      { label: 'SEL=1: D0=1, D1=1 → D1(1)', input: [1, 1, 1], expected: [1] },
    ],
    rewardChip: {
      id: 'MUX',
      name: 'MUX',
      shortName: 'MUX',
      titleJa: 'マルチプレクサ（2→1）',
      descJa: 'SEL=0ならD0、SEL=1ならD1を選んで出力するデータ切替チップ。',
      color: '#2e6f9e',
      accent: '#6ec3ff',
    },
    codexUnlock: ['mux_selector'],
  },

  {
    id: 'stage_09',
    number: 9,
    act: 3,
    code: '09',
    title: '4ビット・データバス切替',
    revealedTitle: '4ビット切替バス（MUX_4B）',
    scene: 'shelter_hub',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'combinational',
    incidentBrief: {
      where: '中央制御室・データバス切替盤',
      trouble: '1本ずつではなく「4桁の数字（0〜15）」を丸ごと一気に切り替えたいが、線がバラバラで束ねられない',
      condition: 'SEL=0 なら4ビット数 A を丸ごと出力 ／ SEL=1 なら B を丸ごと出力せよ！',
      shortRule: 'MUX を4個並べて共通の SEL で 4ビット数 A/B を丸ごと切り替えろ！',
      stakes: 'CPUの血管となる「4ビット・データバス」を完成させる',
    },
    inputs: ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', 'SEL'],
    outputs: ['Y0', 'Y1', 'Y2', 'Y3'],
    pinGroups: {
      inputs: [
        { label: 'A', indices: [0, 1, 2, 3] },
        { label: 'B', indices: [4, 5, 6, 7] },
      ],
      outputs: [{ label: 'Y', indices: [0, 1, 2, 3] }],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT', 'MUX'],
    plainGoal: 'SEL=0 なら4桁の数字 A を丸ごと出し、SEL=1 なら B を丸ごと出す「4本まとめ切替器」を作ろう！',
    beginnerNote:
      'さっき作った MUX を4個並べて、共通の切替レバー SEL を4個ぜんぶに配るだけ！',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: '浄水モニターの切替、すっごく便利になったよ！ でもね、中央制御室のモニターに「4桁の数字（0〜15）」を丸ごと切り替えて表示したいんだけど、1本ずつ切り替えるんじゃとても間に合わないの。',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '博士の回路メモ：4ビット・データバス（動く図解）',
          title: '🚌 4本の信号線を「束（バス）」にして一括切替！',
          anim: 'data_bus_4bit',
          rule: 'MUX を4個並べて共通の SEL を配るだけ！ SEL=0 で4桁の数 A、SEL=1 で B が丸ごと通るぞ！',
          accent: '#6ec3ff',
        },
        text: '1本ずつ切り替えるのはもう卒業だ。コンピュータは複数の線を「束」にして数字を丸ごと運ぶ——これを【バス（Bus）】と呼ぶんだよ。',
      },
      {
        speaker: 'kagari',
        text: '戦前のゲーム機が「8ビット」、昔のパソコンが「32ビット」、旧時代のスマホが「64ビット」と呼ばれていたのを図鑑で見たことがあるだろう？ あれはまさに、この線の束が何本あるかのことなんだ！',
      },
      {
        speaker: 'mina',
        text: 'じゃあ今から作る4ビット切替器は、1971年の初代マイクロプロセッサと同じ4ビット幅ってことね。よし、自作の MUX を4つ並べて、共通の SEL で一気に束ねよう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kagari',
        text: '美しい配線だ！【4ビット・マルチプレクサ】の完成！ これから作るレジスタやCPU本体で、計算結果と入力データを一瞬で切り替える大動脈になるぞ。',
      },
    ],
    hints: [
      '【考え方】各桁（0番目〜3番目）ごとに MUX を1個ずつ使い、すべての MUX の SEL ピンを外部入力 SEL につなぎます。',
      '【構成】自作チップ MUX を4個使います。',
      '【手順】MUX0(A0, B0, SEL)→Y0 / MUX1(A1, B1, SEL)→Y1 / MUX2(A2, B2, SEL)→Y2 / MUX3(A3, B3, SEL)→Y3！',
    ],
    tests: [
      mux4Case(5, 10, 0),
      mux4Case(5, 10, 1),
      mux4Case(12, 3, 0),
      mux4Case(12, 3, 1),
      mux4Case(0, 15, 0),
      mux4Case(0, 15, 1),
    ],
    rewardChip: {
      id: 'MUX_4BIT',
      name: 'MUX_4B',
      shortName: 'MUX4',
      titleJa: '4ビット切替バス',
      descJa: '4ビットの数字AとBをSEL信号ひとつで丸ごと切り替えるバスチップ。',
      color: '#2e6f9e',
      accent: '#6ec3ff',
    },
    codexUnlock: ['data_bus'],
  },

  {
    id: 'stage_10',
    number: 10,
    act: 3,
    code: '10',
    title: '水耕室アドレス解読機',
    revealedTitle: '2→4デコーダ（DEC2_4）',
    scene: 'machinery',
    storyBgm: 'story',
    widget: 'hydroponics',
    mode: 'combinational',
    incidentBrief: {
      where: 'B2 水耕栽培室・4区画（0〜3番）',
      trouble: 'レタスやトマトを育てる4部屋へ制御線が2本しか通っていない！ 部屋番号を指定して散水したい',
      condition: '2ビット番号(A0, A1) に対応する1部屋（Y0〜Y3）だけを 1 に点灯せよ！',
      shortRule: '2本の線(0〜3)を解読して Y0〜Y3 のうち該当1本だけ ON にしろ！',
      stakes: '地下世界唯一の緑──4つの水耕農場の自動散水を復旧させる',
    },
    inputs: ['A0', 'A1'],
    outputs: ['Y0', 'Y1', 'Y2', 'Y3'],
    pinHelp: {
      inputs: ['A0: 部屋番号 1の位', 'A1: 部屋番号 2の位'],
      outputs: ['Y0〜Y3: 選ばれた水耕室（0〜3番）だけ 1'],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT', 'MUX', 'MUX_4BIT'],
    plainGoal: '2本の線（A0, A1）で表された番号 0〜3 に対応する出力 Y0〜Y3 のうち、1本だけを 1 にしよう！',
    beginnerNote:
      '0番は「A0=0 かつ A1=0」、1番は「A0=1 かつ A1=0」、2番は「A0=0 かつ A1=1」、3番は「A0=1 かつ A1=1」。NOTとANDだけで4パターン判定できる！',
    introDialogue: [
      {
        speaker: 'mina',
        text: '見て、ここが地下2階の【水耕栽培室】！ 紫のLEDランプの下でレタスとミニトマトを育ててる、この灰色の地下でたった1か所の「緑の部屋」なんだ。',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: '0番から3番まで4つの栽培室があるんだけど、配管の奥に通ってる制御ケーブルが2本（A0とA1）しかないの！ たった2本の信号から「今どの部屋に水をやるか」4つを個別に選び出せるかな？',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '目標の動き：2進数で部屋指定（動く図解）',
          title: '🌱 2本の線（A0, A1）で4部屋をピンポイント点灯！',
          anim: 'decoder_2to4',
          rule: '0番は(A0=0,A1=0)、1番は(A0=1,A1=0)、2番は(A0=0,A1=1)、3番は(A0=1,A1=1)。4通りの条件をそれぞれ見分けるには？',
          accent: '#6ec3ff',
        },
        text: 'もちろんさ！ A0(1の位)とA1(2の位)の2ビットがあれば、(0,0)で0番・(1,0)で1番・(0,1)で2番・(1,1)で3番の4通りを表せるからね。番号を解読して該当の1本だけ点ける【番号解読スイッチ】の出番だ！',
      },
      {
        speaker: 'hako',
        text: '『0の線を「1」として判定したいときは反転チップを使えばいい。4部屋それぞれの条件が揃ったときだけ1を出す回路を組んでみろ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'やった、0番から3番までピンポイントで散水バルブが開いた！ これで新鮮な野菜が育てられるよ！',
      },
      {
        speaker: 'kagari',
        text: 'この【デコーダ】こそ、メモリ番地を指定したり、CPUが「今は足し算命令だ！」と解釈する翻訳機の正体なんだ。さあ、次はいよいよ「記憶」の扉を開けるぞ！',
      },
    ],
    hints: [
      '【考え方】A0の反転(nA0)とA1の反転(nA1)を作れば、Y0=(nA0 AND nA1), Y1=(A0 AND nA1), Y2=(nA0 AND A1), Y3=(A0 AND A1) です！',
      '【構成】NOT を2個、AND を4個使います。',
      '【手順】nA0=NOT(A0), nA1=NOT(A1) を作り、Y0=AND(nA0,nA1), Y1=AND(A0,nA1), Y2=AND(nA0,A1), Y3=AND(A0,A1)！',
    ],
    tests: [
      { label: '番号0 (A0=0, A1=0) → Y0のみON', input: [0, 0], expected: [1, 0, 0, 0] },
      { label: '番号1 (A0=1, A1=0) → Y1のみON', input: [1, 0], expected: [0, 1, 0, 0] },
      { label: '番号2 (A0=0, A1=1) → Y2のみON', input: [0, 1], expected: [0, 0, 1, 0] },
      { label: '番号3 (A0=1, A1=1) → Y3のみON', input: [1, 1], expected: [0, 0, 0, 1] },
    ],
    rewardChip: {
      id: 'DEC_2TO4',
      name: 'DEC2_4',
      shortName: 'DEC4',
      titleJa: '2→4デコーダ',
      descJa: '2ビット番号を解読し4本のうち1本だけをONにするアドレス解読チップ。',
      color: '#2e6f9e',
      accent: '#6ec3ff',
    },
    codexUnlock: ['decoder'],
  },

  // =========================================================================
  // ACT IV — FEEDBACK, MEMORY & CLOCK
  // =========================================================================
  {
    id: 'stage_11',
    number: 11,
    act: 4,
    code: '11',
    title: '消えない地震警報灯',
    revealedTitle: 'SRラッチ（SR_LAT）',
    scene: 'machinery',
    storyBgm: 'crisis',
    widget: 'seismic_lamp',
    mode: 'sequential',
    incidentBrief: {
      where: '地下400m 岩盤監視室・地震センサー盤',
      trouble: '夜間の小さな地震が一瞬で収まるとセンサー S もすぐ0に戻ってしまい、朝の点検員が揺れに気づけない！',
      condition: 'S=1 で警報 Q=1 を点灯させたあと、S=0 に離しても Q=1 を保ち、点検員が解除ボタン R=1 を押したときだけ Q=0 に戻せ！',
      shortRule: 'まず作業台の S を押して離し、直結回路だと警報が消える問題を確かめてから、点検員が解除(R=1)するまで記録を残す回路へ改修せよ！',
      stakes: '電気回路に初めて「過去を覚える記憶（メモリ）」を宿す',
    },
    initialCircuit: {
      inputs: ['S', 'R'],
      outputs: ['Q', 'QN'],
      nodes: [],
      wires: [
        { id: 'w_init_sq', from: { kind: 'input', pin: 0 }, to: { kind: 'output', pin: 0 } },
      ],
    },
    inputs: ['S', 'R'],
    outputs: ['Q', 'QN'],
    pinHelp: {
      inputs: ['S: 地震センサー試験信号（1=揺れ検知 / 0=揺れ停止）', 'R: 点検員の解除ボタン（1=警報リセット / 0=通常）'],
      outputs: ['Q: 警報ランプ（1=要点検記録 / 0=正常）', 'QN: Qの反転状態（点検正常灯）'],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT', 'MUX', 'MUX_4BIT', 'DEC_2TO4'],
    plainGoal: 'まず盤面の S を押して離し（1→0）、今の直結配線だと揺れが止まると警報 Q も消えてしまうことを確認しよう。そのあと、点検員が解除ボタン R を押すまで Q=1 を残し続ける回路に組み替えよう！',
    beginnerNote:
      '作業台にはいま「S → Q」の直結線だけが引かれています。S をタップして 1→0 に戻すと Q も消えてしまいます。どうすれば信号を回路の中に閉じ込めて記憶できるか挑戦しよう（💡ヒントで段階的に解説が見られます）！',
    introDialogue: [
      {
        speaker: 'mina',
        text: '見習いさん、地下400mの岩盤監視室から相談が来たよ！ 数日に一度、深夜に2秒だけ「ゴゴッ」と小さな地鳴りが来るんだけど、今の警報盤はセンサー `S` が警報ランプ `Q` にそのまま直結されてるだけなの。',
      },
      {
        speaker: 'hako',
        showIncident: true,
        text: '『作業台に今の直結配線を再現しておいたぞ。まず盤面に出たら、左上の地震試験ボタン【S】を押して `1` にし、もう一度押して `0` に離してみろ。揺れ（S）が止まった瞬間に警報（Q）まで消えてしまうのが分かるはずだ』',
      },
      {
        speaker: 'mina',
        visualCard: {
          tag: '現場の要望：点検員が解除するまで記録を残す（動く図解）',
          title: '🚨 S=1 で点灯 ➔ S=0 に離しても保持 ➔ R=1 で解除！',
          anim: 'goal_sr_latch',
          rule: '揺れが止まって S=0, R=0 に戻っても Q=1 を維持し、翌朝に点検員が解除ボタン R=1 を押したときだけ Q=0 に戻したい！',
          accent: '#c89bff',
        },
        text: 'そうなの！ 夜中に2秒だけ揺れてすぐ止まっても、翌朝に点検員さんが天井のヒビを点検して【解除ボタン R】を押すまでは、警報 `Q=1` の記録を残し続けたいんだ！',
      },
      {
        speaker: 'kagari',
        text: '「今の入力」だけでなく「さっき起きたこと」を電気に覚えさせる新しい挑戦だ。まずは自分で直結線を外して試行錯誤してみてごらん。仕組みや構成を知りたいときは、いつでも下の「💡ヒント」を段階的に開けるからね！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'すごい……！ 地震センサー S を 0 に離したのに、警報ランプ Q が消えずに光り続けてる！！ そして点検員さんの解除ボタン R を押したらピタッと消えたよ！ 電気が「さっき揺れたこと」を覚えてる！！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：SRラッチ（記憶素子）',
          title: '🔁 たすき掛けの帰還ループ【SRラッチ】！',
          anim: 'sr_latch_loop',
          rule: '2個のNANDの出力をお互いの入力へ戻す記憶回路【SR_LAT】を図鑑とパレットに登録しました！',
          accent: '#c89bff',
        },
        text: 'これこそ1918年にエクルズとジョーダンが発見した双安定記憶回路【SRラッチ（Set-Reset Latch）】だ！ 2つのゲートの出力をお互いの入口へぐるっと戻す（フィードバックする）ことで、電気信号が輪の中に閉じ込められ、コンピュータに初めての「記憶（メモリ）」が宿ったんだよ！',
      },
    ],
    hints: [
      '【考え方】NAND①とNAND②を上下に置き、NAND①の出力(Q)をNAND②の入力へ、NAND②の出力(QN)をNAND①の入力へ「たすき掛け」につなぎます！',
      '【構成】NOT を2個、NAND を2個使います。SをNOTで反転してNAND①の空き入力へ、RをNOTで反転してNAND②の空き入力へ！',
      '【手順】1) nS=NOT(S), nR=NOT(R) → 2) NAND①(A=nS, B=NAND②.OUT)→Q → 3) NAND②(A=nR, B=NAND①.OUT)→QN！',
    ],
    tests: [
      { label: '① リセット (S=0, R=1) → Q=0', input: [0, 1], expected: [0, 1] },
      { label: '② 離しても保持 (S=0, R=0) → Q=0のまま', input: [0, 0], expected: [0, 1] },
      { label: '③ 地震検知! (S=1, R=0) → Q=1', input: [1, 0], expected: [1, 0] },
      { label: '④ 揺れ停止後も記憶! (S=0, R=0) → Q=1のまま!', input: [0, 0], expected: [1, 0] },
      { label: '⑤ 解除ボタン (S=0, R=1) → Q=0', input: [0, 1], expected: [0, 1] },
      { label: '⑥ 解除後も保持 (S=0, R=0) → Q=0のまま', input: [0, 0], expected: [0, 1] },
    ],
    rewardChip: {
      id: 'SR_LATCH',
      name: 'SR_LAT',
      shortName: 'SRL',
      titleJa: 'SRラッチ（記憶素子）',
      descJa: 'Sで1を記憶、Rで0にリセットし、0,0で状態を保持する記憶回路。',
      color: '#6e459c',
      accent: '#c89bff',
    },
    codexUnlock: ['sr_latch'],
  },

  {
    id: 'stage_12',
    number: 12,
    act: 4,
    code: '12',
    title: '書き込みロック付き金庫',
    revealedTitle: 'Dラッチ（D_LAT / 1ビット金庫）',
    scene: 'shelter_hub',
    storyBgm: 'story',
    widget: 'memory_vault',
    mode: 'sequential',
    incidentBrief: {
      where: '中央制御室・データ保護メモリ盤',
      trouble: '信号線のノイズで記憶が勝手に書き換わってしまう！ 「保存ボタン(WE)」を押した瞬間だけ記憶させたい',
      condition: 'WE=1 のときだけ D を記憶 ／ WE=0 の間は D が変わっても Q を保持せよ！',
      shortRule: 'WE=1 で D を保存、WE=0 で完全ロックする1ビット金庫（Dラッチ）を組め！',
      stakes: 'コンピュータの記憶装置の最小単位「1ビット記憶セル」を完成させる',
    },
    inputs: ['D', 'WE'],
    outputs: ['Q'],
    pinHelp: {
      inputs: ['D: 覚えさせたいデータ（0か1）', 'WE: 書き込み許可（1=上書き / 0=ロック保持）'],
      outputs: ['Q: 金庫に保存中の値'],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT', 'MUX', 'MUX_4BIT', 'DEC_2TO4', 'SR_LATCH'],
    plainGoal: '書き込み許可 WE=1 のときだけデータ D を記憶し、WE=0 の間は D が変わっても絶対に忘れない1ビット金庫を作ろう！',
    beginnerNote:
      'SRラッチのSとRの前にANDの門番を置こう！ WE=1でD=1ならS=1、WE=1でD=0ならR=1、WE=0ならSもRも0（保持）になるように組めば完璧！',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: '地震の記憶ランプ、すっごく頼もしいよ！ ただ中央制御室の記録盤に繋いでみたら、古い配線のノイズが飛び込んできて記憶が勝手に書き換わっちゃうことがあって……。',
      },
      {
        speaker: 'kagari',
        text: 'そこでSRラッチをもう一段進化させよう！ 実際のコンピュータでは「SとRを別々に押す」のではなく、「データ(D)」と「保存ボタン(WE)」の2本で安全に操作するんだ。',
      },
      {
        speaker: 'mina',
        text: 'なるほど！ 保存ボタン（WE）が 0 のときは、外の配線がノイズでパチパチ変わっても記憶が絶対に壊れない「ロック付き金庫」にすればいいんだね！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: '目標の動き：ロック付き1ビット金庫（動く図解）',
          title: '🔐 WE=1 のときだけ保存、WE=0 で外乱を遮断！',
          anim: 'goal_d_latch',
          rule: 'さっき作った SR_LAT は「S=0, R=0」なら記憶を保持する。WE=0 のとき両方 0 にする門番を前に置こう！',
          accent: '#c89bff',
        },
        text: '『WE=0 なら SR_LAT に S=0, R=0 を渡せば完全ロックだ。WE=1 のときだけ D の値に応じて S か R を押す門番を前に組んでみろ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：Dラッチ',
          title: '🔐 AND門番＋SR_LAT で1ビット金庫に！',
          anim: 'd_latch_vault',
          rule: 'あなたが発見した内部構造を【⚡モジュール図鑑】に登録しました！',
          accent: '#c89bff',
        },
        text: '素晴らしい！【Dラッチ（1ビット・メモリセル）】の誕生だ！ かつて地上にあった「1ギガバイトのメモリ」は、今きみが作ったこの1ビット金庫が85億個並んでいるだけなんだよ！',
      },
    ],
    hints: [
      '【考え方】S = (D AND WE)、R = ((NOT D) AND WE) にして SR_LAT につなぐだけ！ WE=0なら両方0で保持されます。',
      '【構成】NOT を1個、AND を2個、SR_LAT を1個使います。',
      '【手順】AND①(D, WE)→SR_LAT.S。NOT(D)とWE→AND②→SR_LAT.R。SR_LAT.Q → Q！',
    ],
    tests: [
      { label: '① 0を書き込む (D=0, WE=1) → Q=0', input: [0, 1], expected: [0] },
      { label: '② ロック中にD=1へ変化 (D=1, WE=0) → Q=0のまま!', input: [1, 0], expected: [0] },
      { label: '③ 1を書き込む (D=1, WE=1) → Q=1', input: [1, 1], expected: [1] },
      { label: '④ ロック中にD=0へ変化 (D=0, WE=0) → Q=1のまま!', input: [0, 0], expected: [1] },
      { label: '⑤ ロック継続 (D=1, WE=0) → Q=1のまま', input: [1, 0], expected: [1] },
      { label: '⑥ 0で上書き (D=0, WE=1) → Q=0', input: [0, 1], expected: [0] },
    ],
    rewardChip: {
      id: 'D_LATCH',
      name: 'D_LAT',
      shortName: 'DLAT',
      titleJa: 'Dラッチ（1ビット記憶セル）',
      descJa: 'WE=1のときDを書き込み、WE=0で記憶をロックする1ビットメモリ。',
      color: '#6e459c',
      accent: '#c89bff',
    },
    codexUnlock: ['d_latch'],
  },

  {
    id: 'stage_13',
    number: 13,
    act: 4,
    code: '13',
    title: '心臓の鼓動・クロック同期',
    revealedTitle: 'Dフリップフロップ（D_FF）',
    scene: 'shelter_hub',
    storyBgm: 'crisis',
    widget: 'clock_pulse',
    mode: 'sequential',
    incidentBrief: {
      where: '中央制御室・システムクロック同期盤',
      trouble: '出力を計算機へ戻すと WE=1 の間に信号が筒抜けで暴走してしまう！ 1拍ごとにピタッと進めたい',
      condition: 'CLK が「0→1へ立ち上がった一瞬」だけ D を取り込み、CLK=1のままDが変わっても揺るぐな！',
      shortRule: 'D_LAT×2 と NOT で二重扉を作り、CLK 0→1 の瞬間だけ記憶を更新しろ！',
      stakes: 'CPU全体の歩調を合わせる心臓の鼓動（クロック同期）を生み出す',
    },
    hasClock: true,
    inputs: ['D', 'CLK'],
    outputs: ['Q'],
    pinHelp: {
      inputs: ['D: 次に覚えたい値', 'CLK: クロック鼓動（0→1 になった瞬間だけ更新！）'],
      outputs: ['Q: 同期出力'],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT', 'MUX', 'MUX_4BIT', 'DEC_2TO4', 'SR_LATCH', 'D_LATCH'],
    plainGoal: 'CLKが「0から1へ立ち上がった瞬間（ドクン！）」だけ D を取り込み、CLK=1のままDが変わっても揺るがない記憶素子を作ろう！',
    beginnerNote:
      '潜水艦のエアロック（二重扉）を想像しよう！ 前室のDラッチは CLK=0 で開き、後室のDラッチは CLK=1 で開く。2つを直列につなぐと……？',
    introDialogue: [
      {
        speaker: 'kagari',
        showIncident: true,
        text: 'いよいよCPUの「心臓の鼓動（クロック）」を作るぞ！ 普通のDラッチはWE=1の間ずっと筒抜けだから、出力を足し算器へ戻すと信号が一瞬でぐるぐる暴走してしまうんだ。',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '目標の動き：立ち上がりの一瞬だけ更新（動く図解）',
          title: '🚪 CLK が 0→1 になった瞬間だけ D を取り込む！',
          anim: 'goal_dff',
          rule: 'ヒント：潜水艦の「二重扉（前室と後室）」のように、2個の金庫の扉を交互に開け閉めさせると……？',
          accent: '#c89bff',
        },
        text: 'そこで潜水艦の【二重エアロック】の発想を使う！ 前室と後室の2つの扉が「同時に開く瞬間がない」ように交互に開閉させれば、切り替わった一瞬だけ値を渡せるんだ。',
      },
      {
        speaker: 'hako',
        text: '『パレットの D_LAT を2個並べて、片方は CLK=0 で開き、もう片方は CLK=1 で開くように工夫してみろ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'すごい……CLKボタンを押した瞬間だけ「カチッ」と1拍ぶん進む！ まるで機械仕掛けの腕時計みたい！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：Dフリップフロップ',
          title: '🚪 前室(CLK=0) → 後室(CLK=1) の二重扉！',
          anim: 'dff_airlock',
          rule: 'あなたが発見した内部構造を【⚡モジュール図鑑】に登録しました！',
          accent: '#c89bff',
        },
        text: '【Dフリップフロップ（マスター・スレーブ型）】の完成だ！ 戦前のスマホの仕様書に「3GHz」と書いてあるのは、今きみが作ったこの鼓動を1秒間に30億回打っているという意味なんだよ！',
      },
    ],
    hints: [
      '【考え方】D_LAT①（前室）のWEには NOT(CLK) を入れ、D_LAT②（後室）のWEにはそのまま CLK を入れて直列につなぎます！',
      '【構成】NOT を1個、D_LAT を2個（合計3個）だけです！',
      '【手順】D → D_LAT①.D / NOT(CLK) → D_LAT①.WE / D_LAT①.Q → D_LAT②.D / CLK → D_LAT②.WE / D_LAT②.Q → Q！',
    ],
    tests: [
      { label: '① 準備(D=0, CLK=0) → 前室へ0待機', input: [0, 0], expected: [null] },
      { label: '② 鼓動!(CLK 0→1) → Q=0 を確定!', input: [0, 1], expected: [0] },
      { label: '③ CLK=1のままD=1へ変更 → Q=0のまま!(筒抜け防止)', input: [1, 1], expected: [0] },
      { label: '④ CLK=0へ戻す(D=1) → 前室へ1待機、Qは0のまま', input: [1, 0], expected: [0] },
      { label: '⑤ 鼓動!(CLK 0→1) → Q=1 を確定!', input: [1, 1], expected: [1] },
      { label: '⑥ CLK=1のままD=0へ変更 → Q=1のまま!', input: [0, 1], expected: [1] },
      { label: '⑦ CLK=0へ戻す(D=0) → 前室へ0待機、Qは1のまま', input: [0, 0], expected: [1] },
      { label: '⑧ 鼓動!(CLK 0→1) → Q=0 へ更新!', input: [0, 1], expected: [0] },
    ],
    rewardChip: {
      id: 'D_FF',
      name: 'D_FF',
      shortName: 'DFF',
      titleJa: 'Dフリップフロップ',
      descJa: 'CLKの立ち上がり(0→1)の瞬間だけDを記憶する同期フリップフロップ。',
      color: '#6e459c',
      accent: '#c89bff',
    },
    codexUnlock: ['d_ff_clock'],
  },

  {
    id: 'stage_14',
    number: 14,
    act: 4,
    code: '14',
    title: '4ビット・作業机レジスタ',
    revealedTitle: '4ビット・レジスタ（REG_4B）',
    scene: 'shelter_hub',
    storyBgm: 'story',
    widget: 'register_bank',
    mode: 'sequential',
    incidentBrief: {
      where: '中央制御室・演算データ保持バンク',
      trouble: '1ビットずつではなく「4桁の数字（0〜15）」を丸ごと記憶して、必要な拍だけ書き換えたい！',
      condition: 'CLK立ち上がり時、LOAD=1 なら D0..3 を保存 ／ LOAD=0 なら今の Q0..3 を維持せよ！',
      shortRule: 'MUX_4B と D_FF×4 で、4桁の数値を保持・更新できるレジスタを組め！',
      stakes: 'CPUの計算結果を置いておく超高速な作業机（レジスタ）を完成させる',
    },
    hasClock: true,
    inputs: ['D0', 'D1', 'D2', 'D3', 'LOAD', 'CLK'],
    outputs: ['Q0', 'Q1', 'Q2', 'Q3'],
    pinGroups: {
      inputs: [{ label: 'D', indices: [0, 1, 2, 3] }],
      outputs: [{ label: 'Q', indices: [0, 1, 2, 3] }],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT', 'MUX', 'MUX_4BIT', 'DEC_2TO4', 'SR_LATCH', 'D_LATCH', 'D_FF'],
    plainGoal: 'CLKの立ち上がり時に LOAD=1 なら4桁の数字 D を丸ごと記憶し、LOAD=0 なら今の値 Q を保持し続けるレジスタを作ろう！',
    beginnerNote:
      'ヒント：MUX_4B を使うと超スッキリ！ D_FF の出力 Q を MUX_4B の「A側」へぐるっと戻し、外部入力 D を「B側」へ、SEL に LOAD をつないで4個の D_FF に入れよう！',
    introDialogue: [
      {
        speaker: 'mina',
        text: 'アーク7の生命維持設備が、ほとんど息を吹き返してきたよ……！ ついに地上ハッチの奥に眠ってる探査ローバーの電源にも手が届きそうなんだ！',
      },
      {
        speaker: 'kagari',
        showIncident: true,
        text: 'あと一歩で計算機の中枢がそろうぞ！ 今から作るのは、CPUが4桁の数字（0〜15）を丸ごと覚えておく超高速の作業机——【4ビット・レジスタ】だ！',
      },
      {
        speaker: 'mina',
        text: 'クロックが鳴るたびに毎回上書きされちゃ困るから、「LOAD=1 のときだけ新しい数字 D を取り込み、LOAD=0 なら今の記憶 Q をそのまま維持する」仕組みが必要なのね！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: '目標の動き：4ビット作業机（動く図解）',
          title: '🗂 LOAD=1 で新しい4桁を保存、LOAD=0 で保持！',
          anim: 'goal_reg4',
          rule: 'D_FF はクロックのたびに必ず何かを取り込む。LOAD=0 のときは「何を」取り込ませれば今の値が消えないだろう？',
          accent: '#c89bff',
        },
        text: '『D_FF はクロックが鳴ると毎回入力を取り込んでしまう。LOAD=0 のときは「今の自分の記憶」を選び、LOAD=1 のときは「外の新しい入力 D」を選ぶ切替器を前に置けばいいぞ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：4ビット・レジスタ',
          title: '🗂 MUX_4B ＋ D_FF×4 で循環保持＆更新！',
          anim: 'reg_4bit',
          rule: 'あなたが発見した内部構造を【⚡モジュール図鑑】に登録しました！',
          accent: '#c89bff',
        },
        text: '見事だ！！ 【4ビット・レジスタ】完成！ これでアーク7は「4桁の数字を自由に覚え、守り、好きなタイミングで書き換える」能力を取り戻した！',
      },
      {
        speaker: 'mina',
        text: 'いよいよ地上探査ローバーの制御と、中央コアの再起動が目の前まで来たね……！',
      },
    ],
    hints: [
      '【考え方】各ビット i で、LOAD=0なら今の Q[i]、LOAD=1なら新しい D[i] を選び、それを D_FF に入れます！',
      '【構成】MUX_4B を1個（または MUX を4個）＋ D_FF を4個使います。全 D_FF の CLK は外部 CLK へ共通接続！',
      '【手順】D_FF0..3 の出力を Q0..3 と同時に MUX_4B の A0..A3 へ戻す → 外部 D0..D3 を MUX_4B の B0..B3 へ → LOAD を MUX_4B.SEL へ → MUX_4B.Y0..3 を D_FF0..3 の D へ！',
    ],
    tests: [
      reg4Cycle('① 5 を保存 (D=5, LOAD=1, CLK↑)', 5, 1, 5),
      reg4Cycle('② 保持確認 (D=12, LOAD=0, CLK↑ → 5のまま)', 12, 0, 5),
      reg4Cycle('③ 11 を保存 (D=11, LOAD=1, CLK↑)', 11, 1, 11),
      reg4Cycle('④ 保持確認 (D=0, LOAD=0, CLK↑ → 11のまま)', 0, 0, 11),
      reg4Cycle('⑤ 0 を保存 (D=0, LOAD=1, CLK↑)', 0, 1, 0),
    ],
    rewardChip: {
      id: 'REG_4BIT',
      name: 'REG_4B',
      shortName: 'REG4',
      titleJa: '4ビット・レジスタ',
      descJa: 'LOAD=1のときCLK立ち上がりで4ビット値を保存・保持する作業机レジスタ。',
      color: '#6e459c',
      accent: '#c89bff',
    },
    codexUnlock: ['register_4bit'],
  },

  // =========================================================================
  // ACT V — ALU, PROGRAM COUNTER & ARK-4 CPU CORE
  // =========================================================================
  {
    id: 'stage_15',
    number: 15,
    act: 5,
    code: '15',
    title: 'ローバー演算心臓・加減算ALU',
    revealedTitle: '4ビット加減算ALU（ALU_4B）',
    scene: 'surface_rover',
    storyBgm: 'story',
    widget: 'rover_alu',
    mode: 'combinational',
    incidentBrief: {
      where: '地上探査ローバー「NOMAD-3」遠隔通信卓',
      trouble: '地上ローバーが瓦礫との距離を測るのに「足し算」だけでなく「引き算」も必要になった！',
      condition: 'SUB=0 なら足し算(A + B) ／ SUB=1 なら引き算(A − B) を 1つの回路で計算せよ！',
      shortRule: 'XOR×4 と ADD_4B で「足し算(SUB=0)／引き算(SUB=1)」両対応のALUを組め！',
      stakes: '42年ぶりの地上探査ローバーを安全に走らせ、地上の空と中継塔へ近づく',
    },
    inputs: ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', 'SUB'],
    outputs: ['Y0', 'Y1', 'Y2', 'Y3', 'COUT'],
    pinGroups: {
      inputs: [
        { label: 'A', indices: [0, 1, 2, 3] },
        { label: 'B', indices: [4, 5, 6, 7] },
      ],
      outputs: [{ label: 'Y', indices: [0, 1, 2, 3] }],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT', 'MUX', 'MUX_4BIT', 'DEC_2TO4', 'SR_LATCH', 'D_LATCH', 'D_FF', 'REG_4BIT'],
    plainGoal: 'SUB=0 なら足し算（A + B）、SUB=1 なら引き算（A − B）を行う万能演算ユニットを作ろう！',
    beginnerNote:
      '【CS最大の魔法：2の補数】引き算は「Bの全ビットを反転して +1 を足す」だけで足し算器が計算してくれる！ XOR(B, SUB) は SUB=1 のときだけ B を反転する魔法のスイッチ！',
    introDialogue: [
      {
        speaker: 'mina',
        text: '……見て！！ 地上ハッチの奥に眠ってた太陽光ローバーのカメラが、42年ぶりに目を覚ましたよ！！ 画面の向こう……あれが、本物の「夕焼けの空」なんだね……！',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: '遠くに戦前の電波中継塔も見える！ ローバーをあそこまで動かしたいんだけど、瓦礫との距離を計算するには「足し算」だけじゃなくて「引き算」も必要なの。引き算用の回路も一から作り直すのかな？',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '目標の動き：足し算と引き算の切替（動く図解）',
          title: '✨ SUB=0 で A+B ／ SUB=1 で A−B を計算！',
          anim: 'goal_alu',
          rule: 'ヒント：引き算は「Bの全ビットを反転して +1 足す」だけで ADD_4B がそのまま計算してくれる！',
          accent: '#ff8a7a',
        },
        text: 'ふふふ、ここがコンピュータ科学で一番ゾクゾクする魔法だ！ 引き算専用回路なんていらない。実は【Bの0と1を全部ひっくり返して、さらに1を足す】だけで、さっきの ADD_4B がそのまま引き算をしてしまうんだ！',
      },
      {
        speaker: 'hako',
        text: '『SUB=0 のときは B をそのまま通し、SUB=1 のときだけ B を反転させるにはどのゲートが使える？ あとは「+1」を ADD_4B のどこから足すかが鍵だ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'うそ……7-2=5、10-6=4、足し算も引き算も1つの回路で動いた！ 地上ローバーの障害物距離計算がオンラインになったよ！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：4ビットALU',
          title: '✨ XOR×4 で条件反転 ＋ CIN=1 で 2の補数減算！',
          anim: 'alu_twos_comp',
          rule: 'あなたが発見した内部構造を【⚡モジュール図鑑】に登録しました！',
          accent: '#ff8a7a',
        },
        text: 'これが【2の補数】と【ALU（算術論理演算装置）】の真骨頂だ！ フォン・ノイマンら先人たちが惚れ込んだ、数学と電気回路の最も美しい結婚だよ。',
      },
    ],
    hints: [
      '【考え方】XOR(B[i], SUB) は SUB=0 のとき B[i] そのまま、SUB=1 のとき NOT(B[i]) になります！ さらに SUB を ADD_4B の CIN へつなぐと「A + (~B) + 1 = A − B」！',
      '【構成】XOR を4個、ADD_4B を1個（たった5チップ！）使います。',
      '【手順】A0..A3 → ADD_4B.A0..A3。各 B0..B3 と SUB を XOR0..3 へ入れ、出力を ADD_4B.B0..B3 へ。SUB を ADD_4B.CIN へ。ADD_4B の出力をそのまま Y0..Y3, COUT へ！',
    ],
    tests: [
      alu4Case(4, 3, 0),
      alu4Case(9, 6, 0),
      alu4Case(12, 7, 0),
      alu4Case(7, 2, 1),
      alu4Case(10, 6, 1),
      alu4Case(5, 5, 1),
      alu4Case(15, 1, 1),
      alu4Case(3, 5, 1),
    ],
    rewardChip: {
      id: 'ALU_4BIT',
      name: 'ALU_4B',
      shortName: 'ALU4',
      titleJa: '4ビット加減算ALU',
      descJa: 'SUB=0でA+B、SUB=1でA-Bを計算するCPUの演算心臓部。',
      color: '#a8423b',
      accent: '#ff8a7a',
    },
    codexUnlock: ['alu_twos_comp'],
  },

  {
    id: 'stage_16',
    number: 16,
    act: 5,
    code: '16',
    title: '手順を刻む歩み・プログラムカウンタ',
    revealedTitle: 'プログラムカウンタ（PC_4B）',
    scene: 'surface_rover',
    storyBgm: 'story',
    widget: 'program_counter',
    mode: 'sequential',
    incidentBrief: {
      where: '地上ローバー自律航行ユニット',
      trouble: '電波が遅れる地上では手動操作が間に合わない！ 機械が自分で手順（0→1→2…）を進め、必要ならジャンプしたい',
      condition: 'CLKごとに自動で「+1」、JMP=1 のときは指定番地 J へ飛び移れ！',
      shortRule: 'ADD_4B＋MUX_4B＋REG_4B で、毎拍+1＆ジャンプできるプログラムカウンタを組め！',
      stakes: '命令を順番に追いかけ続けるCPUの司令塔を完成させる',
    },
    hasClock: true,
    inputs: ['J0', 'J1', 'J2', 'J3', 'JMP', 'CLK'],
    outputs: ['Q0', 'Q1', 'Q2', 'Q3'],
    pinGroups: {
      inputs: [{ label: 'JUMP先', indices: [0, 1, 2, 3] }],
      outputs: [{ label: 'PC番地', indices: [0, 1, 2, 3] }],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT', 'MUX', 'MUX_4BIT', 'DEC_2TO4', 'SR_LATCH', 'D_LATCH', 'D_FF', 'REG_4BIT', 'ALU_4BIT'],
    plainGoal: 'CLKのたびに「今の番地+1」へ自動で進み、JMP=1 のときは指定番地 J へ飛び移るプログラムカウンタを作ろう！',
    beginnerNote:
      'このステージからパレットの「アース0（いつも0）」と「でんち（いつも1）」も使えます！ REG_4B の値に ADD_4B で +1 し、MUX_4B で通常(+1)とジャンプ(J)を切り替えて REG_4B へ戻そう！',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: 'ローバーが瓦礫の間をゆっくり進み始めたよ！ でもね、厚い火山岩盤のせいで地上との通信に遅れがあるの……。手動で1歩ずつ指示するんじゃなくて、機械が自分で「次の手順」へ進み続けられるようにできないかな？',
      },
      {
        speaker: 'kagari',
        text: 'コンピュータが人間なしで自律して動く秘密——それは「今は何行目の命令を実行しているか」を自分で数え進める【プログラムカウンタ（PC）】にある！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '目標の動き：手順を刻むカウンタ（動く図解）',
          title: '🏃 毎拍 +1 で進み、JMP=1 で指定番地 J へ飛ぶ！',
          anim: 'goal_pc',
          rule: '現在の番地を覚えるチップ、+1 を足すチップ、通常(+1)とジャンプ先(J)を切り替えるチップを組み合わせよう！',
          accent: '#ff8a7a',
        },
        text: 'クロックが1拍打つたびに、今の番号に「+1」して 0→1→2→3… と進む。さらにジャンプ命令（JMP=1）が来たら指定番地（J）へ飛び移る——これがループや条件分岐の正体だ！',
      },
      {
        speaker: 'hako',
        text: '『このステージからパレットの「アース0（いつも0）」「でんち（いつも1）」も使えるぞ。これまでに作った4ビット部品3つを組み合わせれば組める！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '0、1、2、3……そしてJMPで一気に10番地へ飛んで、11、12！ 機械が自分で手順を追いかけてる……！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：プログラムカウンタ',
          title: '🏃 REG_4B → ADD_4B(+1) → MUX_4B(JMP) の循環！',
          anim: 'pc_loop',
          rule: 'あなたが発見した内部構造を【⚡モジュール図鑑】に登録しました！',
          accent: '#ff8a7a',
        },
        text: '素晴らしい！ これで部品はすべて揃った。次が最終工程——君が砂とNANDから組み上げたすべての結晶を束ね、アーク7の新中枢CPU【ARK-4】を起動するぞ！',
      },
    ],
    hints: [
      '【考え方】現在の値 Q を ADD_4B(A=Q, B=0000, CIN=1) に通すと Q+1 が出ます。それを MUX_4B で J と切り替え、LOAD=1 固定の REG_4B へ戻せば完成！',
      '【構成】ADD_4B、MUX_4B、REG_4B を各1個 ＋「アース0（いつも0）」と「でんち（いつも1）」！',
      '【手順】REG_4B.Q0..3 → 外部Q0..3 かつ ADD_4B.A0..3。アース0 → ADD_4B.B0..3。でんち → ADD_4B.CIN と REG_4B.LOAD。ADD_4B.S0..3 → MUX_4B.A0..3、外部J0..3 → MUX_4B.B0..3、JMP → MUX_4B.SEL。MUX_4B.Y0..3 → REG_4B.D0..3、CLK → REG_4B.CLK！',
    ],
    tests: [
      pc4Cycle('① 0番地へ初期化 (J=0, JMP=1)', 0, 1, 0),
      pc4Cycle('② 自動カウント +1 (JMP=0 → 1)', 0, 0, 1),
      pc4Cycle('③ 自動カウント +1 (JMP=0 → 2)', 0, 0, 2),
      pc4Cycle('④ 自動カウント +1 (JMP=0 → 3)', 0, 0, 3),
      pc4Cycle('⑤ 10番地へジャンプ! (J=10, JMP=1 → 10)', 10, 1, 10),
      pc4Cycle('⑥ ジャンプ先から +1 (JMP=0 → 11)', 0, 0, 11),
      pc4Cycle('⑦ 15番地へジャンプ (J=15, JMP=1 → 15)', 15, 1, 15),
      pc4Cycle('⑧ 15の次は0へ戻る (JMP=0 → 0)', 0, 0, 0),
    ],
    rewardChip: {
      id: 'PC_4BIT',
      name: 'PC_4B',
      shortName: 'PC4',
      titleJa: '4ビット・プログラムカウンタ',
      descJa: '毎クロック+1ずつ番地を進め、JMPで任意番地へ飛ぶCPUの司令塔。',
      color: '#a8423b',
      accent: '#ff8a7a',
    },
    codexUnlock: ['program_counter'],
  },

  {
    id: 'stage_17',
    number: 17,
    act: 5,
    code: '17',
    title: '最終起動：自作CPU「ARK-4」',
    revealedTitle: 'アキュムレータCPUコア（ARK-4）',
    scene: 'surface_rover',
    storyBgm: 'finale',
    widget: 'ark4_finale',
    mode: 'sequential',
    incidentBrief: {
      where: 'アーク7 中枢コア＆地上通信ビーコン塔',
      trouble: '地上中継塔へ復興電文を発信するには、6行の起動プログラムを自律実行できる中枢CPUが不可欠！',
      condition: 'ALU_4B・MUX_4B・REG_4B を環に結び、LDI / ADD / SUB / NOP の4命令を連続実行せよ！',
      shortRule: '3大自作チップ（ALU_4B・MUX_4B・REG_4B）を結合し、自作CPU「ARK-4」を起動せよ！',
      stakes: '他の生存シェルターへ「HELLO, WORLD.」を届け、人類の文明を再起動する',
    },
    hasClock: true,
    isFinale: true,
    inputs: ['IMM0', 'IMM1', 'IMM2', 'IMM3', 'OP', 'SET', 'WE', 'CLK'],
    outputs: ['ACC0', 'ACC1', 'ACC2', 'ACC3'],
    pinGroups: {
      inputs: [{ label: '数値 IMM', indices: [0, 1, 2, 3] }],
      outputs: [{ label: '計算結果 ACC', indices: [0, 1, 2, 3] }],
    },
    pinHelp: {
      inputs: [
        'IMM0..3: 命令に書かれた数値 (0〜15)',
        'OP: 0=足し算(ADD) / 1=引き算(SUB)',
        'SET: 1=数値IMMをそのまま代入(LDI) / 0=計算結果を使う',
        'WE: 1=命令を実行して保存 / 0=何もしない(NOP)',
        'CLK: システムクロック',
      ],
      outputs: ['ACC0..3: CPU内部の計算値（アキュムレータ）'],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT', 'MUX', 'MUX_4BIT', 'DEC_2TO4', 'SR_LATCH', 'D_LATCH', 'D_FF', 'REG_4BIT', 'ALU_4BIT', 'PC_4BIT'],
    plainGoal: 'ALU_4B・MUX_4B・REG_4B の3大自作チップを結合し、LDI / ADD / SUB / NOP の4命令を連続実行するCPUコアを起動せよ！',
    beginnerNote:
      'あなたの集大成！ ALU_4B が「現在のACCとIMM」を計算し、MUX_4B が「計算結果か、直接代入(SET)か」を選び、REG_4B が「WE=1のときクロックで保存」します！',
    introDialogue: [
      {
        speaker: 'kagari',
        text: 'ついにここまで来たね、見習い君。最初は砂（シリコン）と抵抗のしくみすら知らなかった君が、物理の法則からNANDを生み出し、加算器も、バスも、記憶回路も、ALUもすべて自分の手で組み上げた。',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: '地上中継塔への救難・復興ビーコン、送信準備完了してるよ！ あとは【ARK-4 CPUコア】が6行の起動プログラムを最後まで計算し切れば、地下シェルター・アーク7は再び世界と繋がる……！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: '最終ミッション：ARK-4 CPUの目標動作（動く図解）',
          title: '🧠 LDI(代入) / ADD(加算) / SUB(減算) / NOP(保持) を実行！',
          anim: 'goal_ark4',
          rule: '計算するチップ、直接代入と計算結果を切り替えるチップ、WE=1のとき保存するチップをひとつの環に結ぼう！',
          accent: '#ffbe76',
        },
        text: '『最後の配線だ。お前がこれまでに鍛え上げた4ビットの主力チップたちをひとつの環に結べ。お前が積み上げた数百個のNANDゲートすべてが、いまひとつの頭脳として目を覚ます』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'hako',
        visualCard: {
          tag: 'モジュール図鑑へ登録：ARK-4 CPUコア',
          title: '🧠 REG_4B → ALU_4B → MUX_4B の頭脳ループ完成！',
          anim: 'ark4_cpu',
          rule: '全21種のモジュール図鑑コンプリート達成！',
          accent: '#ffbe76',
        },
        text: '『……全命令シーケンス正常完了。LDI 5 → ADD 3 → SUB 2 → NOP → ADD 7 → SUB 13 → ZERO。中枢コア ARK-4、完全起動を確認。地上ビーコン発信開始——送信電文："HELLO, WORLD."』',
      },
      {
        speaker: 'mina',
        text: '……っ！ 見て、地上の中継塔が光った！！ 他のシェルターから応答信号が返ってきてる！！ 私たち、生き残ったんだ……もう一度、文明を始められるんだね！！',
      },
      {
        speaker: 'kagari',
        text: 'おめでとう、アーク7主任技師。もう「見習い」じゃない。君はいま、人類が100年かけて築いたコンピュータ科学のすべてを、たった1粒の砂と1個のNANDから自分の手で再発明したんだ。胸を張っていい！',
      },
    ],
    hints: [
      '【考え方】1) ALU_4B に「今のACC」と「IMM」と「OP(SUB)」を入れる → 2) MUX_4B で「ALU出力(A側)」と「IMMそのまま(B側)」を SET で切り替える → 3) REG_4B に WE と CLK をつないで保存し、出力を ACC かつ ALU へ戻す！',
      '【構成】使う自作チップはたった3個！ ALU_4B × 1、MUX_4B × 1、REG_4B × 1！',
      '【手順】REG_4B.Q0..3 → 外部ACC0..3 かつ ALU_4B.A0..3。IMM0..3 → ALU_4B.B0..3 かつ MUX_4B.B0..3。OP → ALU_4B.SUB。ALU_4B.Y0..3 → MUX_4B.A0..3。SET → MUX_4B.SEL。MUX_4B.Y0..3 → REG_4B.D0..3。WE → REG_4B.LOAD、CLK → REG_4B.CLK！',
    ],
    tests: [
      ark4Cycle('命令1: LDI 5 (ACC ← 5)', 5, 0, 1, 1, 5),
      ark4Cycle('命令2: ADD 3 (5 + 3 → 8)', 3, 0, 0, 1, 8),
      ark4Cycle('命令3: SUB 2 (8 − 2 → 6)', 2, 1, 0, 1, 6),
      ark4Cycle('命令4: NOP (保持 → 6のまま)', 9, 0, 0, 0, 6),
      ark4Cycle('命令5: ADD 7 (6 + 7 → 13)', 7, 0, 0, 1, 13),
      ark4Cycle('命令6: SUB 13 (13 − 13 → 0 起動完了!)', 13, 1, 0, 1, 0),
    ],
    rewardChip: {
      id: 'ARK4_CORE',
      name: 'ARK4_CPU',
      shortName: 'CPU',
      titleJa: 'ARK-4 CPUコア',
      descJa: 'LDI / ADD / SUB / NOP命令を実行する自作4ビットCPU中枢コア。',
      color: '#c44536',
      accent: '#ffbe76',
    },
    codexUnlock: ['ark4_cpu'],
  },

  // =========================================================================
  // CHAPTER II — ACT VI: FROM HARDWARE TO MACHINE CODE & CONDITIONAL BRANCH
  // =========================================================================
  {
    id: 'stage_18',
    number: 18,
    act: 6,
    chapter: 2,
    code: '18',
    title: 'ゼロを見抜く目・差圧検知器',
    revealedTitle: '4ビット・ゼロ検知器（ZERO_4B）',
    scene: 'surface_rover',
    storyBgm: 'crisis',
    widget: 'memory_vault',
    mode: 'combinational',
    incidentBrief: {
      where: 'B1 地上大ハッチ・気圧均衡エアロック盤',
      trouble: 'アーク3からの緊急通信で「頭上の氷河湖が決壊寸前、地上へ脱出せよ」と判明！ だが内外の気圧差が0になる前にハッチを開けると急減圧で危険！',
      condition: '4ビットの差圧値（A0..A3）がすべて 0（0000）になった瞬間だけ Z=1 を出力せよ！',
      shortRule: '差圧センサーの4ビット入力 A0..3 を監視し、「0000 のときだけ Z=1」を出すゼロ検知回路を主任技師として設計せよ！',
      stakes: '計算結果が「ぴったり0になった瞬間」を機械自身が見抜く『目（ゼロフラグ）』を創る',
    },
    inputs: ['A0', 'A1', 'A2', 'A3'],
    outputs: ['Z'],
    pinGroups: {
      inputs: [{ label: '差圧 A', indices: [0, 1, 2, 3] }],
    },
    pinHelp: {
      inputs: ['A0〜A3: ALUで引き算した気圧差（4ビット 0〜15）'],
      outputs: ['Z: 4本すべて 0（差圧ゼロ！）のときだけ 1'],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT', 'MUX', 'MUX_4BIT', 'DEC_2TO4', 'SR_LATCH', 'D_LATCH', 'D_FF', 'REG_4BIT', 'ALU_4BIT', 'PC_4BIT', 'ARK4_CORE'],
    plainGoal: '4本の入力 A0〜A3 がすべて 0（0000）のときだけ Z=1 を出し、1本でも 1 があれば Z=0 を出す「ゼロ検知器」を設計しよう！',
    beginnerNote:
      '第一章であなたが鍛え上げた基本論理チップ（NOT / AND / OR / XOR など）がすべてパレットに揃っています。仕様書（📋仕様）を確認して設計し、ヒントが必要なときは「💡ヒント」を開こう！',
    introDialogue: [
      {
        speaker: 'hako',
        text: '『おはよう、アーク7主任技師。まずは朝の施設稼働ログを報告する──B3酸素ファン正常、中央配給ターミナル集計誤差0件、岩盤監視盤は「夜間の揺れ1件・記憶保持→朝点検済み」だ。お前が直した設備はすべて順調に動いているぞ』',
      },
      {
        speaker: 'mina',
        text: '主任さん、大変！！ さっき地上ビーコン（"HELLO, WORLD."）に応答してくれた海沿いの生存シェルター『アーク3』から、緊急通信が入ったの！！',
      },
      {
        speaker: 'hako',
        text: '『アーク3通信官カイより入電──「こちらアーク3！ 地上の放射能雲はすでに晴れ、本物の青空が戻っている！ ……だが聞け、お前たちアーク7の真上にある旧地熱ダムの氷河湖が、融雪で今夜にも決壊する！ 地下400mが水没する前に、地上大ハッチを開けて高台へ出ろ！」』',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: '地上に青空が戻ってる……！ でも主任さん、B1の地上大ハッチは42年間閉ざされたままだから、現場の差圧計を見に行ったら、シェルター内と外気の【気圧の差（A0〜A3）】がぴったり「0」になった瞬間を見極めないと、急減圧で子どもたちの耳や肺が傷ついちゃうの！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: 'ハコ信号観測：4ビット差圧ゼロ検知仕様（動く図解）',
          title: '👁 差圧 A0..A3 が「0000」の瞬間だけ Z=1 を出せ！',
          anim: 'goal_zero4',
          rule: '入力 A0, A1, A2, A3 のうち1本でも 1 があれば Z=0、4本すべてが 0（0000）のときだけ Z=1 を出力せよ！',
          accent: '#56ccf2',
        },
        text: '『エアロック制御盤の信号仕様を観測したぞ。入力は ALU_4B が引き算した気圧差の4ビット（A0〜A3）、出力は開門許可フラグの Z（1ビット）だ。どのマイモジュールを組み合わせるか、主任のお前が決めて試験を実行しろ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '差圧 A0〜A3 が 0000 になった瞬間だけ、青い Z ランプがピタッと光った！！ さすが主任さん、これなら気圧が揃った瞬間を絶対に見逃さないよ！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：4ビット・ゼロ検知器',
          title: '👁 OR×3 ＋ NOT で「0000」を一発検知！',
          anim: 'zero_flag_4b',
          rule: 'あなたが設計したマイモジュール【ZERO_4B】を図鑑とパレットに登録しました！',
          accent: '#56ccf2',
        },
        text: '見事な設計だ、主任！ このマイモジュール【ZERO_4B】こそ、CPUに「結果を見て判断する力」を与える【ゼロフラグ】だ。引き算の答えが 0 だと分かれば、「2つの数が一致した！」と機械が自分で気づけるようになるんだよ。',
      },
    ],
    hints: [
      '【考え方】まず「A0〜A3 のうち、どれか1本でも 1 があるか」を OR で調べます。それを最後に NOT で反転すれば「1本も 1 がない（＝全部0）」のときだけ 1 が出ます！',
      '【構成】マイモジュール OR を3個、NOT を1個（合計4チップ）使います！',
      '【手順】1) OR①(A0, A1) と OR②(A2, A3) を作る → 2) その2つの出力を OR③ に入れる → 3) OR③ の出力を NOT に入れて Z へつなぐ！',
    ],
    tests: [
      { label: '差圧 0 (0000) → ゼロ検知 Z=1!', input: [0, 0, 0, 0], expected: [1] },
      { label: '差圧 1 (0001) → まだ非ゼロ Z=0', input: [1, 0, 0, 0], expected: [0] },
      { label: '差圧 2 (0010) → まだ非ゼロ Z=0', input: [0, 1, 0, 0], expected: [0] },
      { label: '差圧 4 (0100) → まだ非ゼロ Z=0', input: [0, 0, 1, 0], expected: [0] },
      { label: '差圧 8 (1000) → まだ非ゼロ Z=0', input: [0, 0, 0, 1], expected: [0] },
      { label: '差圧 5 (0101) → まだ非ゼロ Z=0', input: [1, 0, 1, 0], expected: [0] },
      { label: '差圧 15 (1111) → まだ非ゼロ Z=0', input: [1, 1, 1, 1], expected: [0] },
    ],
    rewardChip: {
      id: 'ZERO_4BIT',
      name: 'ZERO_4B',
      shortName: 'Z4',
      titleJa: '4ビット・ゼロ検知器',
      descJa: '4ビットすべてが0(0000)のときだけZ=1を出すゼロフラグ検知モジュール。',
      color: '#1e6b8c',
      accent: '#56ccf2',
    },
    codexUnlock: ['zero_flag_branch'],
  },

  {
    id: 'stage_19',
    number: 19,
    act: 6,
    chapter: 2,
    code: '19',
    title: 'もし0なら飛べ・条件分岐',
    revealedTitle: '条件分岐カウンタ（COND_PC）',
    scene: 'machinery',
    storyBgm: 'crisis',
    widget: 'program_counter',
    mode: 'sequential',
    incidentBrief: {
      where: 'B1 地上大ハッチ・氷結ボルト融解制御盤',
      trouble: 'ハッチの凍結ボルトを溶かすヒーター手順を自動で繰り返したいが、今の PC_4B は「氷が溶け切った（値=0）瞬間だけ次へ飛ぶ」という判断ができない！',
      condition: '普段は毎拍 +1 進み、「分岐命令 BR=1 かつ 値 V=0」の瞬間だけ指定番地 J へジャンプせよ！',
      shortRule: '計算値 V0..3 と分岐指示 BR から、「BR=1 かつ V=0 のときだけ J0..3 へ飛ぶ」条件分岐カウンタを設計せよ！',
      stakes: '機械に「もし0ならジャンプせよ（if文とループ）」の判断力を授ける',
    },
    hasClock: true,
    inputs: ['V0', 'V1', 'V2', 'V3', 'J0', 'J1', 'J2', 'J3', 'BR', 'CLK'],
    outputs: ['PC0', 'PC1', 'PC2', 'PC3'],
    pinGroups: {
      inputs: [
        { label: '計算値 V', indices: [0, 1, 2, 3] },
        { label: '飛び先 J', indices: [4, 5, 6, 7] },
      ],
      outputs: [{ label: 'PC番地', indices: [0, 1, 2, 3] }],
    },
    pinHelp: {
      inputs: [
        'V0..3: 今の計算結果（0かどうか調べる値）',
        'J0..3: ジャンプ先の命令番地 (0〜15)',
        'BR: 条件分岐フラグ（1=もしVが0なら飛べ / 0=通常の+1進行）',
        'CLK: システムクロック',
      ],
      outputs: ['PC0..3: 次に実行する命令の行番号（0〜15）'],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT', 'MUX', 'MUX_4BIT', 'DEC_2TO4', 'SR_LATCH', 'D_LATCH', 'D_FF', 'REG_4BIT', 'ALU_4BIT', 'PC_4BIT', 'ARK4_CORE', 'ZERO_4BIT'],
    plainGoal: '普段はクロックごとに「+1」進み、「BR=1 かつ V=0」のときだけ指定番地 J へジャンプする条件分岐カウンタを設計しよう！',
    beginnerNote:
      'さっき作ったばかりの【ZERO_4B】と、第一章の【PC_4B】がパレットに入っています。いつ PC_4B の JMP ピンを 1 にすべきか考えて結線しよう！',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: '主任さん、B1ハッチの現場から報告だよ！ 地上ハッチの分厚いロックボルトが42年間の氷でガチガチに凍りついてて、電磁ヒーターで「氷の厚さが 0 になるまで」加熱手順を繰り返さないと開かないんだ！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: 'ハコ信号観測：条件つきジャンプ JZ の仕様（動く図解）',
          title: '🧭「BR=1 かつ 値V=0」の瞬間だけ J番地へ飛ぶ！',
          anim: 'goal_cond_pc',
          rule: 'BR=0 のとき、または BR=1 でも V≠0 のときは +1 進み、「BR=1 かつ V=0000」のときだけ飛び先 J0..3 をロードする！',
          accent: '#56ccf2',
        },
        text: '『主任、制御盤のピン配列を報告する。入力は現在の計算値 V0..3、飛び先番地 J0..3、分岐フラグ BR、それにクロック CLK だ。既存の PC_4B とさっき鍛造した ZERO_4B をどう繋げばこの条件分岐が動くか、設計を決裁してくれ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'すごいよ主任さん！！ Vが3のときは分岐命令（BR=1）が来ても無視して次へ進んだのに、Vが 0 になった瞬間だけパッと10番地へジャンプした！！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：条件分岐カウンタ',
          title: '🧭 ZERO_4B ＋ AND ＋ PC_4B で「if文」が誕生！',
          anim: 'cond_branch_pc',
          rule: 'あなたが設計したマイモジュール【COND_PC】を図鑑とパレットに登録しました！',
          accent: '#56ccf2',
        },
        text: '素晴らしいぞ、主任！ いま君がマイモジュールを繋いだこの瞬間、機械に『もし0ならジャンプせよ（JZ：Jump if Zero）』──あらゆるプログラムの魂である【条件分岐（if文）とループ】が宿ったんだ！',
      },
    ],
    hints: [
      '【考え方】V0..3 を ZERO_4B に入れると「V=0 のときだけ 1」が出ます。それと BR を AND に入れれば「BR=1 かつ V=0 のときだけ JMP=1」になります！',
      '【構成】使うマイモジュールは ZERO_4B × 1、AND × 1、PC_4B × 1 のたった3個です！',
      '【手順】1) V0..3 → ZERO_4B.A0..3 → 2) ZERO_4B.Z と BR を AND へ → 3) AND.OUT → PC_4B.JMP、J0..3 → PC_4B.J0..3、CLK → PC_4B.CLK、PC_4B.Q0..3 → PC0..3！',
    ],
    tests: [
      condPcCycle('① 0番地へ初期化 (V=0, J=0, BR=1 → 0番地)', 0, 0, 1, 0),
      condPcCycle('② 通常進行 (V=5, J=10, BR=0 → 1番地)', 5, 10, 0, 1),
      condPcCycle('③ 分岐命令だがV=3≠0! (V=3, J=10, BR=1 → 飛ばず2番地!)', 3, 10, 1, 2),
      condPcCycle('④ V=0達成で分岐発火! (V=0, J=10, BR=1 → 10番地へ飛躍!)', 0, 10, 1, 10),
      condPcCycle('⑤ V=0だが通常行(BR=0) (V=0, J=4, BR=0 → 11番地)', 0, 4, 0, 11),
      condPcCycle('⑥ V=0かつBR=1で0番地へループ! (V=0, J=0, BR=1 → 0番地)', 0, 0, 1, 0),
    ],
    rewardChip: {
      id: 'COND_PC',
      name: 'COND_PC',
      shortName: 'CPC',
      titleJa: '条件分岐カウンタ',
      descJa: 'BR=1かつV=0のときだけ指定番地Jへジャンプ(JZ)する条件分岐プログラムカウンタ。',
      color: '#1e6b8c',
      accent: '#56ccf2',
    },
    codexUnlock: ['zero_flag_branch'],
  },

  {
    id: 'stage_20',
    number: 20,
    act: 6,
    chapter: 2,
    code: '20',
    title: '機械語を翻訳せよ・命令デコーダ',
    revealedTitle: 'アセンブリ命令デコーダ（INST_DEC）',
    scene: 'shelter_hub',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'combinational',
    incidentBrief: {
      where: '中央制御室・命令翻訳ユニット',
      trouble: 'ARK4_CPU を動かすには OP・SET・WE・BR の4本のレバーを毎回手動で切り替える必要があり、プログラム表の2ビット命令コード（00〜11）をそのまま実行できない！',
      condition: '2ビットの命令番号 (I0, I1) を解読し、00=LDI / 01=ADD / 10=SUB / 11=JZ に対応する OP・SET・WE・BR を自動出力せよ！',
      shortRule: '2ビット機械語 (I0, I1) から4本のCPU制御信号 (OP, SET, WE, BR) へ変換する命令デコーダを設計せよ！',
      stakes: '0と1の「機械語」と人間の言葉「アセンブリ言語」をCPU回路に直結する',
    },
    inputs: ['I0', 'I1'],
    outputs: ['OP', 'SET', 'WE', 'BR'],
    pinHelp: {
      inputs: [
        'I0: 命令番号 1の位 (00=0:LDI, 10=1:ADD, 01=2:SUB, 11=3:JZ)',
        'I1: 命令番号 2の位',
      ],
      outputs: [
        'OP: 引き算フラグ（2番 SUB のときだけ 1）',
        'SET: 直接代入フラグ（0番 LDI のときだけ 1）',
        'WE: レジスタ書込フラグ（0番 LDI・1番 ADD・2番 SUB のとき 1 ／ 3番 JZ のときだけ 0）',
        'BR: 条件ジャンプフラグ（3番 JZ のときだけ 1）',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT', 'MUX', 'MUX_4BIT', 'DEC_2TO4'],
    plainGoal: '2ビットの命令番号（I0, I1）を解読して、CPUを動かす4本の制御信号（OP, SET, WE, BR）に自動翻訳する命令デコーダを作ろう！',
    beginnerNote:
      '「2ビットの番号（0〜3番）から該当する1本を選ぶ」といえば、地下2階の水耕栽培室で作ったあのマイモジュールが使えます。仕様書（📋仕様）の真理値表を見て配線しよう！',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: '主任さん、これで「計算する心臓（ARK4_CPU）」と「0ならジャンプする司令塔（COND_PC）」が揃ったよ！ ……でも、Stage 17でCPUを動かしたときは `OP`・`SET`・`WE` のスイッチを毎回人間がバラバラに切り替えてたよね？',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: 'ハコ信号観測：2ビット機械語と制御線の対応表（動く図解）',
          title: '🗣 機械語（00〜11）を4本の制御線（OP, SET, WE, BR）へ翻訳！',
          anim: 'goal_inst_dec',
          rule: '0番(0,0)=LDI[SET=1,WE=1] ／ 1番(1,0)=ADD[WE=1] ／ 2番(0,1)=SUB[OP=1,WE=1] ／ 3番(1,1)=JZ[WE=0,BR=1]！',
          accent: '#56ccf2',
        },
        text: '『主任、命令コードの仕様表をまとめたぞ！\n・0番 `(I0=0, I1=0)` ＝ **LDI**（代入：SET=1, WE=1）\n・1番 `(I0=1, I1=0)` ＝ **ADD**（加算：OP=0, WE=1）\n・2番 `(I0=0, I1=1)` ＝ **SUB**（減算：OP=1, WE=1）\n・3番 `(I0=1, I1=1)` ＝ **JZ**（値を変えずに WE=0、0なら飛べ BR=1）\n2ビットの番号から4本の線を振り分けるにはどのチップを使うか、主任の判断で組んでくれ！』',
      },
      {
        speaker: 'mina',
        text: 'ちなみに今朝も地下2階の水耕栽培室を通ってきたら、前に直した散水システムが0〜3番のレタス棚へ順番にお水をあげてたよ！ あのときの仕組みがここでも役に立つかも……！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '水耕室の散水バルブを選んでいたあの【DEC2_4】が、そのままアセンブリ言語の命令（LDI / ADD / SUB / JZ）をCPUの電気信号に翻訳する通訳さんになった……！ さすが主任さん、全部がつながってるんだね！！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：アセンブリ命令デコーダ',
          title: '🗣 DEC2_4 ＋ NOT で機械語とアセンブリを直結！',
          anim: 'inst_decoder',
          rule: 'あなたが設計したマイモジュール【INST_DEC】を図鑑とパレットに登録しました！',
          accent: '#56ccf2',
        },
        text: 'これで「人間の言葉（アセンブリ言語 LDI/ADD/SUB/JZ）」と「0と1の番号（機械語）」と「CPUの物理スイッチ」が1本の線で完全に繋がったぞ、主任！ さあ、次で3大モジュールを1つに統合して完全体コンピュータを起動しよう！',
      },
    ],
    hints: [
      '【考え方】DEC2_4(I0, I1) の出力は Y0=0番(LDI), Y1=1番(ADD), Y2=2番(SUB), Y3=3番(JZ) です。つまり SET=Y0、OP=Y2、BR=Y3 そのもの！ そして WE は「JZ(Y3)じゃないとき1」なので NOT(Y3) です！',
      '【構成】使うマイモジュールは DEC2_4 × 1、NOT × 1 のたった2個だけです！（OR×2で Y0,Y1,Y2 を足してもOK）',
      '【手順】1) I0, I1 を DEC2_4 に入れる → 2) DEC2_4.Y0 → SET、DEC2_4.Y2 → OP、DEC2_4.Y3 → BR → 3) DEC2_4.Y3 を NOT に入れて、その出力を WE へつなぐ！',
    ],
    tests: [
      { label: '命令0: LDI [代入] (I0=0, I1=0) → OP=0, SET=1, WE=1, BR=0', input: [0, 0], expected: [0, 1, 1, 0] },
      { label: '命令1: ADD [加算] (I0=1, I1=0) → OP=0, SET=0, WE=1, BR=0', input: [1, 0], expected: [0, 0, 1, 0] },
      { label: '命令2: SUB [減算] (I0=0, I1=1) → OP=1, SET=0, WE=1, BR=0', input: [0, 1], expected: [1, 0, 1, 0] },
      { label: '命令3: JZ [0分岐] (I0=1, I1=1) → OP=0, SET=0, WE=0, BR=1', input: [1, 1], expected: [0, 0, 0, 1] },
    ],
    rewardChip: {
      id: 'INST_DEC',
      name: 'INST_DEC',
      shortName: 'IDEC',
      titleJa: 'アセンブリ命令デコーダ',
      descJa: '2ビット機械語(00=LDI,01=ADD,10=SUB,11=JZ)をOP/SET/WE/BRに翻訳する命令解読器。',
      color: '#1e6b8c',
      accent: '#56ccf2',
    },
    codexUnlock: ['machine_code_asm'],
  },

  {
    id: 'stage_21',
    number: 21,
    act: 6,
    chapter: 2,
    code: '21',
    title: 'ノイマン型自律計算機の完成',
    revealedTitle: 'ノイマン型自律計算機（ARK4_SYS）',
    scene: 'shelter_hub',
    storyBgm: 'finale',
    widget: 'ark4_finale',
    mode: 'sequential',
    incidentBrief: {
      where: '中央制御室・新主幹電算機マウント座',
      trouble: '焼け落ちた旧AETHER-IXの座に、命令を自分で解読し、計算し、結果が0なら自分でジャンプする完全自律コンピュータを据え付けたい！',
      condition: 'INST_DEC・ARK4_CPU・COND_PC の3大マイモジュールを結線し、機械語(I0..1, IMM0..3)から ACC と次番地 PC を同時更新せよ！',
      shortRule: '3大マイモジュール（INST_DEC＋ARK4_CPU＋COND_PC）を合体させ、完全体コンピュータ ARK4_SYS を完成させろ！',
      stakes: 'アセンブリ・プログラムを流し込むだけでどんな制御も自律実行できる「ハードウェアの最終到達点」へ至る',
    },
    hasClock: true,
    inputs: ['I0', 'I1', 'IMM0', 'IMM1', 'IMM2', 'IMM3', 'CLK'],
    outputs: ['ACC0', 'ACC1', 'ACC2', 'ACC3', 'PC0', 'PC1', 'PC2', 'PC3'],
    pinGroups: {
      inputs: [
        { label: '命令 I', indices: [0, 1] },
        { label: '数値 IMM', indices: [2, 3, 4, 5] },
      ],
      outputs: [
        { label: '結果 ACC', indices: [0, 1, 2, 3] },
        { label: '次番地 PC', indices: [4, 5, 6, 7] },
      ],
    },
    pinHelp: {
      inputs: [
        'I0, I1: 2ビット命令番号 (00=LDI, 10=ADD, 01=SUB, 11=JZ)',
        'IMM0..3: 命令に添えられた4ビット数値またはジャンプ先番地 (0〜15)',
        'CLK: システムクロック',
      ],
      outputs: [
        'ACC0..3: 現在の計算結果（アキュムレータ）',
        'PC0..3: 次に読むべきプログラム行番号',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT', 'MUX', 'MUX_4BIT', 'DEC_2TO4', 'SR_LATCH', 'D_LATCH', 'D_FF', 'REG_4BIT', 'ALU_4BIT', 'PC_4BIT', 'ARK4_CORE', 'ZERO_4BIT', 'COND_PC', 'INST_DEC'],
    plainGoal: 'INST_DEC（命令解読）・ARK4_CPU（演算記憶）・COND_PC（条件分岐）の3大マイモジュールを1つに繋ぎ、完全自律コンピュータ「ARK4_SYS」を完成させよう！',
    beginnerNote:
      'ハードウェア編の総仕上げ！ 使うマイモジュールは【INST_DEC】【ARK4_CPU】【COND_PC】の3個だけ！ ARK4_CPU の出力 ACC0..3 を外部出力と同時に COND_PC の V0..3 へ渡すのがポイントです！',
    introDialogue: [
      {
        speaker: 'kagari',
        text: '主任、これが見えているかい？ 第一章の最後で創った演算心臓【ARK4_CPU】、そして第二章で創った条件分岐の司令塔【COND_PC】と命令の通訳【INST_DEC】──すべてのピースが今、作業机の上に並んでいる。',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: '主任さん、この3つのマイモジュールを1枚の基板で繋げば、外から「命令番号（I0, I1）」と「数値（IMM0..3）」が入るだけで、自分で命令を翻訳して、計算して、もし0になったら自分で指定番地へジャンプする【本物のコンピュータ】になるよ！！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: 'ハードウェア最終統合：ノイマン型計算機（動く図解）',
          title: '🖥 INST_DEC ＋ ARK4_CPU ＋ COND_PC の三位一体！',
          anim: 'goal_ark4_sys',
          rule: '1) I0,I1 を INST_DEC で翻訳 → 2) ARK4_CPU で計算し ACC0..3 を出力 → 3) ACC0..3 を COND_PC にも渡して次番地 PC0..3 を決定！',
          accent: '#6fcf97',
        },
        text: '『これが回路配線の最終ステージだ、主任！ 砂粒から積み上げた470個以上のNANDゲートを1つの完全なノイマン型計算機【ARK4_SYS】として結線し、統合試験を決裁しろ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'hako',
        visualCard: {
          tag: 'モジュール図鑑へ登録：ノイマン型自律計算機',
          title: '🖥 完全体コンピュータ【ARK4_SYS】稼働開始！',
          anim: 'ark4_von_neumann',
          rule: 'ハードウェア全階層コンプリート！ 次からはこの ARK4_SYS の実際の回路の上で「アセンブリ・プログラム」を動かします！',
          accent: '#6fcf97',
        },
        text: '『……統合テスト全項目パス！ LDI 2 → ADD 3 (ACC=5) → JZ 10 (ACC≠0のため通過!) → SUB 5 (ACC=0達成!) → JZ 10 (10番地へ自動飛躍!) → LDI 15。完全自律ノイマン型計算機【ARK4_SYS】、主幹マウント完了だ、主任！』',
      },
      {
        speaker: 'mina',
        text: 'すごいよ主任さん……！！ 人間がスイッチを切り替えなくても、自分で答えが0かどうか確かめて、勝手に10番地へジャンプした！！',
      },
      {
        speaker: 'kagari',
        text: 'ついにハードウェア（機械の身体）は完成したぞ、主任！ ここからはハンダごてを置こう──今きみが完成させた【ARK4_SYS】の実機回路に、人間42年ぶりの『ソフトウェア（アセンブリ・プログラム）』を流し込んで、地上大ハッチを開けに行くぞ！！',
      },
    ],
    hints: [
      '【考え方】1) I0, I1 を INST_DEC に入れて OP, SET, WE, BR を出す → 2) IMM0..3 と OP, SET, WE, CLK を ARK4_CPU に入れて ACC0..3 を出す → 3) ACC0..3(V0..3) と IMM0..3(J0..3) と BR, CLK を COND_PC に入れて PC0..3 を出す！',
      '【構成】使うマイモジュールは INST_DEC × 1、ARK4_CPU × 1、COND_PC × 1 のたった3個です！',
      '【手順】I0..1 → INST_DEC.I0..1。IMM0..3 → ARK4_CPU.IMM0..3 かつ COND_PC.J0..3。INST_DEC の OP,SET,WE → ARK4_CPU の OP,SET,WE。INST_DEC.BR → COND_PC.BR。CLK → ARK4_CPU.CLK かつ COND_PC.CLK。ARK4_CPU.ACC0..3 → 外部ACC0..3 かつ COND_PC.V0..3。COND_PC.PC0..3 → 外部PC0..3！',
    ],
    tests: [
      ark4SysCycle('① 起動: LDI 2 [00:0010] → ACC=2, PC=0番地', 0, 0, 2, 2, 0),
      ark4SysCycle('② 加算: ADD 3 [01:0011] → ACC=5, 次PC=1番地', 1, 0, 3, 5, 1),
      ark4SysCycle('③ 分岐判定: JZ 10 [11:1010] (ACC=5≠0) → 飛ばず次PC=2番地!', 1, 1, 10, 5, 2),
      ark4SysCycle('④ 減算: SUB 5 [10:0101] → ACC=0 (ゼロ達成!), 次PC=3番地', 0, 1, 5, 0, 3),
      ark4SysCycle('⑤ 分岐発火: JZ 10 [11:1010] (ACC=0!) → 10番地へ飛躍!', 1, 1, 10, 0, 10),
      ark4SysCycle('⑥ 飛躍先: LDI 15 [00:1111] → ACC=15, 次PC=11番地', 0, 0, 15, 15, 11),
    ],
    rewardChip: {
      id: 'ARK4_SYS',
      name: 'ARK4_SYS',
      shortName: 'SYS',
      titleJa: 'ノイマン型自律計算機',
      descJa: 'INST_DEC・ARK4_CPU・COND_PCを統合し、機械語プログラムを自律実行する完全体コンピュータ。',
      color: '#218c5b',
      accent: '#6fcf97',
    },
    codexUnlock: ['von_neumann_complete'],
  },

  // =========================================================================
  // CHAPTER II — ACT VII: BIRTH OF SOFTWARE, ASSEMBLY & RETURN TO THE BLUE SKY
  // =========================================================================
  {
    id: 'stage_22',
    number: 22,
    act: 7,
    chapter: 2,
    code: '22',
    kind: 'assembly_program',
    title: '最初のプログラム・気圧均衡',
    revealedTitle: 'アセンブリ制御プログラム（気圧均衡）',
    scene: 'machinery',
    storyBgm: 'story',
    widget: 'ark4_finale',
    mode: 'physics',
    incidentBrief: {
      where: 'B1 地上大ハッチ・第一エアロック制御ROM',
      trouble: '地上大ハッチの第一ロックを外すには、まず初期内圧「5」をセットした上で、加圧「+7」と外気差圧「−4」を行って目標圧「8」にする必要がある！',
      condition: 'ARK4_SYS のROM（0〜2番地）に命令カードを並べ、0番地で内圧5をセット後、3命令完了時に最終気圧 ACC=8 (次PC=3番地) を達成せよ！（加圧+7と減圧-4の順序はどちらが先でも可）',
      shortRule: '0番地で初期内圧 5 をセットし、加圧(+7)と減圧(-4)を組み合わせて最終気圧 ACC=8 を出力させよ！',
      stakes: '自作コンピュータ ARK4_SYS の実機回路の上で人類42年ぶりの「ソフトウェア」を走らせる',
    },
    inputs: ['CLK'],
    outputs: ['ACC'],
    pinHelp: {
      inputs: ['ROM 0〜2番地: 実行するアセンブリ命令カード'],
      outputs: ['ACC: 3行実行後の最終気圧（目標 = 8）'],
    },
    physicsParts: [
      {
        id: 'ASM_LDI_5',
        name: 'LDI 5',
        meta: '機械語 00:0101',
        op: 'LDI',
        val: 5,
        opcodeBits: '00',
        immBits: '0101',
        color: '#b87424',
        accent: '#ffd166',
        rule: 'ACC ← 5（作業机レジスタ ACC に初期値 5 を直接代入する）',
        descJa: 'アセンブリ命令「LDI 5（Load Immediate 5）」。INST_DEC に機械語 00（SET=1, WE=1）を送り、ARK4_CPU の作業机レジスタ ACC に数値 5（0101）をセットします。',
      },
      {
        id: 'ASM_ADD_7',
        name: 'ADD 7',
        meta: '機械語 01:0111',
        op: 'ADD',
        val: 7,
        opcodeBits: '01',
        immBits: '0111',
        color: '#2b7a5b',
        accent: '#5ce0a8',
        rule: 'ACC ← ACC + 7（今の ACC に 7 を足して上書き保存する）',
        descJa: 'アセンブリ命令「ADD 7」。INST_DEC に機械語 01（OP=0, SET=0, WE=1）を送り、ALU_4B で今の ACC に +7（0111）を足して保存します。',
      },
      {
        id: 'ASM_SUB_4',
        name: 'SUB 4',
        meta: '機械語 10:0100',
        op: 'SUB',
        val: 4,
        opcodeBits: '10',
        immBits: '0100',
        color: '#a8423b',
        accent: '#ff8a7a',
        rule: 'ACC ← ACC − 4（今の ACC から 4 を引いて上書き保存する）',
        descJa: 'アセンブリ命令「SUB 4」。INST_DEC に機械語 10（OP=1, SET=0, WE=1）を送り、ALU_4B の2の補数減算で今の ACC から −4（0100）を引いて保存します。',
      },
    ],
    asmProgramSpec: {
      goalTitle: '目標：3行実行後に ACC = 8 (1000) を達成せよ！',
      targetAcc: 8,
      rows: [
        { addr: 0, slotId: 'line_0', label: '0番地（初期内圧セット）', ideal: 'ASM_LDI_5' },
        { addr: 1, slotId: 'line_1', label: '1番地（コンプレッサー+7加圧）', ideal: 'ASM_ADD_7' },
        { addr: 2, slotId: 'line_2', label: '2番地（外気差圧-4減圧）', ideal: 'ASM_SUB_4' },
      ],
    },
    plainGoal: '完成したあなたの自作コンピュータ「ARK4_SYS」のROM（0〜2番地）にアセンブリ命令カードを3枚並べ、初期内圧 5 から加圧(+7)・減圧(-4)を行って最終気圧 ACC=8 にしよう！',
    beginnerNote:
      '0番地で初期内圧「5」をセット（LDI 5）したあとは、1〜2番地で「ADD 7 → SUB 4（5+7-4=8）」でも「SUB 4 → ADD 7（5-4+7=8）」でも、仕様を満たせばどちらもあなたの実機CPUで合格します！',
    introDialogue: [
      {
        speaker: 'hako',
        text: '『主任、B1第一エアロックのROMコンソールに、いまお前が Stage 21 までで組み上げた実機回路【ARK4_SYS（COND_PC ＋ INST_DEC ＋ ARK4_CPU ＋ ZERO_4B）】を直結したぞ！』',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: '主任さん、エアロックの圧力仕様を確認したよ！ まず0番地で基準内圧の「5」をセットして、そこからコンプレッサー加圧「+7」と外気差圧調整「−4」を行って、最終的な気圧を【8】に合わせればロックが外れるの！（加圧と減圧はどっちを先にやっても安全範囲内だよ！）',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'ハードウェアからソフトウェアへ（動く図解）',
          title: '📜 回路は1本も変えず「命令表（プログラム）」で自作CPUを動かす！',
          anim: 'asm_program_flow',
          rule: '0〜2番地にセットした命令カードの機械語ビットが、あなたの INST_DEC → ARK4_CPU → COND_PC の実機回路へ1拍ずつ入力される！',
          accent: '#6fcf97',
        },
        text: 'もう回路を1本もハンダ付けし直す必要はないぞ、主任！ 下のROM（命令表）に3枚の命令カードを並べて実行を決裁すれば、君自身が作った NAND ゲート群がその命令を1拍ずつ計算してくれるんだ！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'うわぁっ……！！ 回路の線は1本も触ってないのに、主任さんが作った ARK4_SYS が0番地から順番に命令を読み取って、本当に気圧が「8」になって第一エアロックが外れたよ！！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：アセンブリ言語',
          title: '📜 機械語と1対1で繋がる人間の言葉【アセンブリ】！',
          anim: 'asm_program_flow',
          rule: 'ハードウェア（ARK4_SYS）をそのままに、命令の並び（ソフトウェア）で制御する技術を習得しました！',
          accent: '#6fcf97',
        },
        text: 'これこそが【アセンブリ言語】、そして【ソフトウェア】の誕生だ、主任！ 同じ機械（ハードウェア）のまま、命令シートを差し替えるだけで何万通りもの仕事ができるんだよ。',
      },
    ],
    hints: [
      '【考え方】0番地で最初の数 5 を入れ（LDI 5）、1番地で 7 を足し（ADD 7 → 12）、2番地で 4 を引きます（SUB 4 → 8）！',
      '【操作のコツ】下のパレットの「LDI 5」「ADD 7」「SUB 4」をそれぞれ2回タップすると、順番に0番地・1番地・2番地の枠へ自動で入ります！',
      '【仕上げ】0番地＝LDI 5、1番地＝ADD 7、2番地＝SUB 4 を置いたら、右下の「▶ テスト実行」を押そう！',
    ],
    tests: [],
    rewardChip: {
      id: 'ASM_PROG',
      name: 'ASM_基本',
      shortName: 'ASM',
      titleJa: 'アセンブリ制御プログラム',
      descJa: 'LDI / ADD / SUB 命令をROMに並べてARK4_SYSを自動制御するソフトウェア技術。',
      color: '#218c5b',
      accent: '#6fcf97',
    },
    codexUnlock: ['software_algorithm'],
  },

  {
    id: 'stage_23',
    number: 23,
    act: 7,
    chapter: 2,
    code: '23',
    kind: 'assembly_program',
    title: 'ソフトの知恵・足し算器で掛け算せよ',
    revealedTitle: '乗算＆ゼロ一致分岐アルゴリズム',
    scene: 'machinery',
    storyBgm: 'crisis',
    widget: 'rover_alu',
    mode: 'physics',
    incidentBrief: {
      where: 'B1 地上大ハッチ・電磁油圧ジャッキ昇圧盤',
      trouble: '重い鉛のハッチを押し上げるには「出力3のポンプ×4基分（3×4＝12）」の推力を合成し、基準圧12との差が「0」になったことを検知して開錠番地へジャンプする必要がある！',
      condition: '足し算器しかない ARK4_SYS の上で「3×4＝12」を合成したあと SUB 12 で差を 0 にし、4番地の JZ 6（ゼロなら6番地へ飛ぶ）を発火させよ！',
      shortRule: 'LDI 3 → ADD 3 → ADD 6 で 3×4=12 を作り、SUB 12 で差圧0にして JZ ジャンプを発動させろ！',
      stakes: '「掛け算回路が無いならソフト（アルゴリズム）で掛け算を作ればいい」という計算機科学の真髄を体得する',
    },
    inputs: ['CLK'],
    outputs: ['ACC'],
    pinHelp: {
      inputs: ['ROM 0〜3番地: 掛け算（3×4=12）と差圧0判定を行う命令カード'],
      outputs: ['ACC = 0 かつ ZERO_4B (Z=1) で 4番地の JZ 6 が 6番地へジャンプ！'],
    },
    physicsParts: [
      {
        id: 'ASM_LDI_3',
        name: 'LDI 3',
        meta: '機械語 00:0011',
        op: 'LDI',
        val: 3,
        opcodeBits: '00',
        immBits: '0011',
        color: '#b87424',
        accent: '#ffd166',
        rule: 'ACC ← 3（ポンプ1基目の出力 3 をセット）',
        descJa: 'アセンブリ命令「LDI 3」。機械語 00:0011 で ACC に 3（ポンプ1基分）をセットします。',
      },
      {
        id: 'ASM_ADD_3',
        name: 'ADD 3',
        meta: '機械語 01:0011',
        op: 'ADD',
        val: 3,
        opcodeBits: '01',
        immBits: '0011',
        color: '#2b7a5b',
        accent: '#5ce0a8',
        rule: 'ACC ← ACC + 3（もう1基分の +3 を足して 3×2 = 6 にする）',
        descJa: 'アセンブリ命令「ADD 3」。機械語 01:0011 で今の ACC に +3 を足し、ポンプ2基分の推力（3+3=6）を合成します。',
      },
      {
        id: 'ASM_ADD_6',
        name: 'ADD 6',
        meta: '機械語 01:0110',
        op: 'ADD',
        val: 6,
        opcodeBits: '01',
        immBits: '0110',
        color: '#2b7a5b',
        accent: '#5ce0a8',
        rule: 'ACC ← ACC + 6（さらに2基分の +6 を足して 3×4 = 12 を完成！）',
        descJa: 'アセンブリ命令「ADD 6」。機械語 01:0110 で今の ACC(6) に +6 を足し、ポンプ4基分の推力（3×4=12）を完成させます。',
      },
      {
        id: 'ASM_SUB_12',
        name: 'SUB 12',
        meta: '機械語 10:1100',
        op: 'SUB',
        val: 12,
        opcodeBits: '10',
        immBits: '1100',
        color: '#a8423b',
        accent: '#ff8a7a',
        rule: 'ACC ← ACC − 12（目標推力 12 を引いて差を「0」にし、ZERO_4B を点灯させる！）',
        descJa: 'アセンブリ命令「SUB 12」。機械語 10:1100 で ACC から目標値 12 を引きます。ACC がちょうど 12 なら結果が 0（0000）になり、マイモジュール ZERO_4B が Z=1 を灯して次の JZ ジャンプを発火させます！',
      },
    ],
    asmProgramSpec: {
      goalTitle: '目標：3×4=12 を合成後に SUB 12 で ACC=0(Z=1) にし、JZ 6 で 6番地へ飛べ！',
      targetAcc: 0,
      targetPc: 6,
      rows: [
        { addr: 0, slotId: 'line_0', label: '0番地（1基目：3をセット）', ideal: 'ASM_LDI_3' },
        { addr: 1, slotId: 'line_1', label: '1番地（2基目：+3 で 3×2=6）', ideal: 'ASM_ADD_3' },
        { addr: 2, slotId: 'line_2', label: '2番地（3〜4基目：+6 で 3×4=12）', ideal: 'ASM_ADD_6' },
        { addr: 3, slotId: 'line_3', label: '3番地（目標12との差圧チェック）', ideal: 'ASM_SUB_12' },
        {
          addr: 4,
          slotId: 'line_4',
          locked: true,
          fixedPart: {
            id: 'ASM_JZ_6',
            name: 'JZ 6',
            meta: '機械語 11:0110 [固定]',
            op: 'JZ',
            val: 6,
            opcodeBits: '11',
            immBits: '0110',
            rule: 'もし ACC==0 (Z=1) なら 6番地(承認) へジャンプ！',
          },
        },
      ],
    },
    plainGoal: '足し算器しかない ARK4_SYS の上で「3 × 4 ＝ 12」を足し算の組み合わせで合成し、SUB 12 で差を 0 にして 4番地の条件ジャンプ（JZ 6）を発火させよう！',
    beginnerNote:
      '掛け算の回路がなくても、3 + 3 = 6、6 + 6 = 12 と足し算を重ねれば「3×4=12」が作れます！ 最後に SUB 12 で「12 − 12 = 0」にすれば、あなたの ZERO_4B と COND_PC が JZ 6 で 6番地へジャンプします！',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: '主任さん、第一エアロックが開いたよ！ ……でも第二ロックの鉛扉を持ち上げる油圧ジャッキを調べたら、「出力 3 の補助ポンプ × 4基分（3 × 4 ＝ 12）」の推力を合成して、基準推力12との差が「0」になった瞬間に開錠番地（6番地）へ飛ぶ仕様になってるの！',
      },
      {
        speaker: 'mina',
        text: '私たちが作った【ARK4_CPU】の【ALU_4B】には「足し算（ADD）」と「引き算（SUB）」しかなくて、【掛け算（×）の回路】なんて入ってないよ！ どうしよう、主任さん……！？',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: 'ハコ仕様解析：乗算合成 ➔ 差圧ゼロ分岐（動く図解）',
          title: '🧮 0〜2番地で 3×4=12 を足し算合成 ➔ 3番地 SUB 12 ➔ 4番地 JZ 6！',
          anim: 'ark4_von_neumann',
          rule: '0〜2番地完了時に ACC=12 を合成し、3番地【SUB 12】で差を 0（Z=1）にすれば、4番地の固定命令【JZ 6】が ZERO_4B(Z=1) に反応して6番地へ飛ぶ！',
          accent: '#56ccf2',
        },
        text: '『慌てるなミナ！ 掛け算のハードウェアが無ければ、命令の組み合わせ（アルゴリズム）で合成すればいい。0〜2番地でポンプ4基分の推力「12」を作り、3番地で目標値12を引いて `ACC=0 (Z=1)` にすれば、4番地の `JZ 6` が実機 COND_PC を6番地へジャンプさせるぞ。主任、プログラムを組んで決裁してくれ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '足し算の組み合わせで 12 が合成されて、12 − 12 = 0 になった瞬間に主任さんの ZERO_4B がピカッと光って、COND_PC が6番地へ一気にジャンプした！！ 掛け算回路がなくてもソフトウェアの知恵で解決できちゃった！！',
      },
      {
        speaker: 'kagari',
        text: '初期のマイクロプロセッサ（Intel 4004やZ80、ファミコンの6502）も、実はハードウェアには掛け算回路なんて入っていなかったんだ。すべて今、主任がやったように足し算と分岐命令を組み合わせて掛け算を作っていたんだよ！',
      },
    ],
    hints: [
      '【考え方】0番地に「LDI 3」(ACC=3)、1番地に「ADD 3」(ACC=6)、2番地に「ADD 6」(ACC=12) を置けば 3×4=12 になります！ そして3番地に「SUB 12」を置けば 12−12=0 になり、4番地の JZ 6 が発火します！',
      '【操作のコツ】パレットの「LDI 3」「ADD 3」「ADD 6」「SUB 12」を順番に0番地〜3番地の枠へ配置しよう！',
      '【仕上げ】4枠すべて埋まったら「▶ テスト実行」を押して、JZ 6 のジャンプを見届けよう！',
    ],
    tests: [],
    rewardChip: {
      id: 'ASM_MUL_PROG',
      name: 'MUL_ASM',
      color: '#6e459c',
      accent: '#c89bff',
      description: '乗算合成＆条件ジャンプ・プログラム（3×4=12 ➔ SUB 12 ➔ JZ 6）',
      isLabReward: true,
    },
    codexUnlock: ['software_algorithm'],
  },

  {
    id: 'stage_24',
    number: 24,
    act: 7,
    chapter: 2,
    code: '24',
    kind: 'assembly_program',
    isFinale: true,
    isChapter2Finale: true,
    title: '青空へのカウントダウン・大ハッチ開門',
    revealedTitle: '青空への帰還（カウントダウン・ループ）',
    scene: 'surface_rover',
    storyBgm: 'finale',
    widget: 'ark4_finale',
    mode: 'physics',
    incidentBrief: {
      where: 'B1 地上メインハッチ・最終開門コンソール',
      trouble: 'いよいよ最後の扉！ 爆破ボルト安全規定により、タイマーを「3」から1拍ずつ「3→2→1→0」とループで減らし、0になった瞬間にループを脱出して全開信号「15」を出す必要がある！',
      condition: 'LDI 3・SUB 1・JZ 4・LDI 15 を配置し、カウントダウン・ループから地上大ハッチ全開（ACC=15）を実行せよ！',
      shortRule: '0番[LDI 3] → 1番[SUB 1] → 2番[JZ 4] → (3番:LOOP 1) → 4番[LDI 15] でカウントダウン開門せよ！',
      stakes: '42年間閉ざされていたアーク7の天井ハッチを開き、ミナと子どもたちを本物の「青空」の下へ導く',
    },
    inputs: ['CLK'],
    outputs: ['ACC'],
    pinHelp: {
      inputs: ['ROM 0〜4番地: カウントダウン・ループ＆ハッチ全開プログラム'],
      outputs: ['ACC: 3→2→1→0 とループしたあと、4番地へ脱出して ACC=15（全開！）'],
    },
    physicsParts: [
      {
        id: 'ASM_LDI_3',
        name: 'LDI 3',
        meta: '機械語 00:0011',
        op: 'LDI',
        val: 3,
        opcodeBits: '00',
        immBits: '0011',
        color: '#b87424',
        accent: '#ffd166',
        rule: 'ACC ← 3（カウントダウン初期値「3秒」をセット）',
        descJa: '0番地に配置：カウントダウン・タイマーの初期値「3」を作業机レジスタ ACC にセットします。',
      },
      {
        id: 'ASM_SUB_1',
        name: 'SUB 1',
        meta: '機械語 10:0001',
        op: 'SUB',
        val: 1,
        opcodeBits: '10',
        immBits: '0001',
        color: '#a8423b',
        accent: '#ff8a7a',
        rule: 'ACC ← ACC − 1（ループのたびにタイマーを 1 ずつ減らす：3→2→1→0）',
        descJa: '1番地に配置：ループでここへ戻ってくるたびに ACC から 1 を引き、3 → 2 → 1 → 0 とカウントダウンを進めます。',
      },
      {
        id: 'ASM_JZ_4',
        name: 'JZ 4',
        meta: '機械語 11:0100',
        op: 'JZ',
        val: 4,
        opcodeBits: '11',
        immBits: '0100',
        color: '#6e459c',
        accent: '#c89bff',
        rule: 'もし ACC==0 (Z=1) ならループを脱出して 4番地（開門！）へジャンプ！',
        descJa: '2番地に配置：マイモジュール ZERO_4B と COND_PC を使い、まだ ACC が 0 でない間は3番地(LOOP 1)へ流して繰り返し、ACC が 0 になった瞬間だけ 4番地（ハッチ全開）へジャンプしてループを脱出します！',
      },
      {
        id: 'ASM_LDI_15',
        name: 'LDI 15',
        meta: '機械語 00:1111',
        op: 'LDI',
        val: 15,
        opcodeBits: '00',
        immBits: '1111',
        color: '#218c5b',
        accent: '#6fcf97',
        rule: 'ACC ← 15（ループ脱出後、地上大ハッチへ全開信号 1111=15 を出力！）',
        descJa: '4番地に配置：カウントダウンが 0 になって JZ 4 でここへ飛んできたあと、地上メインハッチの全4ロックを同時開放する全開信号「15（2進数 1111）」を出力します！',
      },
    ],
    asmProgramSpec: {
      goalTitle: '最終目標：3→2→1→0 のカウントダウン・ループ後に 4番地で ACC=15 (全開!) を出せ！',
      targetAcc: 15,
      targetPc: 5,
      rows: [
        { addr: 0, slotId: 'line_0', label: '0番地（タイマー初期値3セット）', ideal: 'ASM_LDI_3' },
        { addr: 1, slotId: 'line_1', label: '1番地（カウントを -1 減算）', ideal: 'ASM_SUB_1' },
        { addr: 2, slotId: 'line_2', label: '2番地（0なら4番地へ脱出ジャンプ）', ideal: 'ASM_JZ_4' },
        {
          addr: 3,
          slotId: 'line_3',
          locked: true,
          label: '外部帰還プルダウン回路',
          fixedPart: {
            id: 'ASM_LOOP_1',
            name: 'LOOP 1',
            meta: '機械語 11:0001(JZ 1)＋帰還線RET=1 [盤面固定]',
            op: 'LOOP',
            val: 1,
            opcodeBits: '11',
            immBits: '0001',
            rule: 'RET=1でCOND_PCのV入力を0000に接地し、WE=0(ACC保持)のままJZ 1で1番地へ強制帰還！',
          },
        },
        { addr: 4, slotId: 'line_4', label: '4番地（地上大ハッチ全開 15 出力！）', ideal: 'ASM_LDI_15' },
      ],
    },
    plainGoal: 'あなたの自作CPU「ARK4_SYS」でタイマー「3」から 1 ずつ減らすループ（SUB 1 ➔ JZ 4 ➔ LOOP 1）を回し、0 になった瞬間に 4番地（LDI 15）へ脱出して、最後の開門クロックで地上大ハッチを全開（1111）にしよう！',
    beginnerNote:
      '3番地の【LOOP 1】は盤面の外部帰還線（RET=1）で COND_PC の V入力を 0000 にプルダウン接地し、機械語 11:0001（JZ 1）で ACC を保ったまま 1番地へ戻すハードウェア帰還回路です。カウントダウンが 0 になって 4番地へ到達したら、あなた自身の最終クロック操作で大ハッチを開門します！',
    introDialogue: [
      {
        speaker: 'mina',
        text: '主任さん、博士……見て！ B1の地上大ハッチの前に、B3で酸欠から助けた機関室の人たちも、加算器で行列が解消した配給係のおばちゃんも、水耕室で育てたレタスを抱えた3区の子どもたちも、昨夜の揺れを朝一番で点検してくれた岩盤監視員さんも……私たちが回路で繋いだ118人全員が集まってるよ……！',
      },
      {
        speaker: 'kagari',
        showIncident: true,
        text: '頭上の氷河湖が崩れる前に、いよいよこの厚さ1.5メートルの鉛の大扉を開けるぞ、主任！ 安全規定により、タイマーを `3` にセットし、1拍ずつ `1` を引いて `3 → 2 → 1 → 0` とカウントダウンした直後にのみ、全開信号 `15 (1111)` が承認される！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: '最終プログラム＆外部帰還回路のしくみ（動く図解）',
          title: '☀ 3 → 2 → 1 → 0 でループ脱出（JZ 4）➔ 最終クロックで大ハッチ全開（LDI 15）！',
          anim: 'asm_program_flow',
          rule: '3番地の固定回路【LOOP 1】は機械語 11:0001(JZ 1) と同時に外部帰還線 RET=1 で COND_PC の V入力を0000に接地し、ACCを保ったまま1番地へ戻す！',
          accent: '#6fcf97',
        },
        text: '『3番地にはコンソール固定の外部帰還プルダウン回路【LOOP 1（機械語 11:0001 + RET=1）】が結線されている。2番地の JZ 4 を通過して3番地へ来ると、RET=1 が COND_PC の判定入力を 0000 に接地するため、お前の ZERO_4B と COND_PC が実機で 1番地へジャンプしてループを回す仕組みだ！』',
      },
      {
        speaker: 'hako',
        text: '『そしてカウントが 3 → 2 → 1 → 0 になって 4番地（開門命令 LDI 15）の直前に到達したら一度停止する。最後の開門クロックは、アーク7主任技師であるお前自身の手で打ち込め！！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'hako',
        visualCard: {
          tag: 'SILICON GENESIS — 完・全・起・動',
          title: '☀ カウント 3 → 2 → 1 → 0 ➔ 地上大ハッチ全開（ACC=15 / 1111）！！',
          anim: 'asm_program_flow',
          rule: 'あなたが作った実機CPU（ARK4_SYS）を最後の開門命令 LDI 15 が通過し、全ロックが開放されました！！',
          accent: '#6fcf97',
        },
        text: '『……主任による最終開門クロック入力を確認！ 4番地 LDI 15 [00:1111]、自作 INST_DEC・ARK4_CPU を通過──出力 ACC = 15 (1111)！ 地上メインハッチ、全4ロック同時開放！！』',
      },
      {
        speaker: 'mina',
        text: '……ゴゴゴゴッって、天井の鉛の扉が動いてる……！！ 隙間から、白い光が……風が、草と海の匂いがするよ……！！',
      },
      {
        speaker: 'mina',
        text: 'うわぁぁぁっ……！！ 見て、主任さん、博士！！ 天井の向こう、どこまでも真っ青だよ……！！ これが……これが、本物の「青空」なんだね……！！ 配給係のおばちゃんも機関室のみんなも泣いてる……子どもたち、ほら見てごらん、外に出られるよ！！',
      },
      {
        speaker: 'kagari',
        text: '……42年ぶりだ。まさか生きているうちに、もう一度この太陽の下で深呼吸ができるなんてな。ほら、丘の向こうから『アーク3』の仲間たちのローバーも旗を振って走ってくるぞ！',
      },
      {
        speaker: 'kagari',
        text: 'ありがとう、アーク7最高主任技師。たった1粒の砂（シリコン）と1個のスイッチから始まり、論理ゲート、加算器、記憶ラッチ、CPU、そしてアセンブリ言語のプログラムまで──君自身が組み上げた計算機が、暗闇の地下から118人全員を青空の下へ連れ出してくれたんだ！！',
      },
    ],
    hints: [
      '【考え方】0番地に「LDI 3」（初期値3）、1番地に「SUB 1」（1ずつ減らす）、2番地に「JZ 4」（0になったら4番地へジャンプ）、4番地に「LDI 15」（ハッチ全開15）を配置します！',
      '【操作のコツ】下のパレットの「LDI 3」「SUB 1」「JZ 4」「LDI 15」を順番に2回タップしていくだけで、0番地・1番地・2番地・4番地の空欄にピタッと入ります！',
      '【仕上げ】4枚すべてセットしたら、右下の「▶ テスト実行」を押して、3→2→1→0→開門(15) のループ実行を見届けよう！',
    ],
    tests: [],
    rewardChip: {
      id: 'ASM_LOOP_PROG',
      name: 'SKY_OS',
      color: '#218c5b',
      accent: '#6fcf97',
      description: '地上大ハッチ開門ループ・プログラム（カウントダウン＆全開 OS）',
      isLabReward: true,
    },
    codexUnlock: ['software_algorithm'],
  },
];

export const SANDBOX_STAGE = {
  id: 'sandbox',
  number: 99,
  act: 5,
  code: 'LAB',
  title: '自由実験室（FREE LAB）',
  revealedTitle: '自由回路ワークベンチ',
  scene: 'shelter_hub',
  widget: 'ark4_finale',
  mode: 'sequential',
  hasClock: true,
  isSandbox: true,
  inputs: ['IN0', 'IN1', 'IN2', 'IN3', 'A', 'B', 'CLK'],
  outputs: ['OUT0', 'OUT1', 'OUT2', 'OUT3', 'Q'],
  pinGroups: {
    inputs: [{ label: 'IN', indices: [0, 1, 2, 3] }],
    outputs: [{ label: 'OUT', indices: [0, 1, 2, 3] }],
  },
  allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
  allowedCustomChips: null, // All unlocked custom chips allowed!
  plainGoal: 'これまでに自作したすべてのチップを自由に組み合わせて実験できるラボ。',
  beginnerNote: '左のスイッチと CLK パルスを自由に操作して、信号の流れを観察しよう！',
  introDialogue: [
    {
      speaker: 'kagari',
      text: 'ここは自由実験室だ。これまでに君が作ったすべてのカスタムチップを使って、好きな回路を自由に試せるよ！',
    },
  ],
  outroDialogue: [],
  hints: ['自由にチップを置いて、左端のスイッチやCLKボタンを押して信号の流れを観察してみよう！'],
  tests: [],
  rewardChip: null,
  codexUnlock: [],
};

export function getStageById(id) {
  if (id === 'sandbox') return SANDBOX_STAGE;
  return STAGES.find((s) => s.id === id) || STAGES[0];
}
