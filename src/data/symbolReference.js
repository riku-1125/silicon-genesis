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
    key: 'JNZ',
    tokens: ['JNZ'],
    en: 'Jump if Not Zero（0でなければジャンプ）',
    ja: 'もし今の値が 0 でない（Z=0）なら指定番地へ飛ぶ。0（Z=1）になったら飛ばず次の番地へ進む',
    category: 'opcode',
  },
  {
    key: 'LOAD',
    tokens: ['LOAD'],
    en: 'Load from SRAM（メモリ読込）',
    ja: 'SRAM の指定番地 [addr] から 1バイトをレジスタ Rd へ読み込む（第3章・機械語 100）',
    category: 'opcode',
  },
  {
    key: 'STOR',
    tokens: ['STOR', 'STORE'],
    en: 'Store to SRAM（メモリ書込）',
    ja: 'レジスタ Rs の 1バイトを SRAM の指定番地 [addr] へ書き込む（第3章・機械語 101）',
    category: 'opcode',
  },
  {
    key: 'ADDI',
    tokens: ['ADDI'],
    en: 'Add Immediate（即値加算）',
    ja: 'レジスタ Rd に即値 IMM（0〜255）を直接足して Rd へ保存する（第3章・機械語 110）',
    category: 'opcode',
  },
  {
    key: 'HALT',
    tokens: ['HALT'],
    en: 'Halt CPU（CPU停止・特権命令）',
    ja: 'PC の更新を止めてプログラムを安全に完了させる命令（第4章ではカーネル専用：ユーザー実行は特権違反トラップ！）',
    category: 'opcode',
  },
  // Chapter 4 OS Extensions (Opcodes 8..15)
  {
    key: 'POP',
    tokens: ['POP'],
    en: 'Pop from Stack（スタックから取り出し）',
    ja: 'スタック先頭 MEM[SP] の1バイトを Rd へ読み込み、SP を +1 進める命令（機械語 1000）',
    category: 'opcode',
  },
  {
    key: 'RET',
    tokens: ['RET'],
    en: 'Return from Subroutine（サブルーチン復帰）',
    ja: 'スタックから戻り番地 MEM[SP] を取り出して PC へ戻し、SP を +1 進める命令（機械語 1001）',
    category: 'opcode',
  },
  {
    key: 'PUSH',
    tokens: ['PUSH'],
    en: 'Push to Stack（スタックへ積む）',
    ja: 'SP を -1 下げ、レジスタ Rs の1バイトを MEM[SP−1] へ積む命令（機械語 1010）',
    category: 'opcode',
  },
  {
    key: 'CALL',
    tokens: ['CALL'],
    en: 'Call Subroutine（サブルーチン呼出）',
    ja: 'SP を -1 下げて戻り番地 PC+1 をスタックへ積み、指定番地 addr へ飛ぶ命令（機械語 1011）',
    category: 'opcode',
  },
  {
    key: 'LDR',
    tokens: ['LDR'],
    en: 'Load Indirect via Pointer（間接メモリ読込）',
    ja: 'レジスタ Rs の値を番地（ポインタ）として MEM[Rs] から Rd へ1バイト読み込む命令（機械語 1100）',
    category: 'opcode',
  },
  {
    key: 'STR',
    tokens: ['STR'],
    en: 'Store Indirect via Pointer（間接メモリ書込）',
    ja: 'レジスタ Rs の値を番地（ポインタ）として Rd の1バイトを MEM[Rs] へ書き込む命令（機械語 1101）',
    category: 'opcode',
  },
  {
    key: 'SYSCALL',
    tokens: ['SYSCALL', 'SYS'],
    en: 'System Call（OSシステムコール要求）',
    ja: 'ユーザーアプリがOSへ処理を依頼する公式窓口。EPC←PC+1 を保存し K_MODE=1 で 0x08番地へ飛ぶ（機械語 1110）',
    category: 'opcode',
  },
  {
    key: 'IRET',
    tokens: ['IRET'],
    en: 'Interrupt Return（割込・特権復帰・特権命令）',
    ja: 'カーネルから EPC 番地へ復帰しつつユーザーモード（K=0）へ戻す特権命令。Uモード実行は特権違反トラップ（機械語 1111）',
    category: 'opcode',
  },
  // Chapter 4 Hardware Pins & OS Signals
  {
    key: 'VA / PA',
    tokens: ['VA', 'PA'],
    en: 'Virtual Address / Physical Address（仮想番地／物理番地）',
    ja: 'VA はアプリから見える仮想番地、PA は MMU が BASE を足して変換した本物の物理RAM番地（K=1では PA=VA）',
    category: 'signal',
  },
  {
    key: 'BASE / LIMIT',
    tokens: ['BASE', 'LIMIT'],
    en: 'MMU Base & Limit Registers（開始番地と上限サイズ）',
    ja: 'ユーザーアプリに許可する砂場区画の開始番地（BASE）と上限幅（LIMIT）。VA >= LIMIT で即座に FAULT=1！',
    category: 'signal',
  },
  {
    key: 'SP / EA',
    tokens: ['SP', 'EA', 'SP_LD'],
    en: 'Stack Pointer / Effective Address（スタックポインタ＆実効番地）',
    ja: 'SP はスタック先頭番地（リセットで 0xF0=240）。PUSH時は EA=SP−1、POP時は EA=SP。SP_LD=1でOSが直接書換可能',
    category: 'signal',
  },
  {
    key: 'K_MODE',
    tokens: ['K_MODE', 'PRIV', 'PRIV_OP'],
    en: 'Kernel Mode / Privilege（特権モード 1=カーネル / 0=ユーザー）',
    ja: '1 なら全メモリ・MMIO・特権命令を使えるOS特権状態。0 のユーザー状態では MMU隔離と特権遮断が強制発動',
    category: 'signal',
  },
  {
    key: 'IRQ / IRQ_EFF',
    tokens: ['IRQ', 'IRQ_EFF', 'PERIOD', 'CNT'],
    en: 'Interrupt Request（ハードウェア割り込み要求＆タイマー）',
    ja: 'タイマー TMR_IRQ が PERIOD からカウントダウンして 1 に達すると IRQ=1！ K=0 のとき実効割込 IRQ_EFF=1 で 0x04 へ強制介入',
    category: 'signal',
  },
  {
    key: 'EPC',
    tokens: ['EPC', 'PC1'],
    en: 'Exception Program Counter（例外・割込復帰番地）',
    ja: 'TRAP 発生時の戻り先を自動保存する専用レジスタ（SYSCALLは次命令 PC+1、IRQ/FAULTは現在命令 PC を退避）',
    category: 'signal',
  },
  {
    key: 'TRAP / FAULT / SAFE',
    tokens: ['TRAP', 'FAULT', 'MMU_FAULT', 'SAFE'],
    en: 'Trap / Protection Fault / Safe Write Gate（トラップ＆書込保護）',
    ja: 'FAULT(違反)・SYSCALL・IRQ のいずれかで TRAP=1 となり、SAFE=!TRAP が 0 に落ちて不正なRAM/レジスタ書込を物理遮断！',
    category: 'signal',
  },
  {
    key: 'DSEL / BOOT / ROM_EN / MMIO_EN / RAM_WE',
    tokens: ['DSEL', 'BOOT', 'ROM_EN', 'MMIO_EN', 'RAM_WE', 'DA'],
    en: 'Unified Bus & Memory Map Signals（統一バス＆領域保護信号）',
    ja: 'DSEL で命令番地(PC)とデータ番地(DA)を切替。0x00..0x0F(BOOT時)は ROM_EN、0xF0..0xFF は MMIO_EN、それ以外の書込だけ RAM_WE=1',
    category: 'signal',
  },
  {
    key: 'CRT / KB / DSK / TMR_SEL',
    tokens: ['CRT_SEL', 'KB_SEL', 'DSK_SEL', 'TMR_SEL', 'DEV_WE'],
    en: 'MMIO Peripheral Select Lines（周辺機器ポート選択信号）',
    ja: '0xF0=CRT文字画面、0xF1=キーボード、0xF2=ディスク、0xF3=タイマーを識別。DEV_WE=MMIO_EN & WE で機器への書込を許可',
    category: 'signal',
  },
  // Chapter 5 OS Kernel Core Symbols & ABI
  {
    key: 'DISK / DPTR',
    tokens: ['DISK', 'DPTR', 'DISK_PTR', '0xF2', '0xF8'],
    en: 'Disk Data Port & Pointer（ディスク読出ポート 0xF2 ＆ ポインタ 0xF8）',
    ja: 'LOAD Rd, [242]（0xF2）でディスクから1バイト読み取るたびに DPTR（0xF8）が自動で +1 進む不揮発性ストレージ窓口',
    category: 'signal',
  },
  {
    key: 'CAUSE',
    tokens: ['CAUSE', 'TRAP_CAUSE', '0xF9'],
    en: 'Trap Cause Register（トラップ要因レジスタ 0xF9）',
    ja: '直近に発生したトラップの原因を示す読み取り専用ポート（1=IRQ / 2=SYSCALL / 3=FAULT）',
    category: 'signal',
  },
  {
    key: 'ABI / スタック枠',
    tokens: ['ABI', 'STACK_ABI', 'outer', 'inner', 'clobber_stack'],
    en: 'Calling Convention & Stack Frame（呼出規約＆スタック枠）',
    ja: 'ネスト呼出前に使うレジスタを PUSH で退避し復帰後に POP で復元する約束事。RET 後の旧スタック枠は次の関数呼出で上書きされるため安全バッファへ保存する',
    category: 'kernel',
  },
  {
    key: 'malloc / free / strdup',
    tokens: ['malloc', 'free', 'strdup', 'MALLOC_STRDUP', 'CHUNK', 'チャンクヘッダ'],
    en: 'User-Space Heap Allocator & String Duplicate（ユーザーヒープ割当・解放・動的複製）',
    ja: 'malloc() は空きチャンクのヘッダを 1(USED) にして本体先頭 ptr を返し、strdup は終端 0 まで独立複製する。free(ptr) は 1バイト手前のヘッダ [ptr−1] を 0(FREE) へ戻して再利用可能にする',
    category: 'kernel',
  },
  {
    key: 'kalloc / kfree',
    tokens: ['kalloc', 'kfree', 'BITMAP', 'SLOT'],
    en: 'Kernel Slot Allocator & Free（物理ビットマップ割当・解放）',
    ja: 'メモリ管理表の 0(FREE) スロットを探して 1(USED) にして貸し出す kalloc と、解放して 0 へ戻す kfree',
    category: 'kernel',
  },
  {
    key: 'BRK / sbrk / OOM',
    tokens: ['BRK', 'sbrk', 'SYS_SBRK', 'OOM', 'HEAP'],
    en: 'Program Break / Heap Expansion / Out of Memory（ヒープ境界＆衝突検知）',
    ja: 'BRK は下から伸びるヒープ領域の先端。要求サイズが空き容量（SP − BRK）を超えると OOM として拡張を安全拒否する',
    category: 'kernel',
  },
  {
    key: 'SYS_WRITE / READ / EXIT',
    tokens: ['SYS_WRITE', 'SYS_READ', 'SYS_EXIT', 'SYS_YIELD'],
    en: 'ARK-OS System Call ABI（システムコール番号規約 R0）',
    ja: 'SYSCALL 窓口（0x08）での R0 番号規約：1=SYS_WRITE（CRT表示）、2=SYS_READ（KB読出）、3=SYS_EXIT（終了）、4=SYS_SBRK / YIELD',
    category: 'kernel',
  },
  {
    key: 'PCB / vDSO',
    tokens: ['PCB', 'vDSO', 'PID', 'CTX', 'cur_pcb'],
    en: 'Process Control Block & vDSO Trampoline（プロセス制御台帳＆復帰コード）',
    ja: 'PCB は各プロセスの [state, base, epc, sp, r0..r3] 8バイト台帳。vDSO はユーザー末尾の POP R0; RET で全状態復元を完遂する',
    category: 'kernel',
  },
  {
    key: 'EQ / LT / GE',
    tokens: ['EQ', 'LT', 'GE'],
    en: 'Equal / Less Than / Greater or Equal（符号なし8bit比較出力）',
    ja: 'ALU_8B の引き算フラグから導く比較結果：EQ(A==B)=Z、GE(A>=B)=C、LT(A<B)=NOT(C)。MMU上限判定の心臓',
    category: 'signal',
  },
  {
    key: 'FLOW',
    tokens: ['FLOW', 'RDATA', 'WDATA'],
    en: 'Control Flow Bundle / Memory Data（制御フロー束線＆読み書きデータ）',
    ja: 'FLOW[3:0]=[BR, CALL, RET, HALT] の4ビット制御束線。RDATA はメモリ読出値、WDATA はメモリ書込値',
    category: 'signal',
  },
  {
    key: 'RST',
    tokens: ['RST'],
    en: 'Reset（物理リセット線）',
    ja: '1 にしてクロックを打つとレジスタや PC を一瞬で 0 へ初期化するハードウェアリセット端子',
    category: 'signal',
  },
  {
    key: 'RD / RS',
    tokens: ['RD0', 'RD1', 'RS0', 'RS1', 'WA0', 'RA0', 'RB0'],
    en: 'Destination / Source Register（書込先・参照元レジスタ選択）',
    ja: '4本の8bit汎用レジスタ（R0〜R3）のどれを使うかを選ぶ2ビット番号',
    category: 'signal',
  },
  {
    key: 'MEM_WE / REG_WE',
    tokens: ['MEM_WE', 'REG_WE', 'ALU_B'],
    en: 'Memory / Register Write Enable（書込許可＆入力切替）',
    ja: 'REG_WE=1 でレジスタ書込、MEM_WE=1 で SRAM 書込、ALU_B=1 で ALU 右入力を IMM に切替',
    category: 'signal',
  },
  {
    key: 'SPL / JON',
    tokens: ['SPLIT4', 'JOIN4', 'SPLIT8', 'JOIN8', 'SPL4', 'JON4', 'SPL8', 'JON8'],
    en: 'Bus Splitter / Joiner（物理リボンコネクタ）',
    ja: '4本・8本のリボン束線をほどいたり束ねたりするゲート0個の物理コネクタ',
    category: 'signal',
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
    ja: '「いま何番地の命令を実行しているか（第2章は0〜15番地／第3章以降は0〜255番地）」を指し示す行番号カウンタ',
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
    ja: '命令のすぐ横に書かれた直接使う数値（第2章は4bit 0〜15／第3章以降は8bit 0〜255）またはジャンプ先・メモリ番地',
    category: 'signal',
  },
  {
    key: 'I0..1',
    tokens: ['I0', 'I1'],
    en: 'Instruction Code（2ビット命令番号）',
    ja: 'どの命令かを2ビット(0〜3)で表すコード（I1,I0: 00=LDI / 01=ADD / 10=SUB / 11=JNZ）',
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
    ja: '1のとき「もし値が0でない（Z=0）ならジャンプせよ」という条件分岐（JNZ）を許可する信号',
    category: 'signal',
  },
  {
    key: 'Z',
    tokens: ['Z'],
    en: 'Zero Flag（ゼロ検知フラグ）',
    ja: '計算結果や入力値がぴったり 0 のときだけ 1 に光る判定信号',
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
    ja: 'デコーダの逆。押された1本のボタン（LDI / ADD / SUB / JNZ）を2ビット機械語（00〜11）へ変換する回路',
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
    mnemonic: 'JNZ n',
    en: 'Jump if Not Zero（≠0ならジャンプ）',
    bits: '11 (I1=1, I0=1)',
    effect: 'もし今の ACC が 0 でない (Z=0) なら n 番地へ飛ぶ。0 なら通過。ACC は変えない',
    ctrl: 'WE=0, BR=1',
  },
];

export const ARK8_ISA_TABLE = [
  { mnemonic: 'LDI Rd, n', en: 'Load Immediate（即値代入）', bits: '000', effect: '8bit即値 n（0〜255）をレジスタ Rd へ直接代入', ctrl: 'WD=01, REG_WE=1', code: '000', op: 'LDI Rd, n', reading: 'エルディーアイ', full: 'Load Immediate', meaning: '8bit即値 n（0〜255）をレジスタ Rd へ直接代入', pins: 'WD=01, REG_WE=1' },
  { mnemonic: 'ADD Rd, Rs', en: 'Add Registers（レジスタ加算）', bits: '001', effect: 'Rd ← Rd + Rs（レジスタ同士の8bit加算）', ctrl: 'WD=00, REG_WE=1', code: '001', op: 'ADD Rd, Rs', reading: 'アド', full: 'Add Registers', meaning: 'Rd ← Rd + Rs（レジスタ同士の8bit加算）', pins: 'WD=00, REG_WE=1' },
  { mnemonic: 'SUB Rd, Rs', en: 'Subtract Registers（レジスタ減算）', bits: '010', effect: 'Rd ← Rd − Rs（レジスタ同士の8bit減算）', ctrl: 'SUB=1, REG_WE=1', code: '010', op: 'SUB Rd, Rs', reading: 'サブ', full: 'Subtract Registers', meaning: 'Rd ← Rd − Rs（レジスタ同士の8bit減算）', pins: 'SUB=1, REG_WE=1' },
  { mnemonic: 'JNZ Rd, addr', en: 'Jump if Not Zero（非ゼロ分岐）', bits: '011', effect: 'Rd ≠ 0 なら addr 番地へジャンプ（0なら通過）', ctrl: 'BR=1, REG_WE=0', code: '011', op: 'JNZ Rd, addr', reading: 'ジェイエヌゼット', full: 'Jump if Not Zero', meaning: 'Rd ≠ 0 なら addr 番地へジャンプ（0なら通過）', pins: 'BR=1, REG_WE=0' },
  { mnemonic: 'LOAD Rd, [a]', en: 'Load from SRAM（メモリ読込）', bits: '100', effect: 'SRAM の a 番地（0〜15）から Rd へ 1バイト読込', ctrl: 'WD=10, REG_WE=1', code: '100', op: 'LOAD Rd, [a]', reading: 'ロード', full: 'Load from SRAM', meaning: 'SRAM の a 番地（0〜15）から Rd へ 1バイト読込', pins: 'WD=10, REG_WE=1' },
  { mnemonic: 'STOR Rs, [a]', en: 'Store to SRAM（メモリ書込）', bits: '101', effect: 'Rs の 1バイトを SRAM の a 番地（0〜15）へ書込', ctrl: 'MEM_WE=1', code: '101', op: 'STOR Rs, [a]', reading: 'ストア', full: 'Store to SRAM', meaning: 'Rs の 1バイトを SRAM の a 番地（0〜15）へ書込', pins: 'MEM_WE=1' },
  { mnemonic: 'ADDI Rd, n', en: 'Add Immediate（即値加算）', bits: '110', effect: 'Rd ← Rd + n（レジスタに即値 n を加算）', ctrl: 'ALU_B=1, REG_WE=1', code: '110', op: 'ADDI Rd, n', reading: 'アドアイ', full: 'Add Immediate', meaning: 'Rd ← Rd + n（レジスタに即値 n を加算）', pins: 'ALU_B=1, REG_WE=1' },
  { mnemonic: 'HALT', en: 'Halt CPU（CPU停止）', bits: '111', effect: 'PC を停止させてプログラムを安全に完了する', ctrl: 'HALT=1', code: '111', op: 'HALT', reading: 'ハルト', full: 'Halt CPU', meaning: 'PC を停止させてプログラムを安全に完了する', pins: 'HALT=1' },
];

export const ARK8_OS_ISA_TABLE = [
  { mnemonic: 'LDI Rd, n', en: 'Load Immediate（即値代入）', bits: '0000 (0)', effect: 'Rd ← n（8bit即値 0〜255 を代入）', ctrl: 'WD=01, REG_WE=1' },
  { mnemonic: 'ADD Rd, Rs', en: 'Add Registers（レジスタ加算）', bits: '0001 (1)', effect: 'Rd ← Rd + Rs（8bit加算）', ctrl: 'WD=00, REG_WE=1' },
  { mnemonic: 'SUB Rd, Rs', en: 'Subtract Registers（レジスタ減算）', bits: '0010 (2)', effect: 'Rd ← Rd − Rs（8bit減算）', ctrl: 'SUB=1, REG_WE=1' },
  { mnemonic: 'JNZ Rd, addr', en: 'Jump if Not Zero（非ゼロ分岐）', bits: '0011 (3)', effect: 'Rd ≠ 0 なら addr へジャンプ（0なら次命令）', ctrl: 'BR=1' },
  { mnemonic: 'LOAD Rd, [a]', en: 'Load Direct（直接メモリ読込）', bits: '0100 (4)', effect: 'Rd ← MEM[a]（番地 a から1バイト読込）', ctrl: 'WD=10, REG_WE=1, MEM_OP=1' },
  { mnemonic: 'STOR Rs, [a]', en: 'Store Direct（直接メモリ書込）', bits: '0101 (5)', effect: 'MEM[a] ← Rs（番地 a へ1バイト書込）', ctrl: 'MEM_WE=1, MEM_OP=1' },
  { mnemonic: 'ADDI Rd, n', en: 'Add Immediate（即値加算）', bits: '0110 (6)', effect: 'Rd ← Rd + n（即値加算）', ctrl: 'ALU_B=1, REG_WE=1' },
  { mnemonic: 'HALT', en: 'Halt CPU（特権・CPU停止）', bits: '0111 (7)', effect: 'K=1で安全停止／ユーザー(K=0)実行は特権違反トラップ', ctrl: 'HALT=1, PRIV=1' },
  { mnemonic: 'POP Rd', en: 'Pop Stack（スタック読出）', bits: '1000 (8)', effect: 'Rd ← MEM[SP], SP ← SP + 1', ctrl: 'STK=POP, WD=10, REG_WE=1' },
  { mnemonic: 'RET', en: 'Return（サブルーチン復帰）', bits: '1001 (9)', effect: 'PC ← MEM[SP], SP ← SP + 1', ctrl: 'STK=POP, RET=1' },
  { mnemonic: 'PUSH Rs', en: 'Push Stack（スタック書込）', bits: '1010 (10)', effect: 'SP ← SP − 1, MEM[SP−1] ← Rs', ctrl: 'STK=PUSH, MEM_WE=1' },
  { mnemonic: 'CALL addr', en: 'Call Subroutine（関数呼出）', bits: '1011 (11)', effect: 'SP ← SP − 1, MEM[SP−1] ← PC+1, PC ← addr', ctrl: 'STK=PUSH, CALL=1, MEM_WE=1' },
  { mnemonic: 'LDR Rd, [Rs]', en: 'Load Indirect（ポインタ読込）', bits: '1100 (12)', effect: 'Rd ← MEM[Rs]（Rsの指す番地から1バイト読込）', ctrl: 'IND=1, WD=10, REG_WE=1' },
  { mnemonic: 'STR Rd, [Rs]', en: 'Store Indirect（ポインタ書込）', bits: '1101 (13)', effect: 'MEM[Rs] ← Rd（Rsの指す番地へRdを1バイト書込）', ctrl: 'IND=1, MEM_WE=1' },
  { mnemonic: 'SYSCALL n', en: 'System Call（OS呼出）', bits: '1110 (14)', effect: 'EPC ← PC+1, K ← 1, PC ← 0x08（OS窓口へ昇格）', ctrl: 'SYS=1' },
  { mnemonic: 'IRET', en: 'Interrupt Return（特権・割込復帰）', bits: '1111 (15)', effect: 'K=1で K ← 0, PC ← EPC／K=0実行は特権違反トラップ', ctrl: 'IRET=1, PRIV=1' },
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
  const exactPins = new Set(
    [...(stage.inputs || []), ...(stage.outputs || [])].map((p) => String(p).replace(/\[.*\]$/, ''))
  );

  const matches = [];
  for (const entry of SYMBOL_CATALOG) {
    // Avoid showing single-letter S/R/D/Q/Z on unrelated early stages unless actually a pin of this stage
    const isHit = entry.tokens.some((tok) => {
      if (
        tok.length <= 2 &&
        /^[A-Z][0-9]?$/.test(tok) &&
        !['PC', 'OP', 'WE', 'BR', 'SP', 'EA', 'VA', 'PA', 'EQ', 'LT', 'GE', 'DA'].includes(tok)
      ) {
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
 * Whether this stage involves the ARK-4 4-instruction set (LDI / ADD / SUB / JNZ).
 */
export function stageUsesIsaTable(stage) {
  if (!stage) return false;
  if (stageUsesArk8OsIsaTable(stage) || stageUsesArk8IsaTable(stage)) return false;
  return (
    stage.kind === 'assembly_program' ||
    stage.id === 'stage_17' ||
    stage.id === 'stage_20' ||
    stage.id === 'stage_21' ||
    stage.id === 'stage_asm_enc' ||
    stage.id === 'stage_rom_4w'
  );
}

/**
 * Whether this stage involves the Chapter 3 ARK-8 8-instruction set (LDI..HALT).
 */
export function stageUsesArk8IsaTable(stage) {
  if (!stage) return false;
  if (stageUsesArk8OsIsaTable(stage)) return false;
  return (
    stage.kind === 'ark8_program' ||
    stage.id === 'stage_38' ||
    stage.id === 'stage_39' ||
    stage.id === 'stage_40'
  );
}

/**
 * Whether this stage involves the Chapter 4 ARK-8 OS-Ready 16-instruction set (LDI..IRET).
 */
export function stageUsesArk8OsIsaTable(stage) {
  if (!stage) return false;
  return (
    stage.kind === 'ark8_os_program' ||
    stage.id === 'stage_51' ||
    stage.id === 'stage_52' ||
    stage.id === 'stage_53' ||
    stage.id === 'stage_54'
  );
}
