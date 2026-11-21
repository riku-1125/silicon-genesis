/**
 * SILICON GENESIS — Deep, Lived-In Opening Prologue (3 Chapters)
 * Chapter I gives the player a grounded, atmospheric morning walk through
 * Shelter ARK-7 (air scrubbers, hydroponics, B4 geothermal generator, AETHER-IX)
 * BEFORE the blackout hits in Chapter II, so every subsequent crisis feels personal & clear!
 */

export const PROLOGUE_STEPS = [
  // =========================================================================
  // CHAPTER I — 地下400メートルの朝
  // =========================================================================
  {
    scene: './assets/scene_surface_rover.jpg',
    dateline: 'PROLOGUE I // 2052 — 沈黙の閃光',
    mood: 'ash',
    bgm: 'title',
    chapterCard: {
      roman: 'PROLOGUE · I',
      title: '地下400メートルの朝',
      sub: '118人が暮らす地下シェルター「アーク7」の日常',
    },
    speaker: null,
    text: '2052年──『沈黙の閃光』。\n核と電磁パルス（EMP）の嵐は、地上の都市と、人類が100年かけて築いたあらゆるコンピュータを一瞬で焼き尽くした。',
  },
  {
    scene: './assets/scene_surface_rover.jpg',
    dateline: 'A.D. 2052 — 2094 // SHELTER ARK-7',
    mood: 'ash',
    bgm: 'title',
    speaker: null,
    text: '灰に覆われた地上を逃れ、わずかに生き残った人々は、火山岩盤の下400メートル──地下シェルター『アーク7』へ閉じこもった。\nあれから42年。いま、この地下には118人が暮らしている。',
  },
  {
    scene: './assets/scene_machinery.jpg',
    dateline: '2094.11.21 06:00 // B4 生命維持・地熱区画',
    mood: 'calm',
    bgm: 'story',
    speaker: 'mina',
    text: 'おはよう、見習いさん！ ほら、朝の巡回いくよ。ここが地下4階──シェルターの心臓部「生命維持・地熱発電区画」だよ。',
  },
  {
    scene: './assets/scene_machinery.jpg',
    dateline: '2094.11.21 06:02 // 生命維持区画の仕事',
    mood: 'calm',
    speaker: 'mina',
    text: '見て、左の巨大なファンが地下3区の居住区に新鮮な空気を送る【空気清浄機】。奥の銅パイプは、火山岩盤の熱で電気を作る【地熱発電炉】と、その熱を冷やす【冷却水ライン】だよ。',
  },
  {
    scene: './assets/scene_machinery.jpg',
    dateline: '2094.11.21 06:04 // 地下生まれの日常',
    mood: 'calm',
    speaker: 'mina',
    text: '上の階には水耕栽培の小さなレタス畑があって、夕方6時にはみんなで水筒を持って配給カウンターに並ぶの。……私、この地下で生まれて23年。一度も本物の「青空」を見たことがないんだ。',
  },
  {
    scene: './assets/scene_machinery.jpg',
    dateline: '2094.11.21 06:05 // ささやかな夢',
    mood: 'calm',
    speaker: 'mina',
    text: 'でもね、地上の放射線がいつか引いたら、3区の子どもたちを連れて外へ出るのが夢なんだ。その日まで、この配管も空気も1秒だって止められないんだよ。',
  },
  {
    scene: './assets/scene_shelter_hub.jpg',
    dateline: '2094.11.21 06:08 // アーク7 中央制御室',
    mood: 'calm',
    speaker: null,
    text: '鉄の階段を上って中央制御室へ入ると、いつもの低く穏やかな唸り声が聞こえてくる。\n戦前の遺産──中央電算機『AETHER-IX（エーテル9）』が、今日も118人の命を静かに見守っている音だ。',
  },
  {
    scene: './assets/scene_shelter_hub.jpg',
    dateline: '2094.11.21 06:09 // 中央制御室・朝の珈琲',
    mood: 'dim',
    speaker: 'kagari',
    text: 'おはよう、二人とも。大麦を煎った代用コーヒーだが飲むかい？ ……ほら見習い君、モニターを見てごらん。',
  },
  {
    scene: './assets/scene_shelter_hub.jpg',
    dateline: '2094.11.21 06:10 // コンピュータが支える命',
    mood: 'dim',
    speaker: 'kagari',
    text: '空気清浄の異常監視、地熱発電炉の冷却弁、夕方の水の配給計算、地殻の小さな揺れの記録──アーク7の暮らしはぜんぶ、あの古い計算機エーテル9が1秒ごとに計算して支えているんだ。',
  },
  {
    scene: './assets/scene_shelter_hub.jpg',
    dateline: '2094.11.21 06:11 // 篝博士の記憶',
    mood: 'dim',
    speaker: 'kagari',
    text: '……実はね、ここ数日エーテル9の電圧がひどく不安定なんだ。42年間、1秒も眠らず働かせてしまったからな。戦前の地上を知っている最後の世代として、君たちをこんな暗闇に閉じ込めたままには──',
  },

  // =========================================================================
  // CHAPTER II — 42年目の沈黙
  // =========================================================================
  {
    scene: './assets/scene_opening_aether.jpg',
    dateline: '2094.11.21 06:14 // 臨界崩壊',
    mood: 'alert',
    bgm: 'crisis',
    fx: 'shake',
    sfx: 'alarm',
    chapterCard: {
      roman: 'PROLOGUE · II',
      title: '42年目の沈黙',
      sub: '中央電算機 AETHER-IX ── 永久停止',
    },
    speaker: null,
    text: '──バチッ！！\n激しい火花とともに天井灯が一斉に落ちた。\nそして、42年間一度も途絶えたことのなかったあの低い唸り声が──ふっつりと消えた。',
  },
  {
    scene: './assets/scene_opening_aether.jpg',
    dateline: '2094.11.21 06:14 // 中央電算室・緊急警報',
    mood: 'alert',
    fx: 'shake',
    sfx: 'alarm',
    speaker: 'hako',
    text: '『……緊急警告！ 中央電算機 AETHER-IX、主基板の絶縁層が完全焼損。再起動不能。生命維持・発電冷却・水配給・地上通信──全自動制御を喪失！』',
  },
  {
    scene: './assets/scene_shelter_hub.jpg',
    dateline: '2094.11.21 06:15 // 音のない地下',
    mood: 'alert',
    speaker: 'mina',
    text: '……静かすぎる。こんな音のない朝、生まれて初めて……！ 空気清浄ファンも、発電炉の冷却モニタも全部真っ暗だよ！ 博士、予備のコンピュータはまだ残ってるよね！？',
  },
  {
    scene: './assets/scene_shelter_hub.jpg',
    dateline: '2094.11.21 06:15 // 失われた工場',
    mood: 'dim',
    speaker: 'kagari',
    text: '……もう1枚も残っていないよ、ミナ。髪の毛の1万分の1より細い回路を刻んでいた戦前の巨大工場は、地上の文明と一緒に灰になった。',
  },
  {
    scene: './assets/scene_shelter_hub.jpg',
    dateline: '2094.11.21 06:16 // 迫る限界',
    mood: 'dim',
    speaker: 'mina',
    text: '嘘でしょ……！ 計算機がなくなったら、発電炉の冷却も、3区の空気も、今夜の水の配給も全部止まっちゃう！ このまま118人みんなで、暗い地下で終わりなの……！？',
  },
  {
    scene: './assets/scene_shelter_hub.jpg',
    dateline: '2094.11.21 06:16 // 古いリレー端末の声',
    mood: 'dim',
    speaker: 'hako',
    text: '『……泣くのはまだ早いぞ、人間。オレのボロ筐体を見ろ。戦前の最先端だったエーテル9は焼け落ちたが、単純な古いスイッチで組まれたオレはまだ生きている。』',
  },

  // =========================================================================
  // CHAPTER III — 砂と光の約束
  // =========================================================================
  {
    scene: './assets/scene_opening_aether.jpg',
    dateline: '2094.11.21 06:17 // B4 保守保管庫',
    mood: 'amber',
    bgm: 'finale',
    sfx: 'powerup',
    chapterCard: {
      roman: 'PROLOGUE · III',
      title: '砂と光の約束',
      sub: '砂とスイッチから、もういちど人類の頭脳を創り出せ',
    },
    speaker: 'kagari',
    text: 'ハコの言う通りだ！ ミナ、顔を上げてくれ。──最先端の工場はいらない。B4保守庫の奥に、EMPを生き延びた旧式の「チップ焼付け機」と、精製済みのシリコン板が眠っているんだ！',
  },
  {
    scene: './assets/scene_opening_aether.jpg',
    dateline: '2094.11.21 06:17 // 最後の希望「NAND」',
    mood: 'amber',
    showNandRelic: true,
    speaker: 'kagari',
    text: 'この機械で量産できるのは、たった“1種類”の小さな部品【NAND（ナンド）】だけ。しかも今は原板がないから、最初の1個だけは砂（シリコン）と抵抗から手作業で創る必要がある。',
  },
  {
    scene: './assets/scene_machinery.jpg',
    dateline: '2094.11.21 06:18 // 計算機科学の奇跡',
    mood: 'amber',
    speaker: 'kagari',
    text: 'だが信じていい。コンピュータは異星人の魔法なんかじゃない──1969年に人類を月面へ運んだアポロ11号も、たった1種類の単純な部品を積み上げただけで動いていたんだ！',
  },
  {
    scene: './assets/scene_machinery.jpg',
    dateline: '2094.11.21 06:18 // ゼロからの再発明',
    mood: 'amber',
    speaker: 'kagari',
    text: 'たった1個の「電気のスイッチ」から始めて、足し算も、記憶も、本物のCPUも──アーク7を守る新しい頭脳を、僕たちの手でゼロから創り直すんだ！',
  },
  {
    scene: './assets/scene_shelter_hub.jpg',
    dateline: '2094.11.21 06:19 // 見習い技師への託宣',
    mood: 'calm',
    bgm: 'story',
    speaker: 'kagari',
    text: '見習い君。君は「専門知識なんて何もない」と思っているかもしれない。──それでいいんだ。僕が隣で1つずつ、水のホースや普段の言葉に噛み砕いて案内するよ。',
  },
  {
    scene: './assets/scene_shelter_hub.jpg',
    dateline: '2094.11.21 06:19 // 約束',
    mood: 'calm',
    bgm: 'story',
    speaker: 'mina',
    text: '……見習いさん。118人の暮らしも、3区の子どもたちにいつか青空を見せる夢も──いま、私たち3人の手にかかってる。一緒に、もういちどアーク7へ明かりを灯してくれる？',
    choices: [
      {
        label: '「知識ゼロだけど、絶対にやってみせる！」',
        replySpeaker: 'kagari',
        replyText: '──その一言を待っていた！ 変な先入観のない君の頭こそ、ただの電気が「知性」に変わる奇跡を一番鮮やかに掴める。さあ、歴史をゼロからやり直そう！',
      },
      {
        label: '「アーク7のみんなに、いつか青空を見せよう」',
        replySpeaker: 'mina',
        replyText: '……うんっ！ ありがとう！ 絶対に諦めないよ。私が現場の設備を全部つなぐから、見習いさんは頭脳の回路をお願いね！',
      },
    ],
  },
  {
    scene: './assets/scene_machinery.jpg',
    dateline: '2094.11.21 06:20 // 最初の非常警報',
    mood: 'alert',
    bgm: 'crisis',
    fx: 'shake',
    sfx: 'alarm',
    speaker: 'hako',
    text: '『──さっそく時間切れだ！ さっきミナが案内したB4地熱発電炉の冷却弁が、制御を失って過熱し始めた！ 予備電力まで落ちたら焼付け機も動かせない！ ただちにB4作業台へ走れ！！』',
  },
];
