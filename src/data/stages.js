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

export const ACTS = [
  { id: 0, roman: 'ACT 0', title: '物理から論理へ', subtitle: 'シリコン・抵抗・NANDの誕生', color: '#ffbe6b' },
  { id: 1, roman: 'ACT I', title: 'スイッチと約束の言葉', subtitle: '論理ゲートの誕生', color: '#e69b42' },
  { id: 2, roman: 'ACT II', title: '電気で「数える」奇跡', subtitle: '2進数と加算器', color: '#45c79e' },
  { id: 3, roman: 'ACT III', title: '道を選び、切り替える', subtitle: 'バスとルーティング', color: '#4ea8de' },
  { id: 4, roman: 'ACT IV', title: '電気に「記憶」を宿す', subtitle: 'フィードバックとクロック', color: '#b57edc' },
  { id: 5, roman: 'ACT V', title: '文明の再起動', subtitle: 'ALU・PC・自作CPUコア', color: '#f26b5e' },
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
        text: '落ち着けミナ！ 冷却弁を直すにはまず、電気信号だけでパチパチ開閉できる「電気のじゃぐち」が必要だ。──だがEMPのせいで既製のスイッチ部品は全滅した。',
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
          tag: '博士の物理メモ 2 / 3',
          title: '🧊 ガラスの壁 ＆ 🔶 金属ひねり',
          diagram: '金属ひねり(+1) → ガラスの壁越しに電子を吸い寄せ → 橋が開通！',
          rule: '真ん中に「ガラスの壁」、その上に「金属ひねり」を乗せる。ガラスのおかげでショートせず電子だけ引き寄せられる！',
          accent: '#ffd166',
        },
        text: 'そこで真ん中に薄い【ガラスの壁】を敷き、一番上に【金属ひねり】を乗せるんだ！ 金属に「1」をかけると、ガラス越しに電子が吸い寄せられて“光の橋”が架かり、左から右へ電気がドッと流れ出す！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: '組み立て手順',
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
        text: 'それこそが現代文明の最小細胞──【MOSFETトランジスタ】だ！ 1959年にベル研究所で発明され、今やスマホ1台の中に数百億個も詰め込まれている「砂から生まれた電気の蛇口」だよ！',
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
          tag: '解決の鍵：プルアップ抵抗',
          title: '💧 上を「細い道（ていこう）」にする！',
          diagram: '電池 ▶ [ていこう(細)] ▶ ランプ(でぐち) ▶ [ぬけ(広)] ▶ 地面(0V)',
          rule: '下が閉じてれば水圧が溜まって 1(5V)！ 下が開けば全部地面へ抜けて安全に 0(0V)！',
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
        speaker: 'mina',
        text: '部品が2つ揃ったね！ これでやっと地熱発電炉の冷却ラインに安全弁を取り付けられる！ 温度計が赤いラインに近づいてるよ、急ごう！',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: '条件をおさらいするね！ 冷却水は【普段はずっと 1（流しっぱなし）】。止めて（0）いいのは──「A：炉心の安全停止」と「B：冷却完了センサー」の【両方が同時に 1 になったときだけ】だよ！',
      },
      {
        speaker: 'kagari',
        text: '……待てよ！ 今ミナが言った「両方1のときだけ 0、それ以外は全部 1」の安全弁──それこそが、焼付け機のマスター原板【NAND】そのものじゃないか！！',
      },
      {
        speaker: 'kagari',
        text: 'よし、一石二鳥だ！ 焼け跡から拾った3種類の部品で、この安全弁を組んで発電炉を救おう。──専門用語は一切使わないから安心して。1つずつ「水のホース」にたとえて説明するよ！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '博士の部品ガイド 1 / 3',
          title: '🔋 でんち（いつも 1）',
          diagram: '[ でんち ] ──▶ つねに 1（電気ON）',
          rule: '電気を流し始めるスタート地点。出力ピン「1」からずっと電気が出ます。',
          accent: '#ffd166',
        },
        text: '1つ目は【でんち】だ。難しいことは何もない、つねに「1（電気あり）」を出しつづけるだけのスタート地点さ。ここから電気を流し始めるよ！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '博士の部品ガイド 2 / 3',
          title: '🚰 じゃぐち（スイッチ）',
          diagram: 'いり ──[ 🚰 ひねり=1で開通! ]──▶ でぐち',
          rule: '「ひねり」が 1 のときだけ「いり」の電気を「でぐち」へ通す！ 0 なら止める。',
          accent: '#ffbe6b',
        },
        text: '2つ目は【じゃぐち】だ。「ひねり」に 1 が来ると栓が開いて、「いり」から来た電気を「でぐち」へ通してくれる。ひねりが 0 のときはギュッと閉まって電気をせき止めるよ。',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '博士の部品ガイド 3 / 3',
          title: '🕳 はいすい（抜け道バルブ）',
          diagram: 'ふだんは でぐち=1 ／ ぬけ=1で地面へ抜けて → でぐち=0!',
          rule: 'ふだんは自動で「1」を出力。でも「ぬけ」に電気が届くと地面へ抜けて「0」に落ちる！',
          accent: '#7cd4f5',
        },
        text: '最後がキモになる【はいすい】だ！ こいつは普段、自分で「1（冷却水を流す）」を出しつづけている。……でも「ぬけ」の穴に電気（1）が流れ込むと、電気が地面へスッと抜け落ちて出力が「0（停止）」になるんだ！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '全体のつなぎ方イメージ',
          title: '2個の「じゃぐち」をまっすぐ一列に！',
          diagram: '🔋でんち ▶ 🚰じゃぐち(A) ▶ 🚰じゃぐち(B) ▶ 🕳はいすい ▶ OUT',
          rule: 'AとBの“両方”が開いた瞬間だけ「はいすい」に電気が届いて 0 になる！',
          accent: '#52e3b6',
        },
        text: 'さあ繋がったかい？ 【でんち】から2個の【じゃぐち】をまっすぐ一列につないで【はいすい】へ流せば──AとBの両方の蛇口が開いたときだけ電気が抜けて 0、それ以外は全部 1 になる！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: 'かんたん操作ガイド',
          title: 'タップだけで回路が組める',
          diagram: '部品を2回タップで自動配置 ／ 丸いピン同士をタップして配線',
          rule: '迷ったら下の「💡ヒント」や部品の「i」ボタンをいつでも見ていいぞ！',
          accent: '#ffb84d',
        },
        text: '『操作はかんたんだ。下の部品をポンポンと2回押すと盤面に置ける。あとは丸いピン同士をタップして線を繋げ！ 組み終わったら右下の「▶テスト実行」を押せ』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '……冷却圧が安定、非常発電炉が持ちこたえた！！ AとBの両方が開いた瞬間だけピタッと弁が閉じたよ！ すごい、B4のチップ焼付け機にも電力が来た！！',
      },
      {
        speaker: 'kagari',
        text: 'おめでとう、見習い君！ 実はいま君が繋いだ【じゃぐち】は現実世界では「トランジスタ（SW）」、【はいすい】は「プルアップ抵抗（PULL）」と呼ぶんだ。難しそうな名前だけど、中身は今の“蛇口と排水”そのままなんだよ！',
      },
      {
        speaker: 'kagari',
        text: 'そしてこの「両方1のときだけ0」になる回路の正式名称こそ──すべてのコンピュータの原点【NANDゲート】だ！ 君の回路を焼付け機の原板にセットしたから、次からはこの1個の【NAND】チップだけで世界中の計算機を組み上げていくぞ！',
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
        text: '覚えてるかい？ NANDは「入口AとB、両方が1のときだけ0」「両方が0のときは1」を返す。……もし1本の線から2つに分岐して、AとBの両方へ同じ信号を入れたらどうなるだろう？',
      },
      {
        speaker: 'hako',
        text: '『下のパレットから NAND を置き、左の IN から2本線を分岐させて NAND の A と B へ繋いでみろ。できた回路は今後ずっと使えるカスタムチップとして登録されるぞ』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '……止まった！ 警報が正常に戻って、空気清浄ファンが回り始めたよ！ すごい、本当に直っちゃった！',
      },
      {
        speaker: 'kagari',
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
        text: 'ふむ、今度は「両方1のときだけ 1」だね！ ちょっと前の NAND と比べてごらん。NAND は「両方1のときだけ 0、それ以外は 1」──ほら、ほしい答えとちょうど真逆じゃないかい？',
      },
      {
        speaker: 'hako',
        text: '『あまのじゃくをもう1回ひっくり返せば素直になる。さっき自分で作って登録した【NOT】チップがもうパレットに入っているぞ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'ガチャン……よし、二重ロックが完璧に噛み合った！ これで安心して貯水区画へ入れる！',
      },
      {
        speaker: 'kagari',
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
        text: 'ふふ、ここは最初の頭脳戦だね！ NANDは「両方が1のときだけ 0」になる。じゃあ今回ほしい回路は「両方が“何”のときだけ 0」になるかな？',
      },
      {
        speaker: 'hako',
        text: '『答えの匂いがしたな。AもBも両方 0 のときだけ 0 にしたい──つまり入口で先に NOT をかませて反転してから NAND へ入れたら、どうなるか試してみろ』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '北側テストOK、南側テストOK！ これで火災の見落としはなくなるね！',
      },
      {
        speaker: 'kagari',
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
      inputs: ['A: 地下1階スイッチ', 'B: 地下2階スイッチ'],
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
        text: '『条件を言葉にしてみろ。「どちらか片方は1（OR）」かつ「両方とも1ではない（NAND）」……おっと、喋りすぎたか』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'わっ、上で点けて下で消せる！ 暗い地下階段が少しだけ昔のマンションみたいに明るくなったね。',
      },
      {
        speaker: 'kagari',
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
    revealedTitle: '半加算器（Half Adder）',
    scene: 'shelter_hub',
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
        text: '歴史的な瞬間だぞ、見習い君！ スイッチは0と1しかないから「2」になったら桁を1つ上げる──これが【2進数】だ。0+0=00、0+1=01、1+0=01、そして 1+1=10（くり上がり1、1の位0）！',
      },
      {
        speaker: 'kagari',
        text: '1の位（SUM）と、2の位のくり上がり（CARRY）の答えを見比べてごらん。……なんと、君がさっき作ったチップ2個を並べるだけで完成してしまうんだよ！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '……待って、ランプが光った！ 1と1を入れたら、くり上がりランプが点いて「2」になった！ 電気が本当に足し算をしたよ……すごい！！',
      },
      {
        speaker: 'kagari',
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
    revealedTitle: '全加算器（Full Adder）',
    scene: 'shelter_hub',
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
        text: '1桁の足し算はできたけど、実際の配給計算は何桁もあるよね？ 筆算を思い出すと、2桁目からは「下の桁からのくり上がり」も一緒に足さないとダメだよね？',
      },
      {
        speaker: 'kagari',
        text: 'するどいぞミナ！ さっきのが「半」加算器だった理由はそこにある。下の桁からのくり上がり（CIN）まで含めて3つ同時に足せる完全版を作ろう！',
      },
      {
        speaker: 'hako',
        text: '『さっき自作した H_ADD（半加算器）を2個と、ORを1個使えば美しく組めるぞ』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kagari',
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
      '【手順】A,B → HA1(SUM→HA2.A, CARRY→OR.A)。CIN → HA2.B。HA2.SUM → SUM。HA2.CARRY → OR.B。OR.OUT → COUT！',
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
    revealedTitle: '4ビット加算器（Ripple-Carry Adder）',
    scene: 'shelter_hub',
    widget: 'ration_terminal',
    mode: 'combinational',
    incidentBrief: {
      where: '中央配給カウンター・本館集計ターミナル',
      trouble: '全4区画の水と食料の合計（0〜15リットル同士）を自動集計できず、配給列が滞っている',
      condition: '4桁の数 A(0〜15) ＋ B(0〜15) ＋ CIN を計算し、答え S0..S3 と桁溢れ COUT を出せ！',
      shortRule: 'F_ADD を4個並べて COUT→次のCIN へ繋ぐ4ビット加算器を組め！',
      stakes: '118人の配給管理ターミナルを完全復旧させる',
    },
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
    plainGoal: '4桁の2進数 A(0〜15) と B(0〜15) と CIN を足し算する計算機を組もう！',
    beginnerNote:
      'A0は「1の位」、A1は「2の位」、A2は「4の位」、A3は「8の位」。4個の F_ADD を上から順に並べて、COUT を次の CIN へバトンタッチ！',
    introDialogue: [
      {
        speaker: 'mina',
        text: 'よし、本番だよ！ シェルター全4区画の食料と水の配給数を一気に合計したいの。0から15まで数えられる4桁の計算機があれば、もう手計算のミスはゼロになる！',
      },
      {
        speaker: 'kagari',
        text: 'さっき作った【F_ADD（全加算器）】を4つ並べるだけでいい。一番上（1の位）のくり上がりを2の位へ、2の位を4の位へ、4の位を8の位へ——バトンリレーのように繋ぐんだ！',
      },
      {
        speaker: 'hako',
        text: '『ちなみに左端と右端には、いま入力中の2進数が「普通の10進数でいくつか」も表示してやったぞ。実際にスイッチを触って足し算を確かめろ』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '5+3=8、9+6=15、12+7=19……全部一瞬で出た！！ これで配給管理端末が復旧したよ！ 本当にありがとう、見習いさん！',
      },
      {
        speaker: 'kagari',
        text: '1941年、コンラート・ツーゼが世界初のプログラム計算機Z3を動かしたときと同じ感動だね。くり上がりが波紋のように伝わるから【リップルキャリー加算器】と呼ぶんだ。',
      },
    ],
    hints: [
      '【考え方】4つの桁（0, 1, 2, 3）それぞれに F_ADD を1個ずつ割り当て、くり上がり（COUT → 次のCIN）を縦につなげます。',
      '【構成】F_ADD を4個縦に並べます！',
      '【手順】FA0(A0, B0, CIN)→S0, c0 / FA1(A1, B1, c0)→S1, c1 / FA2(A2, B2, c1)→S2, c2 / FA3(A3, B3, c2)→S3, COUT！',
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
        text: '浄水プラントに予備の地下井戸をつないだんだけど、モニターが1台しかないの。切替レバー（SEL）が0なら主タンク(D0)、1なら予備井戸(D1)の信号が映るようにしたいんだ。',
      },
      {
        speaker: 'kagari',
        text: 'ここで「計算」から「判断・選択」のフェーズへ進もう！ プログラミングでいう『もし〜ならこっち』を電気回路で作るんだ。',
      },
      {
        speaker: 'hako',
        text: '『ANDゲートを「通行止めゲート」だと思え。SEL=0のときD0を通し、SEL=1のときD1を通して、最後にORで1本にまとめろ』',
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
    revealedTitle: '4ビット・マルチプレクサ（MUX_4BIT）',
    scene: 'shelter_hub',
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
        speaker: 'kagari',
        text: '1本ずつ切り替えるのはもう卒業だ。コンピュータは複数の線を「束」にして数字を丸ごと運ぶ——これを【バス（Bus）】と呼ぶんだよ。',
      },
      {
        speaker: 'kagari',
        text: 'ファミコンが「8ビット」、昔のパソコンが「32ビット」、今のスマホが「64ビット」と言うだろう？ あれはまさに、この線の束が何本あるかのことなんだ！',
      },
      {
        speaker: 'mina',
        text: 'じゃあ今から作る4ビット切替器は、1971年の初代マイクロプロセッサと同じ4ビット幅ってことね。よし、MUXを4つ並べて束ねよう！',
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
    revealedTitle: '2→4デコーダ（DEC_2TO4）',
    scene: 'machinery',
    widget: 'hydroponics',
    mode: 'combinational',
    incidentBrief: {
      where: '地下農場・4区画 水耕栽培室（0〜3番）',
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
        text: 'もちろんさ！ 2ビットあれば 00(0)・01(1)・10(2)・11(3) の4通りを表せるからね。番号を解読して該当の1本だけ点ける回路──【デコーダ】の出番だ！',
      },
      {
        speaker: 'hako',
        text: '『A0の反転とA1の反転を用意すれば、あとは4個のANDで全組み合わせをキャッチできる。シンプルだ』',
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
    revealedTitle: 'SRラッチ（記憶の原点）',
    scene: 'machinery',
    widget: 'seismic_lamp',
    mode: 'sequential',
    incidentBrief: {
      where: '地下400m 岩盤監視室・地震センサー盤',
      trouble: '夜間の小さな地震が一瞬で収まるとセンサーもすぐ0に戻ってしまい、壁のヒビ点検を見落としてしまう！',
      condition: 'S=1 で警報 Q=1 を記憶し、S=0 に戻しても光り続け、R=1 で Q=0 へリセットせよ！',
      shortRule: 'ボタンを押して離しても「1」を覚え続ける記憶ループ（SRラッチ）を組め！',
      stakes: '電気回路に初めて「過去を覚える記憶（メモリ）」を宿す',
    },
    inputs: ['S', 'R'],
    outputs: ['Q', 'QN'],
    pinHelp: {
      inputs: ['S: SET（一瞬でも1にしたら警報ONを記憶）', 'R: RESET（1にしたら警報を解除して0を記憶）'],
      outputs: ['Q: 記憶している状態', 'QN: Qの反転状態'],
    },
    allowedPrimitives: ['NAND'],
    allowedCustomChips: ['NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT', 'MUX', 'MUX_4BIT', 'DEC_2TO4'],
    plainGoal: 'Sを押して離して（0,0に戻して）も Q=1 を「覚え続け」、Rを押したら Q=0 に戻る記憶回路を作ろう！',
    beginnerNote:
      'ここから大転換！ 出力の線をぐるっと入力へ戻す「輪っか（フィードバック）」を作ると、電気が過去を記憶し始めます！',
    introDialogue: [
      {
        speaker: 'mina',
        text: 'アーク7は火山岩盤の400メートル下にあるから、数日に一度、深夜に2秒だけ「ゴゴッ」と小さな地鳴りが来るの。翌朝に天井のヒビを点検しなきゃいけないんだけど……',
      },
      {
        speaker: 'mina',
        showIncident: true,
        text: '揺れが2秒で止まると地震センサー(S)もすぐ 0 に戻っちゃって、朝起きたときには誰も気づけないの！ 一度揺れたら「解除ボタン(R)」を押すまで【ずっと点きっぱなしになる記憶警報灯】って作れないかな？',
      },
      {
        speaker: 'kagari',
        text: '……見習い君、呼吸を整えてくれ。今日これから君は、コンピュータが「記憶（メモリ）」を手に入れる歴史的な魔法を目撃する。',
      },
      {
        speaker: 'kagari',
        text: 'これまでの回路は“今の入力”に反応するだけだった。だが、2個のNANDの出力を【お互いの入口へたすき掛けにぐるっと戻す】と、信号が輪の中に閉じ込められて“過去”を覚え続けるんだ！',
      },
      {
        speaker: 'hako',
        text: '『SとRをそれぞれNOTで反転させて、たすき掛けのNAND2個（上と下）へ入れろ。上がQ、下がQNだ。実際にSをパチッと押して離して観察してみろ』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'うそっ……Sのスイッチを0に戻したのに、ランプが光ったままだ！ そしてRを押したら消えて、離しても消えたまま！ 電気が“覚えてる”！！',
      },
      {
        speaker: 'kagari',
        text: '1918年、エクルズとジョーダンが発見した双安定記憶回路【SRラッチ】！ 君のスマホのメモリも、人類の知識を保存するサーバーも、すべての記憶装置はこの小さな輪っかから始まったんだ！',
      },
    ],
    hints: [
      '【考え方】NAND①とNAND②を上下に置き、NAND①の出力(Q)をNAND②の入力へ、NAND②の出力(QN)をNAND①の入力へ「たすき掛け」につなぎます！',
      '【構成】NOT を2個、NAND を2個使います。SをNOTで反転してNAND①の空き入力へ、RをNOTで反転してNAND②の空き入力へ！',
      '【手順】1) nS=NOT(S), nR=NOT(R) → 2) NAND1(A=nS, B=NAND2.OUT)→Q → 3) NAND2(A=nR, B=NAND1.OUT)→QN！',
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
    revealedTitle: 'Dラッチ（1ビット・メモリセル）',
    scene: 'shelter_hub',
    widget: 'memory_vault',
    mode: 'sequential',
    incidentBrief: {
      where: '中央制御室・データ保護メモリ盤',
      trouble: '信号線のノイズで記憶が勝手に書き換わってしまう！ 「保存ボタン(WE)」を押した瞬間だけ記憶させたい',
      condition: 'WE=1 のときだけ D を記憶 ／ WE=0 の間は D が変わっても Q を保持せよ！',
      shortRule: 'WE=1 で D を保存、WE=0 で完全ロックする1ビット金庫（Dラッチ）を組め！',
      stakes: '現代メモリの最小単位「1ビット記憶セル」を完成させる',
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
        speaker: 'kagari',
        text: 'SRラッチは素晴らしいが、実際のコンピュータでは「SとRを別々に押す」のではなく、「データ(D)」と「保存ボタン(WE)」で操作したいんだ。',
      },
      {
        speaker: 'mina',
        text: 'たしかに！ 保存ボタン（WE）がOFFのときは、外の配線がノイズでパチパチ変わっても記憶が壊れない「金庫」になっててほしいよね。',
      },
      {
        speaker: 'hako',
        text: '『WE=0 なら SRラッチに S=0, R=0 を渡せば完全ロックだ。WE=1 なら D=1 で S=1、D=0 で R=1 になるよう門番をつけろ』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kagari',
        text: '素晴らしい！【Dラッチ（1ビット・メモリセル）】の誕生だ！ 現代の「1ギガバイトのメモリ」は、今きみが作ったこの1ビット金庫が85億個並んでいるだけなんだよ！',
      },
    ],
    hints: [
      '【考え方】S = (D AND WE)、R = ((NOT D) AND WE) にして SR_LAT につなぐだけ！ WE=0なら両方0で保持されます。',
      '【構成】NOT を1個、AND を2個、SR_LAT を1個使います。',
      '【手順】AND1(D, WE)→SR_LAT.S。NOT(D)とWE→AND2→SR_LAT.R。SR_LAT.Q → Q！',
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
    revealedTitle: 'Dフリップフロップ（エッジ駆動）',
    scene: 'shelter_hub',
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
        text: 'いよいよCPUの「心臓の鼓動（クロック）」を作るぞ！ 普通のDラッチはWE=1の間ずっと筒抜けだから、出力を足し算器へ戻すと信号が一瞬で暴走してしまうんだ。',
      },
      {
        speaker: 'kagari',
        text: 'そこで潜水艦の【二重エアロック】を使う！ 1個目のDラッチ（前室）は CLK=0 のときだけ開き、2個目のDラッチ（後室）は CLK=1 のときだけ開くようにするんだ。',
      },
      {
        speaker: 'hako',
        text: '『すると CLK が 0→1 へ切り替わった「その一瞬」だけ、前室に待機していた値が後室 Q へ運ばれる。あとは CLK=1 のあいだ D を何度変えても前室が閉じているからビクともしないぞ』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'すごい……CLKボタンを押した瞬間だけ「カチッ」と1拍ぶん進む！ まるで機械仕掛けの腕時計みたい！',
      },
      {
        speaker: 'kagari',
        text: '【Dフリップフロップ（マスター・スレーブ型）】の完成だ！ 現代のスマホに「3GHz」と書いてあるのは、今きみが作ったこの鼓動を1秒間に30億回打っているという意味なんだよ！',
      },
    ],
    hints: [
      '【考え方】D_LAT①（前室）のWEには NOT(CLK) を入れ、D_LAT②（後室）のWEにはそのまま CLK を入れて直列につなぎます！',
      '【構成】NOT を1個、D_LAT を2個（合計3個）だけです！',
      '【手順】D → D_LAT1.D / NOT(CLK) → D_LAT1.WE / D_LAT1.Q → D_LAT2.D / CLK → D_LAT2.WE / D_LAT2.Q → Q！',
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
    revealedTitle: '4ビット・レジスタ（REG_4BIT）',
    scene: 'shelter_hub',
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
        speaker: 'kagari',
        text: 'あと一歩で計算機の中枢がそろうぞ！ 今から作るのは、CPUが計算の途中結果を置いておく超高速の作業机——【4ビット・レジスタ】だ！',
      },
      {
        speaker: 'mina',
        text: 'クロックが鳴るたびに毎回上書きされちゃ困るから、「LOAD=1 のときだけ新しい数字 D を取り込み、LOAD=0 なら今の記憶 Q をそのまま維持する」仕組みが必要なのね！',
      },
      {
        speaker: 'hako',
        text: '『ここで ACT III の自作チップ MUX_4B（またはMUX×4）が火を吹くぞ。LOAD=0なら自分の出力Qを自分へ戻し、LOAD=1なら新しいDを D_FF へ流せ』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kagari',
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
    revealedTitle: '4ビットALU（2の補数・加減算器）',
    scene: 'surface_rover',
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
        text: 'ふふふ、ここがコンピュータ科学で一番ゾクゾクする魔法だ！ 引き算専用回路なんていらない。実は【Bの0と1を全部ひっくり返して、1を足す】だけで、さっきの ADD_4B がそのまま引き算をしてしまうんだ！',
      },
      {
        speaker: 'hako',
        text: '『本当だぞ。XORの片方に SUB を入れれば、SUB=0 で B そのまま、SUB=1 で B を全反転！ さらに SUB を ADD_4B の CIN に入れれば +1 も自動で足される。たった5チップだ』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'うそ……7-2=5、10-6=4、足し算も引き算も1つの回路で動いた！ 地上ローバーの障害物距離計算がオンラインになったよ！',
      },
      {
        speaker: 'kagari',
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
    revealedTitle: 'プログラムカウンタ（PC_4BIT）',
    scene: 'surface_rover',
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
      'このステージから定数端子「0 (GND)」と「1 (VCC)」も使えます！ REG_4B の値に ADD_4B で +1 し、MUX_4B で通常(+1)とジャンプ(J)を切り替えて REG_4B へ戻そう！',
    introDialogue: [
      {
        speaker: 'kagari',
        text: 'コンピュータが人間なしで自律して動く秘密——それは「今は何行目の命令を実行しているか」を自分で数え進める【プログラムカウンタ（PC）】にある！',
      },
      {
        speaker: 'kagari',
        text: 'クロックが1拍打つたびに、今の番号に「+1」して 0→1→2→3… と進む。さらにジャンプ命令（JMP=1）が来たら指定番地（J）へ飛び移る——これがループや条件分岐の正体だ！',
      },
      {
        speaker: 'hako',
        text: '『自作の ADD_4B、MUX_4B、REG_4B の3つと、定数0・定数1だけで組めるぞ。ADD_4B の B=0000、CIN=1 にすれば自動で「+1回路」になる』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '0、1、2、3……そしてJMPで一気に10番地へ飛んで、11、12！ 機械が自分で手順を追いかけてる……！',
      },
      {
        speaker: 'kagari',
        text: '素晴らしい！ これで部品はすべて揃った。次が最終工程——君がNANDひとつから組み上げたすべての結晶を束ね、アーク7の新中枢CPU【ARK-4】を起動するぞ！',
      },
    ],
    hints: [
      '【考え方】現在の値 Q を ADD_4B(A=Q, B=0000, CIN=1) に通すと Q+1 が出ます。それを MUX_4B で J と切り替え、LOAD=1 固定の REG_4B へ戻せば完成！',
      '【構成】ADD_4B、MUX_4B、REG_4B を各1個 ＋ 定数0（GND）と定数1（VCC）！',
      '【手順】REG_4B.Q0..3 → 外部Q0..3 かつ ADD_4B.A0..3。定数0 → ADD_4B.B0..3。定数1 → ADD_4B.CIN と REG_4B.LOAD。ADD_4B.S0..3 → MUX_4B.A0..3、外部J0..3 → MUX_4B.B0..3、JMP → MUX_4B.SEL。MUX_4B.Y0..3 → REG_4B.D0..3、CLK → REG_4B.CLK！',
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
        text: 'ついにここまで来たね、見習い君。最初は「0と1のスイッチ」すら知らなかった君が、NANDたった1種類から、加算器も、バスも、記憶回路も、ALUもすべて自分の手で組み上げた。',
      },
      {
        speaker: 'mina',
        text: '地上中継塔への救難・復興ビーコン、送信準備完了してるよ！ あとは【ARK-4 CPUコア】が6行の起動プログラムを最後まで計算し切れば、地下シェルター・アーク7は再び世界と繋がる……！',
      },
      {
        speaker: 'hako',
        text: '『最後の配線だ。ALU_4B、MUX_4B、REG_4B をひとつの環に結べ。お前が積み上げた数百個のNANDゲートすべてが、いまひとつの頭脳として目を覚ます』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'hako',
        text: '『……全命令シーケンス正常完了。LDI 5 → ADD 3 → SUB 2 → NOP → ADD 7 → SUB 13 → ZERO。中枢コア ARK-4、完全起動を確認。地上ビーコン発信開始——送信電文："HELLO, WORLD."』',
      },
      {
        speaker: 'mina',
        text: '……っ！ 見て、地上の中継塔が光った！！ 他のシェルターから応答信号が返ってきてる！！ 私たち、生き残ったんだ……もう一度、文明を始められるんだね！！',
      },
      {
        speaker: 'kagari',
        text: 'おめでとう、アーク7主任技師。もう「見習い」じゃない。君はいま、人類が100年かけて築いたコンピュータ科学のすべてを、たった1個のNANDから自分の手で再発明したんだ。胸を張っていい！',
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
