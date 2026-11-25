/**
 * SILICON GENESIS — Chapter 3: The Land of Memory (STAGE 27–42 / ACT VIII & IX)
 *
 * Continues seamlessly from Chapter 2 Ending (2094.11.25 06:42) at the joint
 * ARK-7 (118) + ARK-3 (124) = 242-person surface settlement "Horizon Camp".
 * Introduces physical ribbon bus bundles (4-bit / 8-bit — flattening bit-for-bit
 * down to Stage 00-C player MOSFETs), writable SRAM, 8-bit byte datapath with
 * hardware RST and Z/C/N flags, 4-register file (R0–R3), 16-bit expandable ISA
 * (LDI/ADD/SUB/JNZ/LOAD/STOR/ADDI/HALT), and ARK8_SYS running genuine general
 * algorithms directly on player SRAM!
 */

const CH12_CHIPS = [
  'NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT',
  'MUX', 'MUX_4BIT', 'DEC_2TO4', 'SR_LATCH', 'D_LATCH', 'D_FF', 'REG_4BIT',
  'ALU_4BIT', 'PC_4BIT', 'ARK4_CORE', 'ZERO_4BIT', 'COND_PC', 'INST_DEC',
  'ARK4_SYS', 'ASM_ENC', 'ROM_4W',
];

function alu8Case(a, b, sub) {
  const bEff = sub ? ((~b) & 0xff) : (b & 0xff);
  const raw = (a & 0xff) + bEff + (sub ? 1 : 0);
  const y = raw & 0xff;
  const z = y === 0 ? 1 : 0;
  const c = raw >= 256 ? 1 : 0;
  const n = (y >> 7) & 1;
  return {
    label: sub
      ? `減算 ${a} − ${b} = ${y} (Z=${z}, C=${c}, N=${n})`
      : `加算 ${a} + ${b} = ${y}${c ? ' (桁溢れC=1)' : ''} (Z=${z}, N=${n})`,
    busInput: [a, b, sub],
    busExpected: [y, z, c, n],
  };
}

function ram4Cycle(label, addr, dVal, we, expQ) {
  const a0 = addr & 1;
  const a1 = (addr >> 1) & 1;
  return {
    label,
    busDisplayInput: [a0, a1, dVal, we, 1],
    busPhases: [
      [a0, a1, dVal, we, 0],
      [a0, a1, dVal, we, 1],
    ],
    busExpected: [expQ],
  };
}

function reg8Cycle(label, dVal, load, rst, expQ) {
  return {
    label,
    busDisplayInput: [dVal, load, rst, 1],
    busPhases: [
      [dVal, load, rst, 0],
      [dVal, load, rst, 1],
    ],
    busExpected: [expQ],
  };
}

function regFileCycle(label, wa, wd, we, ra, rb, rst, expA, expB) {
  const wa0 = wa & 1, wa1 = (wa >> 1) & 1;
  const ra0 = ra & 1, ra1 = (ra >> 1) & 1;
  const rb0 = rb & 1, rb1 = (rb >> 1) & 1;
  return {
    label,
    busDisplayInput: [wa0, wa1, wd, we, ra0, ra1, rb0, rb1, rst, 1],
    busPhases: [
      [wa0, wa1, wd, we, ra0, ra1, rb0, rb1, rst, 0],
      [wa0, wa1, wd, we, ra0, ra1, rb0, rb1, rst, 1],
    ],
    busExpected: [expA, expB],
  };
}

function sram16Cycle(label, addr, dVal, we, expQ) {
  return {
    label,
    busDisplayInput: [addr, dVal, we, 1],
    busPhases: [
      [addr, dVal, we, 0],
      [addr, dVal, we, 1],
    ],
    busExpected: [expQ],
  };
}

function pc8Cycle(label, vVal, jVal, br, halt, rst, expPc) {
  return {
    label,
    busDisplayInput: [vVal, jVal, br, halt, rst, 1],
    busPhases: [
      [vVal, jVal, br, halt, rst, 0],
      [vVal, jVal, br, halt, rst, 1],
    ],
    busExpected: [expPc],
  };
}

function ark8Cycle(label, opCode, rd, rs, imm, rst, expQa, expMem, expPc, expZ, expHalt) {
  const op0 = opCode & 1, op1 = (opCode >> 1) & 1, op2 = (opCode >> 2) & 1;
  const rd0 = rd & 1, rd1 = (rd >> 1) & 1;
  const rs0 = rs & 1, rs1 = (rs >> 1) & 1;
  return {
    label,
    busDisplayInput: [op0, op1, op2, rd0, rd1, rs0, rs1, imm, rst, 1],
    busPhases: [
      [op0, op1, op2, rd0, rd1, rs0, rs1, imm, rst, 0],
      [op0, op1, op2, rd0, rd1, rs0, rs1, imm, rst, 1],
      [op0, op1, op2, rd0, rd1, rs0, rs1, imm, rst, 0],
    ],
    busExpected: [expQa, expMem, expPc, expZ, expHalt],
  };
}

export const CHAPTER3_STAGES = [
  // =========================================================================
  // ACT VIII — THE LAND OF MEMORY (BUS RIBBONS, SRAM & 8-BIT BYTE DATAPATH)
  // =========================================================================
  {
    id: 'stage_27',
    number: 27,
    act: 8,
    chapter: 3,
    code: '27',
    busMode: true,
    title: 'リボンケーブル解禁・4入力セレクタ',
    revealedTitle: '4入力4ビット・セレクタ（MUX4_4B）',
    scene: 'horizon_camp',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'combinational',
    incidentBrief: {
      where: '開拓拠点ホライズン・太陽光発電モニタ盤',
      trouble: 'アーク7(118人)とアーク3(124人)の共同拠点で、4基のソーラーパネル出力(D0〜D3)を切り替えて測定したいが、従来のMUX_4Bは2系統しか選べない！',
      condition: '2ビット選択線 (S0, S1) で 4本の4ビット束線 D0[3:0]〜D3[3:0] から1つを選んで Y[3:0] へ出力せよ！',
      shortRule: '4ビット束線4系統（D0〜D3）を S0,S1（00〜11）で1つ選ぶ MUX4_4B を組め！',
      stakes: 'リボンケーブル（バス束線）を習得し、次ステージの書換可能RAM読み出し回路を作る',
    },
    inputs: ['D0[3:0]', 'D1[3:0]', 'D2[3:0]', 'D3[3:0]', 'S0', 'S1'],
    outputs: ['Y[3:0]'],
    pinHelp: {
      inputs: [
        'D0[3:0]〜D3[3:0]: 4本の銅線を束ねた4ビット・リボン入力（0〜15）',
        'S0: 選択番号 1の位（00=D0, 01=D1, 10=D2, 11=D3）',
        'S1: 選択番号 2の位（0ならD0/D1グループ、1ならD2/D3グループ）',
      ],
      outputs: ['Y[3:0]: 選ばれた1系統の4ビット出力'],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH12_CHIPS],
    plainGoal: '4本の4ビット・リボン束線（D0〜D3）から、2ビット選択（S0, S1）で1つを選ぶ 4入力セレクタを作ろう！',
    beginnerNote:
      'ここから「4ビット・リボンケーブル（バス束線）」が使えます！太い端子 D[3:0] は1本の操作で4ビットまとめて配線でき、裏では1ビットずつあなたのMOSFETへ完全に繋がっています。2入力の MUX_4B をトーナメント表のように3個組もう！',
    introDialogue: [
      {
        speaker: 'kai',
        showIncident: true,
        text: 'よう、アーク7の主任技師！ 2日前に大ハッチを開けて合流してから、こっちの拠点「ホライズン」も一気に賑やかになったぜ。俺はアーク3の地上開拓チーフ、カイだ。よろしくな！',
      },
      {
        speaker: 'mina',
        text: 'アーク7の118人とアーク3の124人で、ぜんぶで 242人 の大きな家族になったんだよね！ ……でもカイさん、丘に並べた4基のソーラーパネルの出力を1つの計器で見るのに、2系統用の MUX_4B じゃ足りないみたい。',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '新技術解放：物理リボンケーブル（4bit / 8bit バス束線）',
          title: '🔌 4本の銅線を1本の帯へ！ MUX_4B × 3 で 4入力セレクタ',
          anim: 'goal_mux4_4b',
          rule: 'S1=0なら (S0で D0 / D1)、S1=1なら (S0で D2 / D3) を選ぶトーナメント構造！',
          accent: '#56ccf2',
        },
        text: 'そこで地上開拓の新道具──【バス束線（リボンケーブル）】を解禁しよう！ 4本の平行銅線を1個のコネクタに圧着しただけの純粋な物理配線だから、裏では1ビットずつ君の MOSFET へそのまま繋がる。さあ MUX_4B を3個組んで、4系統セレクタ【MUX4_4B】を作ってくれ！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kai',
        text: 'おおっ、4基のパネル出力がパチパチ気持ちよく切り替わるぜ！ 束線1本で4ビットまとめて繋げるの、現場じゃめちゃくちゃ助かるな！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：4入力4ビットセレクタ',
          title: '🔌 MUX4_4B（96 NAND）完成！',
          anim: 'mux4_4b',
          rule: '次はいよいよ、電源ONのまま何度でも書き換えられる本物のメモリ【RAM_4W】へ！',
          accent: '#56ccf2',
        },
        text: 'よし主任！ この【MUX4_4B】は、次のステージで作る「書き換え可能なメモリ（SRAM）」の読み出し口としてそのまま大活躍するぞ！',
      },
    ],
    hints: [
      '【考え方】2入力の MUX_4B をトーナメント方式で3個並べます。1回戦が2個（D0対D1、D2対D3）、決勝戦が1個！',
      '【構成】使うチップは MUX_4B × 3 個だけ（合計 96 NAND）です。',
      '【配線】1個目(D0, D1, SEL=S0)と 2個目(D2, D3, SEL=S0) の出力を、3個目の A・B へ入れ、3個目の SEL に S1 を繋いで Y[3:0] へ！',
    ],
    tests: [
      { label: 'S=00 (0番) → D0=3', busInput: [3, 9, 12, 6, 0, 0], busExpected: [3] },
      { label: 'S=01 (1番) → D1=9', busInput: [3, 9, 12, 6, 1, 0], busExpected: [9] },
      { label: 'S=10 (2番) → D2=12', busInput: [3, 9, 12, 6, 0, 1], busExpected: [12] },
      { label: 'S=11 (3番) → D3=6', busInput: [3, 9, 12, 6, 1, 1], busExpected: [6] },
      { label: '別値確認 S=10 → D2=15', busInput: [1, 2, 15, 4, 0, 1], busExpected: [15] },
    ],
    rewardChip: {
      id: 'MUX4_4B',
      name: 'MUX4_4B',
      shortName: 'MX4',
      titleJa: '4入力4ビットセレクタ',
      descJa: 'S0, S1 (00〜11) で4系統の4ビット束線から1つを選ぶマルチプレクサ。',
      color: '#1f6f8b',
      accent: '#56ccf2',
    },
    codexUnlock: ['bus_ribbon'],
  },

  {
    id: 'stage_28',
    number: 28,
    act: 8,
    chapter: 3,
    code: '28',
    busMode: true,
    title: '書き換えできる記憶棚・4語SRAM',
    revealedTitle: '4語×4ビット書換可能メモリ（RAM_4W）',
    scene: 'horizon_camp',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'sequential',
    hasClock: true,
    incidentBrief: {
      where: '開拓拠点ホライズン・備蓄データ記録棚',
      trouble: 'Stage 23 のマスクROMは電源を切っても消えないが、発電量や水量を記録するたびに毎回焼き直すわけにはいかない！ 実行中に番地を選んで自由に書き換えられるメモリが必要だ。',
      condition: '番地 (A0, A1) で選んだ1つの REG_4B にだけ WE=1 で書き込み（他3つは保持！）、常に指定番地の値を Q[3:0] へ出力せよ！',
      shortRule: 'DEC2_4 + AND×4 + REG_4B×4 + MUX4_4B で、書き換え可能な 4語×4bit SRAM（RAM_4W）を組み立てよ！',
      stakes: '固定ROMの限界を超え、コンピュータの主記憶装置「RAM」を自らの手で誕生させる',
    },
    inputs: ['A0', 'A1', 'D[3:0]', 'WE', 'CLK'],
    outputs: ['Q[3:0]'],
    pinHelp: {
      inputs: [
        'A0, A1: 読み書きする記憶棚の番地（0〜3番地）',
        'D[3:0]: 書き込む4ビットデータ（0〜15）',
        'WE: 書き込み許可（1で指定番地のみ上書き、0なら全番地を保持して読出専用）',
        'CLK: クロック（0→1の瞬間に WE=1 の選択番地へ保存）',
      ],
      outputs: ['Q[3:0]: いま番地 (A0, A1) が指している記憶棚の中身'],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH12_CHIPS, 'MUX4_4B'],
    plainGoal: '4つの 4ビットレジスタ（REG_4B）を並べ、番地 (A0, A1) と WE で選んだ1つだけを書き換え・読み出しできる本物の【SRAM（RAM_4W）】を創ろう！',
    beginnerNote:
      '書込側＝「DEC2_4 の各出力 Y0〜Y3 と WE を AND して各 REG_4B の LOAD へ」！ 読出側＝「4つの REG_4B の出力を MUX4_4B の D0〜D3 へ入れて A0,A1 で選ぶ」！ これだけで本物のRAMになります！',
    introDialogue: [
      {
        speaker: 'kai',
        showIncident: true,
        text: 'なあ主任、1つデカい問題があるんだ。Stage 23 で組んだ【ROM_4W】は命令を固定で焼き付けるのには最高だが、発電量やタンク水位みたいに1時間ごとに変わる数字を記録できないよな？',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: 'ROM vs RAM：記憶の物理的な違い（動く図解）',
          title: '🧠 番地選択(DEC2_4) × 書込許可(AND) × 記憶棚(REG_4B×4) × 読出(MUX4)',
          anim: 'goal_ram_4w',
          rule: 'WE=1 かつ DEC2_4 で選ばれた1棚だけ CLK↑ で保存！ 他の3棚は値を壊さず保持！',
          accent: '#52e3b6',
        },
        text: '『そこで登場するのが、電気を入れたまま何度でも書き換えられる記憶棚──【SRAM（スタティックRAM）】だ！\n固定配線の代わりに、お前が作った【REG_4B】を4つ並べる。DEC2_4 と AND で「選ばれた番地だけ LOAD=1」にし、出口をさっきの【MUX4_4B】で選べば完成だぜ！』',
      },
      {
        speaker: 'kagari',
        text: '将来、OSカーネルや複数のアプリを同時に走らせるための「主記憶メモリ（RAM）」──その最小完全単位がまさにこの【RAM_4W】だ。心して組み上げよう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'わぁっ、0番地に「5」、2番地に「12」を書いてから0番地に戻したら、ちゃんと「5」が残ってる！！ これが……パソコンの中に入ってる「メモリ（RAM）」の本当の仕組みなんだね！！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：4語×4ビット書換可能SRAM',
          title: '🧠 RAM_4W（546 NAND）誕生！',
          anim: 'ram_4w',
          rule: 'ROM（固定配線）とRAM（書換可能レジスタ配列）の両方を自分の手で制覇！',
          accent: '#52e3b6',
        },
        text: '見事だ主任！ だがすぐに次の壁がやってくる。アーク7とアーク3の合計人数「242人」は、4ビット（最大15）の箱には入らない──次はいよいよ「1バイト（8ビット）」の世界へ跳躍しよう！',
      },
    ],
    hints: [
      '【構成】DEC2_4 × 1、AND × 4、REG_4B × 4、MUX4_4B × 1（合計10チップ）。',
      '【書込配線】A0,A1 → DEC2_4。各 Y0〜Y3 と WE をそれぞれ AND に入れて、4つの REG_4B の LOAD へ接続。全 REG_4B の D には D[3:0]、CLK には CLK を共通接続！',
      '【読出配線】4つの REG_4B の Q[3:0] を MUX4_4B の D0〜D3 へ入れ、S0=A0、S1=A1 を繋いで出力 Y[3:0] → Q[3:0] へ！',
    ],
    tests: [
      ram4Cycle('① 0番地に 5 を書込 (WE=1)', 0, 5, 1, 5),
      ram4Cycle('② 1番地に 10 を書込 (WE=1)', 1, 10, 1, 10),
      ram4Cycle('③ 2番地に 12 を書込 (WE=1)', 2, 12, 1, 12),
      ram4Cycle('④ 3番地に 7 を書込 (WE=1)', 3, 7, 1, 7),
      ram4Cycle('⑤ 0番地を読出 (WE=0, D=15でも壊れず 5 保持!)', 0, 15, 0, 5),
      ram4Cycle('⑥ 2番地を読出 (WE=0 → 12 保持!)', 2, 0, 0, 12),
      ram4Cycle('⑦ 1番地を 14 へ上書き (WE=1 → 14!)', 1, 14, 1, 14),
      ram4Cycle('⑧ 3番地を再確認 (WE=0 → 7 が無事!)', 3, 0, 0, 7),
    ],
    rewardChip: {
      id: 'RAM_4W',
      name: 'RAM_4W',
      shortName: 'RM4',
      titleJa: '4語×4ビット書換可能SRAM',
      descJa: '番地 A0,A1 と WE・CLK で4つの4ビット棚を自由に読み書きできる静的RAM。',
      color: '#1e7858',
      accent: '#52e3b6',
    },
    codexUnlock: ['sram_memory'],
  },

  {
    id: 'stage_29',
    number: 29,
    act: 8,
    chapter: 3,
    code: '29',
    busMode: true,
    title: '1バイトの扉・8ビット加算器',
    revealedTitle: '8ビット加算器（ADD_8B）',
    scene: 'horizon_camp',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'combinational',
    incidentBrief: {
      where: '開拓拠点ホライズン・住民名簿集計盤',
      trouble: 'アーク7（118人）とアーク3（124人）を合算して 242人 を数えたいが、4ビット加算器（最大15）では全く桁が足りない！',
      condition: '2つの 8ビット束線 A[7:0], B[7:0] と CIN を足し、8ビット和 S[7:0] と桁あふれ COUT を出力せよ！',
      shortRule: 'SPLIT8 で8bitを下位4+上位4へ分け、ADD_4B × 2 を COUT→CIN で直結し、JOIN8 で1バイトに戻せ！',
      stakes: '最大15の壁を破り、0〜255（1バイト＝英数字1文字）の世界へ突入する',
    },
    inputs: ['A[7:0]', 'B[7:0]', 'CIN'],
    outputs: ['S[7:0]', 'COUT'],
    pinHelp: {
      inputs: [
        'A[7:0]: 1つ目の8ビット数（0〜255）',
        'B[7:0]: 2つ目の8ビット数（0〜255）',
        'CIN: 最下位へのくり上がり入力（通常 0、+1 加算時に 1）',
      ],
      outputs: [
        'S[7:0]: 8ビットの足し算結果（0〜255）',
        'COUT: 256以上になったときの桁あふれキャリー出力',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH12_CHIPS, 'MUX4_4B', 'RAM_4W'],
    plainGoal: '既存の 4ビット加算器（ADD_4B）を2個つないで、0〜255（1バイト）まで数えられる 8ビット加算器（ADD_8B）を作ろう！',
    beginnerNote:
      'パレットに受動コネクタ【SPLIT8（8→4+4分岐）】と【JOIN8（4+4→8結束）】が追加されました（0 NANDの純配線部品です）。AとBを下位4bit・上位4bitに分けて、下位 ADD_4B の COUT を上位 ADD_4B の CIN へバトンパスしよう！',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: '主任さん、大変！ 住民名簿をまとめるのに「アーク7の 118人 ＋ アーク3の 124人」を足そうとしたら、4ビット計算機だと 15 で桁あふれしちゃって全然計算できないの！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '1バイト（8ビット＝0〜255）革命（動く図解）',
          title: '➕ ADD_4B × 2 を COUT → CIN で連結 ＝ 8ビット加算器！',
          anim: 'goal_add_8b',
          rule: '118 + 124 = 242！ 1バイト（8bit）は将来のASCII文字コードやOS番地にも直結！',
          accent: '#5ce0a8',
        },
        text: '思い出してみろ、Stage 07 で君が作った【ADD_4B】には、わざわざ【CIN】と【COUT】のバトン端子をつけてあっただろう？ 2個横に並べて下位の COUT を上位の CIN へ繋ぐだけで、一気に 0〜255──歴史的な「1バイト（8ビット）」の扉が開くんだ！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '118 ＋ 124 ＝ 242！！ 242人全員が一発で出たよ！！ これからは何百人いても、アルファベット1文字だって、ちゃんと1つの束線で表せるんだね！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: 'モジュール図鑑へ登録：8ビット加算器',
          title: '➕ ADD_8B（152 NAND＝MOSFET 304個）完成！',
          anim: 'add_8b',
          rule: 'たった2個の ADD_4B 連結で1バイト演算を実現！',
          accent: '#5ce0a8',
        },
        text: '『しかもな主任、この ADD_8B は計算だけじゃなく、第4章でスタックポインタ（SP）の増減や、OSがアプリの番地を安全にずらす「Base/Limit MMU（番地変換器）」の心臓としても、1ミリも捨てずにそのまま活躍するぞ！ 完璧な拡張設計だな！』',
      },
    ],
    hints: [
      '【構成】SPLIT8 × 2、ADD_4B × 2、JOIN8 × 1（たった5チップ・152 NAND）。',
      '【下位桁】A[7:0]→SPLIT8(A)、B[7:0]→SPLIT8(B)。それぞれの L[3:0] と入力 CIN を1個目の ADD_4B へ！',
      '【上位桁】それぞれの H[3:0] と「1個目の ADD_4B.COUT」を2個目の ADD_4B へ！ 2つの S[3:0] を JOIN8 で束ねて S[7:0]、2個目の COUT を COUT へ！',
    ],
    tests: [
      { label: '118 + 124 = 242 (全住民合算!)', busInput: [118, 124, 0], busExpected: [242, 0] },
      { label: '15 + 1 = 16 (下位→上位キャリー伝播)', busInput: [15, 1, 0], busExpected: [16, 0] },
      { label: '200 + 55 + CIN1 = 0 (COUT=1 桁溢れ)', busInput: [200, 55, 1], busExpected: [0, 1] },
      { label: '255 + 255 + 1 = 255 (COUT=1 最大値)', busInput: [255, 255, 1], busExpected: [255, 1] },
      { label: '42 + 0 + CIN1 = 43 (+1インクリメント)', busInput: [42, 0, 1], busExpected: [43, 0] },
    ],
    rewardChip: {
      id: 'ADD_8B',
      name: 'ADD_8B',
      shortName: 'AD8',
      titleJa: '8ビット加算器',
      descJa: 'ADD_4B×2をキャリー連結し、0〜255（1バイト）の加算とCOUTを行う加算器。',
      color: '#247a5e',
      accent: '#5ce0a8',
    },
    codexUnlock: ['bus_ribbon'],
  },

  {
    id: 'stage_30',
    number: 30,
    act: 8,
    chapter: 3,
    code: '30',
    busMode: true,
    title: '電源ONの原点・リセット付8bitレジスタ',
    revealedTitle: '物理リセット付8ビットレジスタ（REG_8B）',
    scene: 'horizon_camp',
    storyBgm: 'crisis',
    widget: 'data_bus',
    mode: 'sequential',
    hasClock: true,
    incidentBrief: {
      where: '開拓拠点ホライズン・発電制御コントローラ',
      trouble: '夜間の電源切替テストで、起動直後のレジスタに残っていたゴミ値がそのまま出力されて設備が誤作動！ 電源ONで全ビットを確実に 0 へ揃える物理リセット線（RST）が必要だ！',
      condition: 'RST=1 なら LOAD に関わらず CLK↑ で 0 へ初期化、RST=0 なら LOAD=1 で D[7:0] を保存、LOAD=0 で保持せよ！',
      shortRule: 'MUX_4B で「通常データ vs アース0」を RST で切り替え、OR(LOAD, RST) で書込許可する REG_8B を作れ！',
      stakes: '将来のブートROM起動（PC=0）とOS初期化に必須となる本物のハードウェア・リセットを実現する',
    },
    inputs: ['D[7:0]', 'LOAD', 'RST', 'CLK'],
    outputs: ['Q[7:0]'],
    pinHelp: {
      inputs: [
        'D[7:0]: 保存したい8ビットデータ（0〜255）',
        'LOAD: 書込許可（RST=0のとき、1でDを保存・0で現在値を保持）',
        'RST: 物理リセット（1ならLOAD=0でもCLK↑で強制的に 0 へ初期化！）',
        'CLK: クロック（0→1の立ち上がりで確定）',
      ],
      outputs: ['Q[7:0]: 記憶している8ビット値（0〜255）'],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH12_CHIPS, 'MUX4_4B', 'RAM_4W', 'ADD_8B'],
    plainGoal: '8ビット（1バイト）を記憶でき、さらに物理リセット線 RST=1 の1拍で確実に 0 へ戻せる【REG_8B】を組み立てよう！',
    beginnerNote:
      'ポイントは2つ！① MUX_4B の B側へ「アース0」を繋ぎ SEL=RST にすると、RST=1 のとき入力が 0000 になります（アース0は4bit端子へ直接つなげます！）。② LOAD=0 でもリセットが効くよう、REG_4B.LOAD には OR(LOAD, RST) を入れよう！',
    introDialogue: [
      {
        speaker: 'kai',
        showIncident: true,
        text: 'ひやっとしたぜ……！ さっき風力タービンから太陽光へ電源を切り替えたら、制御レジスタに前のゴミ値が残ってて、散水ポンプが勝手に回り出したんだ！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: 'ハードウェア・リセット（RST）の仕組み（動く図解）',
          title: '🔄 RST=1 で入力をアース0に切替 ＋ OR(LOAD, RST) で強制0書込！',
          anim: 'goal_reg_8b',
          rule: 'RST=1 → CLK↑ で即 0！ 第2章の3拍リセット小技を卒業し、本物のリセットボタンへ！',
          accent: '#c89bff',
        },
        text: '『第2章の ARK4_SYS ではリセットピンが無かったから LDI 1→JNZ 15→LDI 0 の3拍で初期化していたが、本格OSを動かす計算機には本物の【物理リセット線（RST）】が不可欠だ！ 8ビットレジスタを2つの REG_4B で組みつつ、手前に MUX_4B と OR でリセット回路を仕込もう！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kai',
        text: 'おおっ！ RST を 1 にしてクロックを1発叩いた瞬間、200 も 255 も一発でキレイに 0 へ揃った！ これなら停電復帰も怖くねえな！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：リセット付8ビットレジスタ',
          title: '🔄 REG_8B（283 NAND）完成！',
          anim: 'reg_8b',
          rule: 'この REG_8B が汎用レジスタ R0〜R3 と 8bit PC の心臓部になります！',
          accent: '#c89bff',
        },
        text: '実世界のマザーボードにあるリセットボタンも、まさにこうして全レジスタとPCの RST 線へ電気を流して 0番地（ブートROM）から起動させているんだ！',
      },
    ],
    hints: [
      '【構成】SPLIT8×1、アース0(CONST_0)×1、MUX_4B×2、OR×1、REG_4B×2、JOIN8×1（計8チップ）。',
      '【データ切替】D[7:0]→SPLIT8。下位Lとアース0を MUX_4B(下位) へ、上位Hとアース0を MUX_4B(上位) へ入れ、両方の SEL に RST を接続！',
      '【書込許可】OR(LOAD, RST) の出力を2つの REG_4B.LOAD へ、CLK を両方の CLK へ接続し、2つの Q を JOIN8 で束ねて Q[7:0] へ！',
    ],
    tests: [
      reg8Cycle('① 電源ONリセット (D=99, LOAD=0, RST=1 → 0!)', 99, 0, 1, 0),
      reg8Cycle('② 242 を書込 (LOAD=1, RST=0 → 242)', 242, 1, 0, 242),
      reg8Cycle('③ 保持確認 (D=15, LOAD=0, RST=0 → 242保持!)', 15, 0, 0, 242),
      reg8Cycle('④ 170 へ上書き (LOAD=1, RST=0 → 170)', 170, 1, 0, 170),
      reg8Cycle('⑤ 強制リセット (D=255, LOAD=0, RST=1 → 0!)', 255, 0, 1, 0),
    ],
    rewardChip: {
      id: 'REG_8B',
      name: 'REG_8B',
      shortName: 'RG8',
      titleJa: 'リセット付8ビットレジスタ',
      descJa: 'RST=1で即座に0初期化、RST=0で1バイト（0〜255）を記憶・保持するレジスタ。',
      color: '#6b3fa0',
      accent: '#c89bff',
    },
    codexUnlock: ['byte_alu_flags'],
  },

  {
    id: 'stage_31',
    number: 31,
    act: 8,
    chapter: 3,
    code: '31',
    busMode: true,
    title: 'バスを丸ごと反転・4bit条件反転器',
    revealedTitle: '4ビット条件反転器（XOR_4B）',
    scene: 'horizon_camp',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'combinational',
    incidentBrief: {
      where: '開拓拠点ホライズン・8ビット演算ユニット工作台',
      trouble: '8ビット引き算器（ALU_8B）を作ろうとしたら、第1章の ALU_4B には下位からの CIN 端子がなく、2個連結できないことが判明！ ADD_8B の手前で B を条件反転する部品が必要だ。',
      condition: 'INV=0 のときは A[3:0] をそのまま出力、INV=1 のときは4ビットすべてを 0↔1 反転して Y[3:0] へ出力せよ！',
      shortRule: 'SPLIT4 で4bitをほどき、4個の XOR で INV と排他的論理和をとり、JOIN4 で束ねて戻せ！',
      stakes: '正確な8ビット2の補数減算器（ALU_8B）と将来のビット論理演算への共通部品を鍛造する',
    },
    inputs: ['A[3:0]', 'INV'],
    outputs: ['Y[3:0]'],
    pinHelp: {
      inputs: [
        'A[3:0]: 4ビット束線入力（0〜15）',
        'INV: 反転スイッチ（0で素通し、1で全4ビットを反転＝1の補数）',
      ],
      outputs: ['Y[3:0]: INV=0 なら A、INV=1 なら ~A（15−A）'],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH12_CHIPS, 'MUX4_4B', 'RAM_4W', 'ADD_8B', 'REG_8B'],
    plainGoal: 'INV=0 なら4ビットをそのまま通し、INV=1 なら全ビット反転する【XOR_4B】を、SPLIT4・XOR×4・JOIN4 で作ろう！',
    beginnerNote:
      '「x XOR 0 = x（素通し）」「x XOR 1 = NOT(x)（反転）」という XOR の性質を4ビット束線に拡張します！ 24 NAND の超コンパクト部品です。',
    introDialogue: [
      {
        speaker: 'kai',
        showIncident: true,
        text: 'あれっ、主任！ 8ビットの引き算器を作ろうと思って Stage 15 の【ALU_4B】を2個並べてみたんだけど、ALU_4B には下の桁から桁借りを引き継ぐ【CIN】端子がないじゃないか！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'エンジニアの正確な検証：なぜ XOR_4B が要るのか',
          title: '🔀 4bit束線を条件反転する【XOR_4B】（24 NAND）',
          anim: 'goal_xor_4b',
          rule: 'INV=0 なら素通し、INV=1 なら全ビット反転！ 2個並べて ADD_8B(CIN=SUB) へ繋ぐと完璧な8bit減算になる！',
          accent: '#ffb347',
        },
        text: 'よくぞ気づいたな、カイ！ 誤魔化さずに正しい8ビット2の補数引き算（A + ~B + 1）を組むには、ADD_8B の手前で B を条件反転させればいい。まずは4ビット単位の条件反転器【XOR_4B】をサッと鍛えておこう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'hako',
        text: '『よし、24 NAND のキレのいい部品ができたな！ これ2個と ADD_8B を組み合わせれば、ついに 8ビット完全ALU の出番だぜ！』',
      },
    ],
    hints: [
      '【構成】SPLIT4 × 1、XOR × 4、JOIN4 × 1（計6チップ・24 NAND）。',
      '【配線】A[3:0] → SPLIT4。SPLIT4 の出力 0〜3 をそれぞれ XOR の A へ入れ、全 XOR の B に INV を共通接続！',
      '【出力】4つの XOR 出力を JOIN4 の 0〜3 へ入れて Y[3:0] へ繋げば完了！',
    ],
    tests: [
      { label: 'INV=0 素通し (5 → 5)', busInput: [5, 0], busExpected: [5] },
      { label: 'INV=1 全反転 (5[0101] → 10[1010])', busInput: [5, 1], busExpected: [10] },
      { label: 'INV=0 素通し (0 → 0)', busInput: [0, 0], busExpected: [0] },
      { label: 'INV=1 全反転 (0[0000] → 15[1111])', busInput: [0, 1], busExpected: [15] },
      { label: 'INV=1 全反転 (12[1100] → 3[0011])', busInput: [12, 1], busExpected: [3] },
    ],
    rewardChip: {
      id: 'XOR_4B',
      name: 'XOR_4B',
      shortName: 'XR4',
      titleJa: '4ビット条件反転器',
      descJa: 'INV=1で4ビット束線すべての0/1を反転、INV=0で素通しするバス演算チップ。',
      color: '#a86420',
      accent: '#ffb347',
    },
    codexUnlock: ['byte_alu_flags'],
  },

  {
    id: 'stage_32',
    number: 32,
    act: 8,
    chapter: 3,
    code: '32',
    busMode: true,
    title: '大小を見抜く頭脳・8ビットALU',
    revealedTitle: 'フラグ付8ビットALU（ALU_8B）',
    scene: 'horizon_camp',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'combinational',
    incidentBrief: {
      where: '開拓拠点ホライズン・電力需給判定ユニット',
      trouble: '太陽光発電量 A（例：180）と拠点消費量 B（例：115）を引き算するだけでなく、「答えが0か(Z)」「桁あふれか(C)」「負になったか(N)」まで1度に判定できる 8ビットALU が必要だ！',
      condition: 'SUB=0 で A+B、SUB=1 で A−B を Y[7:0] に出力し、同時に Z(Y==0)・C(COUT)・N(Yの最上位bit7) を出力せよ！',
      shortRule: 'XOR_4B×2 + ADD_8B で加減算し、ZERO_4B×2+AND で Z、COUT で C、Yのbit7 で N を出力せよ！',
      stakes: '8ビット演算と大小比較フラグ（Z/C/N）を同時に生み出す本格CPUの演算心臓を完成させる',
    },
    inputs: ['A[7:0]', 'B[7:0]', 'SUB'],
    outputs: ['Y[7:0]', 'Z', 'C', 'N'],
    pinHelp: {
      inputs: [
        'A[7:0]: 左の8ビット数値（0〜255）',
        'B[7:0]: 右の8ビット数値（0〜255）',
        'SUB: 0=足し算 (A+B) ／ 1=引き算 (A−B)',
      ],
      outputs: [
        'Y[7:0]: 計算結果（8ビット）',
        'Z: ゼロフラグ（Y == 0 のとき 1）',
        'C: キャリーフラグ（ADD_8B の COUT。減算時は A >= B で 1！）',
        'N: 符号フラグ（Y の最上位 bit7。2の補数で負なら 1）',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH12_CHIPS, 'MUX4_4B', 'RAM_4W', 'ADD_8B', 'REG_8B', 'XOR_4B'],
    plainGoal: '8ビットの足し算・引き算と同時に、Z（ゼロ）・C（キャリー）・N（符号bit7）の3大ステータスフラグを出力する【ALU_8B】を作ろう！',
    beginnerNote:
      'Z は「下位4bitが0 かつ 上位4bitが0」なので ZERO_4B×2＋AND！ N は「Y の上位4bit H[3:0] を SPLIT4 で分けた 3番ピン（bit7）」そのままです！',
    introDialogue: [
      {
        speaker: 'kai',
        showIncident: true,
        text: '太陽光が 180kW で消費が 115kW なら 65kW 余るけど、もし消費の方が大きくてマイナスになったら即バッテリー切替したいんだ。引き算の結果から「ゼロか」「負か」も一発でわかる頭脳を作れるか？',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '本物のCPUステータスフラグ：Z・C・N（動く図解）',
          title: '⚡ 8bit加減算 ＋ Z(ゼロ) / C(桁溢れ) / N(符号bit7)',
          anim: 'goal_alu_8b',
          rule: 'B を XOR_4B×2 で条件反転 → ADD_8B(CIN=SUB)！ 結果の Y から Z・C・N の3フラグを引き出せ！',
          accent: '#ff8a7a',
        },
        text: 'それこそ実在のプロセッサに必ず備わっている「フラグレジスタ（Z・C・N）」の源泉だ！ さっきの【XOR_4B】×2 と【ADD_8B】、そして第2章の【ZERO_4B】×2 を合体させて、本格8ビット【ALU_8B】を誕生させよう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '180 − 115 ＝ 65（C=1, N=0）、50 − 50 ＝ 0（Z=1）、30 − 80 ＝ 206（N=1・マイナス検知！）──本当に1つの回路でぜんぶ判定できてる！！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：フラグ付8ビットALU',
          title: '⚡ ALU_8B（222 NAND）完成！',
          anim: 'alu_8b',
          rule: 'これで第3章の8bit演算心臓が完成！ いよいよ汎用レジスタと16バイトSRAMの構築へ！',
          accent: '#ff8a7a',
        },
        text: '素晴らしい！ この Z・C・N フラグによる大小比較は、第4章でアプリの暴走を物理的に防ぐ「Base/Limit MMU」の上限チェックでもそのまま活躍するぞ！ さあ次の ACT IX では、ついに「4本の汎用レジスタ（R0〜R3）」と「16バイト主記憶SRAM」を束ね、新世代8ビット計算機【ARK8_SYS】を覚醒させよう！',
      },
    ],
    hints: [
      '【減算入力】B[7:0] → SPLIT8 → XOR_4B×2（両方の INV に SUB）→ JOIN8 → ADD_8B.B。ADD_8B.A=A[7:0]、CIN=SUB！',
      '【YとC】ADD_8B.S → Y[7:0]、ADD_8B.COUT → C。',
      '【ZとN】ADD_8B.S をもう1つの SPLIT8 へ入れ、LとHをそれぞれ ZERO_4B へ繋いで AND → Z！ さらに H を SPLIT4 へ入れて 3番ピン(bit7) → N！',
    ],
    tests: [
      alu8Case(118, 124, 0), // 242, Z=0, C=0, N=1
      alu8Case(180, 115, 1), // 65, Z=0, C=1, N=0
      alu8Case(50, 50, 1),   // 0, Z=1, C=1, N=0
      alu8Case(30, 80, 1),   // 206 (-50), Z=0, C=0, N=1
      alu8Case(200, 100, 0), // 44 (overflow), Z=0, C=1, N=0
      alu8Case(0, 0, 0),     // 0, Z=1, C=0, N=0
    ],
    rewardChip: {
      id: 'ALU_8B',
      name: 'ALU_8B',
      shortName: 'AL8',
      titleJa: 'フラグ付8ビットALU',
      descJa: '8ビット加減算と同時に Z(ゼロ)・C(キャリー)・N(符号bit7) フラグを出力する演算装置。',
      color: '#a8423b',
      accent: '#ff8a7a',
    },
    codexUnlock: ['byte_alu_flags'],
  },

  // =========================================================================
  // ACT IX — AWAKENING OF ARK-8 (REGFILE, 16B SRAM & 16-BIT EXPANDABLE ISA)
  // =========================================================================
  {
    id: 'stage_33',
    number: 33,
    act: 9,
    chapter: 3,
    code: '33',
    busMode: true,
    title: '1バイトの交差点・8bit 4入力セレクタ',
    revealedTitle: '4入力8ビット・セレクタ（MUX4_8B）',
    scene: 'horizon_camp',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'combinational',
    incidentBrief: {
      where: '開拓拠点ホライズン・8ビットデータバス切替盤',
      trouble: 'これから作る「4本の8bitレジスタ（R0〜R3）」「16バイトSRAM」「CPUのデータ書戻し」のすべてで、8ビット束線4系統から1本を選ぶ共通セレクタが必要になる！',
      condition: '4本の8ビット入力 D0[7:0]〜D3[7:0] から、S0,S1 (00〜11) で選んだ1本を Y[7:0] へ出力せよ！',
      shortRule: '4入力を SPLIT8 で下位4/上位4に分け、MUX4_4B × 2 と JOIN8 で8ビット4入力セレクタを組め！',
      stakes: 'レジスタファイル・SRAM・PC・CPUすべてに共通投入する最重要バス切替モジュールを作る',
    },
    inputs: ['D0[7:0]', 'D1[7:0]', 'D2[7:0]', 'D3[7:0]', 'S0', 'S1'],
    outputs: ['Y[7:0]'],
    pinHelp: {
      inputs: [
        'D0[7:0]〜D3[7:0]: 4系統の8ビット（1バイト）データ入力',
        'S0, S1: 選択番号（00=D0, 01=D1, 10=D2, 11=D3）',
      ],
      outputs: ['Y[7:0]: 選ばれた1バイト出力'],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH12_CHIPS, 'MUX4_4B', 'RAM_4W', 'ADD_8B', 'REG_8B', 'XOR_4B', 'ALU_8B'],
    plainGoal: 'Stage 27 の MUX4_4B を2個（下位4bit用・上位4bit用）並列に並べて、1バイト×4系統を切り替える【MUX4_8B】を作ろう！',
    beginnerNote:
      'S1 をアース0に固定すれば「2入力の8bitセレクタ」としてもそのまま使える超万能チップです！ これ1つ作れば、以降の全8bit切替が劇的にスッキリします。',
    introDialogue: [
      {
        speaker: 'kagari',
        showIncident: true,
        text: 'さあ、ここから ACT IX──本格8ビット汎用計算機【ARK8_SYS】の組み立てだ！ その要になる「8ビット4系統バスセレクタ【MUX4_8B】」を最初に1つだけ作っておこう。',
      },
      {
        speaker: 'hako',
        text: '『R0〜R3 の読み出し、SRAM のバンク選択、ALU と IMM と RAM の書き戻し選択──ぜんぶこの MUX4_8B 一種類でまかなえるんだぜ！ MUX4_4B × 2 を並列に束ねるだけだからサクッと組もう！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '下位4ビットと上位4ビットを2個並べるだけで、一気に8ビット（1バイト）の高速道路ができちゃった！ さあ次はいよいよ、4本の作業机【R0〜R3】だね！',
      },
    ],
    hints: [
      '【構成】SPLIT8 × 4、MUX4_4B × 2、JOIN8 × 1（計7チップ・192 NAND）。',
      '【下位側】D0〜D3 をそれぞれ SPLIT8 へ入れ、4つの L[3:0] を1個目の MUX4_4B の D0〜D3 へ（SEL は S0, S1）！',
      '【上位側】4つの H[3:0] を2個目の MUX4_4B の D0〜D3 へ（SEL は S0, S1）入れ、2つの出力を JOIN8 で束ねて Y[7:0] へ！',
    ],
    tests: [
      { label: 'S=00 → D0=42', busInput: [42, 118, 124, 242, 0, 0], busExpected: [42] },
      { label: 'S=01 → D1=118', busInput: [42, 118, 124, 242, 1, 0], busExpected: [118] },
      { label: 'S=10 → D2=124', busInput: [42, 118, 124, 242, 0, 1], busExpected: [124] },
      { label: 'S=11 → D3=242', busInput: [42, 118, 124, 242, 1, 1], busExpected: [242] },
    ],
    rewardChip: {
      id: 'MUX4_8B',
      name: 'MUX4_8B',
      shortName: 'MX8',
      titleJa: '4入力8ビットセレクタ',
      descJa: '4系統の8ビットバスから S0,S1 で1つを選ぶ汎用セレクタ（S1=0で2入力8bitMUXにもなる）。',
      color: '#1b6d7c',
      accent: '#56ccf2',
    },
    codexUnlock: ['bus_ribbon'],
  },

  {
    id: 'stage_34',
    number: 34,
    act: 9,
    chapter: 3,
    code: '34',
    busMode: true,
    title: '4本の作業机・汎用レジスタファイル',
    revealedTitle: '4×8ビット汎用レジスタファイル（REGFILE_4）',
    scene: 'horizon_camp',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'sequential',
    hasClock: true,
    incidentBrief: {
      where: '開拓拠点ホライズン・ARK-8 CPUコア区画',
      trouble: '第2章の ACC 1本だけでは「足す値」「回数カウンタ」「合計」を同時に覚えられない！ R0〜R3 の4本の8ビット作業机を持ち、同時に2本（QA と QB）を読み出せるレジスタファイルが必要だ！',
      condition: '書込番号 (WA0,WA1) と WE=1 で WD[7:0] を該当 REG_8B へ保存し、同時に RA で選んだ QA[7:0] と RB で選んだ QB[7:0] を2ポート出力せよ！（RST=1で全4本を0初期化）',
      shortRule: 'DEC2_4 + AND×4 + REG_8B×4 + MUX4_8B×2 で、2ポート同時読出の R0〜R3 レジスタファイルを組め！',
      stakes: '現代のRISCプロセッサや将来のUNIXシステムコール引数規約（R0, R1, R2）の礎を築く',
    },
    inputs: ['WA0', 'WA1', 'WD[7:0]', 'WE', 'RA0', 'RA1', 'RB0', 'RB1', 'RST', 'CLK'],
    outputs: ['QA[7:0]', 'QB[7:0]'],
    pinHelp: {
      inputs: [
        'WA0, WA1: 書き込み先レジスタ番号（0=R0, 1=R1, 2=R2, 3=R3）',
        'WD[7:0]: 書き込む8ビットデータ',
        'WE: レジスタ書込許可（1で WA のレジスタのみ更新）',
        'RA0, RA1: ポートA（QA）で読み出すレジスタ番号（Rd）',
        'RB0, RB1: ポートB（QB）で読み出すレジスタ番号（Rs）',
        'RST / CLK: 全レジスタ同時0リセット線 と クロック',
      ],
      outputs: [
        'QA[7:0]: ポートA（RA指定レジスタ）の現在値',
        'QB[7:0]: ポートB（RB指定レジスタ）の現在値',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH12_CHIPS, 'MUX4_4B', 'RAM_4W', 'ADD_8B', 'REG_8B', 'XOR_4B', 'ALU_8B', 'MUX4_8B'],
    plainGoal: 'R0〜R3 の4本の8ビットレジスタを束ね、1本へ書き込みながら同時に2本（QA と QB）を読み出せる【REGFILE_4】を作ろう！',
    beginnerNote:
      '構造は Stage 28 の RAM_4W とそっくり！違うのは ① 記憶箱がリセット付の REG_8B×4 になったこと、② 出口の MUX4_8B を2個（RA用→QA、RB用→QB）並べて「2本同時読み出し」できるようにしたことだけです！',
    introDialogue: [
      {
        speaker: 'kai',
        showIncident: true,
        text: '第2章の計算機は作業机（ACC）が1個しかなかったから、「22 × 11」みたいな本当のループ掛け算ができなかったんだよな。被乗数・回数カウンタ・合計・定数1の4つを同時に机に並べられれば最高なんだが！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'RISCとUNIXの心臓：汎用レジスタファイル R0〜R3（動く図解）',
          title: '🗂 4本の REG_8B ＋ 2つの MUX4_8B ＝ 同時に2本読める作業机！',
          anim: 'goal_regfile_4',
          rule: 'ADD R2, R0 の瞬間に QA=R2 と QB=R0 を同時に取り出して ALU_8B へ送り込める！',
          accent: '#c89bff',
        },
        text: 'その通り！ 4本の8ビットレジスタ（R0〜R3）を並べ、出口に【MUX4_8B】を2個つければ、ADD R2, R0 の瞬間に R2 と R0 を同時読み出しできる！ ……しかもな主任、将来もし君が本格的な OS を作る日にも、R0 にシステムコール番号、R1・R2 に引数を入れる王道設計（ABI）がそのまま生きるんだぞ！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'R0=118 と R1=124 を同時に QA と QB から取り出せたよ！！ 作業机が4つもあると、頭の中まで広くなったみたいだね！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：4×8ビット汎用レジスタファイル',
          title: '🗂 REGFILE_4（1,534 NAND）完成！',
          anim: 'regfile_4',
          rule: 'これで R0〜R3 の4レジスタ体系が完成！ 次はいよいよ16バイトの主記憶 SRAM を組み上げる！',
          accent: '#c89bff',
        },
        text: '1,000個以上の NAND──2,000個超の MOSFET が、たった11個のチップ階層で整然と動いている。これこそ抽象化（階層設計）の魔力だ！',
      },
    ],
    hints: [
      '【構成】DEC2_4 × 1、AND × 4、REG_8B × 4、MUX4_8B × 2（計11チップ）。',
      '【書込配線】WA0,WA1 → DEC2_4。Y0〜Y3 と WE を AND×4 して4つの REG_8B.LOAD へ。全 REG_8B の D=WD[7:0]、RST=RST、CLK=CLK を共通接続！',
      '【2ポート読出】4つの REG_8B.Q を「MUX4_8B(A)のD0〜D3」と「MUX4_8B(B)のD0〜D3」の両方へ分岐接続！ AのSELにRA0,RA1→QA、BのSELにRB0,RB1→QB！',
    ],
    tests: [
      regFileCycle('① 全レジスタRST初期化 (RST=1 → QA=0, QB=0)', 0, 99, 0, 0, 1, 1, 0, 0),
      regFileCycle('② R0 ← 22 書込 (RA=0, RB=1 → 22, 0)', 0, 22, 1, 0, 1, 0, 22, 0),
      regFileCycle('③ R1 ← 11 書込 (RA=0, RB=1 → 22, 11 同時読出!)', 1, 11, 1, 0, 1, 0, 22, 11),
      regFileCycle('④ R2 ← 242 書込 (RA=2, RB=3 → 242, 0)', 2, 242, 1, 2, 3, 0, 242, 0),
      regFileCycle('⑤ R3 ← 1 書込 (RA=2, RB=3 → 242, 1)', 3, 1, 1, 2, 3, 0, 242, 1),
      regFileCycle('⑥ WE=0 保持確認 (RA=0, RB=2 → 22, 242 無事!)', 0, 99, 0, 0, 2, 0, 22, 242),
    ],
    rewardChip: {
      id: 'REGFILE_4',
      name: 'REGFILE_4',
      shortName: 'RF4',
      titleJa: '4×8ビット汎用レジスタファイル',
      descJa: 'R0〜R3の4本の8bitレジスタを持ち、同時2ポート読出と同期リセットを備えたCPUレジスタ群。',
      color: '#5c3c94',
      accent: '#c89bff',
    },
    codexUnlock: ['regfile_load_store'],
  },

  {
    id: 'stage_35',
    number: 35,
    act: 9,
    chapter: 3,
    code: '35',
    busMode: true,
    title: 'ビット幅拡張・4バイトSRAMバンク',
    revealedTitle: '4語×8ビットSRAMバンク（RAM4_8B）',
    scene: 'horizon_camp',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'sequential',
    hasClock: true,
    incidentBrief: {
      where: '開拓拠点ホライズン・メモリモジュール組立台',
      trouble: 'Stage 28 で作った RAM_4W はまだ4ビット幅。1バイト（8ビット）のデータを丸ごと出し入れできる 4バイトSRAMバンク を組もう！',
      condition: 'RAM_4W を2個（下位4bit用・上位4bit用）並列接続し、番地 (A0,A1) で 8ビットデータ D[7:0] を読み書きせよ！',
      shortRule: 'SPLIT8 + RAM_4W×2 + JOIN8 のたった4チップで、4bitメモリを1バイト幅へ並列拡張せよ！',
      stakes: '現実のDRAM/SRAMモジュールと同じ「ビット幅並列拡張」の原理を体感する',
    },
    inputs: ['A0', 'A1', 'D[7:0]', 'WE', 'CLK'],
    outputs: ['Q[7:0]'],
    pinHelp: {
      inputs: [
        'A0, A1: 番地（0〜3番地）',
        'D[7:0]: 書き込む1バイトデータ（0〜255）',
        'WE / CLK: 書込許可とクロック',
      ],
      outputs: ['Q[7:0]: 選択番地の1バイト出力'],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH12_CHIPS, 'MUX4_4B', 'RAM_4W', 'ADD_8B', 'REG_8B', 'XOR_4B', 'ALU_8B', 'MUX4_8B', 'REGFILE_4'],
    plainGoal: 'RAM_4W を2個並列に並べて、4ビット幅の記憶棚を一気に1バイト（8ビット）幅の【RAM4_8B】へ拡張しよう！',
    beginnerNote:
      '使うチップは SPLIT8・RAM_4W×2・JOIN8 のたった4個！ 同じ番地 (A0, A1)・WE・CLK を2つの RAM_4W へ同時に入れるだけで、下位4bitと上位4bitが1バイトとして足並み揃えて動きます。',
    introDialogue: [
      {
        speaker: 'kagari',
        showIncident: true,
        text: 'よし主任、ここからは現実のメモリ増設の2大法則を体験してもらおう！ 第1法則は「横に並べてビット幅を広げる（並列拡張）」だ。',
      },
      {
        speaker: 'kai',
        text: 'Stage 28 の 4ビット棚【RAM_4W】を2個横に並べるだけで 1バイト（8ビット）の棚になるってわけか！ たった4チップ、すぐ組めそうだな！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'hako',
        text: '『4バイトSRAMバンク【RAM4_8B】完成！ さあ次は第2法則──これを4バンク縦に並べて一気に【16バイト主記憶 SRAM_16B】へ拡張するぞ！』',
      },
    ],
    hints: [
      '【構成】SPLIT8 × 1、RAM_4W × 2、JOIN8 × 1（計4チップ）。',
      '【配線】D[7:0]→SPLIT8。L[3:0] を下位 RAM_4W.D、H[3:0] を上位 RAM_4W.D へ。A0, A1, WE, CLK は両方の RAM_4W へ共通接続！',
      '【出力】2つの RAM_4W.Q を JOIN8 へ束ねて Q[7:0] へ！',
    ],
    tests: [
      ram4Cycle('① 0番地に 180 書込', 0, 180, 1, 180),
      ram4Cycle('② 1番地に 115 書込', 1, 115, 1, 115),
      ram4Cycle('③ 3番地に 242 書込', 3, 242, 1, 242),
      ram4Cycle('④ 0番地を読出 (WE=0 → 180保持!)', 0, 0, 0, 180),
      ram4Cycle('⑤ 3番地を読出 (WE=0 → 242保持!)', 3, 0, 0, 242),
    ],
    rewardChip: {
      id: 'RAM4_8B',
      name: 'RAM4_8B',
      shortName: 'R4B',
      titleJa: '4バイトSRAMバンク',
      descJa: 'RAM_4W×2を並列化し、4番地×1バイト（8bit）を読み書きできるメモリバンク。',
      color: '#1b7260',
      accent: '#52e3b6',
    },
    codexUnlock: ['sram_memory'],
  },

  {
    id: 'stage_36',
    number: 36,
    act: 9,
    chapter: 3,
    code: '36',
    busMode: true,
    title: '階層タイリング・16バイト主記憶SRAM',
    revealedTitle: '16バイト主記憶メモリ（SRAM_16B）',
    scene: 'horizon_camp',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'sequential',
    hasClock: true,
    incidentBrief: {
      where: '開拓拠点ホライズン・主記憶メモリボード',
      trouble: '4バイトのメモリでは変数も配列もすぐ溢れてしまう！ 4バイトバンク RAM4_8B を4つ並べて、4ビット番地 A[3:0]（0〜15番地）でアクセスできる 16バイト主記憶SRAM を完成させよう！',
      condition: 'A[3:0] の下位2bit（0,1）を各バンク内番地に、上位2bit（2,3）を DEC2_4＋AND でバンク選択書込＆MUX4_8B読出に使え！',
      shortRule: 'SPLIT4 + DEC2_4 + AND×4 + RAM4_8B×4 + MUX4_8B で、本物の16バイト階層SRAMを組み上げよ！',
      stakes: '何ギガバイトもの現代メモリへそのまま繋がる「階層メモリ・タイリング」をマスターする',
    },
    inputs: ['A[3:0]', 'D[7:0]', 'WE', 'CLK'],
    outputs: ['Q[7:0]'],
    pinHelp: {
      inputs: [
        'A[3:0]: 16バイトの番地（0〜15番地。下位2bit=棚番号、上位2bit=バンク番号0〜3）',
        'D[7:0]: 書き込む1バイトデータ（0〜255）',
        'WE / CLK: 書込許可とクロック',
      ],
      outputs: ['Q[7:0]: 指定番地（0〜15）の1バイト内容'],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH12_CHIPS, 'MUX4_4B', 'RAM_4W', 'ADD_8B', 'REG_8B', 'XOR_4B', 'ALU_8B', 'MUX4_8B', 'REGFILE_4', 'RAM4_8B'],
    plainGoal: '4つの RAM4_8B バンクを上位2ビット番地で切り替えて、0〜15番地（16バイト）を自在に読み書きできる【SRAM_16B】を完成させよう！',
    beginnerNote:
      'A[3:0] を SPLIT4 で分けると、0,1番ピンが「バンク内の0〜3番」、2,3番ピンが「4つのバンクのどれか（0〜3）」になります！ Stage 28 の RAM_4W を1段大きくしただけの美しい自己相似構造（フラクタル）です！',
    introDialogue: [
      {
        speaker: 'kagari',
        showIncident: true,
        text: 'さあ、メモリ増設の第2法則──「上位アドレスでバンクを切り替えて容量を4倍にする（階層タイリング）」だ！ RAM4_8B を4つ並べれば、一気に 16バイト（0〜15番地）の主記憶が完成する！',
      },
      {
        speaker: 'mina',
        visualCard: {
          tag: 'メモリの美しい自己相似構造（動く図解）',
          title: '🏛 下位2bitで棚を選び、上位2bitで4バンクを切替 ＝ 16バイトSRAM！',
          anim: 'goal_sram_16b',
          rule: '16バイト → 64バイト → 256バイト統一RAM → 現代の何GBまでも、まったく同じ階層構造の繰り返し！',
          accent: '#52e3b6',
        },
        text: 'あっ、Stage 28 の RAM_4W と形がそっくり！！ 4つのレジスタを並べたのが4語RAMで、4つの4バイトRAMを並べたのが16バイトRAMなんだね！ これなら未来のOS用の大きなメモリまで同じやり方で作れるのがわかるよ！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kai',
        text: '0番地から15番地まで、どの番地に書いてもピタッと保持されて一瞬で読み出せる！！ こいつは約 4,578 NAND──9,156個もの自家製 MOSFET が全部連動して動いてるってことか……鳥肌モンだぜ！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：16バイト主記憶SRAM',
          title: '🏛 SRAM_16B（4,578 NAND＝MOSFET 9,156個）完成！',
          anim: 'sram_16b',
          rule: '主記憶が完成！ 残る部品は 8bit PC・8命令エンコーダ・8命令デコーダの3つだ！',
          accent: '#52e3b6',
        },
        text: 'これでデータ記憶のすべてが揃った！ さあ次は、リセットと停止（HALT）を備えた新世代 8ビット・プログラムカウンタ【PC_8B】だ！',
      },
    ],
    hints: [
      '【構成】SPLIT4×1、DEC2_4×1、AND×4、RAM4_8B×4、MUX4_8B×1（計11チップ）。',
      '【番地分け】A[3:0]→SPLIT4。出力0,1を全4バンクの A0,A1 へ！ 出力2,3を DEC2_4 と MUX4_8B の S0,S1 へ！',
      '【書込＆読出】DEC2_4 の Y0〜Y3 と WE を AND×4 して各 RAM4_8B.WE へ（D と CLK は共通）。4バンクの出力を MUX4_8B の D0〜D3 へ入れて Q[7:0] へ！',
    ],
    tests: [
      sram16Cycle('① 0番地(バンク0)に 22 書込', 0, 22, 1, 22),
      sram16Cycle('② 5番地(バンク1)に 118 書込', 5, 118, 1, 118),
      sram16Cycle('③ 10番地(バンク2)に 124 書込', 10, 124, 1, 124),
      sram16Cycle('④ 15番地(バンク3)に 242 書込', 15, 242, 1, 242),
      sram16Cycle('⑤ 0番地を読出 (WE=0 → 22保持!)', 0, 99, 0, 22),
      sram16Cycle('⑥ 5番地を読出 (WE=0 → 118保持!)', 5, 0, 0, 118),
      sram16Cycle('⑦ 15番地を読出 (WE=0 → 242保持!)', 15, 0, 0, 242),
    ],
    rewardChip: {
      id: 'SRAM_16B',
      name: 'SRAM_16B',
      shortName: 'SR16',
      titleJa: '16バイト主記憶SRAM',
      descJa: '4ビット番地 A[3:0] で16バイト（0〜15番地）を読み書きできる階層タイリングSRAM。',
      color: '#176953',
      accent: '#52e3b6',
    },
    codexUnlock: ['sram_memory'],
  },

  {
    id: 'stage_37',
    number: 37,
    act: 9,
    chapter: 3,
    code: '37',
    busMode: true,
    title: 'リセット＆停止付・8bit条件分岐PC',
    revealedTitle: '8ビット条件分岐カウンタ（PC_8B）',
    scene: 'horizon_camp',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'sequential',
    hasClock: true,
    incidentBrief: {
      where: '開拓拠点ホライズン・命令シーケンサ制御盤',
      trouble: '8ビット計算機では、最大256行のプログラムを歩めるだけでなく、電源ONの RST=1 で即 0番地へ戻り、HALT=1 命令で安全に歩みを止める本物のプログラムカウンタが必要だ！',
      condition: 'RST=1でPC←0、HALT=1でPC保持、通常は BR=1かつV≠0 でPC←J[7:0]（JNZ）、それ以外は PC←PC+1 へ進めよ！',
      shortRule: 'ADD_8B(+1) + ZERO検知(NOT) + MUX4_8B + NOT(HALT) + REG_8B で 8ビット条件分岐PCを組め！',
      stakes: 'リセット・停止・非ゼロ条件分岐の3機能を備えた本格シーケンサを完成させる',
    },
    inputs: ['V[7:0]', 'J[7:0]', 'BR', 'HALT', 'RST', 'CLK'],
    outputs: ['PC[7:0]'],
    pinHelp: {
      inputs: [
        'V[7:0]: 判定対象のレジスタ値（0でないとき JNZ 発火！）',
        'J[7:0]: ジャンプ先の番地（0〜255）',
        'BR: 条件分岐命令フラグ（JNZ のとき 1）',
        'HALT: CPU停止フラグ（1 の間は PC が進まず停止！）',
        'RST / CLK: 0番地リセット と クロック',
      ],
      outputs: ['PC[7:0]: 次に実行する命令の番地（0〜255）'],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH12_CHIPS, 'MUX4_4B', 'RAM_4W', 'ADD_8B', 'REG_8B', 'XOR_4B', 'ALU_8B', 'MUX4_8B', 'REGFILE_4', 'RAM4_8B', 'SRAM_16B'],
    plainGoal: 'RST で 0番地へ戻り、HALT で停止し、JNZ（BR=1 かつ V≠0）で J へジャンプ、それ以外は +1 で進む【PC_8B】を作ろう！',
    beginnerNote:
      '「PC + 1」は ADD_8B(PC, アース0, CIN=でんち1) で簡単に作れます！ また MUX4_8B は S1=アース0 にすれば「0=PC+1 ／ 1=J」の2択セレクタとして使えます。REG_8B.LOAD に NOT(HALT) を繋げば HALT=1 でピタッと止まります！',
    introDialogue: [
      {
        speaker: 'hako',
        showIncident: true,
        text: '『お待たせしたな主任！ 第2章の COND_PC を一気に本格仕様へグレードアップするぜ。今度は 0〜255番地まで歩ける【8ビットPC】、しかも物理リセット【RST】と安全停止【HALT】付きだ！』',
      },
      {
        speaker: 'kagari',
        text: 'HALT 命令が来たら REG_8B の LOAD を 0 に閉じる（NOT(HALT)）。それだけで CPU は暴走せず最終結果を守ったまま静かに停止する。さあ組み上げよう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kai',
        text: 'RST で 0番地スタート、通常は +1、V≠0 なら JNZ ジャンプ、そして HALT でピタッと停止！ もう完全に本物のマイコンの司令塔だな！',
      },
    ],
    hints: [
      '【+1計算】ADD_8B の A=REG_8B.Q、B=アース0、CIN=でんち1 で PC+1 ができます。',
      '【JNZ判定】V[7:0]→SPLIT8→ZERO_4B×2→AND→NOT（これで V≠0 で 1）→ BR と AND して JMP 信号に！',
      '【切替と停止】MUX4_8B(D0=PC+1, D1=J, S0=JMP, S1=アース0) の出力を REG_8B.D へ。REG_8B.LOAD に NOT(HALT)、RST=RST、CLK=CLK を接続！',
    ],
    tests: [
      pc8Cycle('① 電源ONリセット (RST=1 → 0番地)', 0, 0, 0, 0, 1, 0),
      pc8Cycle('② 通常 +1 進行 (BR=0 → 1番地)', 5, 10, 0, 0, 0, 1),
      pc8Cycle('③ 通常 +1 進行 (BR=0 → 2番地)', 0, 10, 0, 0, 0, 2),
      pc8Cycle('④ JNZ発火! (V=11≠0, BR=1, J=4 → 4番地へ飛ぶ!)', 11, 4, 1, 0, 0, 4),
      pc8Cycle('⑤ JNZ不発! (V=0, BR=1, J=1 → 飛ばず5番地へ!)', 0, 1, 1, 0, 0, 5),
      pc8Cycle('⑥ HALT停止! (HALT=1 → 5番地のまま停止!)', 9, 0, 0, 1, 0, 5),
      pc8Cycle('⑦ 強制リセット (RST=1, HALT=1でも0番地へ復帰!)', 9, 0, 0, 1, 1, 0),
    ],
    rewardChip: {
      id: 'PC_8B',
      name: 'PC_8B',
      shortName: 'PC8',
      titleJa: '8ビット条件分岐カウンタ',
      descJa: 'RST(0復帰)・HALT(停止)・JNZ(非ゼロ分岐)・+1進行を備えた8ビットプログラムカウンタ。',
      color: '#1c6385',
      accent: '#56ccf2',
    },
    codexUnlock: ['regfile_load_store'],
  },

  {
    id: 'stage_38',
    number: 38,
    act: 9,
    chapter: 3,
    code: '38',
    title: '8命令キーを3ビット機械語へ',
    revealedTitle: '8→3命令キーエンコーダ（ASM_ENC8）',
    scene: 'horizon_camp',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'combinational',
    incidentBrief: {
      where: '開拓拠点ホライズン・16ビット命令焼付コンソール',
      trouble: 'ARK-8 は従来の4命令に加え、LOAD・STOR・ADDI・HALT の4命令が増えて全8命令になった！ 8つの物理キーから3ビット機械語 (OP0, OP1, OP2) と押下検知 KEY を生み出すエンコーダが必要だ。',
      condition: '8つの命令キー（0=LDI〜7=HALT）を 3ビット機械語 (OP0, OP1, OP2) と押下検知 KEY へ変換せよ！',
      shortRule: '第2章で作った ASM_ENC（4→2エンコーダ）×2 と OR×3 のたった5チップで 8→3 エンコーダを組め！',
      stakes: '16ビット命令の命令番号も人間キーから物理回路だけで変換し、ゼロ飛躍を維持する',
    },
    inputs: ['LDI', 'ADD', 'SUB', 'JNZ', 'LOAD', 'STOR', 'ADDI', 'HALT'],
    outputs: ['OP0', 'OP1', 'OP2', 'KEY'],
    pinHelp: {
      inputs: [
        'LDI(000), ADD(001), SUB(010), JNZ(011): 前半4命令キー（OP2=0グループ）',
        'LOAD(100), STOR(101), ADDI(110), HALT(111): 後半4命令キー（OP2=1グループ）',
      ],
      outputs: [
        'OP0: 機械語 1の位',
        'OP1: 機械語 2の位',
        'OP2: 機械語 4の位（LOAD/STOR/ADDI/HALT のいずれかが1なら 1！）',
        'KEY: いずれかの命令キーが押されている検知フラグ',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH12_CHIPS, 'MUX4_4B', 'RAM_4W', 'ADD_8B', 'REG_8B', 'XOR_4B', 'ALU_8B', 'MUX4_8B', 'REGFILE_4', 'RAM4_8B', 'SRAM_16B', 'PC_8B'],
    plainGoal: '8つの命令キー（LDI〜HALT）から3ビット機械語（OP0〜OP2）と KEY を生成する【ASM_ENC8】を、第2章の ASM_ENC × 2 と OR × 3 で作ろう！',
    beginnerNote:
      '超エレガントな発見！ 後半4命令（LOAD〜HALT）を入れた2個目の ASM_ENC の KEY 出力は「後半4つのどれかが押された＝OP2=1」そのものです！ さらにレジスタ番号 R0〜R3 の2bit変換にも Stage 22 の ASM_ENC がそのまま使われます！',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: '今度は命令が8種類（LDI・ADD・SUB・JNZ に加えて LOAD・STOR・ADDI・HALT）に増えたんだね！ ボタン8個を全部バラバラに OR で繋ぐと大変そうだけど……',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '階層エンコーダの美しさ（動く図解）',
          title: '🎹 ASM_ENC × 2 ＋ OR × 3 ＝ たった5チップの 8→3 エンコーダ！',
          anim: 'goal_asm_enc8',
          rule: '前半4命令と後半4命令をそれぞれ ASM_ENC へ！ 後半側の KEY 出力がそのまま OP2 になる！',
          accent: '#ffd166',
        },
        text: 'そこで第2章 Stage 22 の【ASM_ENC】を2個並べるのさ！ 前半4命令と後半4命令をそれぞれエンコードして、I0同士・I1同士・KEY同士を OR で束ね、後半側の KEY をそのまま OP2 にすれば──たった5チップで完成だ！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kai',
        text: 'うわっ、後半4命令の KEY がそのまま OP2（4の位）になるってマジで美しいな！ しかも R0〜R3 の選択キーも既存の ASM_ENC がそのまま使えるのか！',
      },
    ],
    hints: [
      '【構成】ASM_ENC × 2、OR × 3（たった5チップ・33 NAND！）。',
      '【配線】LDI〜JNZ を ASM_ENC(前半)へ、LOAD〜HALT を ASM_ENC(後半)へ接続。',
      '【出力】前半I0と後半I0を OR→OP0、前半I1と後半I1を OR→OP1、後半KEY をそのまま OP2、前半KEYと後半KEYを OR→KEY！',
    ],
    tests: [
      { label: '未押下 → 000, KEY=0', input: [0,0,0,0,0,0,0,0], expected: [0,0,0,0] },
      { label: 'LDI  → 000, KEY=1', input: [1,0,0,0,0,0,0,0], expected: [0,0,0,1] },
      { label: 'ADD  → 001, KEY=1', input: [0,1,0,0,0,0,0,0], expected: [1,0,0,1] },
      { label: 'SUB  → 010, KEY=1', input: [0,0,1,0,0,0,0,0], expected: [0,1,0,1] },
      { label: 'JNZ  → 011, KEY=1', input: [0,0,0,1,0,0,0,0], expected: [1,1,0,1] },
      { label: 'LOAD → 100, KEY=1', input: [0,0,0,0,1,0,0,0], expected: [0,0,1,1] },
      { label: 'STOR → 101, KEY=1', input: [0,0,0,0,0,1,0,0], expected: [1,0,1,1] },
      { label: 'ADDI → 110, KEY=1', input: [0,0,0,0,0,0,1,0], expected: [0,1,1,1] },
      { label: 'HALT → 111, KEY=1', input: [0,0,0,0,0,0,0,1], expected: [1,1,1,1] },
    ],
    rewardChip: {
      id: 'ASM_ENC8',
      name: 'ASM_ENC8',
      shortName: 'EN8',
      titleJa: '8→3命令キーエンコーダ',
      descJa: '8種のARK-8命令キーから3ビット機械語(OP0..2)と押下検知KEYを生む階層エンコーダ。',
      color: '#a36b1d',
      accent: '#ffd166',
    },
    codexUnlock: ['regfile_load_store'],
  },

  {
    id: 'stage_39',
    number: 39,
    act: 9,
    chapter: 3,
    code: '39',
    title: '8命令を解読せよ・拡張命令デコーダ',
    revealedTitle: '8命令デコーダ（INST_DEC8）',
    scene: 'horizon_camp',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'combinational',
    incidentBrief: {
      where: '開拓拠点ホライズン・ARK-8 制御デコーダ盤',
      trouble: '3ビット機械語 (OP0, OP1, OP2) から、ALU・レジスタファイル・SRAM・PC の全8本の制御線（SUB, ALU_B, WD0, WD1, REG_WE, MEM_WE, BR, HALT）を自動生成する必要がある！',
      condition: '000=LDI, 001=ADD, 010=SUB, 011=JNZ, 100=LOAD, 101=STOR, 110=ADDI, 111=HALT に対応する8本の制御信号を正確に出力せよ！',
      shortRule: 'DEC2_4(OP0,OP1) と OP2 / NOT(OP2) の AND 組み合わせで8命令を解読し、REG_WE = NOT(BR | MEM_WE | HALT) を組め！',
      stakes: 'Load/Store 制御（MEM_WE / WD切替）と HALT をハードウェア配線だけで完全翻訳する',
    },
    inputs: ['OP0', 'OP1', 'OP2'],
    outputs: ['SUB', 'ALU_B', 'WD0', 'WD1', 'REG_WE', 'MEM_WE', 'BR', 'HALT'],
    pinHelp: {
      inputs: ['OP0, OP1, OP2: 3ビット機械語（000=LDI 〜 111=HALT）'],
      outputs: [
        'SUB: 減算フラグ（010 SUB のみ 1）',
        'ALU_B: ALU右入力をIMMへ切替（110 ADDI のみ 1）',
        'WD0: 書戻し=IMM（000 LDI のみ 1）',
        'WD1: 書戻し=SRAM（100 LOAD のみ 1）',
        'REG_WE: レジスタ書込許可（JNZ・STOR・HALT 以外の5命令で 1！）',
        'MEM_WE: SRAM書込許可（101 STOR のみ 1）',
        'BR: 非ゼロ条件分岐（011 JNZ のみ 1）',
        'HALT: CPU停止（111 HALT のみ 1）',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH12_CHIPS, 'MUX4_4B', 'RAM_4W', 'ADD_8B', 'REG_8B', 'XOR_4B', 'ALU_8B', 'MUX4_8B', 'REGFILE_4', 'RAM4_8B', 'SRAM_16B', 'PC_8B', 'ASM_ENC8'],
    plainGoal: '3ビット命令（OP0〜OP2）を解読し、8本のCPU＆SRAM制御信号へ自動翻訳する【INST_DEC8】を組み立てよう！',
    beginnerNote:
      'DEC2_4(OP0, OP1) で下位2bitを4本（Y0〜Y3）に分け、NOT(OP2) と AND すれば前半4命令（LDI/ADD/SUB/JNZ）、OP2 と AND すれば後半4命令（LOAD/STOR/ADDI/HALT）がすぐ取り出せます！ REG_WE は「BR・MEM_WE・HALT のどれでもない」＝ NOT(OR(OR(BR, MEM_WE), HALT))！',
    introDialogue: [
      {
        speaker: 'hako',
        showIncident: true,
        text: '『さあ、いよいよ ARK-8 合体の直前だ！ 8種類の機械語（000〜111）を受け取って、CPU と SRAM の全8本のレバーを自動で切り替える拡張命令デコーダ【INST_DEC8】を作るぜ！』',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '3ビット8命令 → 8本制御線の翻訳表（動く図解）',
          title: '🗣 LDI/ADD/SUB/JNZ ＋ LOAD/STOR/ADDI/HALT を完全解読！',
          anim: 'goal_inst_dec8',
          rule: 'DEC2_4 × (OP2 / NOT(OP2)) で7本が即決定！ 残る REG_WE は「BR・MEM_WE・HALT 以外」で 1！',
          accent: '#56ccf2',
        },
        text: '命令表（📋仕様）を見れば一目瞭然だ。ほとんどの信号は1つの命令でだけ 1 になるから、DEC2_4 と AND でスパッと取り出せるぞ！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '8つの命令ぜんぶ、思い通りにパチパチ翻訳できたよ！！ これで【INST_DEC8】【REGFILE_4】【ALU_8B】【SRAM_16B】【PC_8B】──ぜんぶの部品が机の上に揃ったんだね！',
      },
    ],
    hints: [
      '【前半(OP2=0)】DEC2_4(OP0,OP1) と NOT(OP2) の AND で：Y0→WD0(LDI)、Y2→SUB(SUB)、Y3→BR(JNZ)。',
      '【後半(OP2=1)】DEC2_4(OP0,OP1) と OP2 の AND で：Y0→WD1(LOAD)、Y1→MEM_WE(STOR)、Y2→ALU_B(ADDI)、Y3→HALT(HALT)。',
      '【REG_WE】BR と MEM_WE を OR し、その結果と HALT をさらに OR して NOT へ入れれば REG_WE 完成！',
    ],
    tests: [
      { label: '000 LDI  (WD0=1, REG_WE=1)', input: [0,0,0], expected: [0,0,1,0,1,0,0,0] },
      { label: '001 ADD  (REG_WE=1)',        input: [1,0,0], expected: [0,0,0,0,1,0,0,0] },
      { label: '010 SUB  (SUB=1, REG_WE=1)', input: [0,1,0], expected: [1,0,0,0,1,0,0,0] },
      { label: '011 JNZ  (BR=1)',            input: [1,1,0], expected: [0,0,0,0,0,0,1,0] },
      { label: '100 LOAD (WD1=1, REG_WE=1)', input: [0,0,1], expected: [0,0,0,1,1,0,0,0] },
      { label: '101 STOR (MEM_WE=1)',        input: [1,0,1], expected: [0,0,0,0,0,1,0,0] },
      { label: '110 ADDI (ALU_B=1,REG_WE=1)',input: [0,1,1], expected: [0,1,0,0,1,0,0,0] },
      { label: '111 HALT (HALT=1)',          input: [1,1,1], expected: [0,0,0,0,0,0,0,1] },
    ],
    rewardChip: {
      id: 'INST_DEC8',
      name: 'INST_DEC8',
      shortName: 'ID8',
      titleJa: '8命令デコーダ',
      descJa: '3ビット機械語(OP0..2)からLoad/Store/ALU/分岐/HALTの全8制御信号を生成するデコーダ。',
      color: '#20638c',
      accent: '#56ccf2',
    },
    codexUnlock: ['regfile_load_store'],
  },

  {
    id: 'stage_40',
    number: 40,
    act: 9,
    chapter: 3,
    code: '40',
    busMode: true,
    title: '8ビット汎用計算機『ARK-8』統合',
    revealedTitle: '8ビットLoad/Store計算機（ARK8_SYS）',
    scene: 'horizon_camp',
    storyBgm: 'finale',
    widget: 'ark8_finale',
    mode: 'sequential',
    hasClock: true,
    incidentBrief: {
      where: '開拓拠点ホライズン・中央管理棟マザーボード',
      trouble: 'すべての8ビット・マイモジュールが揃った！ INST_DEC8・REGFILE_4・ALU_8B・SRAM_16B・PC_8B・MUX4_8B×2 を1本の8ビットデータバスで統合し、新世代計算機【ARK8_SYS】を起動せよ！',
      condition: 'LDI / ADD / SUB / JNZ / LOAD / STOR / ADDI / HALT と物理リセット RST のすべてが1枚のボード上で自律連携するよう結線せよ！',
      shortRule: '9個の自作チップ（INST_DEC8・REGFILE_4・MUX4_8B×2・ALU_8B・SRAM_16B・PC_8B・SPLIT8・アース0）を統合せよ！',
      stakes: '1万個超の自家製MOSFETが協調稼働する、将来のUNIX系OSへ直結する8ビット計算機を誕生させる',
    },
    inputs: ['OP0', 'OP1', 'OP2', 'RD0', 'RD1', 'RS0', 'RS1', 'IMM[7:0]', 'RST', 'CLK'],
    outputs: ['QA[7:0]', 'MEM[7:0]', 'PC[7:0]', 'Z', 'HALT'],
    pinHelp: {
      inputs: [
        'OP0〜OP2: 3ビット命令番号（000=LDI 〜 111=HALT）',
        'RD0, RD1: 操作先レジスタ番号（R0〜R3）',
        'RS0, RS1: 参照元レジスタ番号（R0〜R3）',
        'IMM[7:0]: 8ビット即値／ジャンプ先／下位4bitがSRAM番地',
        'RST / CLK: 同期リセット線 と クロック',
      ],
      outputs: [
        'QA[7:0]: 選択レジスタ R[Rd] の現在値',
        'MEM[7:0]: SRAM[IMM下位4bit] の現在値',
        'PC[7:0]: プログラムカウンタの番地',
        'Z / HALT: ALUゼロフラグ と 停止フラグ',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH12_CHIPS, 'MUX4_4B', 'RAM_4W', 'ADD_8B', 'REG_8B', 'XOR_4B', 'ALU_8B', 'MUX4_8B', 'REGFILE_4', 'RAM4_8B', 'SRAM_16B', 'PC_8B', 'ASM_ENC8', 'INST_DEC8'],
    plainGoal: '第3章で鍛えた全8ビットモジュールを統合し、4レジスタ＋16バイトSRAM＋8命令が連動する【ARK8_SYS】を完成させよう！',
    beginnerNote:
      'チップは9個だけ！① INST_DEC8 が制御線を配り、② REGFILE_4(QA=R[Rd], QB=R[Rs]) が値を出し、③ ALU右MUX(QB vs IMM)→ALU_8B、④ SPLIT8(IMM下位4bit)→SRAM_16B(D=QB, WE=MEM_WE)、⑤ 書戻しMUX(0=ALU, 1=IMM, 2=SRAM)→REGFILE_4.WD、⑥ PC_8B(V=QA, J=IMM) で完成！',
    introDialogue: [
      {
        speaker: 'kagari',
        showIncident: true,
        text: 'ついにこの瞬間が来たぞ、主任！ 砂から作った MOSFET 14,000個以上・プルアップ抵抗 7,000本以上を9個のマイモジュールへ凝縮し、1枚のマザーボードへ統合する──新世代8ビット計算機【ARK8_SYS】の誕生だ！',
      },
      {
        speaker: 'kai',
        visualCard: {
          tag: 'ARK-8 システム全体配線図（動く図解）',
          title: '🖥️ INST_DEC8 ＋ REGFILE_4 ＋ ALU_8B ＋ SRAM_16B ＋ PC_8B ＝ ARK8_SYS！',
          anim: 'goal_ark8_sys',
          rule: 'データ書戻しMUX（WD0,WD1）で 00=ALU・01=IMM・10=SRAM を切り替えて REGFILE_4 へ戻す！',
          accent: '#ffd166',
        },
        text: 'すげえ……！ たった9個のチップをリボンケーブルで結ぶだけで、4本のレジスタと16バイトの書き換えRAMが連動する本物のコンピュータが組み上がるんだな！ やってやろうぜ、主任！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'hako',
        text: '『……全テスト・オールグリーン！！ 14,800個超の自作 MOSFET が1つの破綻もなく同期稼働──LDI・ADD・SUB・JNZ・LOAD・STOR・ADDI・HALT・RST 全機能完全合格！！ 新世代8ビット汎用計算機【ARK8_SYS】、ここに覚醒！！』',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：8ビットLoad/Store計算機',
          title: '🖥️ ARK8_SYS（7,403 NAND／MOSFET 14,806個＋抵抗 7,403本）覚醒！',
          anim: 'ark8_sys',
          rule: 'さあ、この実機上で RAM を読み書きする本物のアセンブリ・プログラムを動かそう！',
          accent: '#ffd166',
        },
        text: '見事だ主任！ 1バイト（8ビット）データ・0〜255番地・16ビット拡張命令というこの【ARK8_SYS】の設計は、第4章のハードウェア完結から第6章のUNIX系OSまで一度も作り直さずにそのまま進化し続ける土台だ！ 残すは最終2ステージ──自作【ASM_ENC8】と16ビット焼付マスクROMで、地上拠点ホライズンの電力制御と242人全員の汎用ループ乗算アルゴリズムを実行しよう！',
      },
    ],
    hints: [
      '【制御＆レジスタ】OP0..2→INST_DEC8。RD0..1 を REGFILE_4 の WA0..1 と RA0..1 両方へ、RS0..1 を RB0..1 へ、REG_WE→WE、RST→RST、CLK→CLK！ QA→出力QA・ALU.A・PC.V！',
      '【ALU＆SRAM】MUX4_8B(ALU用: D0=QB, D1=IMM, S0=ALU_B, S1=アース0)→ALU.B、SUB→ALU.SUB。IMM→SPLIT8→L[3:0]→SRAM.A、QB→SRAM.D、MEM_WE→SRAM.WE、CLK→SRAM.CLK！',
      '【書戻し＆PC】MUX4_8B(書戻し用: D0=ALU.Y, D1=IMM, D2=SRAM.Q, S0=WD0, S1=WD1)→REGFILE_4.WD。PC_8B(V=QA, J=IMM, BR, HALT, RST, CLK)→出力PC！ ALU.Z→Z、HALT→HALT！',
    ],
    tests: [
      ark8Cycle('① ハードウェアRST (RST=1 → R=0, PC=0)', 0, 0, 0, 0, 1, 0, 0, 0, 1, 0),
      ark8Cycle('② LDI R0, 180 (R0←180, PC=1)', 0, 0, 0, 180, 0, 180, 0, 1, 0, 0),
      ark8Cycle('③ STOR R0, [2] (SRAM[2]←180, PC=2)', 5, 0, 0, 2, 0, 180, 180, 2, 0, 0),
      ark8Cycle('④ LDI R1, 115 (R1←115, PC=3)', 0, 1, 0, 115, 0, 115, 0, 3, 0, 0),
      ark8Cycle('⑤ LOAD R2, [2] (R2←SRAM[2]=180, PC=4)', 4, 2, 0, 2, 0, 180, 180, 4, 0, 0),
      ark8Cycle('⑥ SUB R2, R1 (R2←180−115=65, PC=5)', 2, 2, 1, 0, 0, 65, 0, 5, 0, 0),
      ark8Cycle('⑦ JNZ R2, 10 (R2=65≠0 → PC=10へ飛躍!)', 3, 2, 0, 10, 0, 65, 0, 10, 0, 0),
      ark8Cycle('⑧ HALT (R0=180保持・PC=10のまま停止, HALT=1!)', 7, 0, 0, 0, 0, 180, 0, 10, 0, 1),
    ],
    rewardChip: {
      id: 'ARK8_SYS',
      name: 'ARK8_SYS',
      shortName: 'A8S',
      titleJa: '8ビットLoad/Store計算機',
      descJa: '4本の8bitレジスタ・16バイトSRAM・8bit ALU・8命令デコーダを統合した新世代自律計算機。',
      color: '#b87424',
      accent: '#ffd166',
    },
    codexUnlock: ['ark8_horizon'],
  },

  {
    id: 'stage_41',
    number: 41,
    act: 9,
    chapter: 3,
    code: '41',
    kind: 'ark8_program',
    title: 'SRAM実戦・地上マイクログリッド制御',
    revealedTitle: 'ARK-8 電力制御プログラム（GRID_OS）',
    scene: 'horizon_camp',
    storyBgm: 'story',
    widget: 'ark8_finale',
    mode: 'physics',
    incidentBrief: {
      where: '開拓拠点ホライズン・マイクログリッド配電盤',
      trouble: '太陽光発電量（RAM[0]=180）と消費電力（RAM[1]=115）がリアルタイムに SRAM へ送られてくる。余剰電力（RAM[0] − RAM[1] ＝ 65）を計算してバッテリー充電指示の RAM[2] へ書き込め！',
      condition: 'ARK8_SYS の 16ビットアセンブリ（LOAD / SUB / STOR / HALT）で RAM[0] − RAM[1] を計算し RAM[2] へ保存せよ！（別の入力値でも正しく動く汎用手順が必要）',
      shortRule: 'RAM[0]とRAM[1]をレジスタへ LOAD し、SUB で引いて RAM[2] へ STOR ➔ HALT！',
      stakes: '実行中に主記憶SRAMから値を読み取り、計算結果をSRAMへ書き戻す初の本格ソフトウェアを稼働させる',
    },
    inputs: ['CLK'],
    outputs: ['RAM[2]'],
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: null,
    asmProgramSpec: {
      arch: 'ark8',
      goalTitle: '目標：RAM[0](180) − RAM[1](115) を計算し、余剰電力 65 を RAM[2] へ STOR せよ！',
      initialRam: { 0: 180, 1: 115 },
      targetRam: { 2: 65 },
      maxCycles: 24,
      rows: [
        { addr: 0, slotId: 'line_0', label: '0番地（発電量 RAM[0] を R0 へ読込）', ideal: 'A8_LOAD_0_0_0' },
        { addr: 1, slotId: 'line_1', label: '1番地（消費量 RAM[1] を R1 へ読込）', ideal: 'A8_LOAD_1_0_1' },
        { addr: 2, slotId: 'line_2', label: '2番地（余剰 R0 ← R0 − R1 計算）', ideal: 'A8_SUB_0_1_0' },
        { addr: 3, slotId: 'line_3', label: '3番地（結果を RAM[2] へ書込）', ideal: 'A8_STOR_0_0_2' },
        { addr: 4, slotId: 'line_4', label: '4番地（CPU安全停止 HALT）', ideal: 'A8_HALT_0_0_0' },
        { addr: 5, slotId: 'line_5', label: '5番地（予備行）', ideal: null },
      ],
    },
    plainGoal: '自作の8ビット計算機 ARK8_SYS で、SRAM の0番地（発電量）から1番地（消費量）を引き、余剰電力を2番地へ書き戻すプログラムを書こう！',
    beginnerNote:
      '命令キーは自作【ASM_ENC8】、レジスタ R0〜R3 は第2章の【ASM_ENC】を通って16ビット機械語へ変換され、自作16ビット焼付マスクROMから14,800個超のMOSFET実機へ流れます！ 右上の「SRAM実測ダンプ」で RAM[2] が書き換わる瞬間を見届けよう！',
    introDialogue: [
      {
        speaker: 'kai',
        showIncident: true,
        text: 'よっしゃ、いよいよ実戦だ！ 拠点の電力センサから SRAM の [0]番地に太陽光発電量（180）、[1]番地に拠点消費電力（115）が入ってくる。余剰電力（180 − 115 ＝ 65）を計算して [2]番地へ書き戻すプログラムを組んでくれ！',
      },
      {
        speaker: 'hako',
        text: '『しかもテスト時は別データ（210 − 90 ＝ 120）でも検証するから、65 を直書きするズルは効かないぞ！ ちゃんと LOAD → SUB → STOR → HALT で組んでくれ！』',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kai',
        text: 'おおっ、SRAM の [2]番地がパッと「65」に書き換わってバッテリー充電が始まった！！ 別データの 210 − 90 ＝ 120 も一発クリアだぜ！',
      },
      {
        speaker: 'mina',
        text: 'すごいよ主任さん！ 同じプログラムのまま、メモリの中身が変わるだけでどんな日の発電量でも自動で計算してくれるんだね！ さあいよいよ第3章の最終ミッションだよ！',
      },
    ],
    hints: [
      '【考え方】① LOAD R0, [0]（R0←180） ② LOAD R1, [1]（R1←115） ③ SUB R0, R1（R0←65） ④ STOR R0, [2]（RAM[2]←65） ⑤ HALT！',
      '【STORの注意】STOR は「第1引数 Rs の中身を [番地] へ書く」命令です。R0 に答えがあるなら「STOR R0, [2]」と書きます！',
      '【答えの例】0: LOAD R0, [0] ／ 1: LOAD R1, [1] ／ 2: SUB R0, R1 ／ 3: STOR R0, [2] ／ 4: HALT を書いてテスト実行！',
    ],
    tests: [],
    rewardChip: {
      id: 'ARK8_GRID_PROG',
      name: 'GRID_OS',
      color: '#226b80',
      accent: '#56ccf2',
      description: 'ARK-8 マイクログリッド余剰電力演算（LOAD → SUB → STOR → HALT）',
      isLabReward: true,
    },
    codexUnlock: ['ark8_horizon'],
  },

  {
    id: 'stage_42',
    number: 42,
    act: 9,
    chapter: 3,
    code: '42',
    kind: 'ark8_program',
    isChapter3Finale: true,
    title: '記憶の大地・真の汎用ループ乗算',
    revealedTitle: 'ARK-8 汎用乗算OS（HORIZON_OS）',
    scene: 'horizon_camp',
    storyBgm: 'finale',
    widget: 'ark8_finale',
    mode: 'physics',
    incidentBrief: {
      where: '開拓拠点ホライズン・242人共同備蓄管理コンソール',
      trouble: 'アーク7(118人)＋アーク3(124人)＝242人を 11の開拓班（各班22人）に分けた！ SRAM[0]=22 と SRAM[1]=11 を掛け算し、総配給数 242 を SRAM[2] へ出力する「真の汎用ループ乗算」を完成させよ！',
      condition: '4本のレジスタ（R0〜R3）・LOAD・ADD・SUB・JNZ・STOR・HALT を使い、どんな数値でも RAM[0] × RAM[1] → RAM[2] を計算できる汎用ループを組め！',
      shortRule: 'RAM[0](22) を RAM[1](11) 回足し込む JNZ ループを組み、242 を RAM[2] へ STOR ➔ HALT！',
      stakes: '第2章では不可能だった汎用ループ乗算を自作14,800 MOSFET実機で成し遂げ、第3章を完結させる',
    },
    inputs: ['CLK'],
    outputs: ['RAM[2]'],
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: null,
    asmProgramSpec: {
      arch: 'ark8',
      goalTitle: '最終目標：RAM[0](22) × RAM[1](11) ＝ 242 を汎用 JNZ ループで計算し RAM[2] へ STOR せよ！',
      initialRam: { 0: 22, 1: 11 },
      targetRam: { 2: 242 },
      maxCycles: 64,
      rows: [
        { addr: 0, slotId: 'line_0', label: '0番地（被乗数 RAM[0] を R0 へ読込）', ideal: 'A8_LOAD_0_0_0' },
        { addr: 1, slotId: 'line_1', label: '1番地（回数 RAM[1] を R1 へ読込）', ideal: 'A8_LOAD_1_0_1' },
        { addr: 2, slotId: 'line_2', label: '2番地（合計 R2 ← 0 初期化）', ideal: 'A8_LDI_2_0_0' },
        { addr: 3, slotId: 'line_3', label: '3番地（減算定数 R3 ← 1 セット）', ideal: 'A8_LDI_3_0_1' },
        { addr: 4, slotId: 'line_4', label: '4番地（ループ本体：R2 ← R2 + R0）', ideal: 'A8_ADD_2_0_0' },
        { addr: 5, slotId: 'line_5', label: '5番地（回数−1：R1 ← R1 − R3）', ideal: 'A8_SUB_1_3_0' },
        { addr: 6, slotId: 'line_6', label: '6番地（R1≠0 なら 4番地へ戻る！）', ideal: 'A8_JNZ_1_0_4' },
        { addr: 7, slotId: 'line_7', label: '7番地（結果 R2 を RAM[2] へ保存）', ideal: 'A8_STOR_0_2_2' },
        { addr: 8, slotId: 'line_8', label: '8番地（CPU停止 HALT）', ideal: 'A8_HALT_0_0_0' },
        { addr: 9, slotId: 'line_9', label: '9番地（予備行）', ideal: null },
      ],
    },
    plainGoal: '4本のレジスタ（R0〜R3）と SRAM をフル活用し、RAM[0] × RAM[1] を汎用 JNZ ループで計算して RAM[2] へ書き込む【HORIZON_OS】を完成させよう！',
    beginnerNote:
      '第2章の掛け算はレジスタ1本しかなく回数カウンタを持てませんでしたが、いまの君には R0(22)・R1(残り回数11)・R2(累計)・R3(定数1) の4本があります！ 22×11=242 と別データ 15×6=90 の両方で検証されます！',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: 'いよいよ第3章の集大成だよ、主任さん！ アーク7の118人とアーク3の124人──242人全員を「1班 22人 × 11班」に分けて共同配給システムを立ち上げよう！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '4レジスタ × 汎用ループ乗算の設計図（動く図解）',
          title: '🏆 R0(22) を R1(11) 回足す本物のループ → RAM[2]=242！',
          anim: 'goal_ark8_mul',
          rule: 'R2←0、R3←1 で準備し、「ADD R2, R0 → SUB R1, R3 → JNZ R1, 4」を R1=0 まで回す！',
          accent: '#52e3b6',
        },
        text: 'レジスタ1本だった第2章では絶対に書けなかった「本物の汎用ループ乗算アルゴリズム」だ！ 15×6=90 みたいな別データでもそのまま動くよう、君の 14,800個超の MOSFET 計算機で証明してみせよう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kai',
        text: '22 × 11 ＝ 242、そして 15 × 6 ＝ 90 も一発クリア！！ しかも外部のお助け回路ゼロ、全部お前が砂から組んだ8ビットCPUとSRAMだけでやり切ったんだ……最高だぜ、主任！！',
      },
    ],
    hints: [
      '【役割分担】R0=RAM[0](足す数)、R1=RAM[1](残り回数)、R2=累計(最初は0)、R3=1(回数減算用) に割り当てるとスッキリします！',
      '【ループ構造】4番地で ADD R2, R0（累計に加算）、5番地で SUB R1, R3（残り回数を-1）、6番地で JNZ R1, 4（まだ0でなければ4番地へ戻る）！',
      '【答えの例】0: LOAD R0,[0] / 1: LOAD R1,[1] / 2: LDI R2,0 / 3: LDI R3,1 / 4: ADD R2,R0 / 5: SUB R1,R3 / 6: JNZ R1,4 / 7: STOR R2,[2] / 8: HALT！',
    ],
    tests: [],
    rewardChip: {
      id: 'ARK8_MUL_PROG',
      name: 'HORIZON_OS',
      color: '#1e7858',
      accent: '#52e3b6',
      description: 'ARK-8 4レジスタ×SRAM 汎用ループ乗算OS（RAM[0] × RAM[1] → RAM[2]）',
      isLabReward: true,
    },
    codexUnlock: ['ark8_horizon'],
  },
];
