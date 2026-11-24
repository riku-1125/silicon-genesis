/**
 * SILICON GENESIS — Non-Spoiler Pin, Abbreviation & Opcode Reference Catalog
 *
 * Explains what English hardware abbreviations and assembly mnemonics MEAN
 * (full English origin + plain Japanese meaning) right inside the Spec modal.
 * Knowing what a symbol or instruction means is part of the specification, not a hint!
 */

export const SYMBOL_CATALOG = [
  // Assembly Opcodes (Mnemonics)
  {
    key: 'LDI',
    tokens: ['LDI'],
    en: 'Load Immediate（即値代入）',
    ja: '計算せず、後ろに書いた数値(IMM)をそのまま作業机 ACC へ入れる（例：LDI 5 → ACC←5）',
    category: 'opcode',
  },
  {
    key: 'ADD',
    tokens: ['ADD'],
    en: 'Add（加算）',
    ja: '今の作業机 ACC に後ろの数値を足して保存する（例：ADD 7 → ACC←ACC+7）',
    category: 'opcode',
  },
  {
    key: 'SUB',
    tokens: ['SUB'],
    en: 'Subtract（減算／引き算）',
    ja: '回路では「1で引き算切替」、命令では「今の ACC から後ろの数値を引く」（例：SUB 4 → ACC←ACC−4）',
    category: 'opcode',
  },
  {
    key: 'JZ',
    tokens: ['JZ'],
    en: 'Jump if Zero（ゼロならジャンプ）',
    ja: 'もし今の ACC が 0（Z=1）なら指定番地へ飛ぶ。0でなければ次の番地へ進む（ACCは変えない）',
    category: 'opcode',
  },
  {
    key: 'LOOP',
    tokens: ['LOOP'],
    en: 'Loop（繰り返し帰還）',
    ja: '指定した番地へ戻って処理を繰り返す（Stage 24では外部帰還線 RET=1＋JZ 1 で実現）',
    category: 'opcode',
  },
  {
    key: 'NOP',
    tokens: ['NOP'],
    en: 'No Operation（何もしない）',
    ja: '書込許可 WE=0 のとき、記憶を書き換えずにそのまま保つ動作',
    category: 'opcode',
  },

  // CPU / Memory / Control Signals
  {
    key: 'ACC',
    tokens: ['ACC', 'ACC0', 'ACC1', 'ACC2', 'ACC3'],
    en: 'Accumulator（アキュムレータ／作業机）',
    ja: 'CPUの中で「いま計算している途中の数値 (0〜15)」を置いておく4ビットの記憶箱',
    category: 'signal',
  },
  {
    key: 'PC',
    tokens: ['PC', 'PC0', 'PC1', 'PC2', 'PC3'],
    en: 'Program Counter（プログラムカウンタ）',
    ja: '「いま何番地の命令を実行しているか（0〜15番地）」を指し示す行番号カウンタ',
    category: 'signal',
  },
  {
    key: 'ROM',
    tokens: ['ROM'],
    en: 'Read-Only Memory（命令メモリ表）',
    ja: '0番地・1番地…と命令カードを順番に並べておくプログラム棚',
    category: 'signal',
  },
  {
    key: 'IMM',
    tokens: ['IMM', 'IMM0', 'IMM1', 'IMM2', 'IMM3'],
    en: 'Immediate（即値）',
    ja: '命令のすぐ横に書かれた「直接使う4ビット数値 (0〜15)」またはジャンプ先番地',
    category: 'signal',
  },
  {
    key: 'I0..1',
    tokens: ['I0', 'I1'],
    en: 'Instruction Code（2ビット命令番号）',
    ja: 'どの命令かを2ビット(0〜3)で表すコード（I1,I0: 00=LDI / 01=ADD / 10=SUB / 11=JZ）',
    category: 'signal',
  },
  {
    key: 'OP',
    tokens: ['OP'],
    en: 'Operation（演算モード）',
    ja: 'ALUの計算方法を切り替える信号（0=足し算 ADD ／ 1=引き算 SUB）',
    category: 'signal',
  },
  {
    key: 'SET',
    tokens: ['SET'],
    en: 'Set（直接代入スイッチ）',
    ja: '1のとき計算結果ではなく即値 IMM をそのまま ACC へ入れる（LDI命令で使用）',
    category: 'signal',
  },
  {
    key: 'WE',
    tokens: ['WE'],
    en: 'Write Enable（書き込み許可）',
    ja: '1なら記憶を新しい値で上書き保存、0なら今の記憶をロック保持する',
    category: 'signal',
  },
  {
    key: 'BR',
    tokens: ['BR'],
    en: 'Branch（条件分岐フラグ）',
    ja: '1のとき「もし値が0（Z=1）ならジャンプせよ」という条件分岐を許可する信号',
    category: 'signal',
  },
  {
    key: 'Z',
    tokens: ['Z'],
    en: 'Zero Flag（ゼロ検知フラグ）',
    ja: '4ビットの数値がぴったり 0（0000）のときだけ 1 に光る判定信号',
    category: 'signal',
  },
  {
    key: 'RET',
    tokens: ['RET'],
    en: 'Return（外部帰還プルダウン線）',
    ja: 'Stage 24 の固定帰還配線。1の間は COND_PC の V入力を 0000 に接地して1番地へ戻す',
    category: 'signal',
  },
  {
    key: 'V0..3',
    tokens: ['V0', 'V1', 'V2', 'V3'],
    en: 'Value（判定する4ビット値）',
    ja: '0（0000）かどうかをチェックするために入力する4ビットの数値',
    category: 'signal',
  },
  {
    key: 'J0..3',
    tokens: ['J0', 'J1', 'J2', 'J3'],
    en: 'Jump Address（ジャンプ先番地）',
    ja: 'ジャンプが発動したときに飛びたい先の命令番号（0〜15番地）',
    category: 'signal',
  },
  {
    key: 'JMP',
    tokens: ['JMP'],
    en: 'Jump（ジャンプ切替）',
    ja: '0なら次の拍で「今の番地 + 1」へ進み、1なら「J0..3 の番地」へワープする',
    category: 'signal',
  },
  {
    key: 'LOAD',
    tokens: ['LOAD'],
    en: 'Load（読み込み・上書き許可）',
    ja: '1ならクロックの瞬間に新しいデータ D0..3 を取り込み、0なら今の記憶を保持する',
    category: 'signal',
  },
  {
    key: 'CLK',
    tokens: ['CLK'],
    en: 'Clock（クロック／心臓の鼓動）',
    ja: '0 → 1 に立ち上がる一瞬だけ記憶を一斉に更新するリズム信号',
    category: 'signal',
  },
  {
    key: 'CIN / COUT',
    tokens: ['CIN', 'COUT'],
    en: 'Carry In / Carry Out（くり上がり入出力）',
    ja: 'CIN＝下の桁からもらうくり上がり、COUT＝上の桁へ渡すくり上がり（桁あふれ）',
    category: 'signal',
  },
  {
    key: 'SUM / CARRY',
    tokens: ['SUM', 'CARRY'],
    en: 'Sum / Carry（合計／くり上がり）',
    ja: 'SUM＝その桁の答え（1の位）、CARRY＝上の桁へ送るくり上がり（2の位）',
    category: 'signal',
  },
  {
    key: 'SEL',
    tokens: ['SEL'],
    en: 'Select（選択レバー）',
    ja: '0 か 1 で「どちらの入力ルートを通すか」を切り替える制御ピン',
    category: 'signal',
  },
  {
    key: 'S / R',
    tokens: ['S', 'R'],
    en: 'Set / Reset（セット／リセット）',
    ja: 'S=1 で記憶を 1 にセット（点灯）、R=1 で記憶を 0 にリセット（解除）',
    category: 'signal',
  },
  {
    key: 'D / Q / QN',
    tokens: ['D', 'Q', 'QN'],
    en: 'Data / Output Q / Not-Q',
    ja: 'D＝覚えさせたい入力データ、Q＝記憶中の出力、QN＝Qを反転した出力',
    category: 'signal',
  },
  {
    key: 'MUX',
    tokens: ['MUX', 'MUX_4B', 'MUX_4BIT'],
    en: 'Multiplexer（マルチプレクサ／切替器）',
    ja: 'SEL レバーの値によって、2つの入力から片方を選んで出力へ通す切替回路',
    category: 'module',
  },
  {
    key: 'DEC',
    tokens: ['DEC', 'DEC_2TO4', 'INST_DEC'],
    en: 'Decoder（デコーダ／解読器）',
    ja: '番号（2進数コード）を読み取って、対応する1本の信号線だけを ON に翻訳する回路',
    category: 'module',
  },
  {
    key: 'ALU',
    tokens: ['ALU', 'ALU_4B', 'ALU_4BIT'],
    en: 'Arithmetic Logic Unit（算術論理演算装置）',
    ja: '足し算・引き算などの計算を一手に引き受けるCPUの計算エンジン',
    category: 'module',
  },
  {
    key: 'REG',
    tokens: ['REG', 'REG_4B', 'REG_4BIT'],
    en: 'Register（レジスタ／作業机メモリ）',
    ja: 'CPU内部で4ビットの数値を1個記憶しておき、クロックの瞬間に更新できる記憶装置',
    category: 'module',
  },
  {
    key: 'ENC',
    tokens: ['ENC', 'ASM_ENC'],
    en: 'Encoder（エンコーダ／符号器）',
    ja: 'デコーダの逆。押された1本のボタン（LDI / ADD / SUB / JZ）を2ビット機械語（00〜11）へ変換する回路',
    category: 'module',
  },
  {
    key: 'KEY',
    tokens: ['KEY'],
    en: 'Key Pressed（入力検知フラグ）',
    ja: '4つの命令ボタンのうち、どれか1つでも押されていれば 1、何も押されていなければ 0 になる確認信号',
    category: 'pin',
  },
];

export const ARK4_ISA_TABLE = [
  {
    mnemonic: 'LDI n',
    en: 'Load Immediate（即値代入）',
    bits: '00 (I1=0, I0=0)',
    effect: '作業机 ACC に数値 n をそのままセットする（ACC ← n）',
    ctrl: 'SET=1, WE=1',
  },
  {
    mnemonic: 'ADD n',
    en: 'Add（足し算）',
    bits: '01 (I1=0, I0=1)',
    effect: '今の ACC に数値 n を足して保存する（ACC ← ACC + n）',
    ctrl: 'OP=0, SET=0, WE=1',
  },
  {
    mnemonic: 'SUB n',
    en: 'Subtract（引き算）',
    bits: '10 (I1=1, I0=0)',
    effect: '今の ACC から数値 n を引いて保存する（ACC ← ACC − n）',
    ctrl: 'OP=1, SET=0, WE=1',
  },
  {
    mnemonic: 'JZ n',
    en: 'Jump if Zero（0ならジャンプ）',
    bits: '11 (I1=1, I0=1)',
    effect: 'もし今の ACC が 0 (Z=1) なら n 番地へ飛ぶ。ACC は変えない',
    ctrl: 'WE=0, BR=1',
  },
];

/**
 * Collects all relevant symbol/abbreviation definitions for the given stage
 * so the Spec modal always explains every cryptic name on screen!
 */
export function getStageSymbolReferences(stage) {
  if (!stage) return [];
  const corpusParts = [
    ...(stage.inputs || []),
    ...(stage.outputs || []),
    ...(stage.pinHelp?.inputs || []),
    ...(stage.pinHelp?.outputs || []),
    stage.plainGoal || '',
    stage.beginnerNote || '',
    stage.incidentBrief?.trouble || '',
    stage.incidentBrief?.condition || '',
    stage.incidentBrief?.shortRule || '',
    ...(stage.physicsParts || []).map((p) => `${p.name} ${p.op || ''} ${p.rule || ''}`),
    ...(stage.asmProgramSpec?.rows || []).map(
      (r) => `${r.label || ''} ${r.fixedPart?.name || ''} ${r.fixedPart?.rule || ''}`
    ),
  ];
  const fullText = corpusParts.join(' ');
  const exactPins = new Set([...(stage.inputs || []), ...(stage.outputs || [])]);

  const matches = [];
  for (const entry of SYMBOL_CATALOG) {
    // Avoid showing single-letter S/R/D/Q/Z on unrelated early stages unless actually a pin of this stage
    const isHit = entry.tokens.some((tok) => {
      if (tok.length <= 2 && /^[A-Z][0-9]?$/.test(tok) && tok !== 'PC' && tok !== 'OP' && tok !== 'WE' && tok !== 'BR' && tok !== 'JZ') {
        return exactPins.has(tok);
      }
      const re = new RegExp(`(?<![A-Za-z0-9_])${tok}(?![A-Za-z0-9_])`);
      return re.test(fullText);
    });
    if (isHit) {
      matches.push(entry);
    }
  }
  return matches;
}

/**
 * Whether this stage involves the ARK-4 4-instruction set (LDI / ADD / SUB / JZ).
 */
export function stageUsesIsaTable(stage) {
  if (!stage) return false;
  return (
    stage.kind === 'assembly_program' ||
    stage.id === 'stage_17' ||
    stage.id === 'stage_20' ||
    stage.id === 'stage_21' ||
    stage.id === 'stage_asm_enc' ||
    stage.id === 'stage_rom_4w'
  );
}
