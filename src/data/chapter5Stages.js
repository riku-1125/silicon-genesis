/**
 * SILICON GENESIS — Chapter 5: OS Kernel Core (STAGE 55–62 / ACT XII & XIII)
 *
 * Continues directly from Chapter 4 Ending (2094.12.04 20:23) when northern shelter
 * ARK-5 (Ren) warns Horizon Camp's 328 survivors of an approaching stratospheric
 * electromagnetic blizzard (solar-flare geomagnetic storm + severe cold wave).
 *
 * Runs 100% natively on UNMODIFIED Chapter 4 `ARK8_OS_HW` physical silicon
 * (6,294 NAND / 12,588 CPU MOSFETs / 18,880 Board MOSFETs + verified SRAM_16B):
 *   ACT XII  (55–58): BOOT_LOADER -> KALLOC_MAP -> HEAP_SBRK -> SYSCALL_MUX
 *   ACT XIII (59–62): PCB_CTX_SW -> RR_SCHED -> FAULT_ISOLATE -> ARK_KERNEL_CORE
 */

function inst(op, rd = 0, rs = 0, imm = 0) {
  return { op, rd, rs, imm };
}

function idOf(op, rd = 0, rs = 0, imm = 0) {
  return `A8OS_${op}_${rd}_${rs}_${imm}`;
}

function makeCoopUserProc(startChar) {
  return [
    inst('LDI', 1, 0, startChar), // 0: R1 = startChar ('A' or '1')
    inst('LDI', 0, 0, 1),         // 1: SYS_WRITE
    inst('SYSCALL', 0, 0, 1),     // 2: print startChar
    inst('PUSH', 0, 1, 0),        // 3: push R1 onto private stack
    inst('LDI', 0, 0, 4),         // 4: SYS_YIELD
    inst('SYSCALL', 0, 0, 4),     // 5: yield CPU (returns R0=1 via vDSO POP R0!)
    inst('POP', 1, 0, 0),         // 6: pop R1 from private stack
    inst('ADDI', 1, 0, 1),        // 7: next char ('A'->'B', '1'->'2')
    inst('SYSCALL', 0, 0, 1),     // 8: print next char using restored R0==1!
    inst('LDI', 0, 0, 3),         // 9: SYS_EXIT
    inst('SYSCALL', 0, 0, 3),     // 10: exit!
  ];
}

function makePreemptUserProc(ch, count, workIters = 2) {
  return [
    inst('LDI', 1, 0, ch),        // 0: char
    inst('LDI', 2, 0, count),     // 1: print count
    inst('LDI', 0, 0, 1),         // 2: SYS_WRITE
    inst('SYSCALL', 0, 0, 1),     // 3: print char
    inst('LDI', 3, 0, workIters), // 4: busy-work loop (NO yield!)
    inst('ADDI', 3, 0, 255),      // 5: work--
    inst('JNZ', 3, 0, 5),         // 6: loop
    inst('ADDI', 2, 0, 255),      // 7: count--
    inst('JNZ', 2, 0, 2),         // 8: next print
    inst('LDI', 0, 0, 3),         // 9: SYS_EXIT
    inst('SYSCALL', 0, 0, 3),     // 10: exit!
  ];
}

function makeInline3CharProc(str3) {
  return [
    inst('LDI', 0, 0, 1),
    inst('LDI', 1, 0, str3.charCodeAt(0)),
    inst('SYSCALL', 0, 0, 1),
    inst('LDI', 0, 0, 1),
    inst('LDI', 1, 0, str3.charCodeAt(1)),
    inst('SYSCALL', 0, 0, 1),
    inst('LDI', 0, 0, 1),
    inst('LDI', 1, 0, str3.charCodeAt(2)),
    inst('SYSCALL', 0, 0, 1),
    inst('LDI', 0, 0, 3),
    inst('SYSCALL', 0, 0, 3),
  ];
}

function makeRogueProc(attackChar, printBefore = null) {
  const out = [inst('LDI', 2, 0, 7)]; // non-zero R2 so fault handler MUST explicitly clear R2 <- 0
  if (printBefore) {
    out.push(
      inst('LDI', 1, 0, printBefore.charCodeAt(0)),
      inst('LDI', 0, 0, 1),
      inst('SYSCALL', 0, 0, 1)
    );
  }
  out.push(
    inst('LDI', 0, 0, attackChar.charCodeAt(0)),
    inst('STOR', 0, 0, 240), // ILLEGAL MMIO 0xF0 WRITE -> MMU_FAULT!
    inst('HALT', 0, 0, 0)
  );
  return out;
}

export const CHAPTER5_STAGES = [
  // =========================================================================
  // ACT XII — BOOT & MEMORY MANAGEMENT (STAGE 55–58)
  // =========================================================================
  {
    id: 'stage_55',
    number: 55,
    act: 12,
    chapter: 5,
    code: '55',
    kind: 'ark8_os_program',
    title: '停電から蘇れ・ディスク起動ブートローダ',
    revealedTitle: 'ディスク・ブートローダ（BOOT_LOADER）',
    scene: 'ark5_station',
    storyBgm: 'story',
    widget: 'ark8_finale',
    mode: 'physics',
    incidentBrief: {
      where: 'ホライズン電算司令室・不揮発性ディスク起動装置（0xF2）',
      trouble: '迫り来る成層圏・電磁ブリザードの予兆で電力網に瞬断が発生！ 揮発性の統一RAM（SRAM）が停電のたびに真っ白へ消えてしまい、OS本体が起動できない！',
      condition: '先頭のブートローダ（2〜7番地）で DISK[242=0xF2] から残バイト数 R2 ぶんの機械語を RAM[R1]（0x40＝PC32〜）へ順番に展開し、CALL 32 で本体を起動せよ！（主検証 "OS!" ＋ 別サイズ検証 "ARK5"）',
      shortRule: '2: LOAD R0,[242] → STR R0,[R1] → ADDI R1,1 → ADDI R2,255 → JNZ R2,2 → CALL 32！',
      stakes: '瞬断が襲っても不揮発性ディスクから自動でOSを呼び覚ます起動連鎖（ブートローダ）を確立する',
    },
    inputs: ['CLK'],
    outputs: ['CRT'],
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: null,
    asmProgramSpec: {
      arch: 'ark8_os',
      goalTitle: '目標：DISK[0xF2] からOSバイナリを空のRAM[0x40]へ展開し CALL 32 で起動せよ！（OS! ＆ ARK5）',
      targetCrt: 'OS!',
      altCrt: 'ARK5',
      maxCycles: 160,
      memInspectorPreset: 'disk_boot',
      kernelMeta: {
        diskBootTargetAddr: 0x40,
        diskBootTargetPc: 32,
        diskLenExpected: 15,
      },
      sectionHeaders: {
        0: { title: '🔒 0x00 BOOT準備（展開先 0x40 とバイト長取得・固定）', cls: 'vec-locked' },
        2: { title: '✏️ ディスク読込ループ＆起動（6命令を実装！）', cls: 'vec-edit' },
        8: { title: '🔒 帰還後停止（固定）', cls: 'vec-locked' },
      },
      diskProgram: {
        withLenHeader: true,
        instructions: [
          inst('LDI', 0, 0, 79),   // 'O'
          inst('STOR', 0, 0, 240),
          inst('LDI', 0, 0, 83),   // 'S'
          inst('STOR', 0, 0, 240),
          inst('LDI', 0, 0, 33),   // '!'
          inst('STOR', 0, 0, 240),
          inst('RET', 0, 0, 0),
        ],
      },
      altDiskProgram: {
        withLenHeader: true,
        instructions: [
          inst('LDI', 0, 0, 65),   // 'A'
          inst('STOR', 0, 0, 240),
          inst('LDI', 0, 0, 82),   // 'R'
          inst('STOR', 0, 0, 240),
          inst('LDI', 0, 0, 75),   // 'K'
          inst('STOR', 0, 0, 240),
          inst('LDI', 0, 0, 53),   // '5'
          inst('STOR', 0, 0, 240),
          inst('RET', 0, 0, 0),
        ],
      },
      rows: [
        { addr: 0, slotId: 'line_0', locked: true, fixedPart: inst('LDI', 1, 0, 64), label: '展開先 RAM 0x40(64=PC32) を R1 へ' },
        { addr: 1, slotId: 'line_1', locked: true, fixedPart: inst('LOAD', 2, 0, 242), label: 'DISK[0xF2]先頭のバイト長を R2 へ読込' },
        { addr: 2, slotId: 'line_2', ideal: idOf('LOAD', 0, 0, 242), label: '① DISK[242] から1バイト読込 (R0←DISK)', placeholder: 'LOAD R0, [242]' },
        { addr: 3, slotId: 'line_3', ideal: idOf('STR', 0, 1, 0), label: '② 読んだ1バイトを RAM[R1] へ書込', placeholder: 'STR R0, [R1]' },
        { addr: 4, slotId: 'line_4', ideal: idOf('ADDI', 1, 0, 1), label: '③ 書込先アドレスを進める (R1++)', placeholder: 'ADDI R1, 1' },
        { addr: 5, slotId: 'line_5', ideal: idOf('ADDI', 2, 0, 255), label: '④ 残りバイト数を減らす (R2-- = +255)', placeholder: 'ADDI R2, 255' },
        { addr: 6, slotId: 'line_6', ideal: idOf('JNZ', 2, 0, 2), label: '⑤ 残り R2≠0 なら2番地へループ', placeholder: 'JNZ R2, 2' },
        { addr: 7, slotId: 'line_7', ideal: idOf('CALL', 0, 0, 32), label: '⑥ 展開完了！PC=32(0x40) のOS本体を起動', placeholder: 'CALL 32' },
        { addr: 8, slotId: 'line_8', locked: true, fixedPart: inst('HALT', 0, 0, 0), label: 'RET帰還後に安全停止 HALT' },
      ],
    },
    plainGoal: '不揮発性ディスク（0xF2）に眠るコンパイル済みバイナリを空の RAM[0x40] へ1バイトずつコピーし、CALL 32 でそのまま実行するブートローダを書こう！',
    beginnerNote:
      '0〜1番地で展開先 R1=64（0x40＝命令番地 PC 32）と残りバイト数 R2 がすでに用意されています！ DISK[242] は LOAD するたびに内部ポインタ DPTR（0xF8）が自動で +1 進むため、同じ LOAD R0, [242] をループするだけで次々と後続バイトを読み出せます。引き算「−1」は 8ビット2の補数で「ADDI R2, 255」と書けるのも現場の定番テクニックです！',
    introDialogue: [
      {
        speaker: 'ren',
        showIncident: true,
        text: '『ホライズンのみんな、緊急気象警報だよ！！ 北の成層圏で巨大な大寒波と太陽フレア誘発の磁気嵐が合体──【成層圏・電磁ブリザード】が24時間以内にホライズン拠点へ直撃する！！』',
      },
      {
        speaker: 'kai',
        text: 'くそっ、さっきから風力と太陽光の発電ラインが磁気ノイズで瞬断しまくってる！ 電源が一瞬落ちるたびに、第4章で作った統一SRAMの中身が真っ白に消えちまうんだ──嵐の真っ最中に毎回手打ちでプログラムを入れ直すわけにはいかねえぞ！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '第5章・ACT XII 開幕：ディスク自動起動（動く図解）',
          title: '💾 DISK[0xF2] → 1バイトずつ RAM[0x40] へ展開 → CALL 32 起動！',
          anim: 'ch5_boot_loader',
          rule: 'ハードウェアは第4章の ARK8_OS_HW を1本も変えない！ 不揮発性ディスクから自動で蘇る「ブートローダ」を組め！',
          accent: '#45d4a8',
        },
        text: 'いよいよ第5章『OSカーネル中核』の幕開けだ！ 君が第4章で繋いだディスク装置（0xF2）は電源が落ちても消えない不揮発性ストレージだ。先頭の1バイトに「長さ」、後ろにコンパイル済みの機械語本体が入っている。ブートローダが自動で空の RAM[0x40]（PC 32番地）へ展開し、CALL 32 で飛び移る仕組みを6行で組み上げよう！',
      },
      {
        speaker: 'mina',
        text: 'アーク7の118人、アーク3の124人、アーク5の86人──328人みんなの暖房と無線を守るOSの第一歩だね！ がんばろう、主任さん！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kai',
        text: 'おおっ！！ 空っぽだった RAM の 0x40番地へ、ディスク 0xF2 から機械語が1バイトずつ流し込まれて──展開が終わった瞬間に CALL 32 で「OS!」が光った！！ 長さの違う別バイナリ「ARK5」も一発で起動したぜ！！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：ディスク・ブートローダ',
          title: '💾 BOOT_LOADER 完成！ 電源復帰から全自動でOSが蘇る！',
          anim: 'ch5_boot_loader',
          rule: '次は複数アプリを衝突させずに配置する物理メモリ割当器【KALLOC_MAP】へ進もう！',
          accent: '#45d4a8',
        },
        text: '見事だ！ これこそ「自分の靴ひもを引っ張って立ち上がる（Bootstrap）」──ブートローダの本質だ。さあ、次はディスクからいくつものプログラムを読み込むときに起きる「メモリ衝突」を解決する番だよ！',
      },
    ],
    hints: [
      '【ループの流れ】R1 が書込先の RAM番地（64〜）、R2 が残りバイト数です。2番地でディスク 242番地から R0 へ1バイト読み込み、3番地でポインタ R1 の指す RAM へ STR で書き込みます！',
      '【カウンタ更新】4番地で書込先を +1（ADDI R1, 1）、5番地で残りバイト数を −1（8ビットでは +255＝ADDI R2, 255）、6番地でまだ残っていれば（JNZ R2, 2）ループ先頭へ戻ります！',
      '【全6行の答え】2: LOAD R0, [242] ／ 3: STR R0, [R1] ／ 4: ADDI R1, 1 ／ 5: ADDI R2, 255 ／ 6: JNZ R2, 2 ／ 7: CALL 32（0x40番地は命令1本2バイトなので PC=32 です！）',
    ],
    tests: [],
    rewardChip: {
      id: 'CH5_BOOT_LOADER',
      name: 'BOOT_LOADER',
      color: '#1b6d5b',
      accent: '#45d4a8',
      description: 'DISK[0xF2]から可変長バイナリをRAM[0x40]へ自動展開・起動するブートローダ',
      isLabReward: true,
    },
    codexUnlock: ['disk_bootloader'],
  },

  {
    id: 'stage_56',
    number: 56,
    act: 12,
    chapter: 5,
    code: '56',
    kind: 'ark8_os_program',
    title: '衝突なき区画台帳・物理ビットマップ割当',
    revealedTitle: '物理メモリ割当器（KALLOC_MAP）',
    scene: 'horizon_camp',
    storyBgm: 'story',
    widget: 'ark8_finale',
    mode: 'physics',
    incidentBrief: {
      where: 'ホライズン拠点・OSメモリ管理台帳（RAM 0x60..0x63）',
      trouble: '気象解析・電力制御・通信ログなど複数アプリを順番に読み込もうとしたら、みんな同じ固定番地へ上書き衝突してしまった！ 空いている区画を探して貸し出し、終わったら回収する管理係が必要だ！',
      condition: '4区画ビットマップ [96..99]（0=空き / 1=使用中）を先頭から調べて空きを確保する kalloc（14〜20番地）と、使い終わった区画を 0 へ戻す kfree（24番地）を実装せよ！（主検証 "130" ＋ 別配置検証 "231"）',
      shortRule: 'kalloc(14..20): LDR R2,[R1] → JNZ R2,19 → LDI R2,1 → STR R2,[R1] → RET → ADDI R1,1 → ADDI R0,1 ／ kfree(24): STR R2,[R0]！',
      stakes: '空きメモリの自動探索（kalloc）と解放再利用（kfree）を実装し、複数プログラムの動的共存を可能にする',
    },
    inputs: ['CLK'],
    outputs: ['CRT'],
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: null,
    asmProgramSpec: {
      arch: 'ark8_os',
      goalTitle: '目標：4区画ビットマップ[0x60..0x63]の空き探索 kalloc と解放 kfree を実装せよ！（130 ＆ 231）',
      targetCrt: '130',
      altCrt: '231',
      maxCycles: 120,
      memInspectorPreset: 'kalloc',
      kernelMeta: {
        bitmapStartAddr: 96,
        bitmapCount: 4,
        freeArgAddr: 104,
        slotNames: ['SLOT 0 (0x80)', 'SLOT 1 (0xA0)', 'SLOT 2 (0xC0)', 'SLOT 3 (0xE0)'],
      },
      sectionHeaders: {
        0: { title: '🔒 0x00 検証ドライバ（確保→確保→解放→再確保・固定）', cls: 'vec-locked' },
        12: { title: '✏️ kalloc() 空きスロット探索＆確保（7命令を実装！）', cls: 'vec-edit' },
        22: { title: '✏️ kfree(R0) メモリ解放（1命令を実装！）', cls: 'vec-edit' },
      },
      initialRam: {
        96: 1,  // Slot 0 USED
        97: 0,  // Slot 1 FREE
        98: 1,  // Slot 2 USED
        99: 0,  // Slot 3 FREE
        104: 0, // slotToFree = 0
      },
      altInitialRam: {
        96: 1,  // Slot 0 USED
        97: 1,  // Slot 1 USED
        98: 0,  // Slot 2 FREE
        99: 0,  // Slot 3 FREE
        104: 1, // slotToFree = 1
      },
      rows: [
        { addr: 0, slotId: 'line_0', locked: true, fixedPart: inst('CALL', 0, 0, 12), label: '1回目の kalloc() 呼出' },
        { addr: 1, slotId: 'line_1', locked: true, fixedPart: inst('ADDI', 0, 0, 48), label: '番号→ASCII ("0".."3")' },
        { addr: 2, slotId: 'line_2', locked: true, fixedPart: inst('STOR', 0, 0, 240), label: 'CRTへ表示' },
        { addr: 3, slotId: 'line_3', locked: true, fixedPart: inst('CALL', 0, 0, 12), label: '2回目の kalloc() 呼出' },
        { addr: 4, slotId: 'line_4', locked: true, fixedPart: inst('ADDI', 0, 0, 48), label: 'ASCII変換' },
        { addr: 5, slotId: 'line_5', locked: true, fixedPart: inst('STOR', 0, 0, 240), label: 'CRTへ表示' },
        { addr: 6, slotId: 'line_6', locked: true, fixedPart: inst('LOAD', 0, 0, 104), label: '解放対象番号を [104] から読込' },
        { addr: 7, slotId: 'line_7', locked: true, fixedPart: inst('CALL', 0, 0, 22), label: 'kfree(R0) で区画解放' },
        { addr: 8, slotId: 'line_8', locked: true, fixedPart: inst('CALL', 0, 0, 12), label: '3回目の kalloc() で再利用確認' },
        { addr: 9, slotId: 'line_9', locked: true, fixedPart: inst('ADDI', 0, 0, 48), label: 'ASCII変換' },
        { addr: 10, slotId: 'line_10', locked: true, fixedPart: inst('STOR', 0, 0, 240), label: 'CRTへ表示' },
        { addr: 11, slotId: 'line_11', locked: true, fixedPart: inst('HALT', 0, 0, 0), label: '検証完了 HALT' },
        { addr: 12, slotId: 'line_12', locked: true, fixedPart: inst('LDI', 1, 0, 96), label: '[kalloc] ビットマップ先頭 0x60(96)' },
        { addr: 13, slotId: 'line_13', locked: true, fixedPart: inst('LDI', 0, 0, 0), label: '[kalloc] スロット番号 R0=0' },
        { addr: 14, slotId: 'line_14', ideal: idOf('LDR', 2, 1, 0), label: '① bitmap[i] を R2 へ間接読込', placeholder: 'LDR R2, [R1]' },
        { addr: 15, slotId: 'line_15', ideal: idOf('JNZ', 2, 0, 19), label: '② 使用中(≠0)なら19番地へ飛ぶ', placeholder: 'JNZ R2, 19' },
        { addr: 16, slotId: 'line_16', ideal: idOf('LDI', 2, 0, 1), label: '③ 空き発見！使用中マーク 1 を準備', placeholder: 'LDI R2, 1' },
        { addr: 17, slotId: 'line_17', ideal: idOf('STR', 2, 1, 0), label: '④ bitmap[i] ← 1 (確保!)', placeholder: 'STR R2, [R1]' },
        { addr: 18, slotId: 'line_18', ideal: idOf('RET', 0, 0, 0), label: '⑤ 確保した番号 R0 を返却 RET', placeholder: 'RET' },
        { addr: 19, slotId: 'line_19', ideal: idOf('ADDI', 1, 0, 1), label: '⑥ ビットマップ番地 R1++', placeholder: 'ADDI R1, 1' },
        { addr: 20, slotId: 'line_20', ideal: idOf('ADDI', 0, 0, 1), label: '⑦ スロット番号 R0++', placeholder: 'ADDI R0, 1' },
        { addr: 21, slotId: 'line_21', locked: true, fixedPart: inst('JNZ', 0, 0, 14), label: '次スロットを走査 (14番地へ)' },
        { addr: 22, slotId: 'line_22', locked: true, fixedPart: inst('ADDI', 0, 0, 96), label: '[kfree] 番地 R0 ← 96 + slot' },
        { addr: 23, slotId: 'line_23', locked: true, fixedPart: inst('LDI', 2, 0, 0), label: '[kfree] 空きマーク 0 を R2 へ' },
        { addr: 24, slotId: 'line_24', ideal: idOf('STR', 2, 0, 0), label: '⑧ bitmap[slot] ← 0 (区画解放!)', placeholder: 'STR R2, [R0]' },
        { addr: 25, slotId: 'line_25', locked: true, fixedPart: inst('RET', 0, 0, 0), label: '解放完了 RET' },
      ],
    },
    plainGoal: 'RAM[96..99] の4スロット管理表から空き（0）を探して使用中（1）にする kalloc と、解放して 0 へ戻す kfree を実装しよう！',
    beginnerNote:
      '0〜11番地の検証ドライバが「kalloc → kalloc → kfree → 再び kalloc」の順で呼び出します！ 初期状態 [1, 0, 1, 0] なら「1番」→「3番」を確保し、0番を解放してから再確保すると「0番」が返って CRT に「130」と表示されます。画面右のビットマップランプが緑（FREE）↔橙（USED）に切り替わる様子も観察しよう！',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: 'ディスクから自動起動できるようになって大助かりだよ！ ──でもね、さっき暖房監視アプリと気象レーダー受信アプリを続けて読み込んだら、どっちも「0x40番地から置く」って決め打ちだったせいで、後から来たほうが先のを上書きして壊しちゃったの！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '動的メモリ管理：4スロット物理ビットマップ（動く図解）',
          title: '🧩 [0x60..0x63] = [USED, FREE, USED, FREE] → kalloc で空き発見＆確保！',
          anim: 'ch5_kalloc_map',
          rule: '空き（0）を探して 1 に書き換えて返すのが kalloc、使い終わったら 0 へ戻すのが kfree だ！',
          accent: '#45d4a8',
        },
        text: '固定番地の決め打ちはここまでだ！ OSが物理メモリを4つの区画（スロット 0〜3）に分け、RAM[96..99] に「0＝空き／1＝使用中」の【ビットマップ台帳】を持つんだ。空いている番号を探して貸し出す【kalloc】と、終わった区画を空きに戻す【kfree】を8命令で実装しよう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'わあっ、きれい！！ 初期状態 [1,0,1,0] から 1番・3番を順番に確保して、0番を kfree で空けた瞬間に次の kalloc がちゃんと 0番を再利用して「130」になった！！ 別テスト「231」もバッチリ合格だよ！！',
      },
      {
        speaker: 'ren',
        visualCard: {
          tag: 'モジュール図鑑へ登録：物理メモリ割当器',
          title: '🧩 KALLOC_MAP（kalloc / kfree）完成！ 衝突ゼロの動的区画管理！',
          anim: 'ch5_kalloc_map',
          rule: '次はプロセス内部で伸びる「ヒープ↑」と「↓スタック」の衝突を防ぐ【HEAP_SBRK】だ！',
          accent: '#45d4a8',
        },
        text: '『ありがとう！ ……ただ、もう1つ相談があるんだ。嵐が近づくにつれて気象観測の予報セル数が増えて、1つのプロセスの中でデータ領域がどんどん膨らんでる！ そのまま伸び続けると、上から降りてくるスタックと正面衝突しちゃわないかな！？』',
      },
    ],
    hints: [
      '【kalloc の探索（14〜15番地）】12〜13番地で R1=96（台帳ポインタ）、R0=0（スロット番号）が用意済み！ 14番地で LDR R2, [R1] で状態を読み、15番地で JNZ R2, 19（使用中なら次のスロットへスキップ）！',
      '【kalloc の確保と次走査（16〜20番地）】空き（R2=0）なら 16: LDI R2, 1 → 17: STR R2, [R1] → 18: RET で R0 を返却！ 使用中だった場合は 19: ADDI R1, 1 → 20: ADDI R0, 1 で次へ進みます！',
      '【kfree（24番地）】22〜23番地で R0 に解放先の台帳番地（96+slot）、R2 に 0 がセット済みです。24番地は STR R2, [R0] のたった1行で解放完了！',
    ],
    tests: [],
    rewardChip: {
      id: 'CH5_KALLOC_MAP',
      name: 'KALLOC_MAP',
      color: '#1b6d5b',
      accent: '#45d4a8',
      description: '4スロット物理ビットマップの動的確保（kalloc）＆解放再利用（kfree）',
      isLabReward: true,
    },
    codexUnlock: ['memory_allocator_heap'],
  },

  {
    id: 'stage_57',
    number: 57,
    act: 12,
    chapter: 5,
    code: '57',
    kind: 'ark8_os_program',
    title: 'ヒープ↑対↓スタック・衝突防衛 sbrk',
    revealedTitle: '動的ヒープ衝突ガード（HEAP_SBRK）',
    scene: 'ark5_station',
    storyBgm: 'story',
    widget: 'ark8_finale',
    mode: 'physics',
    incidentBrief: {
      where: 'ホライズン電算司令室・ユーザー砂場メモリ境界（BASE=0x80, LIMIT=64）',
      trouble: 'レンの気象解析プロセスが動的データ用にヒープ（BRK）を上方へ拡張している！ だが同じ砂場の上端からは関数コール用のスタック（SP）が下方へ降りてきており、無制限に許すと戻り番地を踏み潰してしまう！',
      condition: 'SYS_SBRK（18〜24番地）で現在の実スタック SP[246=0xF6] を読み込み、空き容量 free = SP − BRK と要求量 R1 を突き合わせて、収まらなければ OOM拒否（29番地："!"）へ逃がせ！（主検証 "H!S" ＋ 狭スタック検証 "M!Z"）',
      shortRule: '18: LOAD R2,[246] → SUB R2,R0 → JNZ R2,22 → JNZ R1,29 → ADDI R2,255 → ADDI R1,255 → JNZ R1,20！',
      stakes: 'ヒープ上端（BRK）と実スタック先端（SP）の正面衝突を事前拒否し、スタック上の重要データを守り抜く',
    },
    inputs: ['CLK'],
    outputs: ['CRT'],
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: null,
    asmProgramSpec: {
      arch: 'ark8_os',
      goalTitle: '目標：sbrk() で実スタック SP[0xF6] と BRK を比べ、安全域は拡張・衝突時は拒否せよ！（H!S ＆ M!Z）',
      targetCrt: 'H!S',
      altCrt: 'M!Z',
      maxCycles: 220,
      memInspectorPreset: 'heap_stack',
      kernelMeta: {
        brkAddr: 96,
        initialBrk: 46,
        sandboxBase: 0x80,
        sandboxLimit: 64,
      },
      sectionHeaders: {
        0: { title: '🔒 0x00 BOOT ＆ 0x08 SYSCALL 受付（固定）', cls: 'vec-locked' },
        16: { title: '✏️ sbrk(req) ヒープ↑ vs ↓スタック衝突ガード（7命令を実装！）', cls: 'vec-edit' },
        25: { title: '🔒 許可（BRK更新）＆ 拒否（OOM "!"・スタック保護・固定）', cls: 'vec-locked' },
      },
      initialRam: {
        96: 46, // BRK starts at VA 46 (above 23-inst max user code)
      },
      userPrograms: [
        {
          name: 'HEAP_APP',
          baseAddr: 0x80,
          instructions: [
            inst('LDI', 3, 0, 83),     // 0: 'S' stack sentinel
            inst('PUSH', 0, 3, 0),     // 1: SP=63
            inst('PUSH', 0, 3, 0),     // 2: SP=62 (free = 62 - 46 = 16)
            inst('LDI', 1, 0, 6),      // 3: req = 6 -> GRANTED (BRK: 46->52)
            inst('LDI', 0, 0, 1),      // 4: SYS_SBRK
            inst('SYSCALL', 0, 0, 1),  // 5: returns old BRK=46
            inst('LDI', 2, 0, 72),     // 6: 'H'
            inst('STR', 2, 0, 0),      // 7: write 'H' into heap[46]
            inst('LDR', 1, 0, 0),      // 8: read back 'H'
            inst('LDI', 0, 0, 2),      // 9: SYS_WRITE
            inst('SYSCALL', 0, 0, 2),  // 10: prints 'H'
            inst('LDI', 1, 0, 14),     // 11: req = 14 (52+14=66 > SP=62 -> OOM!)
            inst('LDI', 0, 0, 1),      // 12: SYS_SBRK
            inst('SYSCALL', 0, 0, 1),  // 13: rejected -> '!'
            inst('POP', 1, 0, 0),      // 14: pop intact 'S' from stack!
            inst('LDI', 0, 0, 2),      // 15: SYS_WRITE
            inst('SYSCALL', 0, 0, 2),  // 16: prints 'S'
            inst('LDI', 0, 0, 3),      // 17: SYS_EXIT
            inst('SYSCALL', 0, 0, 3),  // 18: exit!
          ],
        },
      ],
      altUserPrograms: [
        {
          name: 'TIGHT_STACK_APP',
          baseAddr: 0x80,
          instructions: [
            inst('LDI', 3, 0, 90),     // 0: 'Z' sentinel
            inst('PUSH', 0, 3, 0),     // 1: SP=63
            inst('PUSH', 0, 3, 0),     // 2: SP=62
            inst('PUSH', 0, 3, 0),     // 3: SP=61
            inst('PUSH', 0, 3, 0),     // 4: SP=60
            inst('PUSH', 0, 3, 0),     // 5: SP=59
            inst('PUSH', 0, 3, 0),     // 6: SP=58 (free = 58 - 46 = 12)
            inst('LDI', 1, 0, 6),      // 7: req = 6 -> GRANTED (BRK: 46->52, free=6)
            inst('LDI', 0, 0, 1),
            inst('SYSCALL', 0, 0, 1),
            inst('LDI', 2, 0, 77),     // 10: 'M'
            inst('STR', 2, 0, 0),
            inst('LDR', 1, 0, 0),
            inst('LDI', 0, 0, 2),
            inst('SYSCALL', 0, 0, 2),  // prints 'M'
            inst('LDI', 1, 0, 8),      // 15: req = 8 (52+8=60 > SP=58 -> OOM!)
            inst('LDI', 0, 0, 1),
            inst('SYSCALL', 0, 0, 1),  // prints '!'
            inst('POP', 1, 0, 0),      // pop 'Z'
            inst('LDI', 0, 0, 2),
            inst('SYSCALL', 0, 0, 2),  // prints 'Z'
            inst('LDI', 0, 0, 3),
            inst('SYSCALL', 0, 0, 3),
          ],
        },
      ],
      kernelLib: [
        { addr: 33, part: inst('LDI', 0, 0, 128), module: 'boot_init' },
        { addr: 34, part: inst('STOR', 0, 0, 244), module: 'boot_init' },
        { addr: 35, part: inst('LDI', 0, 0, 64), module: 'boot_init' },
        { addr: 36, part: inst('STOR', 0, 0, 245), module: 'boot_init' },
        { addr: 37, part: inst('STOR', 0, 0, 246), module: 'boot_init' },
        { addr: 38, part: inst('IRET', 0, 0, 0), module: 'boot_init' },
        { addr: 40, part: inst('ADDI', 0, 0, 255), module: 'sys_io' },
        { addr: 41, part: inst('JNZ', 0, 0, 44), module: 'sys_io' },
        { addr: 42, part: inst('STOR', 0, 1, 240), module: 'sys_io' },
        { addr: 43, part: inst('IRET', 0, 0, 0), module: 'sys_io' },
        { addr: 44, part: inst('HALT', 0, 0, 0), module: 'sys_io' },
      ],
      rows: [
        { addr: 0, slotId: 'line_0', locked: true, fixedPart: inst('LDI', 0, 0, 1), label: 'Boot：初期化ルーチン(33番)へ' },
        { addr: 1, slotId: 'line_1', locked: true, fixedPart: inst('JNZ', 0, 0, 33), label: 'BASE=0x80, LIMIT=64, SP=64 で起動' },
        { addr: 8, slotId: 'line_8', locked: true, fixedPart: inst('ADDI', 0, 0, 255), label: '[0x08] R0=1なら0(sbrk)／他は40番へ' },
        { addr: 9, slotId: 'line_9', locked: true, fixedPart: inst('JNZ', 0, 0, 40), label: 'WRITE/EXITは40番へ分岐' },
        { addr: 10, slotId: 'line_10', locked: true, fixedPart: inst('LDI', 0, 0, 1), label: 'sbrk本体(16番地)へ' },
        { addr: 11, slotId: 'line_11', locked: true, fixedPart: inst('JNZ', 0, 0, 16), label: 'sbrkへジャンプ' },
        { addr: 12, slotId: 'line_12', locked: true, fixedPart: inst('HALT', 0, 0, 0), label: '[0x0C FAULT] 安全停止' },
        { addr: 16, slotId: 'line_16', locked: true, fixedPart: inst('LOAD', 0, 0, 96), label: '[sbrk] 現在ヒープ上端 BRK ← [96]' },
        { addr: 17, slotId: 'line_17', locked: true, fixedPart: inst('STOR', 0, 1, 97), label: '要求サイズ req(R1) を [97] へ保存' },
        { addr: 18, slotId: 'line_18', ideal: idOf('LOAD', 2, 0, 246), label: '① 現在の実スタック SP ← [246=0xF6]', placeholder: 'LOAD R2, [246]' },
        { addr: 19, slotId: 'line_19', ideal: idOf('SUB', 2, 0, 0), label: '② 空き容量 R2 ← SP − BRK', placeholder: 'SUB R2, R0' },
        { addr: 20, slotId: 'line_20', ideal: idOf('JNZ', 2, 0, 22), label: '③ 空き≠0なら減算へ(22番)／0なら衝突確認', placeholder: 'JNZ R2, 22' },
        { addr: 21, slotId: 'line_21', ideal: idOf('JNZ', 1, 0, 29), label: '④ 空き0でreq残存→OOM拒否(29番へ!)', placeholder: 'JNZ R1, 29' },
        { addr: 22, slotId: 'line_22', ideal: idOf('ADDI', 2, 0, 255), label: '⑤ 空き容量 R2--', placeholder: 'ADDI R2, 255' },
        { addr: 23, slotId: 'line_23', ideal: idOf('ADDI', 1, 0, 255), label: '⑥ 残り要求 R1--', placeholder: 'ADDI R1, 255' },
        { addr: 24, slotId: 'line_24', ideal: idOf('JNZ', 1, 0, 20), label: '⑦ req≠0なら20番地へ検査続行', placeholder: 'JNZ R1, 20' },
        { addr: 25, slotId: 'line_25', locked: true, fixedPart: inst('LOAD', 1, 0, 97), label: '[許可] 保存済み req を R1 へ復元' },
        { addr: 26, slotId: 'line_26', locked: true, fixedPart: inst('ADD', 1, 0, 0), label: '[許可] 新BRK ← 旧BRK + req' },
        { addr: 27, slotId: 'line_27', locked: true, fixedPart: inst('STOR', 0, 1, 96), label: '[許可] BRK[96] 更新 (旧BRKをR0返却)' },
        { addr: 28, slotId: 'line_28', locked: true, fixedPart: inst('IRET', 0, 0, 0), label: '[許可] ユーザーへ安全復帰' },
        { addr: 29, slotId: 'line_29', locked: true, fixedPart: inst('LDI', 0, 0, 33), label: '[拒否] 衝突回避マーク "!" (33)' },
        { addr: 30, slotId: 'line_30', locked: true, fixedPart: inst('STOR', 0, 0, 240), label: '[拒否] CRTへ "!" を警告出力' },
        { addr: 31, slotId: 'line_31', locked: true, fixedPart: inst('LDI', 0, 0, 0), label: '[拒否] NULL(0)返却・BRK不変!' },
        { addr: 32, slotId: 'line_32', locked: true, fixedPart: inst('IRET', 0, 0, 0), label: '[拒否] スタック無傷で復帰' },
      ],
    },
    plainGoal: '動的ヒープ拡張 sbrk() の心臓部（18〜24番地）を実装し、実スタック SP と現在 BRK の空き容量を測って安全域だけ許可・衝突要求は OOM 拒否しよう！',
    beginnerNote:
      'ユーザーアプリは最初にスタックへ番兵文字 "S" を積み、次に sbrk(6) で確保したヒープへ "H" を書き戻して表示、続いて大きすぎる sbrk(14) を要求して拒否("!")されたあと、スタックから無傷の "S" を POP して "H!S" を完成させます！ 固定のしきい値をごまかすと、スタックを深く積んだ別検証 "M!Z"（req=8 でも衝突！）で見抜かれます！',
    introDialogue: [
      {
        speaker: 'ren',
        showIncident: true,
        text: '『北の嵐セルが急拡大して、観測バッファがどんどん大きくなってる！ プロセスの中で動的にメモリを伸ばせる UNIX の【sbrk】がほしいんだけど──伸ばしすぎたときに、上から降りてくるスタックの戻り番地を潰さないようにできる？』',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'UNIXメモリ配置：下からヒープ↑ vs 上からスタック↓（動く図解）',
          title: '📏 空き容量 = SP[0xF6] − BRK[96]！ req > 空き なら OOM("!")で即拒否！',
          anim: 'ch5_heap_sbrk',
          rule: 'R2(空き) と R1(要求) を1ずつ減らし、R2 が先に 0 になったら即 29番地（拒否）へ逃がすぞ！',
          accent: '#45d4a8',
        },
        text: 'これぞ計算機科学の名設計だ！ 1つの砂場の中で、コードの後ろから上へ伸びる【ヒープ（BRK）】と、上端から下へ伸びる【スタック（SP）】を向かい合わせに配置する。18〜24番地で実ハードウェアの SP（246番地）を読んで空き容量 R2 = SP − BRK を計算し、要求サイズ R1 が収まるか1バイトずつ安全検査するガードを組もう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'ren',
        text: '『やった！！ 1回目の sbrk(6) でヒープに "H" を安全に書けて、無茶な sbrk(14) は衝突直前で "!" と弾かれ、最後にスタックの "S" も無傷で取り出せて "H!S"！！ スタックが深い別ケース "M!Z" も完璧に見抜いたよ！！』',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：動的ヒープ衝突ガード',
          title: '📏 HEAP_SBRK（SYS_SBRK）完成！ ヒープとスタックの安全境界を死守！',
          anim: 'ch5_heap_sbrk',
          rule: 'ACT XII の締めくくりは、画面・キーボード・終了を1つの窓口で捌く【SYSCALL_MUX】だ！',
          accent: '#45d4a8',
        },
        text: 'これでメモリ管理の2大柱──物理スロット割当とプロセス内ヒープ保護の両方が整った。さあ ACT XII 最後の仕上げとして、ユーザーアプリがキーボード入力まで安全に扱える統一システムコール窓口を完成させよう！',
      },
    ],
    hints: [
      '【空き容量の算出（18〜19番地）】16〜17番地で R0 に現在 BRK、R1 に要求サイズ req が入っています。18: LOAD R2, [246] で実スタック SP を読み込み、19: SUB R2, R0 で空き容量 R2 = SP − BRK を計算！',
      '【大小比較ループ（20〜24番地）】20: JNZ R2, 22（まだ空きがあれば 22番地で減算）、もし R2==0 なら 21: JNZ R1, 29（空き尽きたのに req 残存 → OOM拒否29番地へ！）。両方 0 ならちょうど満杯で 25番地の許可ルートへ抜けます！',
      '【全7行の答え】18: LOAD R2, [246] ／ 19: SUB R2, R0 ／ 20: JNZ R2, 22 ／ 21: JNZ R1, 29 ／ 22: ADDI R2, 255 ／ 23: ADDI R1, 255 ／ 24: JNZ R1, 20！',
    ],
    tests: [],
    rewardChip: {
      id: 'CH5_HEAP_SBRK',
      name: 'HEAP_SBRK',
      color: '#1b6d5b',
      accent: '#45d4a8',
      description: '実スタックSP[0xF6]とBRKを照合しヒープ衝突を未然拒否する動的ヒープ拡張sbrk',
      isLabReward: true,
    },
    codexUnlock: ['memory_allocator_heap'],
  },

  {
    id: 'stage_58',
    number: 58,
    act: 12,
    chapter: 5,
    code: '58',
    kind: 'ark8_os_program',
    title: '統一OS窓口・マルチシステムコール分岐',
    revealedTitle: 'マルチ・システムコール窓口（SYSCALL_MUX）',
    scene: 'ark5_station',
    storyBgm: 'story',
    widget: 'ark8_finale',
    mode: 'physics',
    incidentBrief: {
      where: 'ホライズン電算司令室・0x08 SYSCALL ディスパッチャ',
      trouble: '嵐に備えて操作員がキーボードからコマンドを打てる端末アプリを動かしたいが、ユーザーモード（K=0）は CRT[0xF0] にもキーボード[0xF1] にも HALT にも直接触れられない！',
      condition: '0x08 SYSCALL 窓口（8〜11番地・16〜19番地）で R0 の番号を判別し、1=SYS_WRITE（CRT出力）、2=SYS_READ（KB[241]読出→R1）、3=SYS_EXIT（20番地HALT）を振り分けよ！（主検証 "ARK8" ＋ 別入力検証 "UNIX!"）',
      shortRule: '8..11: ADDI R0,255 → JNZ R0,16 → STOR R1,[240] → IRET ／ 16..19: ADDI R0,255 → JNZ R0,20 → LOAD R1,[241] → IRET！',
      stakes: '1つの特権窓口 0x08 から文字出力・キーボード読込・プロセス終了を安全に仲介する UNIX 型システムコール規約を完成させる',
    },
    inputs: ['CLK'],
    outputs: ['CRT'],
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: null,
    asmProgramSpec: {
      arch: 'ark8_os',
      goalTitle: '目標：0x08 SYSCALL窓口で 1:WRITE / 2:READ(KB) / 3:EXIT を振り分けよ！（ARK8 ＆ UNIX!）',
      targetCrt: 'ARK8',
      altCrt: 'UNIX!',
      maxCycles: 160,
      memInspectorPreset: 'syscall',
      kernelMeta: {
        sandboxBase: 0x80,
        sandboxLimit: 32,
        syscalls: [
          { num: 1, name: 'SYS_WRITE', desc: 'CRT[0xF0] ← R1' },
          { num: 2, name: 'SYS_READ', desc: 'R1 ← KB[0xF1]' },
          { num: 3, name: 'SYS_EXIT', desc: '安全停止 HALT' },
        ],
      },
      sectionHeaders: {
        0: { title: '🔒 0x00 BOOT（砂場 BASE=0x80 起動・固定）', cls: 'vec-locked' },
        8: { title: '📞 0x08 SYSCALL 分岐 ① SYS_WRITE (R0=1)（4命令を実装！）', cls: 'vec-syscall' },
        12: { title: '🛡 0x0C FAULT（固定）', cls: 'vec-fault' },
        16: { title: '📞 SYSCALL 分岐 ② SYS_READ (R0=2) ＆ ③ EXIT (R0=3)（4命令を実装！）', cls: 'vec-syscall' },
        20: { title: '🔒 EXIT ＆ INIT（固定）', cls: 'vec-locked' },
      },
      initialKeys: 'ARK8',
      altKeys: 'UNIX!',
      userPrograms: [
        {
          name: 'KB_ECHO_APP',
          baseAddr: 0x80,
          instructions: [
            inst('LDI', 0, 0, 2),      // 0: SYS_READ
            inst('SYSCALL', 0, 0, 2),  // 1: R1 <- KB[0xF1]
            inst('JNZ', 1, 0, 5),      // 2: char != 0 -> write
            inst('LDI', 0, 0, 3),      // 3: SYS_EXIT
            inst('SYSCALL', 0, 0, 3),  // 4: exit!
            inst('LDI', 0, 0, 1),      // 5: SYS_WRITE
            inst('SYSCALL', 0, 0, 1),  // 6: CRT <- R1
            inst('LDI', 2, 0, 1),      // 7: loop
            inst('JNZ', 2, 0, 0),      // 8: -> 0
          ],
        },
      ],
      rows: [
        { addr: 0, slotId: 'line_0', locked: true, fixedPart: inst('LDI', 0, 0, 128), label: 'Boot：BASE=0x80(128)' },
        { addr: 1, slotId: 'line_1', locked: true, fixedPart: inst('STOR', 0, 0, 244), label: 'MMU_BASE[0xF4] ← 128' },
        { addr: 2, slotId: 'line_2', locked: true, fixedPart: inst('LDI', 0, 0, 32), label: 'LIMIT=0x20(32)' },
        { addr: 3, slotId: 'line_3', locked: true, fixedPart: inst('JNZ', 0, 0, 21), label: 'Init(21番地)へ' },
        { addr: 8, slotId: 'line_8', ideal: idOf('ADDI', 0, 0, 255), label: '① 番号R0を-1 (1:WRITE→0)', placeholder: 'ADDI R0, 255' },
        { addr: 9, slotId: 'line_9', ideal: idOf('JNZ', 0, 0, 16), label: '② WRITEでなければ16番地へ', placeholder: 'JNZ R0, 16' },
        { addr: 10, slotId: 'line_10', ideal: idOf('STOR', 0, 1, 240), label: '③ [WRITE] R1をCRT[240]へ出力', placeholder: 'STOR R1, [240]' },
        { addr: 11, slotId: 'line_11', ideal: idOf('IRET', 0, 0, 0), label: '④ [WRITE] ユーザーへ復帰', placeholder: 'IRET' },
        { addr: 12, slotId: 'line_12', locked: true, fixedPart: inst('HALT', 0, 0, 0), label: '[0x0C FAULT] 安全停止' },
        { addr: 16, slotId: 'line_16', ideal: idOf('ADDI', 0, 0, 255), label: '⑤ さらに-1 (2:READ→0)', placeholder: 'ADDI R0, 255' },
        { addr: 17, slotId: 'line_17', ideal: idOf('JNZ', 0, 0, 20), label: '⑥ READでなければEXIT(20番)へ', placeholder: 'JNZ R0, 20' },
        { addr: 18, slotId: 'line_18', ideal: idOf('LOAD', 1, 0, 241), label: '⑦ [READ] KB[241]から1文字読込→R1', placeholder: 'LOAD R1, [241]' },
        { addr: 19, slotId: 'line_19', ideal: idOf('IRET', 0, 0, 0), label: '⑧ [READ] ユーザーへ復帰', placeholder: 'IRET' },
        { addr: 20, slotId: 'line_20', locked: true, fixedPart: inst('HALT', 0, 0, 0), label: '[EXIT] プロセス正常終了 HALT' },
        { addr: 21, slotId: 'line_21', locked: true, fixedPart: inst('STOR', 0, 0, 245), label: 'MMU_LIMIT[0xF5] ← 32' },
        { addr: 22, slotId: 'line_22', locked: true, fixedPart: inst('IRET', 0, 0, 0), label: 'ユーザーモード(PC=0)へ降格!' },
      ],
    },
    plainGoal: '0x08 のシステムコール入口で R0 の番号（1=WRITE / 2=READ / 3=EXIT）を振り分け、キーボード入力を1文字ずつエメラルドCRTへ返す対話ループを動かそう！',
    beginnerNote:
      '砂場（0x80）のユーザーアプリは「R0=2 でキーボード読込 → 0でなければ R0=1 でCRT表示 → 0（入力終了）なら R0=3 で終了」という本物のUNIX型エコー処理を実行します！ 番号比較は「ADDI R0, 255（−1）して 0 か？」を2段階並べるだけで、1→WRITE、2→READ、3→EXIT へ美しく分岐できます！',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: 'キーボードから文字を読み取って画面へ出すユーザーアプリを作ったんだけど、K=0 のままだとキーボード（0xF1）も画面（0xF0）も PRIV_CTRL に弾かれちゃう！ かといって、機能ごとに新しいCPU命令を増やすわけにもいかないよね？',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'UNIX型OSインターフェース：マルチSYSCALL分岐（動く図解）',
          title: '📞 0x08 窓口 → R0=1(WRITE:0xF0) / R0=2(READ:0xF1) / R0=3(EXIT:HALT)！',
          anim: 'ch5_syscall_mux',
          rule: 'R0 を「−1（+255）」して 0 なら該当処理、0 でなければ次へ！ たった8命令で全OSサービスを捌くぞ！',
          accent: '#45d4a8',
        },
        text: 'その答えが1971年の UNIX から現代の Linux・macOS まで変わらぬ名設計──【マルチ・システムコール分岐（ディスパッチャ）】だ！ 入口は 0x08 のたった1箇所のまま、R0 に番号（1=WRITE・2=READ・3=EXIT）、R1 に文字データを入れて呼び出す約束事（ABI）を実装しよう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: 'すごいっ！！ キーボードに打ち込んだ "ARK8" も、別テストの "UNIX!" も、ユーザーアプリから 10回以上のシステムコール経由で1文字ずつ安全に画面へ返ってきたよ！！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: 'ACT XII 完了 ＆ モジュール図鑑へ登録',
          title: '📞 SYSCALL_MUX 完成！ ……警報！！ 電磁ブリザード第1波が到達した！！',
          anim: 'ch5_syscall_mux',
          rule: '準備の幕（ACT XII）は完了──ここからは嵐の本番【ACT XIII：マルチタスクとカーネル中核】だ！！',
          accent: '#ff7b54',
        },
        text: '『……緊急警報！！ 外部風速 48m/s、太陽フレア磁気波がホライズン上空へ直撃した！！ 起動・メモリ・システムコールの土台はギリギリ間に合ったぞ──ここからは第13幕、たった1個のCPUで気象と電力を同時防衛するマルチタスク戦へ突入だ！！』',
      },
    ],
    hints: [
      '【SYS_WRITE 分岐（8〜11番地）】8: ADDI R0, 255（R0が1なら0に！）、9: JNZ R0, 16（0でなければ READ/EXIT 判定へ）。0なら 10: STOR R1, [240] で CRT へ出力し、11: IRET で復帰！',
      '【SYS_READ ＆ EXIT 分岐（16〜19番地）】16番地に来た時点で元の 2 は 1、3 は 2 になっています！ もう1回 16: ADDI R0, 255 して、17: JNZ R0, 20（0でなければ EXIT の 20番地へ！）。',
      '【全8行の答え】8: ADDI R0, 255 ／ 9: JNZ R0, 16 ／ 10: STOR R1, [240] ／ 11: IRET ／ 16: ADDI R0, 255 ／ 17: JNZ R0, 20 ／ 18: LOAD R1, [241] ／ 19: IRET！',
    ],
    tests: [],
    rewardChip: {
      id: 'CH5_SYSCALL_MUX',
      name: 'SYSCALL_MUX',
      color: '#1b6d5b',
      accent: '#45d4a8',
      description: '0x08窓口でR0番号によりSYS_WRITE/SYS_READ/SYS_EXITを振り分けるOSディスパッチャ',
      isLabReward: true,
    },
    codexUnlock: ['syscall_abi_dispatch'],
  },

  // =========================================================================
  // ACT XIII — MULTITASKING & KERNEL CORE (STAGE 59–62)
  // =========================================================================
  {
    id: 'stage_59',
    number: 59,
    act: 13,
    chapter: 5,
    code: '59',
    kind: 'ark8_os_program',
    title: '嵐の幕開け・PCBとvDSOコンテキストスイッチ',
    revealedTitle: 'PCBコンテキストスイッチ（PCB_CTX_SW）',
    scene: 'storm_core',
    storyBgm: 'crisis',
    widget: 'ark8_finale',
    mode: 'physics',
    incidentBrief: {
      where: 'ホライズン電算司令室・磁気嵐警戒（2プロセス同時管制）',
      trouble: '成層圏・電磁ブリザードがホライズン拠点へ到達！ 気象観測プロセス P0（"A"→"B"）と電力制御プロセス P1（"1"→"2"）をたった1個のCPUで交互に走らせねばならないが、切替のたびに MMU・スタック・レジスタが混ざって壊れてしまう！',
      condition: 'restore_ctx の心臓部（23〜29番地）を実装し、次プロセスの MMU_BASE[244] 切替・物理スタック頂点 PA=base+sp への EPC ＆ R0 積込・仮想SP退避（sp−2）を行い、vDSO（POP R0; RET）で2プロセスを無破壊交代させよ！（"A1B2" ＆ "W3X4"）',
      shortRule: '23..29: STOR R3,[244] → ADD R3,R2 → STOR R3,[246] → PUSH R1 → PUSH R0 → ADDI R2,254 → STOR R2,[114]！',
      stakes: 'PCB台帳とユーザー末尾の vDSO トランポリンを連動させ、1ビットも失わない本物のコンテキストスイッチを完成させる',
    },
    inputs: ['CLK'],
    outputs: ['CRT'],
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: null,
    asmProgramSpec: {
      arch: 'ark8_os',
      goalTitle: '目標：PCBから次プロセスのMMU・スタック・vDSO復帰枠を切替え、2プロセスを無破壊交代せよ！（A1B2 ＆ W3X4）',
      targetCrt: 'A1B2',
      altCrt: 'W3X4',
      maxCycles: 400,
      memInspectorPreset: 'pcb_mt',
      kernelMeta: {
        pcb0Addr: 96,
        pcb1Addr: 104,
        curPcbAddr: 118,
        vdsoPc: 16,
        sandboxLimit: 36,
        procLabels: ['P0 (気象A)', 'P1 (電力1)'],
      },
      sectionHeaders: {
        0: { title: '🔒 0x00 BOOT ＆ vDSO復帰ゲート（固定）', cls: 'vec-locked' },
        16: { title: '🔒 restore_ctx 前半：次PCBから base/epc/sp/r0 を取出（固定）', cls: 'vec-ctx' },
        23: { title: '✏️ コンテキスト切替の心臓部：MMU切替＋スタック退避（7命令を実装！）', cls: 'vec-edit' },
        30: { title: '🔒 restore_ctx 後半：R1..R3復元 → vDSO降格（固定）', cls: 'vec-locked' },
      },
      initialRam: {
        // PCB 0 (96..103): [state, base=128, epc=0, sp=32, r0..r3=0]
        96: 1, 97: 128, 98: 0, 99: 32, 100: 0, 101: 0, 102: 0, 103: 0,
        // PCB 1 (104..111): [state, base=164, epc=0, sp=32, r0..r3=0]
        104: 1, 105: 164, 106: 0, 107: 32, 108: 0, 109: 0, 110: 0, 111: 0,
        118: 96, // cur_pcb (96 <-> 104 via 200 - x)
      },
      userPrograms: [
        { name: 'PROC_A', baseAddr: 128, instructions: makeCoopUserProc(65), vdsoPc: 16 }, // 'A'->'B'
        { name: 'PROC_1', baseAddr: 164, instructions: makeCoopUserProc(49), vdsoPc: 16 }, // '1'->'2'
      ],
      altUserPrograms: [
        { name: 'PROC_W', baseAddr: 128, instructions: makeCoopUserProc(87), vdsoPc: 16 }, // 'W'->'X'
        { name: 'PROC_3', baseAddr: 164, instructions: makeCoopUserProc(51), vdsoPc: 16 }, // '3'->'4'
      ],
      kernelLib: [
        // save_ctx (100..114): saves R0(=1 on YIELD), R1..R3, SP, EPC into cur_pcb
        { addr: 100, part: inst('STOR', 0, 0, 112), module: 'save_ctx' },
        { addr: 101, part: inst('LOAD', 0, 0, 246), module: 'save_ctx' },
        { addr: 102, part: inst('STOR', 0, 0, 113), module: 'save_ctx' },
        { addr: 103, part: inst('LOAD', 0, 0, 118), module: 'save_ctx' },
        { addr: 104, part: inst('ADDI', 0, 0, 8), module: 'save_ctx' },
        { addr: 105, part: inst('STOR', 0, 0, 246), module: 'save_ctx' },
        { addr: 106, part: inst('PUSH', 0, 3, 0), module: 'save_ctx' },
        { addr: 107, part: inst('PUSH', 0, 2, 0), module: 'save_ctx' },
        { addr: 108, part: inst('PUSH', 0, 1, 0), module: 'save_ctx' },
        { addr: 109, part: inst('LOAD', 0, 0, 112), module: 'save_ctx' },
        { addr: 110, part: inst('PUSH', 0, 0, 0), module: 'save_ctx' },
        { addr: 111, part: inst('LOAD', 0, 0, 113), module: 'save_ctx' },
        { addr: 112, part: inst('PUSH', 0, 0, 0), module: 'save_ctx' },
        { addr: 113, part: inst('LOAD', 1, 0, 247), module: 'save_ctx' },
        { addr: 114, part: inst('PUSH', 0, 1, 0), module: 'save_ctx' },
        // sched (115..119 + 4..7, 10..11)
        { addr: 115, part: inst('LOAD', 1, 0, 118), module: 'sched' },
        { addr: 116, part: inst('LDI', 0, 0, 200), module: 'sched' },
        { addr: 117, part: inst('SUB', 0, 1, 0), module: 'sched' },
        { addr: 118, part: inst('LDR', 2, 0, 0), module: 'sched' },
        { addr: 119, part: inst('JNZ', 1, 0, 4), module: 'sched' },
        { addr: 4, part: inst('JNZ', 2, 0, 16), module: 'sched' },
        { addr: 5, part: inst('LDR', 2, 1, 0), module: 'sched' },
        { addr: 6, part: inst('JNZ', 2, 0, 10), module: 'sched' },
        { addr: 7, part: inst('HALT', 0, 0, 0), module: 'sched' },
        { addr: 10, part: inst('LOAD', 0, 0, 118), module: 'sched' },
        { addr: 11, part: inst('JNZ', 0, 0, 16), module: 'sched' },
        // syscall WRITE/EXIT/YIELD (39..47)
        { addr: 39, part: inst('ADDI', 0, 0, 255), module: 'syscall' },
        { addr: 40, part: inst('JNZ', 0, 0, 43), module: 'syscall' },
        { addr: 41, part: inst('STOR', 0, 1, 240), module: 'syscall' },
        { addr: 42, part: inst('IRET', 0, 0, 0), module: 'syscall' },
        { addr: 43, part: inst('ADDI', 0, 0, 254), module: 'syscall' },
        { addr: 44, part: inst('JNZ', 0, 0, 100), module: 'syscall' },
        { addr: 45, part: inst('LOAD', 1, 0, 118), module: 'syscall' },
        { addr: 46, part: inst('STR', 0, 1, 0), module: 'syscall' },
        { addr: 47, part: inst('JNZ', 1, 0, 115), module: 'syscall' },
      ],
      rows: [
        { addr: 0, slotId: 'line_0', locked: true, fixedPart: inst('LDI', 0, 0, 36), label: 'Boot：LIMIT=36(0x24) を準備' },
        { addr: 1, slotId: 'line_1', locked: true, fixedPart: inst('STOR', 0, 0, 245), label: 'Boot：MMU_LIMIT[245] ← 36' },
        { addr: 2, slotId: 'line_2', locked: true, fixedPart: inst('LDI', 0, 0, 96), label: 'Boot：最初のプロセス PCB0(96) を選択' },
        { addr: 3, slotId: 'line_3', locked: true, fixedPart: inst('JNZ', 0, 0, 16), label: 'Boot：restore_ctx(16番)で起動!' },
        { addr: 8, slotId: 'line_8', locked: true, fixedPart: inst('JNZ', 0, 0, 39), label: '[0x08] R0≠0なら通常SYSCALL(39番)' },
        { addr: 9, slotId: 'line_9', locked: true, fixedPart: inst('IRET', 0, 0, 0), label: '[0x08] R0=0ならユーザーvDSO(PC16)へ降格!' },
        { addr: 12, slotId: 'line_12', locked: true, fixedPart: inst('HALT', 0, 0, 0), label: '[0x0C FAULT] 安全停止' },
        { addr: 14, slotId: 'line_14', locked: true, fixedPart: inst('LDI', 0, 0, 0), label: '[vDSO] R0=0 をセット' },
        { addr: 15, slotId: 'line_15', locked: true, fixedPart: inst('SYSCALL', 0, 0, 0), label: '[vDSO] EPC←16 にして 0x08→IRET!' },
        { addr: 16, slotId: 'line_16', locked: true, fixedPart: inst('STOR', 0, 0, 118), label: '[ctx] cur_pcb[118] ← 切替先PCB(R0)' },
        { addr: 17, slotId: 'line_17', locked: true, fixedPart: inst('ADDI', 0, 0, 1), label: '[ctx] PCB+1(base) へ移動' },
        { addr: 18, slotId: 'line_18', locked: true, fixedPart: inst('STOR', 0, 0, 246), label: '[ctx] SP ← PCB+1' },
        { addr: 19, slotId: 'line_19', locked: true, fixedPart: inst('POP', 3, 0, 0), label: '[ctx] R3 ← next.base' },
        { addr: 20, slotId: 'line_20', locked: true, fixedPart: inst('POP', 1, 0, 0), label: '[ctx] R1 ← next.epc' },
        { addr: 21, slotId: 'line_21', locked: true, fixedPart: inst('POP', 2, 0, 0), label: '[ctx] R2 ← next.sp' },
        { addr: 22, slotId: 'line_22', locked: true, fixedPart: inst('POP', 0, 0, 0), label: '[ctx] R0 ← next.r0' },
        { addr: 23, slotId: 'line_23', ideal: idOf('STOR', 0, 3, 244), label: '① MMU_BASE[244] ← next.base(R3) 砂場切替!', placeholder: 'STOR R3, [244]' },
        { addr: 24, slotId: 'line_24', ideal: idOf('ADD', 3, 2, 0), label: '② 物理スタック頂点 R3 ← base + sp', placeholder: 'ADD R3, R2' },
        { addr: 25, slotId: 'line_25', ideal: idOf('STOR', 0, 3, 246), label: '③ SP[246] ← 物理スタック頂点 R3', placeholder: 'STOR R3, [246]' },
        { addr: 26, slotId: 'line_26', ideal: idOf('PUSH', 0, 1, 0), label: '④ next.epc(R1) をユーザースタックへ積む', placeholder: 'PUSH R1' },
        { addr: 27, slotId: 'line_27', ideal: idOf('PUSH', 0, 0, 0), label: '⑤ next.r0(R0) をユーザースタックへ積む', placeholder: 'PUSH R0' },
        { addr: 28, slotId: 'line_28', ideal: idOf('ADDI', 2, 0, 254), label: '⑥ 仮想SP ← next.sp − 2 (+254)', placeholder: 'ADDI R2, 254' },
        { addr: 29, slotId: 'line_29', ideal: idOf('STOR', 0, 2, 114), label: '⑦ 仮想SPを [114] へ退避', placeholder: 'STOR R2, [114]' },
        { addr: 30, slotId: 'line_30', locked: true, fixedPart: inst('LOAD', 0, 0, 118), label: '[復帰] cur_pcb 読込' },
        { addr: 31, slotId: 'line_31', locked: true, fixedPart: inst('ADDI', 0, 0, 5), label: '[復帰] PCB+5(r1) へ移動' },
        { addr: 32, slotId: 'line_32', locked: true, fixedPart: inst('STOR', 0, 0, 246), label: '[復帰] SP ← PCB+5' },
        { addr: 33, slotId: 'line_33', locked: true, fixedPart: inst('POP', 1, 0, 0), label: '[復帰] R1 ← next.r1' },
        { addr: 34, slotId: 'line_34', locked: true, fixedPart: inst('POP', 2, 0, 0), label: '[復帰] R2 ← next.r2' },
        { addr: 35, slotId: 'line_35', locked: true, fixedPart: inst('POP', 3, 0, 0), label: '[復帰] R3 ← next.r3' },
        { addr: 36, slotId: 'line_36', locked: true, fixedPart: inst('LOAD', 0, 0, 114), label: '[復帰] 仮想SP [114] を読込' },
        { addr: 37, slotId: 'line_37', locked: true, fixedPart: inst('STOR', 0, 0, 246), label: '[復帰] SP_REG[246] ← 仮想SP' },
        { addr: 38, slotId: 'line_38', locked: true, fixedPart: inst('JNZ', 0, 0, 14), label: '[復帰] PC14(vDSO起動)へ跳躍!' },
      ],
    },
    plainGoal: '次プロセスの PCB（base・epc・sp・r0）から MMU とユーザースタック上の vDSO 復帰枠を組み立て、気象P0と電力P1を無破壊交代させよう！',
    beginnerNote:
      '19〜22番地で R3=next.base、R1=next.epc、R2=next.sp、R0=next.r0 が取り出されています！ カーネルは K=1（物理番地直通）なので、物理スタック頂点 PA = base + sp を SP[246] へセットして next.epc → next.r0 の順に PUSH し、仮想SP（next.sp − 2）を [114] へ保存すると、後半の vDSO（ユーザー空間の POP R0; RET）が R0 と PC と SP を完璧に元へ戻してくれます！',
    introDialogue: [
      {
        speaker: 'kai',
        showIncident: true,
        text: '外を見ろ、空が磁気嵐のオーロラで真っ紫だ！！ 吹雪が屋根を叩いて室温が一気に下がり始めた──気象観測 P0 と電力制御 P1 の両方を、この1台の ARK8_OS_HW で交互に回し続けなきゃ拠点が持たねえ！！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '第13幕・マルチタスクの心臓：PCB ＆ vDSO復帰（動く図解）',
          title: '🔄 PCB0 ↔ PCB1：MMU_BASE切替 ＋ ユーザースタックへ EPC/R0 積込 → vDSO(POP R0; RET)！',
          anim: 'ch5_pcb_ctx',
          rule: 'ハードウェアの EPC が読取専用でも、ユーザースタックへ EPC と R0 を積んで vDSO に着地させれば全レジスタ完全復元だ！',
          accent: '#ff7b54',
        },
        text: '落ち着け！ 1個のCPUで2つの仕事を切り替える秘訣は、各プロセスの全状態 [state, base, epc, sp, r0..r3] を記録した8バイトの台帳【PCB】だ。さらにユーザー砂場の末尾（PC 16..17）に UNIX 伝統の【vDSO トランポリン（POP R0 → RET）】を仕込んである！ 23〜29番地で MMU切替とスタック積込を実装し、レジスタも私用スタックも1ビットも壊さずに交代させてみせよう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kai',
        text: 'うおおっ！！ P0 が "A" を出してスタックへ退避→P1 へ交代して "1" を出力→また P0 へ戻って R0 も私用スタックの "A" も無傷のまま "B" を出し、P1 が "2" で締めくくって【A1B2】！！ 別テスト【W3X4】も100点満点だ！！',
      },
      {
        speaker: 'ren',
        visualCard: {
          tag: 'モジュール図鑑へ登録：PCBコンテキストスイッチ',
          title: '🔄 PCB_CTX_SW 完成！ 2つの砂場が無破壊でバトンを繋いだ！',
          anim: 'ch5_pcb_ctx',
          rule: 'だが嵐の現場では「譲ってくれないタスク」が来る──次はタイマー強制割込【RR_SCHED】だ！',
          accent: '#ff7b54',
        },
        text: '『……すごいけど、ちょっと待って！！ 今のはプロセスが自分から SYS_YIELD で席を譲ってくれたからだよね？ 本番の気象ループや電力制御ループは、処理に夢中で自分から譲らないよ！ 片方が止まらなくなったら、もう片方が凍えちゃう！！』',
      },
    ],
    hints: [
      '【MMU切替と物理スタック（23〜25番地）】R3 に next.base、R2 に next.sp、R1 に next.epc、R0 に next.r0 が入っています！ まず 23: STOR R3, [244] で MMU_BASE を切り替え、24: ADD R3, R2 で物理スタック頂点（base+sp）を作り、25: STOR R3, [246] で SP レジスタへ設定！',
      '【vDSO用の積込（26〜27番地）】ユーザー末尾の vDSO は「POP R0 → RET（PCをPOP）」の順で取り出します！ 後入れ先出しなので、先に 26: PUSH R1（next.epc）、次に 27: PUSH R0（next.r0）の順で積みます！',
      '【仮想SPの更新（28〜29番地）】2バイト積んだので、仮想SPは 2 だけ減ります（8ビットで −2 = +254）！ 28: ADDI R2, 254 → 29: STOR R2, [114] で全7行完成！',
    ],
    tests: [],
    rewardChip: {
      id: 'CH5_PCB_CTX',
      name: 'PCB_CTX_SW',
      color: '#9e3f24',
      accent: '#ff7b54',
      description: 'PCB台帳とMMU/スタック切替・vDSO(POP R0; RET)による無破壊コンテキストスイッチ',
      isLabReward: true,
    },
    codexUnlock: ['preemptive_microkernel'],
  },

  {
    id: 'stage_60',
    number: 60,
    act: 13,
    chapter: 5,
    code: '60',
    kind: 'ark8_os_program',
    title: '譲らぬタスクを裁け・タイマー割込ラウンドロビン',
    revealedTitle: 'プリエンプティブ・スケジューラ（RR_SCHED）',
    scene: 'storm_core',
    storyBgm: 'crisis',
    widget: 'ark8_finale',
    mode: 'physics',
    incidentBrief: {
      where: 'ホライズン電算司令室・0x04 タイマー割込＆スケジューラ',
      trouble: '本番の気象タスク（W）も電力タスク（P）も SYS_YIELD を一切呼ばない連続ループだ！ 自発的な交代を待っていては電力制御が飢餓状態になって暖房が止まってしまう！',
      condition: '0x04 タイマー割込（周期19拍）から呼ばれる sched_next（16〜23番地）を実装し、現在PCB [135] から相方PCB（240 − cur_pcb）を算出して生存確認→交代／継続／全終了HALTを裁け！（"WPWPPP" ＆ "ABAABA"）',
      shortRule: '16..23: LOAD R1,[135] → LDI R0,240 → SUB R0,R1 → LDR R2,[R0] → JNZ R2,32 → LDR R2,[R1] → JNZ R2,10 → HALT！',
      stakes: 'ハードウェアタイマー TMR_IRQ と PCB 切替を直結し、譲らない2タスクを強制交互実行する本物のプリエンプティブ・マルチタスクを完成させる',
    },
    inputs: ['CLK'],
    outputs: ['CRT'],
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: null,
    asmProgramSpec: {
      arch: 'ark8_os',
      goalTitle: '目標：タイマーIRQ強制割込で2タスクを交互切替するラウンドロビン・スケジューラを組め！（WPWPPP ＆ ABAABA）',
      targetCrt: 'WPWPPP',
      altCrt: 'ABAABA',
      maxCycles: 450,
      memInspectorPreset: 'pcb_mt',
      kernelMeta: {
        pcb0Addr: 116,
        pcb1Addr: 124,
        curPcbAddr: 135,
        tmrPeriodAddr: 137,
        vdsoPc: 16,
        sandboxLimit: 36,
        procLabels: ['P0 (気象W)', 'P1 (電力P)'],
      },
      sectionHeaders: {
        0: { title: '🔒 0x00 BOOT（固定）', cls: 'vec-locked' },
        4: { title: '⚡ 0x04 IRQ 強制プリエンプション → save_ctx（固定）', cls: 'vec-irq' },
        8: { title: '🔒 0x08 SYSCALL / FAULT / vDSO（固定）', cls: 'vec-locked' },
        16: { title: '✏️ sched_next() ラウンドロビン・スケジューラ（8命令を実装！）', cls: 'vec-edit' },
      },
      initialRam: {
        116: 1, 117: 140, 118: 0, 119: 32, 120: 0, 121: 0, 122: 0, 123: 0,
        124: 1, 125: 176, 126: 0, 127: 32, 128: 0, 129: 0, 130: 0, 131: 0,
        135: 116, // cur_pcb (116 <-> 124 via 240 - x!)
        137: 19,  // tmrPeriod = 19 (coprime to loop -> clean preemption!)
        138: 1,
        139: 1,
      },
      userPrograms: [
        { name: 'WEATHER_W', baseAddr: 140, instructions: makePreemptUserProc(87, 2, 2), vdsoPc: 16 }, // 'W' x2
        { name: 'POWER_P', baseAddr: 176, instructions: makePreemptUserProc(80, 4, 2), vdsoPc: 16 },   // 'P' x4
      ],
      altUserPrograms: [
        { name: 'TASK_A', baseAddr: 140, instructions: makePreemptUserProc(65, 4, 2), vdsoPc: 16 },    // 'A' x4
        { name: 'TASK_B', baseAddr: 176, instructions: makePreemptUserProc(66, 2, 2), vdsoPc: 16 },    // 'B' x2
      ],
      kernelLib: [
        // save_ctx (106..118 -> sched 16)
        { addr: 106, part: inst('LOAD', 0, 0, 135), module: 'save_ctx' },
        { addr: 107, part: inst('ADDI', 0, 0, 8), module: 'save_ctx' },
        { addr: 108, part: inst('STOR', 0, 0, 246), module: 'save_ctx' },
        { addr: 109, part: inst('PUSH', 0, 3, 0), module: 'save_ctx' },
        { addr: 110, part: inst('PUSH', 0, 2, 0), module: 'save_ctx' },
        { addr: 111, part: inst('PUSH', 0, 1, 0), module: 'save_ctx' },
        { addr: 112, part: inst('LOAD', 0, 0, 132), module: 'save_ctx' },
        { addr: 113, part: inst('PUSH', 0, 0, 0), module: 'save_ctx' },
        { addr: 114, part: inst('LOAD', 0, 0, 133), module: 'save_ctx' },
        { addr: 115, part: inst('PUSH', 0, 0, 0), module: 'save_ctx' },
        { addr: 116, part: inst('LOAD', 1, 0, 247), module: 'save_ctx' },
        { addr: 117, part: inst('PUSH', 0, 1, 0), module: 'save_ctx' },
        { addr: 118, part: inst('JNZ', 0, 0, 16), module: 'save_ctx' },
        // restore_ctx (32..56 -> vDSO 14)
        { addr: 32, part: inst('STOR', 0, 0, 135), module: 'restore_ctx' },
        { addr: 33, part: inst('ADDI', 0, 0, 1), module: 'restore_ctx' },
        { addr: 34, part: inst('STOR', 0, 0, 246), module: 'restore_ctx' },
        { addr: 35, part: inst('POP', 3, 0, 0), module: 'restore_ctx' },
        { addr: 36, part: inst('POP', 1, 0, 0), module: 'restore_ctx' },
        { addr: 37, part: inst('POP', 2, 0, 0), module: 'restore_ctx' },
        { addr: 38, part: inst('POP', 0, 0, 0), module: 'restore_ctx' },
        { addr: 39, part: inst('STOR', 0, 3, 244), module: 'restore_ctx' },
        { addr: 40, part: inst('ADD', 3, 2, 0), module: 'restore_ctx' },
        { addr: 41, part: inst('STOR', 0, 3, 246), module: 'restore_ctx' },
        { addr: 42, part: inst('PUSH', 0, 1, 0), module: 'restore_ctx' },
        { addr: 43, part: inst('PUSH', 0, 0, 0), module: 'restore_ctx' },
        { addr: 44, part: inst('ADDI', 2, 0, 254), module: 'restore_ctx' },
        { addr: 45, part: inst('STOR', 0, 2, 134), module: 'restore_ctx' },
        { addr: 46, part: inst('LOAD', 0, 0, 135), module: 'restore_ctx' },
        { addr: 47, part: inst('ADDI', 0, 0, 5), module: 'restore_ctx' },
        { addr: 48, part: inst('STOR', 0, 0, 246), module: 'restore_ctx' },
        { addr: 49, part: inst('POP', 1, 0, 0), module: 'restore_ctx' },
        { addr: 50, part: inst('POP', 2, 0, 0), module: 'restore_ctx' },
        { addr: 51, part: inst('POP', 3, 0, 0), module: 'restore_ctx' },
        { addr: 52, part: inst('LOAD', 0, 0, 137), module: 'restore_ctx' },
        { addr: 53, part: inst('STOR', 0, 0, 243), module: 'restore_ctx' },
        { addr: 54, part: inst('LOAD', 0, 0, 134), module: 'restore_ctx' },
        { addr: 55, part: inst('STOR', 0, 0, 246), module: 'restore_ctx' },
        { addr: 56, part: inst('JNZ', 0, 0, 14), module: 'restore_ctx' },
        // syscall WRITE/EXIT (24..31) + cur-fallback (10..11)
        { addr: 24, part: inst('ADDI', 0, 0, 255), module: 'syscall' },
        { addr: 25, part: inst('JNZ', 0, 0, 28), module: 'syscall' },
        { addr: 26, part: inst('STOR', 0, 1, 240), module: 'syscall' },
        { addr: 27, part: inst('IRET', 0, 0, 0), module: 'syscall' },
        { addr: 28, part: inst('LOAD', 1, 0, 135), module: 'syscall' },
        { addr: 29, part: inst('LDI', 0, 0, 0), module: 'syscall' },
        { addr: 30, part: inst('STR', 0, 1, 0), module: 'syscall' },
        { addr: 31, part: inst('JNZ', 1, 0, 16), module: 'syscall' },
        { addr: 10, part: inst('LOAD', 0, 0, 135), module: 'sched_helper' },
        { addr: 11, part: inst('JNZ', 0, 0, 32), module: 'sched_helper' },
      ],
      rows: [
        { addr: 0, slotId: 'line_0', locked: true, fixedPart: inst('LDI', 0, 0, 36), label: 'Boot：LIMIT=36 を準備' },
        { addr: 1, slotId: 'line_1', locked: true, fixedPart: inst('STOR', 0, 0, 245), label: 'Boot：MMU_LIMIT[245] ← 36' },
        { addr: 2, slotId: 'line_2', locked: true, fixedPart: inst('LDI', 0, 0, 116), label: 'Boot：PCB0(116) を起動対象へ' },
        { addr: 3, slotId: 'line_3', locked: true, fixedPart: inst('JNZ', 0, 0, 32), label: 'Boot：restore_ctx(32番)へ!' },
        { addr: 4, slotId: 'line_4', locked: true, fixedPart: inst('STOR', 0, 0, 132), label: '[0x04 IRQ] R0 を一時退避' },
        { addr: 5, slotId: 'line_5', locked: true, fixedPart: inst('LOAD', 0, 0, 246), label: '[0x04 IRQ] ユーザーSP を取得' },
        { addr: 6, slotId: 'line_6', locked: true, fixedPart: inst('STOR', 0, 0, 133), label: '[0x04 IRQ] SP退避' },
        { addr: 7, slotId: 'line_7', locked: true, fixedPart: inst('JNZ', 0, 0, 106), label: '[0x04 IRQ] 全レジスタ保存(106番)→16番へ!' },
        { addr: 8, slotId: 'line_8', locked: true, fixedPart: inst('JNZ', 0, 0, 24), label: '[0x08 SYS] 通常SYSCALL(24番)へ' },
        { addr: 9, slotId: 'line_9', locked: true, fixedPart: inst('IRET', 0, 0, 0), label: '[0x08 SYS] vDSO降格 IRET' },
        { addr: 12, slotId: 'line_12', locked: true, fixedPart: inst('HALT', 0, 0, 0), label: '[0x0C FAULT] 安全停止' },
        { addr: 14, slotId: 'line_14', locked: true, fixedPart: inst('LDI', 0, 0, 0), label: '[vDSO] R0=0' },
        { addr: 15, slotId: 'line_15', locked: true, fixedPart: inst('SYSCALL', 0, 0, 0), label: '[vDSO] EPC←16 復帰トリガ' },
        { addr: 16, slotId: 'line_16', ideal: idOf('LOAD', 1, 0, 135), label: '① 現在PCB [135] (116 or 124) を R1 へ', placeholder: 'LOAD R1, [135]' },
        { addr: 17, slotId: 'line_17', ideal: idOf('LDI', 0, 0, 240), label: '② 切替定数 240 (= 116 + 124) を R0 へ', placeholder: 'LDI R0, 240' },
        { addr: 18, slotId: 'line_18', ideal: idOf('SUB', 0, 1, 0), label: '③ 相方PCB R0 ← 240 − R1 (116↔124)', placeholder: 'SUB R0, R1' },
        { addr: 19, slotId: 'line_19', ideal: idOf('LDR', 2, 0, 0), label: '④ 相方の状態 R2 ← [R0] (1=稼働/0=終了)', placeholder: 'LDR R2, [R0]' },
        { addr: 20, slotId: 'line_20', ideal: idOf('JNZ', 2, 0, 32), label: '⑤ 相方が稼働中なら restore_ctx(32番)へ!', placeholder: 'JNZ R2, 32' },
        { addr: 21, slotId: 'line_21', ideal: idOf('LDR', 2, 1, 0), label: '⑥ 相方終了→現在PCB状態 R2 ← [R1]', placeholder: 'LDR R2, [R1]' },
        { addr: 22, slotId: 'line_22', ideal: idOf('JNZ', 2, 0, 10), label: '⑦ 現在プロセス継続なら 10番(復帰)へ!', placeholder: 'JNZ R2, 10' },
        { addr: 23, slotId: 'line_23', ideal: idOf('HALT', 0, 0, 0), label: '⑧ 全プロセス終了！カーネル安全停止 HALT', placeholder: 'HALT' },
      ],
    },
    plainGoal: 'タイマー割込 IRQ と save_ctx の直後に走るラウンドロビン・スケジューラ（16〜23番地）を書き、譲らない2タスクを強制交互実行させよう！',
    beginnerNote:
      'Stage 59 で完成させたコンテキスト切替（save_ctx ＆ restore_ctx）はすでにカーネル基盤としてRAMに稼働中です！ PCB 0 は 116番地、PCB 1 は 124番地なので「240 − cur_pcb」を計算するだけで116↔124が綺麗に反転します。相方が生きていれば 32番地（restore_ctx）へ交代、相方が終わっていれば現在プロセスを 10番地で継続、両方 0 なら HALT で安全終了！',
    introDialogue: [
      {
        speaker: 'kai',
        showIncident: true,
        text: '大変だ！！ 気象タスク W も電力タスク P も、本番の監視ループは一切 SYS_YIELD を呼ばないぜ！！ このままだと W が終わるまで P が1回も動けず、配電盤の暖房制御が凍りついっちまう！！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'プリエンプティブ・マルチタスク：TMR_IRQ → ラウンドロビン（動く図解）',
          title: '⏱ 19拍ごとに 0x04 IRQ 強制奪還 → 相方(240−cur)生存なら即交代！',
          anim: 'ch5_rr_sched',
          rule: 'アプリの良心に頼らない！ 第4章の TMR_IRQ が強制的にCPUを奪い、sched_next が公平に回し切るぞ！',
          accent: '#ff7b54',
        },
        text: 'だからこそ第4章で自動再装填タイマー【TMR_IRQ】を鍛えたのだ！ 19拍ごとに 0x04 IRQ が強制発動し、さっき君が組んだ save_ctx が全レジスタをPCBへ退避して 16番地【sched_next】へ渡してくれる。あとは「相方PCB（240 − cur）が生きていれば交代、相方が終了していれば自分を継続、両方終われば HALT」──8行のラウンドロビン・スケジューラで2つのタスクを交互に走らせよう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '見て！！ どっちのアプリも1回も譲ってないのに、タイマー割込が 3回鳴って画面に【WPWPPP】って交互に走った！！ 別パターンの【ABAABA】も完璧に織り交ざってるよ！！',
      },
      {
        speaker: 'hako',
        visualCard: {
          tag: 'モジュール図鑑へ登録：プリエンプティブ・スケジューラ',
          title: '⏱ RR_SCHED 完成！ ……警告！！ 太陽フレア直撃、P1センサーにビット反転発生！！',
          anim: 'ch5_rr_sched',
          rule: '暴走タスクが 0xF0 へ攻撃を仕掛けた──全体を止めず暴走だけを葬る【FAULT_ISOLATE】へ急げ！！',
          accent: '#ff7b54',
        },
        text: '『……緊急警報！！ 磁気嵐ピークの太陽フレアが直撃、周辺センサー・プロセス P1 のコードが化けて MMIO 0xF0 へ暴走攻撃を始めた！！ Stage 54 のまま 0x0C で HALT したら、隣で動いてる生命維持プロセス P0 まで道連れで全滅するぞ！！』',
      },
    ],
    hints: [
      '【相方PCBの算出（16〜18番地）】16: LOAD R1, [135]（現在のPCB：116か124） ／ 17: LDI R0, 240（116+124=240） ／ 18: SUB R0, R1（R0 が相方PCBになる！）',
      '【相方の生存確認（19〜20番地）】PCBの先頭バイトが状態（1=稼働、0=終了）です！ 19: LDR R2, [R0] で相方の状態を読み、20: JNZ R2, 32 で生きていれば restore_ctx(32番地)へ交代！',
      '【現在継続＆全終了（21〜23番地）】相方が終了（0）なら 21: LDR R2, [R1] で現在PCBの状態を確認し、22: JNZ R2, 10（10番地が現在PCBをR0へ戻して32番へ渡す！）、両方 0 なら 23: HALT！',
    ],
    tests: [],
    rewardChip: {
      id: 'CH5_RR_SCHED',
      name: 'RR_SCHED',
      color: '#9e3f24',
      accent: '#ff7b54',
      description: 'TMR_IRQ強制割込とPCB交代で非協調タスクを同時実行するラウンドロビン・スケジューラ',
      isLabReward: true,
    },
    codexUnlock: ['preemptive_microkernel'],
  },

  {
    id: 'stage_61',
    number: 61,
    act: 13,
    chapter: 5,
    code: '61',
    kind: 'ark8_os_program',
    title: '無停止防衛・暴走プロセス障害隔離',
    revealedTitle: '無停止フォールト隔離（FAULT_ISOLATE）',
    scene: 'storm_core',
    storyBgm: 'crisis',
    widget: 'ark8_finale',
    mode: 'physics',
    incidentBrief: {
      where: 'ホライズン電算司令室・0x0C FAULT 無停止隔離ハンドラ',
      trouble: '太陽フレアのノイズで狂ったプロセス（ROGUE_X）が CRT 0xF0 への不正直書き攻撃を仕掛けた！ Stage 54 のように 0x0C で HALT すると、同時に動く生命維持タスク（LIFE_SUP "ARK"）まで巻き添えで止まってしまう！',
      condition: '0x0C 隔離ハンドラ（16〜22番地）で暴走中の cur_pcb[232] の状態だけを 0（DEAD）にして抹消し、対応ビットマップ（cur_pcb + 16）を kfree(0) で回収、CRT へ "!" を記録してスケジューラへ戻り正常タスクを完走させよ！（"ARB!K" ＆ 入替検証 "!RUN"）',
      shortRule: '16..22: LOAD R1,[232] → LDI R2,0 → STR R2,[R1] → ADDI R1,16 → STR R2,[R1] → LDI R0,33 → STOR R0,[240]！',
      stakes: 'カーネルパニック（全停止）を卒業し、異常プロセスのみを切り離してメモリ回収・システム無停止運転を実現する',
    },
    inputs: ['CLK'],
    outputs: ['CRT'],
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: null,
    asmProgramSpec: {
      arch: 'ark8_os',
      goalTitle: '目標：0x0C FAULTでパニック停止せず暴走タスクのみ強制終了＋kfree解放し、正常タスクを完走させよ！（ARB!K ＆ !RUN）',
      targetCrt: 'ARB!K',
      altCrt: '!RUN',
      maxCycles: 350,
      memInspectorPreset: 'pcb_mt',
      kernelMeta: {
        pcb0Addr: 212,
        pcb1Addr: 220,
        curPcbAddr: 232,
        bitmapAddrs: [228, 236],
        vdsoPc: 12,
        sandboxLimit: 28,
        procLabels: ['P0 (生命維持)', 'P1 (暴走タスク)'],
      },
      sectionHeaders: {
        0: { title: '🔒 0x00 BOOT / 0x04 IRQ / 0x08 SYS / vDSO（固定）', cls: 'vec-locked' },
        12: { title: '🛡 0x0C FAULT 検知 → 隔離ハンドラへ（固定）', cls: 'vec-fault' },
        16: { title: '✏️ 無停止フォールト隔離ハンドラ（7命令を実装！）', cls: 'vec-edit' },
      },
      initialRam: {
        212: 1, 213: 156, 214: 0, 215: 24, 216: 0, 217: 0, 218: 0, 219: 0,
        220: 1, 221: 184, 222: 0, 223: 24, 224: 0, 225: 0, 226: 0, 227: 0,
        228: 1,   // Bitmap Slot 0 (= 212 + 16)
        232: 212, // cur_pcb
        236: 1,   // Bitmap Slot 1 (= 220 + 16)
      },
      userPrograms: [
        { name: 'LIFE_SUP', baseAddr: 156, instructions: makeInline3CharProc('ARK'), vdsoPc: 12 },
        { name: 'ROGUE_X', baseAddr: 184, instructions: makeRogueProc('X', 'B'), vdsoPc: 12 },
      ],
      altUserPrograms: [
        { name: 'ROGUE_Z', baseAddr: 156, instructions: makeRogueProc('Z', null), vdsoPc: 12 },
        { name: 'SURVIVE', baseAddr: 184, instructions: makeInline3CharProc('RUN'), vdsoPc: 12 },
      ],
      kernelLib: [
        { addr: 14, part: inst('LOAD', 0, 0, 232), module: 'sched' },
        { addr: 15, part: inst('JNZ', 0, 0, 53), module: 'sched' },
        { addr: 24, part: inst('LOAD', 1, 0, 232), module: 'sched' },
        { addr: 25, part: inst('LDI', 0, 0, 176), module: 'sched' },
        { addr: 26, part: inst('SUB', 0, 1, 0), module: 'sched' },
        { addr: 27, part: inst('LDR', 2, 0, 0), module: 'sched' },
        { addr: 28, part: inst('JNZ', 2, 0, 53), module: 'sched' },
        { addr: 29, part: inst('LDR', 2, 1, 0), module: 'sched' },
        { addr: 30, part: inst('JNZ', 2, 0, 14), module: 'sched' },
        { addr: 31, part: inst('HALT', 0, 0, 0), module: 'sched' },
        { addr: 32, part: inst('ADDI', 0, 0, 255), module: 'syscall' },
        { addr: 33, part: inst('JNZ', 0, 0, 36), module: 'syscall' },
        { addr: 34, part: inst('STOR', 0, 1, 240), module: 'syscall' },
        { addr: 35, part: inst('IRET', 0, 0, 0), module: 'syscall' },
        { addr: 36, part: inst('LOAD', 1, 0, 232), module: 'syscall' },
        { addr: 37, part: inst('LDI', 0, 0, 0), module: 'syscall' },
        { addr: 38, part: inst('STR', 0, 1, 0), module: 'syscall' },
        { addr: 39, part: inst('JNZ', 1, 0, 24), module: 'syscall' },
        { addr: 40, part: inst('LOAD', 0, 0, 232), module: 'save_ctx' },
        { addr: 41, part: inst('ADDI', 0, 0, 8), module: 'save_ctx' },
        { addr: 42, part: inst('STOR', 0, 0, 246), module: 'save_ctx' },
        { addr: 43, part: inst('PUSH', 0, 3, 0), module: 'save_ctx' },
        { addr: 44, part: inst('PUSH', 0, 2, 0), module: 'save_ctx' },
        { addr: 45, part: inst('PUSH', 0, 1, 0), module: 'save_ctx' },
        { addr: 46, part: inst('LOAD', 0, 0, 229), module: 'save_ctx' },
        { addr: 47, part: inst('PUSH', 0, 0, 0), module: 'save_ctx' },
        { addr: 48, part: inst('LOAD', 0, 0, 230), module: 'save_ctx' },
        { addr: 49, part: inst('PUSH', 0, 0, 0), module: 'save_ctx' },
        { addr: 50, part: inst('LOAD', 1, 0, 247), module: 'save_ctx' },
        { addr: 51, part: inst('PUSH', 0, 1, 0), module: 'save_ctx' },
        { addr: 52, part: inst('JNZ', 0, 0, 24), module: 'save_ctx' },
        { addr: 53, part: inst('STOR', 0, 0, 232), module: 'restore_ctx' },
        { addr: 54, part: inst('ADDI', 0, 0, 1), module: 'restore_ctx' },
        { addr: 55, part: inst('STOR', 0, 0, 246), module: 'restore_ctx' },
        { addr: 56, part: inst('POP', 3, 0, 0), module: 'restore_ctx' },
        { addr: 57, part: inst('POP', 1, 0, 0), module: 'restore_ctx' },
        { addr: 58, part: inst('POP', 2, 0, 0), module: 'restore_ctx' },
        { addr: 59, part: inst('POP', 0, 0, 0), module: 'restore_ctx' },
        { addr: 60, part: inst('STOR', 0, 3, 244), module: 'restore_ctx' },
        { addr: 61, part: inst('ADD', 3, 2, 0), module: 'restore_ctx' },
        { addr: 62, part: inst('STOR', 0, 3, 246), module: 'restore_ctx' },
        { addr: 63, part: inst('PUSH', 0, 1, 0), module: 'restore_ctx' },
        { addr: 64, part: inst('PUSH', 0, 0, 0), module: 'restore_ctx' },
        { addr: 65, part: inst('ADDI', 2, 0, 254), module: 'restore_ctx' },
        { addr: 66, part: inst('STOR', 0, 2, 231), module: 'restore_ctx' },
        { addr: 67, part: inst('LOAD', 0, 0, 232), module: 'restore_ctx' },
        { addr: 68, part: inst('ADDI', 0, 0, 5), module: 'restore_ctx' },
        { addr: 69, part: inst('STOR', 0, 0, 246), module: 'restore_ctx' },
        { addr: 70, part: inst('POP', 1, 0, 0), module: 'restore_ctx' },
        { addr: 71, part: inst('POP', 2, 0, 0), module: 'restore_ctx' },
        { addr: 72, part: inst('POP', 3, 0, 0), module: 'restore_ctx' },
        { addr: 73, part: inst('LDI', 0, 0, 14), module: 'restore_ctx' },
        { addr: 74, part: inst('STOR', 0, 0, 243), module: 'restore_ctx' },
        { addr: 75, part: inst('LOAD', 0, 0, 231), module: 'restore_ctx' },
        { addr: 76, part: inst('STOR', 0, 0, 246), module: 'restore_ctx' },
        { addr: 77, part: inst('JNZ', 0, 0, 10), module: 'restore_ctx' },
      ],
      rows: [
        { addr: 0, slotId: 'line_0', locked: true, fixedPart: inst('LDI', 0, 0, 28), label: 'Boot：LIMIT=28(0x1C)' },
        { addr: 1, slotId: 'line_1', locked: true, fixedPart: inst('STOR', 0, 0, 245), label: 'Boot：MMU_LIMIT[245] ← 28' },
        { addr: 2, slotId: 'line_2', locked: true, fixedPart: inst('LDI', 0, 0, 212), label: 'Boot：PCB0(212) を起動対象へ' },
        { addr: 3, slotId: 'line_3', locked: true, fixedPart: inst('JNZ', 0, 0, 53), label: 'Boot：restore_ctx(53番)へ!' },
        { addr: 4, slotId: 'line_4', locked: true, fixedPart: inst('STOR', 0, 0, 229), label: '[0x04 IRQ] R0退避' },
        { addr: 5, slotId: 'line_5', locked: true, fixedPart: inst('LOAD', 0, 0, 246), label: '[0x04 IRQ] SP取得' },
        { addr: 6, slotId: 'line_6', locked: true, fixedPart: inst('STOR', 0, 0, 230), label: '[0x04 IRQ] SP退避' },
        { addr: 7, slotId: 'line_7', locked: true, fixedPart: inst('JNZ', 0, 0, 40), label: '[0x04 IRQ] save_ctx(40)→sched(24)へ' },
        { addr: 8, slotId: 'line_8', locked: true, fixedPart: inst('JNZ', 0, 0, 32), label: '[0x08 SYS] 通常SYSCALL(32番)へ' },
        { addr: 9, slotId: 'line_9', locked: true, fixedPart: inst('IRET', 0, 0, 0), label: '[0x08 SYS] vDSO降格(PC12) IRET' },
        { addr: 10, slotId: 'line_10', locked: true, fixedPart: inst('LDI', 0, 0, 0), label: '[vDSO] R0=0' },
        { addr: 11, slotId: 'line_11', locked: true, fixedPart: inst('SYSCALL', 0, 0, 0), label: '[vDSO] EPC←12 トリガ' },
        { addr: 12, slotId: 'line_12', locked: true, fixedPart: inst('LDI', 0, 0, 1), label: '[0x0C FAULT] 暴走検知！パニックせず隔離へ' },
        { addr: 13, slotId: 'line_13', locked: true, fixedPart: inst('JNZ', 0, 0, 16), label: '[0x0C FAULT] 隔離ハンドラ(16番)へ' },
        { addr: 16, slotId: 'line_16', ideal: idOf('LOAD', 1, 0, 232), label: '① 暴走プロセスのPCB [232] を R1 へ', placeholder: 'LOAD R1, [232]' },
        { addr: 17, slotId: 'line_17', ideal: idOf('LDI', 2, 0, 0), label: '② 終了・解放値 0 (DEAD/FREE) を R2 へ', placeholder: 'LDI R2, 0' },
        { addr: 18, slotId: 'line_18', ideal: idOf('STR', 2, 1, 0), label: '③ 暴走PCBの状態 [R1] ← 0 (強制終了!)', placeholder: 'STR R2, [R1]' },
        { addr: 19, slotId: 'line_19', ideal: idOf('ADDI', 1, 0, 16), label: '④ ビットマップ番地 R1 ← PCB + 16 (228/236)', placeholder: 'ADDI R1, 16' },
        { addr: 20, slotId: 'line_20', ideal: idOf('STR', 2, 1, 0), label: '⑤ kfree：[R1] ← 0 (メモリ区画解放!)', placeholder: 'STR R2, [R1]' },
        { addr: 21, slotId: 'line_21', ideal: idOf('LDI', 0, 0, 33), label: '⑥ 隔離完了マーク "!" (33) を R0 へ', placeholder: 'LDI R0, 33' },
        { addr: 22, slotId: 'line_22', ideal: idOf('STOR', 0, 0, 240), label: '⑦ CRT[240] へ "!" をログ出力', placeholder: 'STOR R0, [240]' },
        { addr: 23, slotId: 'line_23', locked: true, fixedPart: inst('JNZ', 0, 0, 24), label: 'HALTせずスケジューラ(24番)へ！生存タスク続行!' },
      ],
    },
    plainGoal: '0x0C FAULT 時にシステム全体を止めず、暴走プロセス（cur_pcb）だけの状態とビットマップを 0 へ落として "!" を記録し、正常プロセスを完走させよう！',
    beginnerNote:
      'PCB0(212) のビットマップは 228(=212+16)、PCB1(220) のビットマップは 236(=220+16) に揃えて配置してあるため、「ADDI R1, 16」たった1命令でどちらの暴走プロセスにも対応した kfree ができます！ 別検証では暴走役を P0 側へ入れ替えて試すため、必ず動的に [232] から cur_pcb を読んで隔離しよう！',
    introDialogue: [
      {
        speaker: 'mina',
        showIncident: true,
        text: '大変だよ主任さん！！ 磁気嵐ノイズが周辺センサー P1 の命令を化けさせて、画面ポート 0xF0 へ破壊文字 "X" を直書きしようとしてる！ でも Stage 54 みたいに 0x0C で OS ごと HALT したら、隣で動いてる生命維持タスク（P0）まで止まっちゃうよ！！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '本物のOSの真骨頂：無停止・障害隔離（動く図解）',
          title: '🛡 0x0C FAULT → 暴走PCB←0 ＆ スロットkfree←0 ＆ "!" → sched_next で生存続行！',
          anim: 'ch5_fault_isolate',
          rule: '1つのアプリが壊れても街全体を沈めない！ 暴走プロセスだけを葬って、残りの正常プロセスをゴールへ導け！',
          accent: '#ff7b54',
        },
        text: 'ここで「カーネルパニック（全停止）」を卒業し、本物の保護OSへ進化する瞬間だ！ 暴走攻撃 "X" はすでに君の MMU_8B と PRIV_CTRL が 1ビットも通さず弾いてくれた。16〜22番地で、暴走中の cur_pcb[232] だけを DEAD(0) にして強制終了し、対応ビットマップ（+16）を kfree で回収、"!" を記録してそのままスケジューラ（24番地）へ戻そう！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'mina',
        text: '……やった！！ 暴走攻撃 "X" は 1文字も画面へ出ず、P1 だけが DEAD になってスロット1も緑（FREE）へ解放され、生命維持タスクの "ARK" が最後の "K" まで完走して【ARB!K】！！ 暴走役を P0 へ入れ替えた【!RUN】も完全撃退したよ！！',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: 'モジュール図鑑へ登録：無停止フォールト隔離',
          title: '🛡 FAULT_ISOLATE 完成！ いよいよ全4大柱を統合する第5章最終決戦へ！',
          anim: 'ch5_fault_isolate',
          rule: '次はついに第5章クライマックス──【ARK_KERNEL_CORE】統合マイクロカーネル実戦起動だ！！',
          accent: '#ff7b54',
        },
        text: 'すべての部品が嵐の中で鍛え抜かれた！ さあ次はいよいよ第5章の集大成──ディスク自動起動・kalloc/kfree・マルチSYSCALL・タイマー強制割込・そして無停止フォールト隔離のすべてを1基の【ARK_KERNEL_CORE】へ統合し、電磁ブリザードの最大ピークを突破するぞ！！',
      },
    ],
    hints: [
      '【暴走PCBの強制終了（16〜18番地）】16: LOAD R1, [232] で暴走中の cur_pcb を読み込み、17: LDI R2, 0 を用意して、18: STR R2, [R1] で暴走プロセスの state を 0（DEAD）に落とします！',
      '【メモリの自動回収 kfree（19〜20番地）】ビットマップ番地は PCB + 16 なので、19: ADDI R1, 16 → 20: STR R2, [R1] で対応スロットを 0（FREE）へ解放！',
      '【隔離マーク表示（21〜22番地）】21: LDI R0, 33（ASCII "!"） → 22: STOR R0, [240]。直後の 23番地（固定）がそのままスケジューラへ戻って正常プロセスを完走させます！',
    ],
    tests: [],
    rewardChip: {
      id: 'CH5_FAULT_ISOLATE',
      name: 'FAULT_ISOLATE',
      color: '#9e3f24',
      accent: '#ff7b54',
      description: '0x0C保護違反時に暴走プロセスのみ終了＆kfree回収し生存タスクを完走させる障害隔離機構',
      isLabReward: true,
    },
    codexUnlock: ['preemptive_microkernel'],
  },

  {
    id: 'stage_62',
    number: 62,
    act: 13,
    chapter: 5,
    code: '62',
    kind: 'ark8_os_program',
    isChapter5Finale: true,
    title: '嵐を越える魂・ARK-OSカーネル中核統合',
    revealedTitle: '統合ARK-OSマイクロカーネル（ARK_KERNEL_CORE）',
    scene: 'storm_core',
    storyBgm: 'finale',
    widget: 'ark8_finale',
    mode: 'physics',
    incidentBrief: {
      where: 'ホライズン電算司令室・電磁ブリザード最大ピーク',
      trouble: '嵐のピークで瞬断と太陽フレアが同時襲来！ 空の Slot 0 へディスクから気象防衛プロセスを動的確保＆起動し、暴走センサー（Slot 1）と並走させながら、攻撃を無停止隔離して全スロットを綺麗に戻し切らねばならない！',
      condition: '4大OSカーネル柱の要所8命令（7:IRQ切替 / 13:FAULT"!" / 16:PCB終了 / 18:kfree / 30:SYS_EXIT / 31:SYS_WRITE / 47:kalloc / 50:DISK読込）を統合し、主検証 "ARB!K" ＋ 別ディスク検証 "SO!S" を完全突破せよ！',
      shortRule: '7:JNZ R0,33 ／ 13:STOR R0,[240] ／ 16:STR R0,[R1] ／ 18:STR R0,[R1] ／ 30:JNZ R0,14 ／ 31:STOR R1,[240] ／ 47:STOR R0,[230] ／ 50:LOAD R0,[242]！',
      stakes: '無改造 ARK8_OS_HW（18,880 MOSFET）実機上で4大カーネル機構を1基へ統合し、328人を成層圏ブリザードから守り抜いて第5章を完全制覇する',
    },
    inputs: ['CLK'],
    outputs: ['CRT'],
    allowedPrimitives: ['NAND', 'CONST_0', 'CONST_1'],
    allowedCustomChips: null,
    asmProgramSpec: {
      arch: 'ark8_os',
      goalTitle: '最終目標：Disk起動＋kalloc＋SYSCALL＋タイマー強制切替＋FAULT無停止隔離を1基のARK-OSカーネル中核へ統合せよ！（ARB!K ＆ SO!S）',
      targetCrt: 'ARB!K',
      altCrt: 'SO!S',
      maxCycles: 450,
      memInspectorPreset: 'pcb_mt',
      kernelMeta: {
        pcb0Addr: 214,
        pcb1Addr: 222,
        curPcbAddr: 234,
        bitmapAddrs: [230, 238],
        showDiskPtr: true,
        vdsoPc: 12,
        sandboxLimit: 28,
        procLabels: ['P0 (DISK防衛)', 'P1 (破損センサ)'],
      },
      sectionHeaders: {
        0: { title: '🔒 0x00 BOOT（DISKサイズ読込→46番へ・固定）', cls: 'vec-locked' },
        4: { title: '⚡ 0x04 IRQ 強制プリエンプション（① 1命令を統合！）', cls: 'vec-irq' },
        8: { title: '🔒 0x08 SYSCALL 入口 ＆ vDSO（固定）', cls: 'vec-locked' },
        12: { title: '🛡 0x0C FAULT 隔離 ＆ 共通 kill+kfree（②〜④ 3命令を統合！）', cls: 'vec-fault' },
        29: { title: '📞 SYSCALL ディスパッチ WRITE / EXIT（⑤〜⑥ 2命令を統合！）', cls: 'vec-syscall' },
        46: { title: '💾 Diskブートローダ ＆ kalloc 起動（⑦〜⑧ 2命令を統合！）', cls: 'vec-boot' },
      },
      initialRam: {
        // PCB 0 (214..221): starts DEAD (0) — dynamically allocated & booted from DISK!
        214: 0, 215: 158, 216: 0, 217: 24, 218: 0, 219: 0, 220: 0, 221: 0,
        // PCB 1 (222..229): Rogue sensor in Slot 1
        222: 1, 223: 186, 224: 0, 225: 24, 226: 0, 227: 0, 228: 0, 229: 0,
        230: 0,   // Bitmap Slot 0 (= 214 + 16), FREE -> kalloc sets 1 -> EXIT frees 0
        234: 214, // cur_pcb (toggle: (180 - cur_pcb) & 0xFF)
        238: 1,   // Bitmap Slot 1 (= 222 + 16), USED -> FAULT frees 0
      },
      diskProgram: {
        withLenHeader: true,
        padToBytes: 28,
        vdsoPc: 12,
        instructions: makeInline3CharProc('ARK'),
      },
      altDiskProgram: {
        withLenHeader: true,
        padToBytes: 28,
        vdsoPc: 12,
        instructions: makeInline3CharProc('SOS'),
      },
      userPrograms: [
        { name: 'ROGUE_X', baseAddr: 186, instructions: makeRogueProc('X', 'B'), vdsoPc: 12 },
      ],
      altUserPrograms: [
        { name: 'ROGUE_Z', baseAddr: 186, instructions: makeRogueProc('Z', null), vdsoPc: 12 },
      ],
      kernelLib: [
        // sched_next (19..28 -> restore_ctx 56)
        { addr: 19, part: inst('LOAD', 1, 0, 234), module: 'sched' },
        { addr: 20, part: inst('LDI', 0, 0, 180), module: 'sched' },
        { addr: 21, part: inst('SUB', 0, 1, 0), module: 'sched' },
        { addr: 22, part: inst('LDR', 2, 0, 0), module: 'sched' },
        { addr: 23, part: inst('JNZ', 2, 0, 56), module: 'sched' },
        { addr: 24, part: inst('LDR', 2, 1, 0), module: 'sched' },
        { addr: 25, part: inst('JNZ', 2, 0, 27), module: 'sched' },
        { addr: 26, part: inst('HALT', 0, 0, 0), module: 'sched' },
        { addr: 27, part: inst('LOAD', 0, 0, 234), module: 'sched' },
        { addr: 28, part: inst('JNZ', 0, 0, 56), module: 'sched' },
        // save_ctx (33..45 -> sched 19)
        { addr: 33, part: inst('LOAD', 0, 0, 234), module: 'save_ctx' },
        { addr: 34, part: inst('ADDI', 0, 0, 8), module: 'save_ctx' },
        { addr: 35, part: inst('STOR', 0, 0, 246), module: 'save_ctx' },
        { addr: 36, part: inst('PUSH', 0, 3, 0), module: 'save_ctx' },
        { addr: 37, part: inst('PUSH', 0, 2, 0), module: 'save_ctx' },
        { addr: 38, part: inst('PUSH', 0, 1, 0), module: 'save_ctx' },
        { addr: 39, part: inst('LOAD', 0, 0, 231), module: 'save_ctx' },
        { addr: 40, part: inst('PUSH', 0, 0, 0), module: 'save_ctx' },
        { addr: 41, part: inst('LOAD', 0, 0, 232), module: 'save_ctx' },
        { addr: 42, part: inst('PUSH', 0, 0, 0), module: 'save_ctx' },
        { addr: 43, part: inst('LOAD', 1, 0, 247), module: 'save_ctx' },
        { addr: 44, part: inst('PUSH', 0, 1, 0), module: 'save_ctx' },
        { addr: 45, part: inst('JNZ', 0, 0, 19), module: 'save_ctx' },
        // restore_ctx (56..78, 23-inst STR-optimized -> vDSO 10)
        { addr: 56, part: inst('STOR', 0, 0, 234), module: 'restore_ctx' },
        { addr: 57, part: inst('ADDI', 0, 0, 1), module: 'restore_ctx' },
        { addr: 58, part: inst('STOR', 0, 0, 246), module: 'restore_ctx' },
        { addr: 59, part: inst('POP', 3, 0, 0), module: 'restore_ctx' },
        { addr: 60, part: inst('POP', 1, 0, 0), module: 'restore_ctx' },
        { addr: 61, part: inst('POP', 2, 0, 0), module: 'restore_ctx' },
        { addr: 62, part: inst('POP', 0, 0, 0), module: 'restore_ctx' },
        { addr: 63, part: inst('STOR', 0, 3, 244), module: 'restore_ctx' },
        { addr: 64, part: inst('ADD', 3, 2, 0), module: 'restore_ctx' },
        { addr: 65, part: inst('ADDI', 3, 0, 255), module: 'restore_ctx' },
        { addr: 66, part: inst('STR', 1, 3, 0), module: 'restore_ctx' },
        { addr: 67, part: inst('ADDI', 3, 0, 255), module: 'restore_ctx' },
        { addr: 68, part: inst('STR', 0, 3, 0), module: 'restore_ctx' },
        { addr: 69, part: inst('ADDI', 2, 0, 254), module: 'restore_ctx' },
        { addr: 70, part: inst('STOR', 0, 2, 233), module: 'restore_ctx' },
        { addr: 71, part: inst('POP', 1, 0, 0), module: 'restore_ctx' },
        { addr: 72, part: inst('POP', 2, 0, 0), module: 'restore_ctx' },
        { addr: 73, part: inst('POP', 3, 0, 0), module: 'restore_ctx' },
        { addr: 74, part: inst('LDI', 0, 0, 14), module: 'restore_ctx' },
        { addr: 75, part: inst('STOR', 0, 0, 243), module: 'restore_ctx' },
        { addr: 76, part: inst('LOAD', 0, 0, 233), module: 'restore_ctx' },
        { addr: 77, part: inst('STOR', 0, 0, 246), module: 'restore_ctx' },
        { addr: 78, part: inst('JNZ', 0, 0, 10), module: 'restore_ctx' },
      ],
      rows: [
        { addr: 0, slotId: 'line_0', locked: true, fixedPart: inst('LOAD', 2, 0, 242), label: 'Boot：DISK先頭からサイズ(28)を R2 へ読込' },
        { addr: 1, slotId: 'line_1', locked: true, fixedPart: inst('STOR', 0, 2, 245), label: 'Boot：MMU_LIMIT[245] ← 28' },
        { addr: 2, slotId: 'line_2', locked: true, fixedPart: inst('JNZ', 2, 0, 46), label: 'Boot：ディスク起動＆確保(46番)へ!' },
        { addr: 4, slotId: 'line_4', locked: true, fixedPart: inst('STOR', 0, 0, 231), label: '[0x04 IRQ] R0 退避' },
        { addr: 5, slotId: 'line_5', locked: true, fixedPart: inst('LOAD', 0, 0, 246), label: '[0x04 IRQ] ユーザーSP 取得' },
        { addr: 6, slotId: 'line_6', locked: true, fixedPart: inst('STOR', 0, 0, 232), label: '[0x04 IRQ] SP 退避' },
        { addr: 7, slotId: 'line_7', ideal: idOf('JNZ', 0, 0, 33), label: '① [IRQ] save_ctx(33番)→ラウンドロビンへ強制切替!', placeholder: 'JNZ R0, 33' },
        { addr: 8, slotId: 'line_8', locked: true, fixedPart: inst('JNZ', 0, 0, 29), label: '[0x08 SYS] 通常SYSCALL(29番)へ' },
        { addr: 9, slotId: 'line_9', locked: true, fixedPart: inst('IRET', 0, 0, 0), label: '[0x08 SYS] vDSO降格 IRET' },
        { addr: 10, slotId: 'line_10', locked: true, fixedPart: inst('LDI', 0, 0, 0), label: '[vDSO] R0=0' },
        { addr: 11, slotId: 'line_11', locked: true, fixedPart: inst('SYSCALL', 0, 0, 0), label: '[vDSO] EPC←12 トリガ' },
        { addr: 12, slotId: 'line_12', locked: true, fixedPart: inst('LDI', 0, 0, 33), label: '[0x0C FAULT] 隔離記号 "!" (33)' },
        { addr: 13, slotId: 'line_13', ideal: idOf('STOR', 0, 0, 240), label: '② [FAULT] CRT[240]へ "!" を出力し隔離へ!', placeholder: 'STOR R0, [240]' },
        { addr: 14, slotId: 'line_14', locked: true, fixedPart: inst('LOAD', 1, 0, 234), label: '[kill] 現在PCB [234] を R1 へ' },
        { addr: 15, slotId: 'line_15', locked: true, fixedPart: inst('LDI', 0, 0, 0), label: '[kill] 終了・解放値 0 を R0 へ' },
        { addr: 16, slotId: 'line_16', ideal: idOf('STR', 0, 1, 0), label: '③ [kill] PCB状態 [R1] ← 0 (プロセス終了!)', placeholder: 'STR R0, [R1]' },
        { addr: 17, slotId: 'line_17', locked: true, fixedPart: inst('ADDI', 1, 0, 16), label: '[kfree] ビットマップ番地 R1 ← PCB+16' },
        { addr: 18, slotId: 'line_18', ideal: idOf('STR', 0, 1, 0), label: '④ [kfree] メモリ区画 [R1] ← 0 (解放→19番schedへ!)', placeholder: 'STR R0, [R1]' },
        { addr: 29, slotId: 'line_29', locked: true, fixedPart: inst('ADDI', 0, 0, 255), label: '[SYS] R0=1(WRITE)なら0、3(EXIT)なら2' },
        { addr: 30, slotId: 'line_30', ideal: idOf('JNZ', 0, 0, 14), label: '⑤ [SYS_EXIT] EXITなら kill&kfree(14番)へ!', placeholder: 'JNZ R0, 14' },
        { addr: 31, slotId: 'line_31', ideal: idOf('STOR', 0, 1, 240), label: '⑥ [SYS_WRITE] 文字 R1 を CRT[240] へ出力!', placeholder: 'STOR R1, [240]' },
        { addr: 32, slotId: 'line_32', locked: true, fixedPart: inst('IRET', 0, 0, 0), label: '[SYS_WRITE] ユーザーへ復帰' },
        { addr: 46, slotId: 'line_46', locked: true, fixedPart: inst('LDI', 0, 0, 1), label: '[spawn] 確保＆起動フラグ 1 を準備' },
        { addr: 47, slotId: 'line_47', ideal: idOf('STOR', 0, 0, 230), label: '⑦ [kalloc] スロット0 [230] ← 1 (物理メモリ確保!)', placeholder: 'STOR R0, [230]' },
        { addr: 48, slotId: 'line_48', locked: true, fixedPart: inst('STOR', 0, 0, 214), label: '[spawn] PCB0 [214] ← 1 (実行可能!)' },
        { addr: 49, slotId: 'line_49', locked: true, fixedPart: inst('LDI', 1, 0, 158), label: '[boot] 展開先 Slot0=158 を R1 へ' },
        { addr: 50, slotId: 'line_50', ideal: idOf('LOAD', 0, 0, 242), label: '⑧ [boot] DISK[242]から1バイト読込!', placeholder: 'LOAD R0, [242]' },
        { addr: 51, slotId: 'line_51', locked: true, fixedPart: inst('STR', 0, 1, 0), label: '[boot] Slot0[R1] へ展開' },
        { addr: 52, slotId: 'line_52', locked: true, fixedPart: inst('ADDI', 1, 0, 1), label: '[boot] R1++' },
        { addr: 53, slotId: 'line_53', locked: true, fixedPart: inst('ADDI', 2, 0, 255), label: '[boot] R2--' },
        { addr: 54, slotId: 'line_54', locked: true, fixedPart: inst('JNZ', 2, 0, 50), label: '[boot] 28バイト展開ループ(50番へ)' },
        { addr: 55, slotId: 'line_55', locked: true, fixedPart: inst('LDI', 0, 0, 214), label: '[boot] PCB0(214)をR0へ→restore_ctx(56)でOS起動!' },
      ],
    },
    plainGoal: '第5章で鍛え上げた4大カーネル機構（Disk起動＆kalloc・マルチSYSCALL・タイマー強制割込RR・無停止FAULT隔離）を8命令で結線し、統合マイクロカーネル【ARK_KERNEL_CORE】を起動せよ！',
    beginnerNote:
      '79命令（PC 0〜78）の本格マイクロカーネルが、第4章で完成させた 18,880 MOSFET の無改造実機上で本物の同時稼働を果たします！ 特に美しいのは 14〜18番地の「共通 kill＋kfree」──0x0C の暴走隔離も、30番地の正常な SYS_EXIT も、どちらも同じ1本の後片付けルーチンを共有し、終了時に PCB もビットマップもすべて [0, 0] へ美しく片付けて安全停止します！',
    introDialogue: [
      {
        speaker: 'hako',
        showIncident: true,
        text: '『……第5章・最終決戦だ！！ 電磁ブリザード最大ピーク到来──電圧瞬断で Slot 0 が吹き飛び、同時に Slot 1 の破損センサーが暴走を始めた！！ いまこそ ACT XII〜XIII で築いた全カーネル機構を1基へ統合して火を入れろ！！』',
      },
      {
        speaker: 'kagari',
        visualCard: {
          tag: '第5章 集大成：ARK-OS マイクロカーネル中核（動く図解）',
          title: '🧠 Disk起動＋kalloc＋SYSCALL＋タイマー割込RR＋無停止FAULT隔離 ＝ 完全統合！',
          anim: 'ch5_kernel_core',
          rule: '4大柱の要所8命令を繋ぎ切れ！ 別ディスク検証 "SO!S" まで突破すれば、328人全員が嵐の夜明けを迎えられるぞ！',
          accent: '#ff7b54',
        },
        text: 'ハードウェアは第4章の ARK8_OS_HW のまま、1本たりとも作り直していない。君が組み上げた 79命令のマイクロカーネルの最後の8箇所を繋ぎ、ディスク起動・メモリ確保解放・システムコール・タイマー強制多重実行・無停止障害隔離のすべてが1つに響き合う瞬間を見届けよう！！',
      },
    ],
    outroDialogue: [
      {
        speaker: 'kai',
        text: 'やった……やったぞおおおおっ！！ 空だった Slot 0 にディスクから防衛プロセスが確保＆起動され、タイマー割込で同時稼働し、暴走センサー "X" を "!" で叩き落としてメモリ回収、最後まで完走して両スロット [0, 0] でピタッと着地した！！ 嵐を乗り切ったぞおおお！！',
      },
    ],
    hints: [
      '【① IRQ ＆ ②〜④ FAULT/kill/kfree】7: JNZ R0, 33（save_ctx→スケジューラへ強制切替！） ／ 13: STOR R0, [240]（"!" 出力） ／ 16: STR R0, [R1]（PCB←0 終了） ／ 18: STR R0, [R1]（bitmap←0 kfree解放、そのまま19番 sched へ落ちる！）',
      '【⑤〜⑥ SYSCALL】30: JNZ R0, 14（R0=1のWRITEは29番で0になり素通り、R0=3のEXITは≠0なので14番の共通 kill&kfree へ合流！） ／ 31: STOR R1, [240]（WRITE文字をCRTへ出力！）',
      '【⑦〜⑧ kalloc ＆ Disk起動】47: STOR R0, [230]（Slot 0 のビットマップ[230]を 1=USED で確保！） ／ 50: LOAD R0, [242]（DISK[0xF2]から1バイトずつ読込！）',
    ],
    tests: [],
    rewardChip: {
      id: 'CH5_ARK_KERNEL_CORE',
      name: 'ARK_KERNEL_CORE',
      color: '#b84324',
      accent: '#ffd166',
      description: 'Disk起動・kalloc/kfree・SYSCALL・タイマー強制RR・無停止FAULT隔離を統合したARK-OSカーネル中核',
      isLabReward: true,
    },
    codexUnlock: ['disk_bootloader', 'memory_allocator_heap', 'syscall_abi_dispatch', 'preemptive_microkernel'],
  },
];
