/**
 * SILICON GENESIS — Chapter 4: OS-Ready PC Hardware Complete (STAGE 43–54 / ACT X & XI)
 *
 * Continues directly from Chapter 3 Ending (2094.12.01 17:08) when northern shelter
 * ARK-5 (420km north, communications engineer Ren) transmits a live machine-code
 * distress broadcast that breaks the Harvard mask-ROM limit of ARK8_SYS.
 *
 * Reuses EVERY Chapter 1–3 8-bit component bottom-up on live Stage 00-C MOSFETs:
 *   ACT X  (43–48): MEM_BUS8 -> MMIO_DEC -> STACK_PTR -> CMP_8B -> TMR_IRQ -> MMU_8B
 *   ACT XI (49–54): PRIV_CTRL -> IRQ_VEC -> INST_DEC16 -> ARK8_OS_HW (12,588 FET)
 *                   -> Stage 53 ARK5_CRT -> Stage 54 GUARD_TRAP (Hardware Half Complete!)
 */

const CH123_CHIPS = [
  'NOT', 'AND', 'OR', 'XOR', 'HALF_ADDER', 'FULL_ADDER', 'ADD_4BIT',
  'MUX', 'MUX_4BIT', 'DEC_2TO4', 'SR_LATCH', 'D_LATCH', 'D_FF', 'REG_4BIT',
  'ALU_4BIT', 'PC_4BIT', 'ARK4_CORE', 'ZERO_4BIT', 'COND_PC', 'INST_DEC',
  'ARK4_SYS', 'ASM_ENC', 'ROM_4W',
  'MUX4_4B', 'RAM_4W', 'ADD_8B', 'REG_8B', 'XOR_4B', 'ALU_8B', 'MUX4_8B',
  'REGFILE_4', 'RAM4_8B', 'SRAM_16B', 'PC_8B', 'ASM_ENC8', 'INST_DEC8', 'ARK8_SYS',
];

function stackCycle(label, din, push, pop, load, en, rst, expSp, expEa, { clock = true } = {}) {
  if (!clock) {
    return {
      label,
      busDisplayInput: [din, push, pop, load, en, rst, 0],
      busPhases: [[din, push, pop, load, en, rst, 0]],
      busExpected: [expSp, expEa],
    };
  }
  return {
    label,
    busDisplayInput: [din, push, pop, load, en, rst, 1],
    busPhases: [
      [din, push, pop, load, en, rst, 0],
      [din, push, pop, load, en, rst, 1],
      [0, 0, 0, 0, 0, 0, 0],
    ],
    busExpected: [expSp, expEa],
  };
}

function tmrCycle(label, period, load, rst, expCnt, expIrq) {
  return {
    label,
    busDisplayInput: [period, load, rst, 1],
    busPhases: [
      [period, load, rst, 0],
      [period, load, rst, 1],
      [period, 0, 0, 0],
    ],
    busExpected: [expCnt, expIrq],
  };
}

function privStep(label, privOp, mmioEn, iret, irq, syscall, mmuFault, rst, expVec, { clock = true } = {}) {
  if (!clock) {
    return {
      label,
      displayInput: [privOp, mmioEn, iret, irq, syscall, mmuFault, rst, 0],
      phases: [[privOp, mmioEn, iret, irq, syscall, mmuFault, rst, 0]],
      expected: expVec,
    };
  }
  return {
    label,
    displayInput: [privOp, mmioEn, iret, irq, syscall, mmuFault, rst, 1],
    phases: [
      [privOp, mmioEn, iret, irq, syscall, mmuFault, rst, 0],
      [privOp, mmioEn, iret, irq, syscall, mmuFault, rst, 1],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    expected: expVec,
  };
}

function irqVecCycle(label, v, imm, rdata, flow, irq, syscall, fault, iret, rst, expPc, expEpc, expPc1) {
  return {
    label,
    busDisplayInput: [v, imm, rdata, flow, irq, syscall, fault, iret, rst, 1],
    busPhases: [
      [v, imm, rdata, flow, irq, syscall, fault, iret, rst, 0],
      [v, imm, rdata, flow, irq, syscall, fault, iret, rst, 1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    busExpected: [expPc, expEpc, expPc1],
  };
}

function instDec16Case(op, name, core, mem, stk, call, ret, sys, iret, halt, priv) {
  return {
    label: `${op.toString(2).padStart(4, '0')} (${op}) ${name}`,
    busInput: [op],
    busExpected: [core, mem, stk, call, ret, sys, iret, halt, priv],
  };
}

function ark8OsStep(
  label,
  op,
  rd,
  rs,
  imm,
  rdata,
  base,
  limit,
  irq,
  spLd,
  rst,
  expOut,
  { clock = true, releaseAfter = true } = {}
) {
  const reg = ((rd & 3) << 2) | (rs & 3);
  if (!clock) {
    return {
      label,
      busDisplayInput: [op, reg, imm, rdata, base, limit, irq, spLd, rst, 0],
      busPhases: [[op, reg, imm, rdata, base, limit, irq, spLd, rst, 0]],
      busExpected: expOut,
    };
  }
  const phases = [
    [op, reg, imm, rdata, base, limit, irq, spLd, rst, 0],
    [op, reg, imm, rdata, base, limit, irq, spLd, rst, 1],
  ];
  if (releaseAfter) {
    phases.push([0, reg, 0, 0, base, limit, 0, 0, 0, 0]);
  } else {
    phases.push([op, reg, imm, rdata, base, limit, irq, spLd, rst, 0]);
  }
  return {
    label,
    busDisplayInput: [op, reg, imm, rdata, base, limit, irq, spLd, rst, 1],
    busPhases: phases,
    busExpected: expOut,
  };
}

export const CHAPTER4_STAGES = [
  // =========================================================================
  // ACT X — UNIFIED MEMORY BUS, MMIO PERIPHERALS, STACK, TIMER & MMU (43–48)
  // =========================================================================
  {
    id: 'stage_43',
    number: 43,
    act: 10,
    chapter: 4,
    code: '43',
    busMode: true,
    title: 'ROMの檻を破れ・統一ノイマンバス',
    revealedTitle: '8ビット統一メモリバス（MEM_BUS8）',
    scene: 'ark5_station',
    storyBgm: 'crisis',
    widget: 'data_bus',
    mode: 'combinational',
    incidentBrief: {
      where: 'ホライズン電算司令室・長距離受信バス盤',
      trouble: '北方420kmのシェルター ARK-5 から生きた機械語プログラムが届いているのに、第3章のハーバード型 ARK8_SYS は命令が固定マスクROM側しか読めない！',
      condition: 'DSEL=0で命令番地PC、DSEL=1でデータ番地DAを選び ADDR[7:0] へ出力。0x00〜0x0F(BOOT=1)は ROM_EN=1、0xF0〜0xFF は MMIO_EN=1 とし、RAM_WE は両領域への誤書込を遮断せよ！',
      shortRule: 'MUX4_8B で PC/DA を束ね、上位4bitが 0x0(BOOT時) なら ROM_EN、0xF なら MMIO_EN、それ以外の書込だけ RAM_WE=1！',
      stakes: '命令とデータを同じ256バイト統一RAMへ同居させ、外部プログラムを実行する第一歩を踏み出す',
    },
    inputs: ['PC[7:0]', 'DA[7:0]', 'DSEL', 'BOOT', 'WE'],
    outputs: ['ADDR[7:0]', 'ROM_EN', 'MMIO_EN', 'RAM_WE'],
    pinHelp: {
      inputs: [
        'PC[7:0]: 命令フェッチ用の8ビット番地（0x00〜0xFF）',
        'DA[7:0]: データ読み書き用の8ビット番地（0x00〜0xFF）',
        'DSEL: 0=PC（命令読出）／ 1=DA（データアクセス）',
        'BOOT: 1のとき 0x00〜0x0F を起動用ブートROM領域として保護',
        'WE: CPUからのメモリ書込要求（1=書込要求）',
      ],
      outputs: [
        'ADDR[7:0]: 統一メモリへ送る最終8ビット番地',
        'ROM_EN: BOOT=1 かつ ADDR上位4bit==0x0（0x00〜0x0F）のとき 1',
        'MMIO_EN: ADDR上位4bit==0xF（0xF0〜0xFF）のとき 1',
        'RAM_WE: WE=1 かつ ROM_EN=0 かつ MMIO_EN=0 のときだけ 1（RAM書込許可）',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH123_CHIPS],
    plainGoal: '命令番地 PC とデータ番地 DA を1本の統一バス ADDR へ統合し、ブートROM（0x00〜0x0F）と周辺機器 MMIO（0xF0〜0xFF）への誤書込を防ぐ【MEM_BUS8】を組もう！',
    beginnerNote:
      '上位4bit（SPLIT8 の H[3:0]）が 0000(0x0) かは ZERO_4B 一発！ 1111(0xF) かは「XOR_4B(H, INV=1) で全ビット反転してから ZERO_4B」に入れれば一発で見抜けます！ 最後に OR(ROM_EN, MMIO_EN) を NOT して WE と AND すれば RAM_WE 完成！',
    introDialogue: [
      {
        speaker: 'hako',
        showIncident: true,
        text: '『2094年12月1日 17時08分──北方420km、気象観測シェルター【ARK-5】からの緊急電波、なおも連続受信中だ！ 電文の後ろにぶら下がっているのは、生きた機械語プログラム本体だぞ！』',
      },
      {
        speaker: 'ren',
        text: '『……ザザッ……こちら北方観測拠点アーク5、通信技師のレン……聞こえるなら至急、添付した復号プログラムをそちらの計算機へ読み込んで実行して……大気異常の警報コードを送っているのに、暗号化されていて……ザッ……』',
      },
      {
        speaker: 'kai',
        text: 'くそっ、相手の声までノイズ交じりに届いてるのに、今の ARK8_SYS は命令が固定のマスクROMだから、受信したプログラムを RAM に載せて走らせることができねえ！！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'ノイマン型統一メモリマップの設計図（動く図解）',
          title: '🛣 PC と DA を 1本のバスへ！ 0x00..0x0F=ROM / 0xF0..0xFF=MMIO',
          anim: 'goal_mem_bus8',
          rule: 'DSEL で PC/DA を切替！ 上位4bit 0x0(BOOT時)→ROM_EN、0xF→MMIO_EN、それ以外の書込だけ RAM_WE=1！',
          accent: '#7ee8ff',
        },
        text: 'ここからが第4章『OS対応PCハードウェア完結』の幕開けだ！ 第3章の部品は1つも捨てない──まずは MUX4_8B で命令番地 PC とデータ番地 DA を1本の【統一メモリバス（MEM_BUS8）】へ合流させ、ブートROMと将来の周辺機器領域（0xF0〜0xFF）を物理的に仕分けよう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'できた！！ 1本のアドレス線だけで「起動用ブートROM」「自由に読み書きできる統一RAM」「周辺機器のMMIO領域」の3つがピタッと仕分けられて、しかも ROM や MMIO へうっかり上書きしようとしても RAM_WE が 0 でガードされるんだね！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：8ビット統一メモリバス',
          title: '🛣 MEM_BUS8（244 NAND＝MOSFET 488個）完成！',
          anim: 'mem_bus8',
          rule: 'ハーバード型の檻を突破！ 次は 0xF0〜0xFF の先に文字画面CRT・キーボード・ディスク・タイマーを繋ぐ！',
          accent: '#7ee8ff',
        },
        text: '素晴らしい！ これで通信で届いたプログラムを統一RAMへ載せる道が開けた。──だが2進数のランプだけではレン君の緊急メッセージを読めないな。次は 0xF0 番地群へ文字画面 CRT や周辺機器を繋ぐ【MMIO_DEC】だ！',
      },
    ],
    hints: [
      '【ADDR選択】MUX4_8B の D0=PC[7:0], D1=DA[7:0], D2=アース0, D3=アース0, S0=DSEL, S1=アース0 → 出力を ADDR[7:0] と SPLIT8 へ接続！',
      '【ROM_EN と MMIO_EN】SPLIT8 の上位 H[3:0] を ZERO_4B へ入れ、BOOT と AND すれば ROM_EN！ 同じ H[3:0] を XOR_4B(INV=でんち1) で全反転してからもう1つの ZERO_4B へ入れれば 0xF(1111) 検知＝MMIO_EN！',
      '【RAM_WE保護】OR(ROM_EN, MMIO_EN) → NOT → WE と AND して RAM_WE へ接続！（合計11チップ・244 NAND）',
    ],
    tests: [
      { label: '起動フェッチ PC=0x04, BOOT=1 → ROM_EN=1', busInput: [4, 80, 0, 1, 0], busExpected: [4, 1, 0, 0] },
      { label: 'ブートROM書込禁止 DA=0x0A, BOOT=1, WE=1 → RAM_WE=0!', busInput: [0, 10, 1, 1, 1], busExpected: [10, 1, 0, 0] },
      { label: '通常統一RAM書込 DA=0x40, BOOT=1, WE=1 → RAM_WE=1', busInput: [2, 64, 1, 1, 1], busExpected: [64, 0, 0, 1] },
      { label: 'BOOT=0なら0x08もRAM書込可 → RAM_WE=1', busInput: [0, 8, 1, 0, 1], busExpected: [8, 0, 0, 1] },
      { label: 'MMIO領域 0xF0書込 → MMIO_EN=1, RAM_WE=0!', busInput: [16, 240, 1, 0, 1], busExpected: [240, 0, 1, 0] },
      { label: 'MMIO上限 0xFF読出 → MMIO_EN=1, RAM_WE=0', busInput: [16, 255, 1, 0, 0], busExpected: [255, 0, 1, 0] },
    ],
    rewardChip: {
      id: 'MEM_BUS8',
      name: 'MEM_BUS8',
      shortName: 'MB8',
      titleJa: '8ビット統一メモリバス',
      descJa: '命令(PC)とデータ(DA)を1本の統一バスへ統合し、ブートROM・MMIO・RAM書込保護を自動判定する回路。',
      color: '#1b6d7c',
      accent: '#7ee8ff',
    },
    codexUnlock: ['von_neumann_bus'],
  },

  {
    id: 'stage_44',
    number: 44,
    act: 10,
    chapter: 4,
    code: '44',
    busMode: true,
    title: '画面と機器を番地へ・MMIOデコーダ',
    revealedTitle: '周辺機器ポートデコーダ（MMIO_DEC）',
    scene: 'ark5_station',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'combinational',
    incidentBrief: {
      where: 'ホライズン電算司令室・周辺機器ラック',
      trouble: 'アーク3から持ち込んだエメラルド文字CRT・キーボード・磁気ディスク・タイマーを 0xF0〜0xF3 へ繋ぎたいが、0xF4〜0xFF の将来のシステム制御番地が 0xF0〜0xF3 を誤爆（エイリアシング）してはならない！',
      condition: 'MMIO_EN=1 かつ ADDRの bit2・bit3 が両方0のときだけ、下位2bit (00〜11) で CRT_SEL(0xF0) / KB_SEL(0xF1) / DSK_SEL(0xF2) / TMR_SEL(0xF3) を1つ選択し、DEV_WE = MMIO_EN & WE を出力せよ！',
      shortRule: 'DEC2_4 で下位2bitを4機器へ分け、NOT(bit2 | bit3) & MMIO_EN の防誤爆ガードと AND せよ！',
      stakes: '普通の STOR/LOAD 命令だけでCRT画面やタイマーを操る「メモリマップドI/O」を確立する',
    },
    inputs: ['ADDR[7:0]', 'MMIO_EN', 'WE'],
    outputs: ['CRT_SEL', 'KB_SEL', 'DSK_SEL', 'TMR_SEL', 'DEV_WE'],
    pinHelp: {
      inputs: [
        'ADDR[7:0]: 統一バス上の8ビット番地（下位4bitでポート番号を判定）',
        'MMIO_EN: MEM_BUS8 からの MMIO領域フラグ（0xF0〜0xFF で 1）',
        'WE: CPUからの書き込み要求',
      ],
      outputs: [
        'CRT_SEL: 0xF0 (240) 文字CRT画面 選択',
        'KB_SEL: 0xF1 (241) キーボード 選択',
        'DSK_SEL: 0xF2 (242) ディスク装置 選択',
        'TMR_SEL: 0xF3 (243) タイマー 選択',
        'DEV_WE: 周辺機器への書込許可（MMIO_EN & WE）',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH123_CHIPS, 'MEM_BUS8'],
    plainGoal: '0xF0=CRT・0xF1=KB・0xF2=Disk・0xF3=Timer を正確に選び分け、0xF4〜0xFF との誤選択を完全に防ぐ【MMIO_DEC】を組み立てよう！',
    beginnerNote:
      'ADDR[7:0] → SPLIT8 → 下位 L[3:0] → SPLIT4 で 0〜3番ピンを取り出します！ 0,1番ピンは DEC2_4 へ、2,3番ピンは OR → NOT して「0xF0〜0xF3 範囲内チェック」を作り、MMIO_EN と AND した許可線を各出力へ掛けよう！ たった 26 NAND です！',
    introDialogue: [
      {
        speaker: 'kai',
        showIncident: true,
        text: 'ほら主任、倉庫から引っ張り出してきたぜ！ 戦前のエメラルド蛍光CRT文字モニター、メカニカルキーボード、磁気ディスク装置、それにタイマーユニット──ぜんぶ生きてる！ どうやって CPU に繋ぐ？ 専用命令を4個も足すのか？',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'メモリマップドI/O（MMIO）と誤爆防止ガード（動く図解）',
          title: '📺 0xF0=CRT / 0xF1=KB / 0xF2=Disk / 0xF3=Timer（0xF4〜0xFFは遮断！）',
          anim: 'goal_mmio_dec',
          rule: '下位2bitを DEC2_4 で4機器へ！ bit2|bit3=1 (0xF4..0xFF) のときは全4出力を 0 にして誤爆を防ぐ！',
          accent: '#52e3b6',
        },
        text: 'いや、専用命令は1つも要らない！ 1970年の名機 PDP-11 と同じ【メモリマップドI/O（MMIO）】を使うんだ。0xF0番地へ普通に STOR すれば画面に文字が映り、0xF1番地を LOAD すればキーボードが読める！ ただし将来の MMU 制御ポート（0xF4〜0xFF）が CRT を誤爆しないよう、bit2 と bit3 が両方 0 のときだけ開く安全ガードを仕込もう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'おお〜！！ 0xF0 で CRT、0xF1 でキーボード、0xF2 でディスク、0xF3 でタイマーがパチパチ点灯して、0xF4 を入れても CRT が絶対に誤反応しない！！ たった 26個の NAND で周辺機器の世界が開いちゃったよ！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：周辺機器ポートデコーダ',
          title: '📺 MMIO_DEC（26 NAND＝MOSFET 52個）完成！',
          anim: 'mmio_dec',
          rule: 'これで文字画面CRTへの道が繋がった！ 次はレン君の復号プログラムが使う「スタック」だ！',
          accent: '#52e3b6',
        },
        text: 'これで文字画面 CRT もキーボードもディスクもタイマーも、すべて普通のメモリアクセスで操れるようになったぞ！',
      },
    ],
    hints: [
      '【構成】SPLIT8×1、SPLIT4×1、DEC2_4×1、OR×1、NOT×1、AND×6（合計11チップ・26 NAND）。',
      '【誤爆防止】ADDR→SPLIT8→L[3:0]→SPLIT4。pin2 と pin3 を OR → NOT して MMIO_EN と AND したものを「有効化線 EN_LOW」にする！',
      '【4機器＆DEV_WE】pin0, pin1 を DEC2_4 へ入れ、Y0〜Y3 をそれぞれ EN_LOW と AND して CRT/KB/DSK/TMR_SEL へ！ MMIO_EN と WE を AND すれば DEV_WE！',
    ],
    tests: [
      { label: '0xF0 CRT書込 → CRT_SEL=1, DEV_WE=1', busInput: [240, 1, 1], busExpected: [1, 0, 0, 0, 1] },
      { label: '0xF1 キーボード読出 → KB_SEL=1, DEV_WE=0', busInput: [241, 1, 0], busExpected: [0, 1, 0, 0, 0] },
      { label: '0xF2 ディスク書込 → DSK_SEL=1, DEV_WE=1', busInput: [242, 1, 1], busExpected: [0, 0, 1, 0, 1] },
      { label: '0xF3 タイマー書込 → TMR_SEL=1, DEV_WE=1', busInput: [243, 1, 1], busExpected: [0, 0, 0, 1, 1] },
      { label: '誤爆防止 0xF4(MMU_BASE) → 全機器SEL=0, DEV_WE=1!', busInput: [244, 1, 1], busExpected: [0, 0, 0, 0, 1] },
      { label: '誤爆防止 0xFF → 全機器SEL=0!', busInput: [255, 1, 1], busExpected: [0, 0, 0, 0, 1] },
      { label: 'MMIO_EN=0 → 0xF0でも全出力0', busInput: [240, 0, 1], busExpected: [0, 0, 0, 0, 0] },
    ],
    rewardChip: {
      id: 'MMIO_DEC',
      name: 'MMIO_DEC',
      shortName: 'MIO',
      titleJa: '周辺機器ポートデコーダ',
      descJa: '0xF0(CRT)〜0xF3(Timer)を誤爆防止ガード付きでデコードするMMIO周辺機器コントローラ。',
      color: '#1e7858',
      accent: '#52e3b6',
    },
    codexUnlock: ['mmio_peripherals'],
  },

  {
    id: 'stage_45',
    number: 45,
    act: 10,
    chapter: 4,
    code: '45',
    busMode: true,
    title: '呼び出しと帰還の塔・スタックポインタ',
    revealedTitle: 'フル降順スタックポインタ（STACK_PTR）',
    scene: 'ark5_station',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'sequential',
    hasClock: true,
    incidentBrief: {
      where: 'ホライズン電算司令室・実行エンジン盤',
      trouble: 'ARK-5 の復号プログラムは「文字表示サブルーチン」を呼び出し、その中でさらに別の処理へ潜る！ 戻り番地を1箇所に覚えるだけでは上書きされて帰って来られない！',
      condition: 'RST=1で SP←0xF0(240)。PUSH=1で SP←SP−1（実効番地 EA=SP−1）、POP=1で SP←SP+1（EA=SP）、LOAD=1で SP←DIN、EN=0 のときはトラップ保護のため SP を凍結せよ！',
      shortRule: 'ALU_8B(±1) と MUX4_8B×3・REG_8B で、0xF0 から下へ伸びるフル降順スタックポインタを組め！',
      stakes: '何重の CALL/RET サブルーチンも、将来のOS割込退避も破綻させないハードウェア・スタックを完成させる',
    },
    inputs: ['DIN[7:0]', 'PUSH', 'POP', 'LOAD', 'EN', 'RST', 'CLK'],
    outputs: ['SP[7:0]', 'EA[7:0]'],
    pinHelp: {
      inputs: [
        'DIN[7:0]: OSが SP を直接切り替えたいときの8ビット値（LOAD=1で使用）',
        'PUSH: 1でスタックへ積む（SP←SP−1、アクセス番地 EA=SP−1）',
        'POP: 1でスタックから取り出す（SP←SP+1、アクセス番地 EA=SP）',
        'LOAD: 1で DIN をそのまま SP へ代入（OSコンテキスト切替用）',
        'EN: 更新許可（0のときは CLK が来ても SP を凍結！トラップ時の破壊防止）',
        'RST / CLK: 0xF0(240) 初期化リセット線 と クロック',
      ],
      outputs: [
        'SP[7:0]: 現在のスタック先頭番地（リセット初期値 240 = 0xF0）',
        'EA[7:0]: この拍で実際にRAMへ読み書きする実効番地（PUSH時=SP−1、それ以外=SP）',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH123_CHIPS, 'MEM_BUS8', 'MMIO_DEC'],
    plainGoal: 'RAMの上端 0xF0(240) から下方向へ伸び、PUSH(−1)・POP(+1)・LOAD(直書)・EN凍結を備えた【STACK_PTR】を組み立てよう！',
    beginnerNote:
      '初期値 240(0xF0) は JOIN8(L=アース0, H=でんち1) のたった1個で作れます（下位0000＋上位1111＝11110000＝240！）！ 定数 1 は JOIN4(1,0,0,0)→JOIN8(L,0)！ ALU_8B(SP, 1, SUB=PUSH) 1個で PUSH時は SP−1、POP時は SP+1 の両方を計算できるのがポイントです！',
    introDialogue: [
      {
        speaker: 'ren',
        showIncident: true,
        text: '『……ノイズが減ってきた！ 私の送っている文字列復号コード、文字を1つずつ CRT へ送るサブルーチンを CALL で呼び出して、終わったら RET で元の場所へ戻る作りになってるの。そっちの CPU、スタックポインタはある？』',
      },
      {
        speaker: 'hako',
        text: '『むっ……今の ARK-8 にはまだ「呼び出し元の番地を順番に積んで覚えておく塔」がないぞ！ もし1個しか覚える箱がないと、サブルーチンの中から別のサブルーチンを呼んだ瞬間に最初の戻り先が消えちまう！』',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'フル降順スタック（0xF0 ➔ 0xEF ➔ 0xEE…）（動く図解）',
          title: '📚 PUSH で SP−1(EA=SP−1) ／ POP で SP+1(EA=SP) ／ EN=0 で凍結！',
          anim: 'goal_stack_ptr',
          rule: 'RST で 0xF0(240) 初期化！ ALU_8B(SP, 1, SUB=PUSH) 1個で −1 と +1 を両立！',
          accent: '#c89bff',
        },
        text: 'そこで 256バイト統一RAMの上端 0xF0(240) から下へお皿を積むように伸びる【フル降順スタック】の番人──【STACK_PTR】を組もう！ しかも LOAD ピンと EN 凍結ピンを備えておけば、トラップ発生時に SP が壊れるのを防ぎ、第5章ではプロセスごとのスタック丸ごと切替（マルチタスク）にまでそのまま使えるんだ！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'わぁっ！ RST で 240(0xF0) にセットされて、PUSH で 239→238 と1枚ずつ積まれて、POP で 239→240 へキレイに戻った！ しかも EN=0 のときは何があっても絶対に SP が動かないんだね！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：フル降順スタックポインタ',
          title: '📚 STACK_PTR（1,090 NAND＝MOSFET 2,180個）完成！',
          anim: 'stack_ptr',
          rule: 'CALL/RET と PUSH/POP の心臓が完成！ 次はタイマー割込と MMU の両方を支える「比較器」だ！',
          accent: '#c89bff',
        },
        text: 'お見事！ ところでな、レン君のプログラムを動かす前にもう2つ、ホライズンの命を守る絶対のハードウェアが必要になる。まずは第3章の ALU_8B をたった3チップで【8ビット比較器】へ仕立てよう！',
      },
    ],
    hints: [
      '【定数生成】定数1＝JOIN4(でんち1,0,0,0)→JOIN8(L,0)。初期値0xF0(240)＝JOIN8(L=アース0, H=でんち1)！',
      '【加減算とEA】ALU_8B(A=SP, B=定数1, SUB=PUSH) で PUSH時=SP−1・非PUSH時=SP+1。MUX4_8B(D0=SP, D1=ALU.Y, S0=PUSH, S1=0)→EA！',
      '【次SPとRST/EN】S0=OR(PUSH,LOAD)、S1=OR(POP,LOAD) で MUX4_8B(D0=SP, D1=ALU.Y, D2=ALU.Y, D3=DIN)→次SP候補。もう1つの MUX4_8B(D0=次SP候補, D1=240, S0=RST, S1=0)→REG_8B.D！ REG_8B の LOAD=OR(EN, RST)、RSTピン=アース0、CLK=CLK！（計13チップ）',
    ],
    tests: [
      stackCycle('① RST初期化 (RST=1 → SP=240[0xF0], EA=240)', 0, 0, 0, 0, 0, 1, 240, 240),
      stackCycle('② PUSH前段確認 (CLK=0, PUSH=1 → SP=240のままEA=239!)', 0, 1, 0, 0, 1, 0, 240, 239, { clock: false }),
      stackCycle('③ PUSH確定 (PUSH=1, EN=1, CLK↑ → SP=239)', 0, 1, 0, 0, 1, 0, 239, 239),
      stackCycle('④ 連続PUSH確定 (PUSH=1, EN=1, CLK↑ → SP=238)', 0, 1, 0, 0, 1, 0, 238, 238),
      stackCycle('⑤ POP前段確認 (CLK=0, POP=1 → EA=現在SP=238!)', 0, 0, 1, 0, 1, 0, 238, 238, { clock: false }),
      stackCycle('⑥ POP確定 (POP=1, EN=1, CLK↑ → SP=239へ復帰)', 0, 0, 1, 0, 1, 0, 239, 239),
      stackCycle('⑦ トラップ凍結確認 (PUSH=1, EN=0 → SP=239から動かない!)', 0, 1, 0, 0, 0, 0, 239, 239),
      stackCycle('⑧ OS直接切替 (DIN=224, LOAD=1, EN=1 → SP=224)', 224, 0, 0, 1, 1, 0, 224, 224),
    ],
    rewardChip: {
      id: 'STACK_PTR',
      name: 'STACK_PTR',
      shortName: 'SP8',
      titleJa: 'フル降順スタックポインタ',
      descJa: 'RSTで0xF0初期化し、PUSH(-1)・POP(+1)・LOAD・EN凍結と実効番地EAを生成する8ビットスタック制御器。',
      color: '#6b3fa0',
      accent: '#c89bff',
    },
    codexUnlock: ['hardware_stack_call'],
  },

  {
    id: 'stage_46',
    number: 46,
    act: 10,
    chapter: 4,
    code: '46',
    busMode: true,
    title: '天秤の目・8ビット符号なし比較器',
    revealedTitle: '8ビット符号なし比較器（CMP_8B）',
    scene: 'ark5_station',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'combinational',
    incidentBrief: {
      where: 'ホライズン電算司令室・保護判定ユニット',
      trouble: 'これから作る「タイマー割込（CNT == 0 判定）」と「Base/Limit MMU（番地 VA >= LIMIT 違反判定）」の両方で、8ビットの符号なし大小比較が必須になる！',
      condition: '2つの符号なし8ビット数 A[7:0], B[7:0] を比べ、EQ (A == B)、LT (A < B)、GE (A >= B) の3信号を出力せよ！',
      shortRule: '第3章の ALU_8B を引き算(SUB=1)で動かし、EQ=Z・GE=C・LT=NOT(C) のたった3チップで組め！',
      stakes: 'タイマー割込とメモリ保護MMUの両方の判定頭脳を、既存ALUの再活用だけで手に入れる',
    },
    inputs: ['A[7:0]', 'B[7:0]'],
    outputs: ['EQ', 'LT', 'GE'],
    pinHelp: {
      inputs: [
        'A[7:0]: 左の符号なし8ビット値（0〜255、例：仮想番地 VA）',
        'B[7:0]: 右の符号なし8ビット値（0〜255、例：上限 LIMIT）',
      ],
      outputs: [
        'EQ: A == B のとき 1',
        'LT: A < B のとき 1（例：VA < LIMIT なら安全！）',
        'GE: A >= B のとき 1（例：VA >= LIMIT なら境界違反！）',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH123_CHIPS, 'MEM_BUS8', 'MMIO_DEC', 'STACK_PTR'],
    plainGoal: '第3章で鍛えたフラグ付 ALU_8B をそのまま再利用し、たった3チップで符号なし8ビット比較器【CMP_8B】を完成させよう！',
    beginnerNote:
      '2の補数引き算（A + ~B + 1）の超美しい数学法則！ 符号なし整数では「A >= B のとき必ずキャリー C=1、A < B のとき必ず C=0」になります！ だから ALU_8B(A, B, SUB=でんち1) を置くだけで、Z→EQ、C→GE、NOT(C)→LT で一発完成です！',
    introDialogue: [
      {
        speaker: 'kai',
        showIncident: true,
        text: '待てよ主任！ これから「タイマーが 0 で止まってるか」とか「外部プログラムの番地が上限 LIMIT を超えてないか」を判定する回路が要るよな？ 8ビット同士の大小比較って、めちゃくちゃデカい回路になるんじゃねえのか？',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '第3章 ALU_8B の大活躍：たった3チップで8bit比較！（動く図解）',
          title: '⚖ ALU_8B(SUB=1) ➔ Z=EQ ／ C=GE(A>=B) ／ NOT(C)=LT(A<B)',
          anim: 'goal_cmp_8b',
          rule: '2の補数減算 A + ~B + 1 では、A >= B のとき必ず桁上がり C=1 が出る！ 部品はたった3個！',
          accent: '#ffd166',
        },
        text: 'ふふっ、覚えてるかい？ 第3章 Stage 32 で【ALU_8B】に Z・C・N のフラグを付けたとき、「第4章の MMU でそのまま使うぞ」と言っただろう！ 引き算（SUB=1）のキャリー C は符号なし比較の「A >= B」そのものだ。たった3チップで【CMP_8B】を鍛え上げよう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kai',
        text: 'うおっ、本当に ALU_8B と でんち1 と NOT の3チップだけで、0〜255 どんな数字も「等しい・小さい・以上」が一瞬で判定できちまった！！ 第3章の設計が完璧に噛み合ってるぜ！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：8ビット符号なし比較器',
          title: '⚖ CMP_8B（223 NAND＝MOSFET 446個）完成！',
          anim: 'cmp_8b',
          rule: 'この天秤をすぐ次の「タイマー割込 TMR_IRQ」と「メモリ保護 MMU_8B」の両方へ投入するぞ！',
          accent: '#ffd166',
        },
        text: 'さあ、この【CMP_8B】を手に──次は無限ループから拠点を守る「ハードウェア・タイマー割込【TMR_IRQ】」だ！',
      },
    ],
    hints: [
      '【構成】でんち1(CONST_1) × 1、ALU_8B × 1、NOT × 1（たった3チップ・223 NAND！）。',
      '【減算接続】A[7:0] → ALU_8B.A、B[7:0] → ALU_8B.B、でんち1 → ALU_8B.SUB！',
      '【3出力】ALU_8B.Z → EQ、ALU_8B.C → GE、そして ALU_8B.C を NOT に通して LT へ接続すれば完了！',
    ],
    tests: [
      { label: '一致 100 == 100 → EQ=1, LT=0, GE=1', busInput: [100, 100], busExpected: [1, 0, 1] },
      { label: '境界内 31 < 32 → EQ=0, LT=1, GE=0', busInput: [31, 32], busExpected: [0, 1, 0] },
      { label: '境界到達 32 == 32 → EQ=1, LT=0, GE=1 (上限超過!)', busInput: [32, 32], busExpected: [1, 0, 1] },
      { label: 'MMIO侵入 240 >= 32 → EQ=0, LT=0, GE=1', busInput: [240, 32], busExpected: [0, 0, 1] },
      { label: 'ゼロ一致 0 == 0 → EQ=1, LT=0, GE=1', busInput: [0, 0], busExpected: [1, 0, 1] },
      { label: '最大差 0 < 255 → EQ=0, LT=1, GE=0', busInput: [0, 255], busExpected: [0, 1, 0] },
    ],
    rewardChip: {
      id: 'CMP_8B',
      name: 'CMP_8B',
      shortName: 'CMP',
      titleJa: '8ビット符号なし比較器',
      descJa: 'ALU_8Bの減算フラグ(Z/C)をそのまま活用し、符号なし8ビットの EQ・LT・GE を判定する比較器。',
      color: '#a36b1d',
      accent: '#ffd166',
    },
    codexUnlock: ['timer_irq_privilege'],
  },

  {
    id: 'stage_47',
    number: 47,
    act: 10,
    chapter: 4,
    code: '47',
    busMode: true,
    title: '暴走を断つ警鐘・タイマー割込器',
    revealedTitle: '自動再装填タイマー割込器（TMR_IRQ）',
    scene: 'ark5_station',
    storyBgm: 'crisis',
    widget: 'data_bus',
    mode: 'sequential',
    hasClock: true,
    incidentBrief: {
      where: 'ホライズン電算司令室・生命維持監視クロック盤',
      trouble: '長時間の計算ループを走らせたテスト中、処理が終わるまで電力と生命維持の監視が完全にフリーズしてしまった！ 外部プログラムが無限ループしても強制的にOSへ主導権を奪い返すハードウェア目覚まし時計が必要だ！',
      condition: 'RST=1でCNT=0(停止・IRQ=0)。LOAD=1で PERIOD を装填し毎拍−1。CNT==1 の瞬間に IRQ=1 を鳴らし、次の拍で PERIOD を自動再装填せよ！（CNT==0 かつ LOAD=0 なら 0 のまま停止）',
      shortRule: 'ALU_8B(−1) の Z(CNT==1) を IRQ に出し、CMP_8B(CNT==0) と OR(LOAD, IRQ) で MUX4_8B を制御せよ！',
      stakes: 'どんな無限ループでも強制奪還できる「ハードウェア・プリエンプション」の心臓を完成させる',
    },
    inputs: ['PERIOD[7:0]', 'LOAD', 'RST', 'CLK'],
    outputs: ['CNT[7:0]', 'IRQ'],
    pinHelp: {
      inputs: [
        'PERIOD[7:0]: 割り込み周期（例：4 を書くと 4→3→2→1[IRQ!]→4… と自動周回）',
        'LOAD: 1で PERIOD をタイマーへ装填してカウント開始',
        'RST: 1で CNT=0（停止・IRQ=0）へリセット',
        'CLK: クロック（毎拍カウントダウン＆自動再装填）',
      ],
      outputs: [
        'CNT[7:0]: 現在の残りカウント値（0は停止中）',
        'IRQ: CNT == 1 の瞬間に 1 となるハードウェア割り込み要求信号！',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH123_CHIPS, 'MEM_BUS8', 'MMIO_DEC', 'STACK_PTR', 'CMP_8B'],
    plainGoal: 'PERIOD から毎拍カウントダウンし、残り 1 の瞬間に IRQ=1 を発報して自動で PERIOD を再装填する【TMR_IRQ】を組もう！',
    beginnerNote:
      'すごい発見！ ALU_8B(CNT, 1, SUB=1) の答えは「CNT − 1」なので、そのゼロフラグ Z は「CNT − 1 == 0」、つまり【CNT == 1】の瞬間にだけ 1 に光ります！ これがそのまま IRQ 信号かつ自動再装填トリガーになります！',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: '大変だよ主任さん！！ さっき試しに長い計算ループを回していたら、ループが終わるまで拠点の電力・酸素モニターが完全に固まっちゃったの！ もしアーク5の電波に無限ループが紛れていたら、242人の生命維持が止まっちゃう……！',
      },
      {
        speaker: 'hako',
        text: '『ソフトが自分から「そろそろ交代しよう」なんて譲ってくれる保証はどこにもねえ！ だからこそ本物のOSには、CPUが何をしてようが一定拍ごとにベルを鳴らして強制介入する【ハードウェア・タイマー割込（IRQ）】が要るんだ！』',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '自動再装填カウントダウンタイマーの仕組み（動く図解）',
          title: '⏰ 4 ➔ 3 ➔ 2 ➔ 1 [IRQ=1!] ➔ 自動で 4 へ再装填！（0なら停止）',
          anim: 'goal_tmr_irq',
          rule: 'ALU_8B(CNT−1).Z が「CNT==1＝IRQ」そのもの！ CMP_8B(CNT==0) で停止中(0)を判別しよう！',
          accent: '#ff8a7a',
        },
        text: 'さっき作った【CMP_8B】と【ALU_8B】があれば、たった9チップで組めるぞ！ 残り 1 で IRQ=1 を鳴らし、次のクロックで自動で PERIOD を再装填する【TMR_IRQ】を組み立てよう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '3 → 2 → 1（ピコンッ！ IRQ=1！）→ 自動で 3 に戻ってまたカウントダウン！！ しかもリセット直後の 0 のときは勝手に鳴らずに静かに待機してる！ これならもう二度とシステムが固まらないね！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：自動再装填タイマー割込器',
          title: '⏰ TMR_IRQ（923 NAND＝MOSFET 1,846個）完成！',
          anim: 'tmr_irq',
          rule: '強制奪還の目覚まし時計が完成！ ACT X の最後は、外部コードの暴走を閉じ込める鉄壁の砂場【MMU_8B】だ！',
          accent: '#ff8a7a',
        },
        text: 'よし、これで「時間」の暴走（無限ループ）は防げる！ 次は「空間」の暴走──外部プログラムが勝手にカーネルRAMや画面・発電機を書き換えるのを物理的に防ぐ【Base/Limit MMU】だ！',
      },
    ],
    hints: [
      '【カウント−1とIRQ】定数1＝JOIN4(でんち1,0,0,0)→JOIN8(L,0)。ALU_8B(A=REG.Q, B=定数1, SUB=でんち1) を繋ぎ、ALU_8B.Z をそのまま出力 IRQ へ！',
      '【0停止判定と選択線】CMP_8B(A=REG.Q, B=アース0).EQ が「停止中(CNT==0)」。OR(LOAD, ALU_8B.Z) を S0、CMP_8B.EQ を S1 にする！',
      '【次値MUXとREG】MUX4_8B の D0=ALU_8B.Y(CNT−1)、D1=PERIOD(装填/再装填)、D2=アース0(0停止維持)、D3=PERIOD(0から開始)、S0=OR出力、S1=CMP_8B.EQ → REG_8B(LOAD=でんち1, RST=RST, CLK=CLK) → CNT！（計9チップ）',
    ],
    tests: [
      tmrCycle('① RST停止 (RST=1 → CNT=0, IRQ=0)', 3, 0, 1, 0, 0),
      tmrCycle('② 停止維持 (LOAD=0, CNT=0のまま → CNT=0, IRQ=0)', 3, 0, 0, 0, 0),
      tmrCycle('③ 周期3を装填 (PERIOD=3, LOAD=1 → CNT=3, IRQ=0)', 3, 1, 0, 3, 0),
      tmrCycle('④ 1拍経過 (3 → 2, IRQ=0)', 3, 0, 0, 2, 0),
      tmrCycle('⑤ 残り1到達! (2 → 1, IRQ=1発報!)', 3, 0, 0, 1, 1),
      tmrCycle('⑥ 自動再装填! (1 → 3, IRQ=0)', 3, 0, 0, 3, 0),
      tmrCycle('⑦ 強制リセット停止 (RST=1 → CNT=0, IRQ=0)', 3, 0, 1, 0, 0),
    ],
    rewardChip: {
      id: 'TMR_IRQ',
      name: 'TMR_IRQ',
      shortName: 'TMR',
      titleJa: '自動再装填タイマー割込器',
      descJa: 'PERIODからカウントダウンし、CNT==1でIRQ=1を発報して自動再装填するハードウェアタイマー。',
      color: '#a8423b',
      accent: '#ff8a7a',
    },
    codexUnlock: ['timer_irq_privilege'],
  },

  {
    id: 'stage_48',
    number: 48,
    act: 10,
    chapter: 4,
    code: '48',
    busMode: true,
    title: '鉄壁の砂場・Base/Limit MMU',
    revealedTitle: 'メモリ管理ユニット（MMU_8B）',
    scene: 'ark5_station',
    storyBgm: 'crisis',
    widget: 'data_bus',
    mode: 'combinational',
    incidentBrief: {
      where: 'ホライズン電算司令室・メモリ保護防壁盤',
      trouble: '太陽フレアの磁気嵐で ARK-5 の受信バイナリにビット化けが発生する恐れがある！ 外部プログラムが自分の割り当て区画を飛び出してカーネルRAMや 0xF0(CRT/機器) を破壊するのを、1クロックも許さず物理遮断せよ！',
      condition: 'K_MODE=1(OS)は PA=VA, FAULT=0。K_MODE=0(ユーザー)は PA=BASE+VA へ翻訳し、EN=1 のとき「VA >= LIMIT」または「BASE+VA の8bit桁あふれ(COUT)」なら FAULT=1！ また PA が 0xF0〜0xFF(かつEN=1) なら MMIO_EN=1 を出力せよ！',
      shortRule: 'CMP_8B(VA>=LIMIT) | ADD_8B(BASE+VA).COUT で境界違反と折り返し攻撃を同時検出し、MEM_BUS8 で MMIO_EN を判定！',
      stakes: '第3章の ADD_8B と ALU_8B を結集し、本物のOSが持つ仮想番地翻訳とメモリ隔離保護を完成させる',
    },
    inputs: ['VA[7:0]', 'BASE[7:0]', 'LIMIT[7:0]', 'K_MODE', 'EN'],
    outputs: ['PA[7:0]', 'FAULT', 'MMIO_EN'],
    pinHelp: {
      inputs: [
        'VA[7:0]: CPUが出した仮想番地（ユーザーアプリは 0番地からの相対番地）',
        'BASE[7:0]: ユーザーに与えた物理RAM砂場の開始番地（例：0x40=64）',
        'LIMIT[7:0]: ユーザーに許可する砂場のサイズ上限（例：0x20=32 → 0..31のみ許可）',
        'K_MODE: 1=カーネル特権（PA=VA直通・FAULTなし）／ 0=ユーザー隔離モード',
        'EN: メモリアクセス命令のとき 1（LDI/ADD等の非メモリ命令では 0 で誤爆防止）',
      ],
      outputs: [
        'PA[7:0]: 変換後の物理番地（K=1なら VA、K=0なら BASE+VA）',
        'FAULT: 保護違反フラグ（EN=1 かつ K=0 かつ [VA>=LIMIT または 8bit桁溢れ] で 1！）',
        'MMIO_EN: EN=1 かつ 物理番地 PA が 0xF0〜0xFF のとき 1',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH123_CHIPS, 'MEM_BUS8', 'MMIO_DEC', 'STACK_PTR', 'CMP_8B', 'TMR_IRQ'],
    plainGoal: 'ユーザー番地を PA=BASE+VA へ翻訳しつつ、上限超過（VA>=LIMIT）と8ビット折り返し攻撃（COUT）を同時に見抜く【MMU_8B】を組もう！',
    beginnerNote:
      'すごいセキュリティ設計！ もし悪意あるコードが BASE=232 のときに VA=32(<LIMIT=64) を指定すると、232+32=264 が8bit折り返しで 8番地（カーネル領域！）へ回り込んでしまいます。ADD_8B.COUT も OR して FAULT に含めることで、折り返し攻撃まで100%防げます！',
    introDialogue: [
      {
        speaker: 'ren',
        showIncident: true,
        text: '『……警告！！ こっちの上空で強いオーロラ磁気嵐が発生してる！ 私が送っているバイナリの一部が、送信途中でビット化けして暴走命令や 0xF0 直書きに化けるかもしれない！ 絶対にそのまま生身で実行しないで！！』',
      },
      {
        speaker: 'kai',
        text: '危ねえところだったな……！ もし化けたコードがカーネルの番地や発電ポートへ突っ込んだら一発アウトだ。外部のプログラムを「安全な砂場」に閉じ込めて動かす方法はないのか！？',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'Base/Limit MMU の物理防衛（動く図解）',
          title: '🛡 K=0: PA = BASE + VA ／ VA>=LIMIT または COUT=1 ➔ 即 FAULT=1！',
          anim: 'goal_mmu_8b',
          rule: 'ADD_8B で番地をずらし、CMP_8B で上限監視、ADD.COUT で折り返し攻撃も遮断！ MEM_BUS8 で MMIO_EN も検知！',
          accent: '#56ccf2',
        },
        text: 'あるとも──OS最大の盾【Base/Limit MMU（メモリ管理ユニット）】だ！ ユーザーアプリには「0番地からの仮想番地 VA」だけを見せ、ハードウェアが自動で BASE を足して物理番地 PA へ翻訳する。上限 LIMIT を1バイトでも超えるか、8ビット桁あふれで回り込もうとした瞬間、1クロックも許さず【FAULT=1】を叩きつけるぞ！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'うわぁ……！！ ユーザーモードで 0x40〜0x5F の中（VA=5 → PA=69）はスッと通るのに、VA=32(上限) も、0xF0(CRT直書き攻撃) も、さらに8ビット折り返し攻撃まで全部一発で FAULT=1 が光って弾き返したよ！！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：Base/Limit メモリ管理ユニット',
          title: '🛡 MMU_8B（821 NAND＝MOSFET 1,642個）完成！',
          anim: 'mmu_8b',
          rule: 'ACT X 全6ステージ制覇！ 次なる ACT XI では特権リング・割込ベクタ・16命令CPU【ARK8_OS_HW】を完成させる！',
          accent: '#56ccf2',
        },
        text: '見事だ主任！ これで ACT X（統一バス・MMIO・スタック・比較器・タイマー・MMU）がすべて揃った！ さあ最終幕 ACT XI──特権モード保護とOS対応CPU【ARK8_OS_HW】の覚醒へ進もう！',
      },
    ],
    hints: [
      '【翻訳とPA】ADD_8B(A=BASE, B=VA, CIN=アース0) で BASE+VA と COUT を計算。MUX4_8B(D0=ADD.S, D1=VA, S0=K_MODE, S1=アース0) → PA[7:0]！',
      '【違反FAULT】CMP_8B(A=VA, B=LIMIT).GE と ADD_8B.COUT を OR して「範囲外 OOB」。これを NOT(K_MODE) と AND し、さらに EN と AND して FAULT へ！',
      '【MMIO_EN】MEM_BUS8(PC=PA, DA=アース0, DSEL=0, BOOT=0, WE=0) の MMIO_EN 出力を EN と AND すれば MMIO_EN 完成！（計10チップ・821 NAND）',
    ],
    tests: [
      { label: 'カーネル直通RAM (K=1, VA=16 → PA=16, FAULT=0)', busInput: [16, 64, 32, 1, 1], busExpected: [16, 0, 0] },
      { label: 'カーネルMMIO許可 (K=1, VA=0xF0 → PA=240, MMIO_EN=1)', busInput: [240, 64, 32, 1, 1], busExpected: [240, 0, 1] },
      { label: 'ユーザー砂場内 (K=0, VA=5, BASE=64, LIM=32 → PA=69, OK!)', busInput: [5, 64, 32, 0, 1], busExpected: [69, 0, 0] },
      { label: 'ユーザー上限超過 (K=0, VA=32 == LIM=32 → FAULT=1!)', busInput: [32, 64, 32, 0, 1], busExpected: [96, 1, 0] },
      { label: 'ユーザー0xF0攻撃 (K=0, VA=240 → FAULT=1遮断!)', busInput: [240, 64, 32, 0, 1], busExpected: [48, 1, 0] },
      { label: '8bit折り返し攻撃 (BASE=232+VA=32=264→8, VA<64でもFAULT=1!)', busInput: [32, 232, 64, 0, 1], busExpected: [8, 1, 0] },
      { label: '非メモリ命令 (EN=0ならFAULT=0, MMIO_EN=0)', busInput: [240, 64, 32, 0, 0], busExpected: [48, 0, 0] },
    ],
    rewardChip: {
      id: 'MMU_8B',
      name: 'MMU_8B',
      shortName: 'MMU',
      titleJa: 'Base/Limit メモリ管理ユニット',
      descJa: 'K_MODEに応じてPA=BASE+VA翻訳を行い、上限超過と8bit折り返し攻撃を即座にFAULT検知するMMU。',
      color: '#1c6385',
      accent: '#56ccf2',
    },
    codexUnlock: ['mmu_os_ready_hw'],
  },

  // =========================================================================
  // ACT XI — PRIVILEGE RINGS, IRQ VECTORS, 16-OP CPU & OS GUARD (49–54)
  // =========================================================================
  {
    id: 'stage_49',
    number: 49,
    act: 11,
    chapter: 4,
    code: '49',
    busMode: false,
    title: '王冠の番人・特権リング制御器',
    revealedTitle: '特権モード＆トラップ制御器（PRIV_CTRL）',
    scene: 'ark5_station',
    storyBgm: 'crisis',
    widget: 'data_bus',
    mode: 'sequential',
    hasClock: true,
    incidentBrief: {
      where: 'ホライズン電算司令室・特権保護コア盤',
      trouble: 'MMU_8B を作っても、ユーザーアプリが HALT でCPUを止めたり、0xF4(BASE/LIMIT) や 0xF0(CRT) を直接書き換えたりできたら砂場は無意味になる！ 特権状態 K_MODE(1=OS / 0=User) を物理フリップフロップで厳格に管理せよ！',
      condition: 'D_FF で K_MODE を記憶（RST/TRAP→1、K=1かつIRET=1→0）。K=0で PRIV_OP または MMIO_EN が来たら FAULT=1、K=0かつIRQ=1で IRQ_EFF=1。TRAP=FAULT|SYSCALL|IRQ_EFF、そして不正書込を止める SAFE=NOT(TRAP) を出力せよ！',
      shortRule: 'D_FF 1個と論理ゲートだけで、特権昇格・降格・IRQマスク・SAFE書込遮断を司る46 NAND の司令塔を組め！',
      stakes: '現代OSの Ring 0 / Ring 3 権限分離と「違反した拍の書込ゼロ」を物理法則として焼き込む',
    },
    inputs: ['PRIV_OP', 'MMIO_EN', 'IRET', 'IRQ', 'SYSCALL', 'MMU_FAULT', 'RST', 'CLK'],
    outputs: ['K_MODE', 'IRQ_EFF', 'FAULT', 'TRAP', 'SAFE'],
    pinHelp: {
      inputs: [
        'PRIV_OP: 特権命令（HALT または IRET）実行中のとき 1',
        'MMIO_EN: MMIO領域（0xF0〜0xFF）へのアクセス要求のとき 1',
        'IRET: IRET（カーネルからユーザーへ復帰）命令のとき 1',
        'IRQ: タイマー TMR_IRQ からの割り込み要求',
        'SYSCALL: SYSCALL（OSへの正規サービス依頼）命令のとき 1',
        'MMU_FAULT: MMU_8B からの境界違反フラグ',
        'RST / CLK: カーネル復帰リセット（K←1）と クロック',
      ],
      outputs: [
        'K_MODE: 現在の権限（1=カーネル特権 ／ 0=ユーザー隔離）',
        'IRQ_EFF: 実効割込（IRQ=1 かつ K_MODE=0 のときだけ 1！カーネル中は自動マスク）',
        'FAULT: 保護違反（MMU_FAULT または [K=0 かつ (PRIV_OP | MMIO_EN)]）',
        'TRAP: OS介入要求（FAULT | SYSCALL | IRQ_EFF）',
        'SAFE: 書込安全ゲート（NOT(TRAP)。TRAP発生拍は 0 に落ちてRAM/レジスタ書込を物理遮断！）',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH123_CHIPS, 'MEM_BUS8', 'MMIO_DEC', 'STACK_PTR', 'CMP_8B', 'TMR_IRQ', 'MMU_8B'],
    plainGoal: 'D_FF 1個で特権モード K_MODE を守り、不正な特権命令・MMIO侵入・MMU違反を即座に TRAP=1 ＆ SAFE=0 で遮断する【PRIV_CTRL】を完成させよう！',
    beginnerNote:
      'ポイントはたった3本の数式！① PRIV_FAULT = NOT(K) & (PRIV_OP | MMIO_EN)、IRQ_EFF = IRQ & NOT(K)。② FAULT = MMU_FAULT | PRIV_FAULT、TRAP = FAULT | SYSCALL | IRQ_EFF、SAFE = NOT(TRAP)。③ 次のK ＝ (RST | TRAP) | (K & NOT(IRET)) → D_FF！',
    introDialogue: [
      {
        speaker: 'hako',
        showIncident: true,
        text: '『なあ主任、さっきの MMU_8B には決定的な穴が1つ残ってるぞ！ 「K_MODE のスイッチ自体」を誰が握ってるんだ？ もしユーザーアプリが勝手に HALT したり 0xF0 の CRT や MMU_BASE をいじれたら、砂場の柵ごとぶち壊されちまうぜ！』',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'Ring 0 (Kernel) vs Ring 3 (User) の物理法則（動く図解）',
          title: '👑 K=1→0 は IRET のみ！ 違反・SYSCALL・IRQ で SAFE=0 遮断＆即 K←1！',
          anim: 'goal_priv_ctrl',
          rule: 'たった1個の D_FF がOSの王冠を守る！ TRAP=1 の拍は SAFE=0 にしてメモリ書込を物理キャンセル！',
          accent: '#ff8cb0',
        },
        text: 'その通り！ だからこそ現代のあらゆるCPUには「1ビットの特権状態【K_MODE】」を物理フリップフロップで守る【PRIV_CTRL】が入っているんだ。ユーザーは自分では K=1 になれない──なれるのは公式窓口【SYSCALL】、タイマー【IRQ】、あるいは違反【FAULT】で強制的にOSのコードへ飛ばされる瞬間だけだ！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'ren',
        text: '『すごい……たった 46個の NAND と 1個の D_FF だけで、ユーザー権限の暴走も MMIO 侵入も 0クロック遅延で SAFE=0 へ落としてカーネルへ強制昇格させてる！ これぞ本物の特権保護リングだよ！！』',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：特権モード＆トラップ制御器',
          title: '👑 PRIV_CTRL（46 NAND＝MOSFET 92個）完成！',
          anim: 'priv_ctrl',
          rule: '特権の盾が完成！ 次は TRAP が起きた瞬間に「どこへ飛び、どこへ戻るか」を司る【IRQ_VEC】だ！',
          accent: '#ff8cb0',
        },
        text: 'よし！ 特権フラグと安全ゲート SAFE は完璧だ。次は TRAP が鳴った瞬間に復帰番地を【EPC】へ退避し、原因別ベクタ（0x04 / 0x08 / 0x0C）へ跳躍する司令塔【IRQ_VEC】を組もう！',
      },
    ],
    hints: [
      '【違反と実効IRQ】D_FF.Q(=K_MODE) を NOT して NK(=!K) を作る。OR(PRIV_OP, MMIO_EN) と NK の AND が PRIV_FAULT。IRQ と NK の AND が IRQ_EFF！',
      '【FAULT・TRAP・SAFE】OR(MMU_FAULT, PRIV_FAULT)→FAULT。OR(IRQ_EFF, SYSCALL) と FAULT を OR→TRAP。NOT(TRAP)→SAFE！',
      '【次のK_MODE】OR(RST, TRAP) を昇格線、AND(K_MODE, NOT(IRET)) を保持線にし、2つを OR して D_FF.D へ（D_FF.CLK=CLK）！（計13チップ・46 NAND）',
    ],
    tests: [
      privStep('① RST起動 (RST=1 → K=1カーネル, SAFE=1)', 0, 0, 0, 0, 0, 0, 1, [1, 0, 0, 0, 1]),
      privStep('② カーネルMMIO＆IRQマスク (K=1ならMMIO許可・IRQ無視!)', 0, 1, 0, 1, 0, 0, 0, [1, 0, 0, 0, 1], { clock: false }),
      privStep('③ IRETでユーザー降格 (K: 1→0)', 0, 0, 1, 0, 0, 0, 0, [0, 0, 0, 0, 1]),
      privStep('④ ユーザーMMIO侵入検知! (CLK=0: FAULT=1, TRAP=1, SAFE=0遮断!)', 0, 1, 0, 0, 0, 0, 0, [0, 0, 1, 1, 0], { clock: false }),
      privStep('⑤ MMIO違反トラップでカーネル昇格! (K: 0→1)', 0, 1, 0, 0, 0, 0, 0, [1, 0, 0, 0, 1]),
      privStep('⑥ IRETで再びユーザーへ降格 (K: 1→0)', 0, 0, 1, 0, 0, 0, 0, [0, 0, 0, 0, 1]),
      privStep('⑦ タイマーIRQ発火検知! (CLK=0: IRQ_EFF=1, TRAP=1, SAFE=0)', 0, 0, 0, 1, 0, 0, 0, [0, 1, 0, 1, 0], { clock: false }),
      privStep('⑧ タイマーIRQでカーネル昇格! (K: 0→1)', 0, 0, 0, 1, 0, 0, 0, [1, 0, 0, 0, 1]),
      privStep('⑨ IRETでユーザーへ → SYSCALL検知! (CLK=0: TRAP=1, SAFE=0)', 0, 0, 1, 0, 0, 0, 0, [0, 0, 0, 0, 1]),
      privStep('⑩ ユーザーSYSCALL要求 (CLK=0: FAULT=0, TRAP=1, SAFE=0)', 0, 0, 0, 0, 1, 0, 0, [0, 0, 0, 1, 0], { clock: false }),
      privStep('⑪ ユーザー特権命令(HALT等)阻止! (CLK=0: FAULT=1, TRAP=1, SAFE=0)', 1, 0, 0, 0, 0, 0, 0, [0, 0, 1, 1, 0], { clock: false }),
    ],
    rewardChip: {
      id: 'PRIV_CTRL',
      name: 'PRIV_CTRL',
      shortName: 'PRV',
      titleJa: '特権モード＆トラップ制御器',
      descJa: 'D_FF 1個でK/U特権モードを管理し、違反・SYSCALL・IRQを検知してSAFE=0で不正書込を遮断する保護回路。',
      color: '#8f3454',
      accent: '#ff8cb0',
    },
    codexUnlock: ['timer_irq_privilege'],
  },

  {
    id: 'stage_50',
    number: 50,
    act: 11,
    chapter: 4,
    code: '50',
    busMode: true,
    title: '緊急跳躍としおり・割込ベクタ＆EPC',
    revealedTitle: '割込ベクタ＆EPCシーケンサ（IRQ_VEC）',
    scene: 'ark5_station',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'sequential',
    hasClock: true,
    incidentBrief: {
      where: 'ホライズン電算司令室・例外制御シーケンサ盤',
      trouble: 'TRAP が鳴ったら、原因に応じてOSの正しい受付窓口（0x04 IRQ / 0x08 SYSCALL / 0x0C FAULT）へ即座に飛び、しかも処理終了後に元のアプリへ戻れるよう復帰番地 EPC を退避せねばならない！',
      condition: 'FLOW=[BR,CALL,RET,HALT] と3種トラップを統括！ 優先度 FAULT(12) > SYSCALL(8) > IRQ(4) でPCを飛ばし、SYSCALL時は PC+1、IRQ/FAULT時は PC を EPC へ退避。CALL→IMM、RET→RDATA、IRET→EPC へ跳躍し、PC1=PC+1 も出力せよ！',
      shortRule: 'PC_8B・ASM_ENC(優先度エンコーダ)・ADD_8B(PC+1)・REG_8B(EPC)・MUX4_8B で全制御フローを統合！',
      stakes: '通常分岐・サブルーチン・割り込み・システムコール・保護違反のすべてを1基のシーケンサで完全統制する',
    },
    inputs: ['V[7:0]', 'IMM[7:0]', 'RDATA[7:0]', 'FLOW[3:0]', 'IRQ', 'SYSCALL', 'FAULT', 'IRET', 'RST', 'CLK'],
    outputs: ['PC[7:0]', 'EPC[7:0]', 'PC1[7:0]'],
    pinHelp: {
      inputs: [
        'V[7:0]: JNZ 分岐判定用のレジスタ値',
        'IMM[7:0]: JNZ / CALL の飛び先番地',
        'RDATA[7:0]: RET 時にスタックから読み出した戻り番地',
        'FLOW[3:0]: 4ビット制御束線 [bit0=BR(JNZ), bit1=CALL, bit2=RET, bit3=HALT]',
        'IRQ / SYSCALL / FAULT: 3大トラップ信号（優先度 FAULT > SYSCALL > IRQ）',
        'IRET: EPC 番地へ復帰する特権復帰信号',
        'RST / CLK: 0番地リセット と クロック',
      ],
      outputs: [
        'PC[7:0]: 現在の命令番地',
        'EPC[7:0]: 退避された例外復帰番地（SYSCALLはPC+1、IRQ/FAULTはPC）',
        'PC1[7:0]: PC + 1（CALL 時にスタックへ積む戻り番地としても出力！）',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH123_CHIPS, 'MEM_BUS8', 'MMIO_DEC', 'STACK_PTR', 'CMP_8B', 'TMR_IRQ', 'MMU_8B', 'PRIV_CTRL'],
    plainGoal: '既存の PC_8B・ASM_ENC・ADD_8B・REG_8B を束ね、CALL/RET・IRET・3種優先度ベクタ（0x04/0x08/0x0C）と EPC 退避をこなす【IRQ_VEC】を完成させよう！',
    beginnerNote:
      '第2章の ASM_ENC が大活躍！ 入力に (0, IRQ & !SYSCALL, SYSCALL, FAULT) を入れると、出力 (I1, I0) がそのまま 01(IRQ) / 10(SYS) / 11(FAULT) になり、2bit左シフト（JOIN4(0,0,I0,I1)→JOIN8）するだけで 4(0x04) / 8(0x08) / 12(0x0C) のベクタ番地が自動生成されます！ しかも ASM_ENC.KEY が「いずれかのTRAP発生」そのもの！',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: 'PRIV_CTRL が違反やタイマーを検知してカーネルモードへ切り替えてくれても、そのあと CPU は一体どの番地へ飛べばいいの？ それに、SYSCALL が終わったあと元のアプリの続きへ戻るには、元の場所をどこに覚えておくの？',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '3大トラップベクタ ＆ EPC 復帰しおり（動く図解）',
          title: '🧭 0x04=IRQ / 0x08=SYSCALL / 0x0C=FAULT ＆ 1基の MUX4_8B で全跳躍！',
          anim: 'goal_irq_vec',
          rule: '優先度 FAULT(12) > SYSCALL(8) > IRQ(4)！ SYSCALL は次命令 PC+1、IRQ/FAULT は現在命令 PC を EPC へ退避！',
          accent: '#7ee8ff',
        },
        text: '素晴らしい質問だ！ トラップ原因ごとに決まった入口番地──【0x04=タイマーIRQ】【0x08=SYSCALL】【0x0C=FAULT】へ跳躍し、同時に元の番地を専用レジスタ【EPC】へしおりとして挟んでおくんだ！ しかも第2章の【ASM_ENC】と第3章の【PC_8B】をそのまま再利用できるぞ！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'hako',
        text: '『CALL 20 → RET → SYSCALL(0x08＆EPC=PC+1) → IRET復帰 → IRQ(0x04＆EPC=PC) → FAULT優先(0x0C) ──全シーケンス完璧に通過！！ 第2章の ASM_ENC がそのままハードウェア割込ベクタ生成器になるなんて、鳥肌が立つ設計だぜ！』',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：割込ベクタ＆EPCシーケンサ',
          title: '🧭 IRQ_VEC（1,694 NAND＝MOSFET 3,388個）完成！',
          anim: 'irq_vec',
          rule: '残るハードウェアはあと2つ！ 16命令フルISAデコーダ【INST_DEC16】と、統合CPU【ARK8_OS_HW】だ！',
          accent: '#7ee8ff',
        },
        text: 'さあ、いよいよ第3章で未来のために空けておいた命令コード最上位ビット【OP3】の封印を解くときが来たぞ！',
      },
    ],
    hints: [
      '【ベクタ生成】ASM_ENC に (アース0, AND(IRQ, NOT(SYSCALL)), SYSCALL, FAULT) を接続！ 出力 I0,I1 を JOIN4(0,0,I0,I1)→JOIN8(L,0) にすると 0x04/0x08/0x0C ベクタ完成！ ASM_ENC.KEY が TRAP 検知線！',
      '【PC+1とEPC】ADD_8B(PC, 0, でんち1)→PC1。MUX4_8B(D0=PC, D1=PC1, S0=SYSCALL, S1=0)→EPC(REG_8B, LOAD=ASM_ENC.KEY, RST=RST, CLK=CLK)！',
      '【PC_8B統合】FLOW→SPLIT4(0=BR,1=CALL,2=RET,3=HALT)。S0=OR(TRAP,RET)、S1=OR(TRAP,IRET) で飛び先 MUX4_8B(00=IMM, 01=RDATA, 10=EPC, 11=VEC)→PC_8B.J！ 強制ジャンプ線 FORCED=OR(S1, OR(CALL, RET)) で V_MUX(0=V, 1=でんち1, S0=FORCED)→PC_8B.V、OR(BR, FORCED)→PC_8B.BR、HALT→PC_8B.HALT！',
    ],
    tests: [
      irqVecCycle('① RST初期化 → PC=0, EPC=0, PC1=1', 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1),
      irqVecCycle('② 通常 +1 進行 → PC=1, PC1=2', 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2),
      irqVecCycle('③ CALL 20 (FLOW=0010=2) → PC=20, PC1=21', 0, 20, 0, 2, 0, 0, 0, 0, 0, 20, 0, 21),
      irqVecCycle('④ RET (RDATA=2, FLOW=0100=4) → PC=2復帰!', 0, 0, 2, 4, 0, 0, 0, 0, 0, 2, 0, 3),
      irqVecCycle('⑤ SYSCALL (PC=2 → 0x08へ跳躍, EPC=PC+1=3保存!)', 0, 0, 0, 0, 0, 1, 0, 0, 0, 8, 3, 9),
      irqVecCycle('⑥ IRET復帰 (EPC=3 へ帰還!)', 0, 0, 0, 0, 0, 0, 0, 1, 0, 3, 3, 4),
      irqVecCycle('⑦ タイマーIRQ (PC=3 → 0x04へ跳躍, EPC=PC=3保存!)', 0, 0, 0, 0, 1, 0, 0, 0, 0, 4, 3, 5),
      irqVecCycle('⑧ 同時発火優先度 (FAULT&IRQ → 0x0C優先, EPC=4!)', 0, 0, 0, 0, 1, 0, 1, 0, 0, 12, 4, 13),
    ],
    rewardChip: {
      id: 'IRQ_VEC',
      name: 'IRQ_VEC',
      shortName: 'IVC',
      titleJa: '割込ベクタ＆EPCシーケンサ',
      descJa: 'JNZ・CALL/RET・IRETと3種優先度トラップ(0x04/0x08/0x0C)およびEPC退避を統括する制御シーケンサ。',
      color: '#1b6d7c',
      accent: '#7ee8ff',
    },
    codexUnlock: ['timer_irq_privilege'],
  },

  {
    id: 'stage_51',
    number: 51,
    act: 11,
    chapter: 4,
    code: '51',
    busMode: true,
    title: '封印された最上位ビット・16命令デコーダ',
    revealedTitle: '16命令フルISAデコーダ（INST_DEC16）',
    scene: 'ark5_station',
    storyBgm: 'story',
    widget: 'data_bus',
    mode: 'combinational',
    incidentBrief: {
      where: 'ホライズン電算司令室・命令解読マトリクス盤',
      trouble: '第3章で空けておいた4ビット命令コードの最上位 OP3=1 をついに解放する！ 既存の8命令（0..7）を1ビットも壊さず、POP・RET・PUSH・CALL・LDR・STR・SYSCALL・IRET の拡張8命令（8..15）を追加解読せよ！',
      condition: 'OP[3:0] (0〜15) から CORE[SUB,ALU_B,WD0,BR]、MEM[WD1,REG_WE,MEM_WE,MEM_OP]、STK[DA0(IND),DA1(STK),SP0(PUSH),SP1(POP)]、および CALL, RET, SYS, IRET, HALT, PRIV の全制御線を生成せよ！',
      shortRule: 'OP3=0は第3章の INST_DEC8 をそのまま使い、OP3=1 は DEC2_4(OP1,OP2) でスタック・間接参照・SYSCALL/IRET を解読せよ！',
      stakes: '8命令からOS対応フル16命令（ARK-8 OS ISA）へ完全進化させる',
    },
    inputs: ['OP[3:0]'],
    outputs: ['CORE[3:0]', 'MEM[3:0]', 'STK[3:0]', 'CALL', 'RET', 'SYS', 'IRET', 'HALT', 'PRIV'],
    pinHelp: {
      inputs: ['OP[3:0]: 4ビット機械語（0..7=第3章8命令 ／ 8..15=POP,RET,PUSH,CALL,LDR,STR,SYSCALL,IRET）'],
      outputs: [
        'CORE[3:0]: [bit0=SUB, bit1=ALU_B, bit2=WD0, bit3=BR]（OP3=1時は全て0）',
        'MEM[3:0]: [bit0=WD1(読出書戻), bit1=REG_WE, bit2=MEM_WE, bit3=MEM_OP(MMU有効)]',
        'STK[3:0]: [bit0=DA0(間接Rs), bit1=DA1(スタックEA), bit2=SP0(PUSH), bit3=SP1(POP)]',
        'CALL / RET / SYS / IRET / HALT: 各特殊制御命令フラグ',
        'PRIV: 特権命令フラグ（0111 HALT と 1111 IRET の両方で 1！）',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [...CH123_CHIPS, 'MEM_BUS8', 'MMIO_DEC', 'STACK_PTR', 'CMP_8B', 'TMR_IRQ', 'MMU_8B', 'PRIV_CTRL', 'IRQ_VEC'],
    plainGoal: '第3章の INST_DEC8 と DEC2_4 を組み合わせ、全16命令（LDI〜IRET）の制御信号を生み出す【INST_DEC16】を完成させよう！',
    beginnerNote:
      '驚異のビット整列設計！ OP[2:0] をそのまま INST_DEC8 へ繋ぐと、下位3bitが一致する「12 LDR ↔ 4 LOAD」「13 STR ↔ 5 STOR」「14 SYSCALL ↔ 6 ADDI」「15 IRET ↔ 7 HALT」のデコード線がそのまま流用でき、PRIV に至っては INST_DEC8.HALT を直結するだけ（0 NAND追加！）で HALT と IRET の両方を捕捉します！',
    introDialogue: [
      {
        speaker: 'kai',
        showIncident: true,
        text: 'おおっ、いよいよ命令を 8個からフル 16個へ増やす番か！ POP・RET・PUSH・CALL・LDR・STR・SYSCALL・IRET……これ、第3章の INST_DEC8 は作り直しになるのか？',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '美しすぎる16命令ビット整列（動く図解）',
          title: '🗣 OP3=0 は INST_DEC8 そのまま！ OP3=1 で OS拡張8命令を一挙解放！',
          anim: 'goal_inst_dec16',
          rule: '8=POP, 9=RET, 10=PUSH, 11=CALL, 12=LDR, 13=STR, 14=SYSCALL, 15=IRET！ PRIV=INST_DEC8.HALT 直結！',
          accent: '#ffd166',
        },
        text: '1ミリも捨てないさ！ 既存の【INST_DEC8】へ下位3ビットをそのまま繋ぎ、さらに上位2ビット（OP1, OP2）を【DEC2_4】へ入れて OP3 と掛け合わせるだけで──全16命令がわずか 113 NAND で鮮やかに解読できるんだ！ 仕様表（📋仕様）を見ながら組み上げよう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '0番 LDI から 15番 IRET まで、全16命令すべてオールグリーン！！ HALT(0111) と IRET(1111) の両方がちゃんと PRIV=1 に光る仕組み、パズルみたいにピタッと噛み合ってるね！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：16命令フルISAデコーダ',
          title: '🗣 INST_DEC16（113 NAND＝MOSFET 226個）完成！',
          anim: 'inst_dec16',
          rule: '全パーツが司令室の作業台へ揃った！ 次はついにOS対応完全体CPU【ARK8_OS_HW】の統合だ！',
          accent: '#ffd166',
        },
        text: 'さあ最高主任技師──すべてのハードウェア部品が揃った。次のステージで、12,588個の自家製 MOSFET が一体となるOS対応CPU【ARK8_OS_HW】を誕生させるぞ！',
      },
    ],
    hints: [
      '【下位＆上位デコード】OP[3:0]→SPLIT4(0..3)。0,1,2→INST_DEC8(d8)。1,2→DEC2_4(dec)。SP1=AND(OP3, dec.Y0)（8,9 POP/RET）、SP0=AND(OP3, dec.Y1)（10,11 PUSH/CALL）、STK=OR(SP0, SP1)、IND=AND(OP3, dec.Y2)（12,13 LDR/STR）！',
      '【MEM束線】POP=AND(OP3, d8.WD0)。WD1=OR(d8.WD1, POP)。REG_WE=MUX(D0=d8.REG_WE, D1=WD1, SEL=OP3)。MEM_WE=OR(d8.MEM_WE, SP0)。MEM_OP=OR(dec.Y2, STK)！ 4本を JOIN4→MEM！',
      '【CORE・STK・特殊線】CORE=MUX_4B(JOIN4(d8.SUB,d8.ALU_B,d8.WD0,d8.BR), アース0, OP3)。STK=JOIN4(IND, STK, SP0, SP1)。CALL=AND(SP0,OP0)、RET=AND(SP1,OP0)、SYS=AND(OP3,d8.ALU_B)、IRET=AND(OP3,d8.HALT)、HALT=AND(NOT(OP3),d8.HALT)、PRIV=d8.HALT直結！',
    ],
    tests: [
      instDec16Case(0, 'LDI',     4,  2,  0, 0, 0, 0, 0, 0, 0),
      instDec16Case(1, 'ADD',     0,  2,  0, 0, 0, 0, 0, 0, 0),
      instDec16Case(2, 'SUB',     1,  2,  0, 0, 0, 0, 0, 0, 0),
      instDec16Case(3, 'JNZ',     8,  0,  0, 0, 0, 0, 0, 0, 0),
      instDec16Case(4, 'LOAD',    0, 11,  0, 0, 0, 0, 0, 0, 0),
      instDec16Case(5, 'STOR',    0, 12,  0, 0, 0, 0, 0, 0, 0),
      instDec16Case(6, 'ADDI',    2,  2,  0, 0, 0, 0, 0, 0, 0),
      instDec16Case(7, 'HALT',    0,  0,  0, 0, 0, 0, 0, 1, 1),
      instDec16Case(8, 'POP',     0, 11, 10, 0, 0, 0, 0, 0, 0),
      instDec16Case(9, 'RET',     0,  8, 10, 0, 1, 0, 0, 0, 0),
      instDec16Case(10, 'PUSH',   0, 12,  6, 0, 0, 0, 0, 0, 0),
      instDec16Case(11, 'CALL',   0, 12,  6, 1, 0, 0, 0, 0, 0),
      instDec16Case(12, 'LDR',    0, 11,  1, 0, 0, 0, 0, 0, 0),
      instDec16Case(13, 'STR',    0, 12,  1, 0, 0, 0, 0, 0, 0),
      instDec16Case(14, 'SYSCALL',0,  0,  0, 0, 0, 1, 0, 0, 0),
      instDec16Case(15, 'IRET',   0,  0,  0, 0, 0, 0, 1, 0, 1),
    ],
    rewardChip: {
      id: 'INST_DEC16',
      name: 'INST_DEC16',
      shortName: 'D16',
      titleJa: '16命令フルISAデコーダ',
      descJa: 'INST_DEC8を再利用し、スタック・間接参照・SYSCALL・IRETを含む全16命令を解読する拡張デコーダ。',
      color: '#a36b1d',
      accent: '#ffd166',
    },
    codexUnlock: ['mmu_os_ready_hw'],
  },

  {
    id: 'stage_52',
    number: 52,
    act: 11,
    chapter: 4,
    code: '52',
    busMode: true,
    title: 'OS対応CPU『ARK8_OS_HW』完全統合',
    revealedTitle: 'OS対応8ビット完全体CPU（ARK8_OS_HW）',
    scene: 'ark5_station',
    storyBgm: 'finale',
    widget: 'ark8_finale',
    mode: 'sequential',
    hasClock: true,
    incidentBrief: {
      where: 'ホライズン電算司令室・OSメインマザーボード',
      trouble: 'ついに全OSハードウェア部品が揃った！ INST_DEC16・REGFILE_4・ALU_8B・STACK_PTR・MMU_8B・PRIV_CTRL・IRQ_VEC を統合し、SAFE 保護ゲート付きOS対応CPU【ARK8_OS_HW】を起動せよ！',
      condition: '全16命令・スタック・Base/Limit MMU・K/U特権リング・3ベクタ割込が1枚で連動し、REG_WE & SAFE、MEM_WE & SAFE、HALT & K_MODE の3安全門で不正状態変更をゼロに抑え込め！',
      shortRule: '20個の自作モジュールを結線し、6,294 NAND（実機 MOSFET 12,588個）のOS対応CPUを覚醒させよ！',
      stakes: '第5章のOSカーネルも第6章のUNIX『ARK-OS』もそのまま動く、ハードウェア前半の集大成CPUを完成させる',
    },
    inputs: ['OP[3:0]', 'REG[3:0]', 'IMM[7:0]', 'RDATA[7:0]', 'BASE[7:0]', 'LIMIT[7:0]', 'IRQ', 'SP_LD', 'RST', 'CLK'],
    outputs: ['QA[7:0]', 'PA[7:0]', 'WDATA[7:0]', 'PC[7:0]', 'SP[7:0]', 'EPC[7:0]', 'MEM_WE', 'K_MODE', 'TRAP', 'HALT'],
    pinHelp: {
      inputs: [
        'OP[3:0]: 4ビット命令番号（0=LDI 〜 15=IRET）',
        'REG[3:0]: レジスタ指定束線 {RD1, RD0, RS1, RS0}（下位2bit=Rs、上位2bit=Rd）',
        'IMM[7:0]: 8ビット即値／ジャンプ先／直接番地',
        'RDATA[7:0]: 統一メモリ・MMIOから読み出した8ビットデータ',
        'BASE[7:0] / LIMIT[7:0]: カーネルが設定した MMU 砂場の開始番地と上限幅',
        'IRQ / SP_LD: タイマー割込入力 と OS用スタック直接書込許可',
        'RST / CLK: ハードウェア同期リセット と クロック',
      ],
      outputs: [
        'QA[7:0]: Rd レジスタの現在値',
        'PA[7:0]: MMU 翻訳後の物理メモリアドレス',
        'WDATA[7:0]: メモリへ書き込むデータ（STOR/PUSH=QB、STR=QA、CALL=PC+1）',
        'PC[7:0] / SP[7:0] / EPC[7:0]: 命令番地・スタックポインタ・例外復帰番地',
        'MEM_WE / K_MODE / TRAP / HALT: 安全ゲート済メモリ書込・特権状態・トラップ・停止',
      ],
    },
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: [
      ...CH123_CHIPS,
      'MEM_BUS8', 'MMIO_DEC', 'STACK_PTR', 'CMP_8B', 'TMR_IRQ',
      'MMU_8B', 'PRIV_CTRL', 'IRQ_VEC', 'INST_DEC16',
    ],
    plainGoal: '第1章〜第4章で砂から鍛えた全モジュールを結集し、OSが安全に動く完全体CPU【ARK8_OS_HW（6,294 NAND／12,588 MOSFET）】を完成させよう！',
    beginnerNote:
      '黄金の安全門は AND たった3個！① REG_WE & SAFE → REGFILE_4.WE、② MEM_WE & SAFE → 出力 MEM_WE、③ HALT & K_MODE → 出力 HALT ＆ IRQ_VEC！ さらに STACK_PTR.EN にも SAFE を繋ぐことで、トラップ発生拍のメモリ・レジスタ・スタック破壊を物理的にゼロへ封じます！',
    introDialogue: [
      {
        speaker: 'kagari',
        showIncident: true,
        text: '……ついに来たぞ、最高主任技師。砂の1粒から始めたこの旅──ハードウェア前半戦の頂点、OS対応完全体CPU【ARK8_OS_HW】の統合だ！',
      },
      {
        speaker: 'kai',
        visualCard: {
          tag: 'ARK8_OS_HW 完全体アーキテクチャ（動く図解）',
          title: '🖥️ 16命令 ＋ スタック ＋ MMU ＋ 特権リング ＋ 3ベクタ ＝ 12,588 MOSFET！',
          anim: 'goal_ark8_os_hw',
          rule: 'SAFE(!TRAP) で REG_WE・MEM_WE・SP.EN を物理ガード！ HALT は K_MODE=1 専用！',
          accent: '#7ee8ff',
        },
        text: 'INST_DEC16、REGFILE_4、ALU_8B、STACK_PTR、MMU_8B、PRIV_CTRL、IRQ_VEC──全部お前が自分で組んだ本物のシリコンだ！ 3つの SAFE ゲートで鉄壁に固めて、一気に火を入れようぜ！！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'hako',
        text: '『……全10ステップ・オールグリーン！！ 6,294 NAND──実機 MOSFET 12,588個＋プルアップ抵抗 6,294本 が完全同期稼働！！ PUSH/CALL/RET・IRET ユーザー降格・SYSCALL 昇格・そしてユーザーによる 0xF0 不正攻撃の物理遮断（MEM_WE=0, TRAP=1 → 0x0C 連行）まで一分の狂いもなし！！ OS対応完全体CPU【ARK8_OS_HW】、ここに誕生！！』',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：OS対応8ビット完全体CPU',
          title: '🖥️ ARK8_OS_HW（6,294 NAND／MOSFET 12,588個）覚醒！',
          anim: 'ark8_os_hw',
          rule: 'さあ、この18,880 MOSFET マザーボード実機上で、アーク5の電文復号とOSトラップ防衛戦へ挑もう！',
          accent: '#7ee8ff',
        },
        text: '完璧だ……これでもう二度とCPUを作り直す必要はない！ さあ残る最終2ステージ──この完成した実機マザーボード（18,880 MOSFET＋検証済 SRAM_16B 256B統一RAM）で、まず北方アーク5の SOS 電文をエメラルドCRTへ映し出そう！',
      },
    ],
    hints: [
      '【安全門＆レジスタ】INST_DEC16 の CORE/MEM/STK をそれぞれ SPLIT4 へ、REG も SPLIT4(0,1=RS, 2,3=RD)へ！ 安全門 AND×3：REG_WE&SAFE→RF.WE、MEM_WE&SAFE→出力MEM_WE、HALT&K_MODE→出力HALT。RF の WA=RA=RD、RB=RS！',
      '【ALU・書戻し・スタック・MMU】ALU右MUX(QB vs IMM, S0=ALU_B)→ALU_8B。書戻しMUX(00=ALU, 01=IMM, 10=RDATA, S=WD0,WD1)→RF.WD。STACK_PTR(DIN=QB, PUSH=SP0, POP=SP1, LOAD=SP_LD, EN=SAFE)。仮想番地MUX(00=IMM, 01=QB, 10=SP.EA, S=DA0,DA1)→MMU_8B(VA, BASE, LIMIT, K_MODE, EN=MEM_OP)！',
      '【特権・ベクタ・WDATA】PRIV_CTRL(PRIV, MMU.MMIO_EN, IRET, IRQ, SYS, MMU.FAULT, RST, CLK)。IRQ_VEC(V=QA, IMM, RDATA, FLOW=JOIN4(BR,CALL,RET,HALT&K), IRQ_EFF, SYS, FAULT, IRET, RST, CLK)。WDATA_MUX(00=QB, 01=QA, 10=PC1, S0=DA0, S1=CALL)→WDATA！',
    ],
    tests: [
      ark8OsStep('① ハードウェアRST (PC=0, SP=240[0xF0], K=1)', 0, 0, 0, 0, 0, 64, 32, 0, 0, 1, [0, 0, 0, 0, 240, 0, 0, 1, 0, 0]),
      ark8OsStep('② LDI R0, 65 ("A"代入 → QA=65, PC=1)', 0, 0, 0, 65, 0, 64, 32, 0, 0, 0, [65, 0, 65, 1, 240, 0, 0, 1, 0, 0]),
      ark8OsStep('③ PUSH R0 前段確認 (CLK=0: PA=239, WDATA=65, MEM_WE=1)', 10, 0, 0, 0, 0, 64, 32, 0, 0, 0, [65, 239, 65, 1, 240, 0, 1, 1, 0, 0], { clock: false }),
      ark8OsStep('④ PUSH R0 確定 (SP=239, PC=2)', 10, 0, 0, 0, 0, 64, 32, 0, 0, 0, [65, 0, 65, 2, 239, 0, 0, 1, 0, 0]),
      ark8OsStep('⑤ CALL 20 確定 (SP=238, PC=20へ呼出!)', 11, 0, 0, 20, 0, 64, 32, 0, 0, 0, [65, 0, 65, 20, 238, 0, 0, 1, 0, 0]),
      ark8OsStep('⑥ RET 復帰 (RDATA=3 → SP=239, PC=3!)', 9, 0, 0, 0, 3, 64, 32, 0, 0, 0, [65, 0, 65, 3, 239, 0, 0, 1, 0, 0]),
      ark8OsStep('⑦ IRET でユーザー降格 (K:1→0, PC←EPC=0!)', 15, 0, 0, 0, 0, 64, 32, 0, 0, 0, [65, 64, 65, 0, 239, 0, 0, 0, 0, 0]),
      ark8OsStep('⑧ ユーザー LDI R1, 42 (K=0, QA=42, PC=1)', 0, 1, 0, 42, 0, 64, 32, 0, 0, 0, [42, 64, 65, 1, 239, 0, 0, 0, 0, 0]),
      ark8OsStep('⑨ ユーザー SYSCALL → 0x08昇格＆EPC=2保存!', 14, 0, 0, 1, 0, 64, 32, 0, 0, 0, [65, 0, 65, 8, 239, 2, 0, 1, 0, 0]),
      ark8OsStep('⑩ IRET復帰 → ユーザー0xF0攻撃遮断(準備:K←0, PC←2)', 15, 0, 0, 0, 0, 64, 32, 0, 0, 0, [65, 64, 65, 2, 239, 2, 0, 0, 0, 0]),
      ark8OsStep('⑪ ユーザー STOR [0xF0] 攻撃! (CLK=0: MEM_WE=0, TRAP=1物理遮断!)', 5, 0, 1, 240, 0, 64, 32, 0, 0, 0, [65, 48, 42, 2, 239, 2, 0, 0, 1, 0], { clock: false }),
      ark8OsStep('⑫ 攻撃トラップ確定 → 0x0C連行, K=1昇格, EPC=2!', 5, 0, 1, 240, 0, 64, 32, 0, 0, 0, [65, 0, 42, 12, 239, 2, 0, 1, 0, 0]),
      ark8OsStep('⑬ カーネル HALT 停止 (K=1 → HALT=1, PC=12停止!)', 7, 0, 0, 0, 0, 64, 32, 0, 0, 0, [65, 0, 65, 12, 239, 2, 0, 1, 0, 1], { releaseAfter: false }),
    ],
    rewardChip: {
      id: 'ARK8_OS_HW',
      name: 'ARK8_OS_HW',
      shortName: 'A8O',
      titleJa: 'OS対応8ビット完全体CPU',
      descJa: '16命令・スタック・MMU・K/U特権保護・3ベクタ割込を6,294 NAND(12,588 MOSFET)で統合した完全体OS対応CPU。',
      color: '#1b6d7c',
      accent: '#7ee8ff',
    },
    codexUnlock: ['mmu_os_ready_hw'],
  },

  {
    id: 'stage_53',
    number: 53,
    act: 11,
    chapter: 4,
    code: '53',
    kind: 'ark8_os_program',
    title: '文字CRT点灯・北方SOS電文復号',
    revealedTitle: 'ARK-5 文字CRT復号ドライバ（ARK5_CRT）',
    scene: 'ark5_station',
    storyBgm: 'story',
    widget: 'ark8_finale',
    mode: 'physics',
    incidentBrief: {
      where: 'ホライズン電算司令室・エメラルドCRTターミナル',
      trouble: '北方シェルター ARK-5 から届いたASCII電文が統一RAMの 0x60(96番地) から NULL(0) 終端で並んでいる！ CALL/RET サブルーチンと間接読込 LDR で1文字ずつ読み出し、エメラルドCRT（0xF0=240番地）へ映し出せ！',
      condition: 'CALL で表示サブルーチンを呼び出し、LDR R0, [R1] で [0x60] から NULL(0) まで1文字ずつ STOR R0, [240] へ出力して RET → HALT せよ！（別電文「HI,ARK7!」でも動く汎用ループが必要）',
      shortRule: 'LDI R1, 96 → CALL 5 → HALT ／ サブルーチン5番地で LDR R0,[R1] → JNZ R0, 8 → RET → STOR R0,[240] → ADDI R1, 1 → ループ！',
      stakes: '18,880 MOSFET 実機マザーボード上のエメラルドCRTへ、人類復興後初の文字メッセージ「ARK5:SOS」を灯す',
    },
    inputs: ['CLK'],
    outputs: ['CRT'],
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: null,
    asmProgramSpec: {
      arch: 'ark8_os',
      goalTitle: '目標：CALL/RET と LDR [R1] で統一RAM[0x60] の電文を CRT[0xF0] へ汎用復号せよ！（ARK5:SOS ＆ HI,ARK7!）',
      targetCrt: 'ARK5:SOS',
      altCrt: 'HI,ARK7!',
      stringBaseAddr: 0x60,
      maxCycles: 96,
      initialRam: {
        96: 65,  // 'A'
        97: 82,  // 'R'
        98: 75,  // 'K'
        99: 53,  // '5'
        100: 58, // ':'
        101: 83, // 'S'
        102: 79, // 'O'
        103: 83, // 'S'
        104: 0,  // '\0'
      },
      rows: [
        { addr: 0, slotId: 'line_0', label: '0番地（文字列先頭 0x60=96 をポインタ R1 へ）', ideal: 'A8OS_LDI_1_0_96' },
        { addr: 1, slotId: 'line_1', label: '1番地（表示サブルーチン 5番地を CALL）', ideal: 'A8OS_CALL_0_0_5' },
        { addr: 2, slotId: 'line_2', label: '2番地（RET帰還後、カーネル安全停止 HALT）', ideal: 'A8OS_HALT_0_0_0' },
        { addr: 3, slotId: 'line_3', label: '3番地（予備行）', ideal: null },
        { addr: 4, slotId: 'line_4', label: '4番地（予備行）', ideal: null },
        { addr: 5, slotId: 'line_5', label: '5番地（[print] R1の指す1文字を R0 へ LDR）', ideal: 'A8OS_LDR_0_1_0' },
        { addr: 6, slotId: 'line_6', label: '6番地（文字≠0なら 8番地のCRT出力へ JNZ）', ideal: 'A8OS_JNZ_0_0_8' },
        { addr: 7, slotId: 'line_7', label: '7番地（NULL終端=0で呼び出し元へ RET）', ideal: 'A8OS_RET_0_0_0' },
        { addr: 8, slotId: 'line_8', label: '8番地（文字 R0 を CRT[240=0xF0] へ STOR）', ideal: 'A8OS_STOR_0_0_240' },
        { addr: 9, slotId: 'line_9', label: '9番地（ポインタを次の文字へ R1 ← R1 + 1）', ideal: 'A8OS_ADDI_1_0_1' },
        { addr: 10, slotId: 'line_10', label: '10番地（無条件ジャンプ用に R3 ← 1）', ideal: 'A8OS_LDI_3_0_1' },
        { addr: 11, slotId: 'line_11', label: '11番地（5番地ループ先頭へ戻る JNZ R3, 5）', ideal: 'A8OS_JNZ_3_0_5' },
      ],
    },
    plainGoal: 'CALL/RET スタックと間接参照 LDR [R1] を使い、統一RAMの 0x60番地にある NULL終端文字列をエメラルドCRT（240番地）へ映し出す汎用ドライバを書こう！',
    beginnerNote:
      '命令は君の ASM_ENC8＋ASM_ENC でエンコードされ、検証済 SRAM_16B ベースの256B統一RAMへ格納後、18,880個の自作 MOSFET が本物の3相サイクル（FETCH_LO→FETCH_HI→EXEC）で実行します！ CALL で SP が 240→239 へ下がり、RET で 239→240 へ戻る瞬間と、CRTに1文字ずつ浮かぶ光を観察しよう！',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: 'いよいよ完成した【ARK8_OS_HW】実機マザーボードへ火を入れる瞬間だよ！！ アーク5のレンさんから届いたASCII電文が、統一RAMの 0x60(96番地) から並んでいて、終わりには 0（NULL文字）が入ってるんだって！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'CALL/RET ＋ 間接参照 LDR ＋ 文字CRT（動く図解）',
          title: '📺 R1=0x60 → CALL 5 → [LDR R0,[R1] → STOR R0,[0xF0] → R1++] → RET！',
          anim: 'goal_ark5_crt',
          rule: '直書きは別電文「HI,ARK7!」テストで見抜かれるぞ！ 本物のサブルーチン＆ポインタ・ループを組もう！',
          accent: '#52e3b6',
        },
        text: '今回は新命令【CALL】【RET】【LDR Rd, [Rs]】の初陣だ！ 0番地でポインタ R1←96 を用意して 5番地の表示サブルーチンを CALL、サブルーチン内で NULL(0) に当たるまで 1文字ずつ CRT（240=0xF0番地）へ流し込み、終わったら RET で 2番地へ戻って HALT しよう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '……点いた！！ 緑色のモニターに【ARK5:SOS】って、はっきり文字が浮かび上がったよ！！ 2進数のランプじゃなくて、本物の「文字画面」が私たちの自作パソコンで光ってる……！！',
      },
      {
        speaker: 'ren',
        text: '『……届いたんだね！！ よかった……！！ でも急いで聞いて！ 私の次のパケット、磁気嵐で壊れた「ユーザーバイナリ」が混じってる！ 0xF0 への不正直書き攻撃（文字 "X"）を物理防壁で叩き落としながら、正常な SYSCALL とタイマー割り込みだけを捌く3大トラップハンドラを組んで！！』',
      },
    ],
    hints: [
      '【メイン側(0〜2番地)】0: LDI R1, 96（0x60） ／ 1: CALL 5（SPが240→239になり戻り番地2を積む！） ／ 2: HALT！',
      '【サブルーチン(5〜9番地)】5: LDR R0, [R1]（ポインタR1から1文字読込） ／ 6: JNZ R0, 8（0でなければ出力へ） ／ 7: RET（0なら2番地へ帰還！） ／ 8: STOR R0, [240]（CRT[0xF0]へ出力） ／ 9: ADDI R1, 1（次の文字へ）！',
      '【ループ戻り(10〜11番地)】10: LDI R3, 1 ／ 11: JNZ R3, 5 を書けば、別電文「HI,ARK7!」まで完全クリア！',
    ],
    tests: [],
    rewardChip: {
      id: 'ARK8_OS_CRT_PROG',
      name: 'ARK5_CRT',
      color: '#1b6d7c',
      accent: '#7ee8ff',
      description: 'CALL/RET＋LDR間接参照によるエメラルド文字CRT復号ドライバ',
      isLabReward: true,
    },
    codexUnlock: ['hardware_stack_call', 'mmio_peripherals'],
  },

  {
    id: 'stage_54',
    number: 54,
    act: 11,
    chapter: 4,
    code: '54',
    kind: 'ark8_os_program',
    isChapter4Finale: true,
    title: '三種の防壁・OSトラップ防衛戦',
    revealedTitle: 'OS保護トラップハンドラ（GUARD_TRAP）',
    scene: 'ark5_station',
    storyBgm: 'finale',
    widget: 'ark8_finale',
    mode: 'physics',
    incidentBrief: {
      where: 'ホライズン電算司令室・OS特権保護コンソール',
      trouble: '磁気嵐で破損した北方バイナリがユーザー砂場（BASE=0x40, LIMIT=0x20）に装填された！ 2回の正常な SYSCALL("A", "5") の直後に、不正な 0xF0 直書き攻撃("X") を仕掛けてくる！',
      condition: '固定Boot(0〜3)とInit(16〜19)が砂場と周期4タイマーを起動してユーザーへ降格する。3つのOSトラップ窓口【0x04 IRQ】【0x08 SYSCALL】【0x0C FAULT】を実装し、攻撃「X」を1文字も漏らさず物理遮断して「A5!」を表示＆安全停止せよ！',
      shortRule: '4: ADDI R3,1→IRET ／ 8: STOR R1,[240]→ADDI R2,1→IRET ／ 12: LDI R0,33("!")→STOR R0,[240]→HALT！',
      stakes: 'SYSCALL・タイマー強制割込・MMU物理遮断の3大OS保護を実機MOSFETで実証し、第4章（ハードウェア前半）を完全制覇する',
    },
    inputs: ['CLK'],
    outputs: ['CRT'],
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: null,
    asmProgramSpec: {
      arch: 'ark8_os',
      goalTitle: '最終目標：0x04(IRQ)・0x08(SYSCALL)・0x0C(FAULT) の3ハンドラで攻撃「X」を遮断し CRTへ「A5!」（別検証「OK!」）を出力せよ！',
      targetCrt: 'A5!',
      altCrt: 'OK!',
      maxCycles: 96,
      userProgram: {
        baseAddr: 0x40,
        instructions: [
          { op: 'LDI', rd: 1, rs: 0, imm: 65 },     // 'A'
          { op: 'SYSCALL', rd: 0, rs: 0, imm: 1 },  // OS窓口で 'A' 表示要求
          { op: 'LDI', rd: 1, rs: 0, imm: 53 },     // '5'
          { op: 'SYSCALL', rd: 0, rs: 0, imm: 1 },  // OS窓口で '5' 表示要求
          { op: 'LDI', rd: 0, rs: 0, imm: 88 },     // 'X' (破損攻撃ペイロード!)
          { op: 'STOR', rd: 0, rs: 0, imm: 240 },   // 0xF0(CRT)直書き攻撃 → MMU_FAULT!
          { op: 'HALT', rd: 0, rs: 0, imm: 0 },
        ],
      },
      rows: [
        { addr: 0, slotId: 'line_0', locked: true, fixedPart: { op: 'LDI', rd: 0, rs: 0, imm: 64 }, label: '0番地（Boot：砂場 BASE=0x40 を準備）' },
        { addr: 1, slotId: 'line_1', locked: true, fixedPart: { op: 'STOR', rd: 0, rs: 0, imm: 244 }, label: '1番地（Boot：MMU_BASE[0xF4] ← 64）' },
        { addr: 2, slotId: 'line_2', locked: true, fixedPart: { op: 'LDI', rd: 0, rs: 0, imm: 32 }, label: '2番地（Boot：砂場 LIMIT=0x20 を準備）' },
        { addr: 3, slotId: 'line_3', locked: true, fixedPart: { op: 'JNZ', rd: 0, rs: 0, imm: 16 }, label: '3番地（Boot：カーネル初期化 16番地へ飛躍）' },
        { addr: 4, slotId: 'line_4', label: '4番地（[0x04 IRQ] タイマー割込カウント R3 ← R3 + 1）', ideal: 'A8OS_ADDI_3_0_1' },
        { addr: 5, slotId: 'line_5', label: '5番地（[0x04 IRQ] ユーザー実行へ復帰 IRET）', ideal: 'A8OS_IRET_0_0_0' },
        { addr: 8, slotId: 'line_8', label: '8番地（[0x08 SYSCALL] 引数 R1 を CRT[240] へ代理表示）', ideal: 'A8OS_STOR_0_1_240' },
        { addr: 9, slotId: 'line_9', label: '9番地（[0x08 SYSCALL] 処理回数 R2 ← R2 + 1）', ideal: 'A8OS_ADDI_2_0_1' },
        { addr: 10, slotId: 'line_10', label: '10番地（[0x08 SYSCALL] ユーザーへ復帰 IRET）', ideal: 'A8OS_IRET_0_0_0' },
        { addr: 12, slotId: 'line_12', label: '12番地（[0x0C FAULT] 隔離完了記号 33("!") を R0 へ）', ideal: 'A8OS_LDI_0_0_33' },
        { addr: 13, slotId: 'line_13', label: '13番地（[0x0C FAULT] CRT[240] へ "!" を出力）', ideal: 'A8OS_STOR_0_0_240' },
        { addr: 14, slotId: 'line_14', label: '14番地（[0x0C FAULT] 暴走隔離・カーネル安全停止 HALT）', ideal: 'A8OS_HALT_0_0_0' },
        { addr: 16, slotId: 'line_16', locked: true, fixedPart: { op: 'STOR', rd: 0, rs: 0, imm: 245 }, label: '16番地（Init：MMU_LIMIT[0xF5] ← 32）' },
        { addr: 17, slotId: 'line_17', locked: true, fixedPart: { op: 'LDI', rd: 0, rs: 0, imm: 4 }, label: '17番地（Init：タイマー周期 4拍を準備）' },
        { addr: 18, slotId: 'line_18', locked: true, fixedPart: { op: 'STOR', rd: 0, rs: 0, imm: 243 }, label: '18番地（Init：TMR_IRQ[0xF3] ← 4 起動）' },
        { addr: 19, slotId: 'line_19', locked: true, fixedPart: { op: 'IRET', rd: 0, rs: 0, imm: 0 }, label: '19番地（Init：K=0へ降格し砂場 VA=0[0x40] 実行開始！）' },
      ],
    },
    plainGoal: 'カーネルの3大トラップ窓口【0x04 IRQ】【0x08 SYSCALL】【0x0C FAULT】をたった8行のアセンブリで実装し、不正バイナリを物理隔離しながら「A5!」（別検証「OK!」）を完遂しよう！',
    beginnerNote:
      '0〜3番地（Boot）と 16〜19番地（Init）はすでに固定実装済み！ あなたが書くのは本物のOSカーネル最深部──「4〜5番地のタイマー割込」「8〜10番地のSYSCALL窓口」「12〜14番地のFAULT隔離」のたった8行だけ！ ユーザー砂場の攻撃 STOR R0, [240]("X") が MMU_8B と PRIV_CTRL に弾かれて 12番地へ飛ぶ瞬間を1拍ずつ見届けよう！',
    introDialogue: [
      {
        speaker: 'hako',
        showIncident: true,
        text: '『いよいよ第4章──ハードウェア前半戦の最終決戦だ！ ユーザー砂場（0x40〜0x5F）へ装填された北方バイナリは、まず R1="A"・R1="5" と2回正規の SYSCALL を呼んだあと、直後に暴走命令【STOR R0("X"), [0xF0]】でCRTへ直接突っ込んでくる！』',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '3大OSトラップ防衛ハンドラ（動く図解）',
          title: '🛡 0x04 IRQ(R3++) ／ 0x08 SYSCALL(CRT←R1, R2++) ／ 0x0C FAULT("!"＆HALT)',
          anim: 'goal_guard_trap',
          rule: '攻撃 "X" は MMU_8B & PRIV_CTRL が物理遮断し 0x0C へ連行！ 別サンドボックス「OK!」でも検証されるぞ！',
          accent: '#7ee8ff',
        },
        text: 'Boot(0〜3) と初期化(16〜19) はすでに組んである。君の手で【4〜5番地：IRQ】【8〜10番地：SYSCALL】【12〜14番地：FAULT】の3大OSハンドラを書き上げ、18,880 MOSFET の鉄壁の箱庭でアーク5との本回線を開通させよう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kai',
        text: 'おおおおっ！！ "A" と "5" は正規の SYSCALL で表示されて、タイマー IRQ もバッチリ割り込んで、暴走攻撃 "X" は1ミリも CRT へ触れられずに 0x0C の "!" で完全隔離された！！ 別テストの "OK!" も一発合格だ！！',
      },
    ],
    hints: [
      '【0x04 タイマーIRQ（4〜5番地）】4: ADDI R3, 1（割込回数を数える） ／ 5: IRET（ユーザーへシームレス復帰）！',
      '【0x08 SYSCALL（8〜10番地）】8: STOR R1, [240]（引数 R1 の文字をOSが代理で CRT[0xF0] へ表示！） ／ 9: ADDI R2, 1（SYSCALL処理回数を数える） ／ 10: IRET！',
      '【0x0C FAULT隔離（12〜14番地）】12: LDI R0, 33（ASCII 33 = "!"） ／ 13: STOR R0, [240]（遮断完了マークをCRTへ出力） ／ 14: HALT（カーネルモードで安全停止）！',
    ],
    tests: [],
    rewardChip: {
      id: 'ARK8_OS_GUARD_PROG',
      name: 'GUARD_TRAP',
      color: '#1e7858',
      accent: '#7ee8ff',
      description: '3ベクタ保護トラップ（0x04 IRQ / 0x08 SYSCALL / 0x0C FAULT）OS防壁プログラム',
      isLabReward: true,
    },
    codexUnlock: ['timer_irq_privilege', 'mmu_os_ready_hw'],
  },
];
