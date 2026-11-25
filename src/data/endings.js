/**
 * SILICON GENESIS — Cinematic Chapter I & Chapter II Ending Scripts
 *
 * Played in the full-screen Visual-Novel Theater (`PrologueOverlay.playSequence`)
 * upon clearing Stage 17 (Chapter I Finale) and Stage 26 (id: stage_24, Chapter II Grand Finale),
 * using the game's authentic high-detail 32-bit pixel-art backgrounds paired with
 * subtle transparent lighting & radio signal VFX overlays.
 */

function formatStats(stats = {}) {
  const ark4Nand = Number.isFinite(stats.ark4NandCount) && stats.ark4NandCount > 0 ? stats.ark4NandCount : 240;
  const ark4SysNand =
    Number.isFinite(stats.ark4SysNandCount) && stats.ark4SysNandCount > 0 ? stats.ark4SysNandCount : 480;
  const ark4Tr =
    Number.isFinite(stats.ark4SwCount) && stats.ark4SwCount > 0 ? stats.ark4SwCount : ark4Nand * 2;
  const ark4Pull =
    Number.isFinite(stats.ark4PullCount) && stats.ark4PullCount > 0 ? stats.ark4PullCount : ark4Nand;
  const ark4SysTr =
    Number.isFinite(stats.ark4SysSwCount) && stats.ark4SysSwCount > 0 ? stats.ark4SysSwCount : ark4SysNand * 2;
  const ark4SysPull =
    Number.isFinite(stats.ark4SysPullCount) && stats.ark4SysPullCount > 0 ? stats.ark4SysPullCount : ark4SysNand;
  const ark8SysNand =
    Number.isFinite(stats.ark8SysNandCount) && stats.ark8SysNandCount > 0 ? stats.ark8SysNandCount : 7403;
  const ark8SysTr =
    Number.isFinite(stats.ark8SysSwCount) && stats.ark8SysSwCount > 0 ? stats.ark8SysSwCount : ark8SysNand * 2;
  const ark8SysPull =
    Number.isFinite(stats.ark8SysPullCount) && stats.ark8SysPullCount > 0 ? stats.ark8SysPullCount : ark8SysNand;
  const forgedChips = Number.isFinite(stats.forgedChipCount) && stats.forgedChipCount > 0 ? stats.forgedChipCount : 18;
  const clearedCount = Number.isFinite(stats.clearedCount) && stats.clearedCount > 0 ? stats.clearedCount : 20;
  return {
    ark4Nand,
    ark4Tr,
    ark4Pull,
    ark4SysNand,
    ark4SysTr,
    ark4SysPull,
    ark8SysNand,
    ark8SysTr,
    ark8SysPull,
    forgedChips,
    clearedCount,
  };
}

/**
 * CHAPTER I ENDING — Clearing Stage 17 (`ARK-4 CPU`)
 */
export function buildChapter1EndingSteps(rawStats = {}) {
  const s = formatStats(rawStats);
  return [
    {
      scene: './assets/scene_opening_aether.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: 'ENDING I // 2094.11.24 21:03 — ARK-4 完全起動',
      mood: 'amber',
      bgm: 'finale',
      sfx: 'powerup',
      speaker: 'hako',
      text: `『……全6命令シーケンス正常完了！ LDI 5 → ADD 3 → SUB 2 → NOP → ADD 7 → SUB 13 → ZERO！ お前が砂から積み上げた ${s.ark4Nand} 個の NAND ゲート（実機 MOSFET ${s.ark4Tr} 個＋プルアップ抵抗 ${s.ark4Pull} 本）が、いまひとつの頭脳【ARK-4】として完全に目を覚ました！』`,
    },
    {
      scene: './assets/scene_machinery.jpg',
      dateline: '2094.11.24 21:03 // 地下400m・全区画復旧',
      mood: 'calm',
      speaker: null,
      text: '中央制御室から放たれたクロック信号が、地下4階から居住区まで一気に駆け抜ける。\n止まっていた冷却ポンプが低く穏やかな唸りを取り戻し、廊下の非常灯が次々と暖かい琥珀色へ切り替わっていった。',
    },
    {
      scene: './assets/scene_surface_rover.jpg',
      canvasScene: 'fx_beacon',
      canvasPhase: 0,
      dateline: 'CHAPTER I ENDING // 21:04 — "HELLO, WORLD."',
      mood: 'calm',
      sfx: 'powerup',
      chapterCard: {
        roman: 'CHAPTER I · ENDING',
        title: '最初の産声 — "HELLO, WORLD."',
        sub: 'たった1粒の砂と1個のスイッチから、再び世界へ繋がる瞬間',
      },
      speaker: 'hako',
      text: '『地上通信ビーコン塔へ出力直結完了！ 君の自作CPU【ARK-4】から、地下シェルター・アーク7 42年ぶりのデジタル復興電文を発信する──送信開始！\n…… "HELLO, WORLD." 』',
    },
    {
      scene: './assets/scene_surface_rover.jpg',
      canvasScene: 'fx_beacon',
      canvasPhase: 0,
      dateline: '2094.11.24 21:04 // 地上400m上・中継ビーコン塔',
      mood: 'dim',
      speaker: null,
      text: '分厚い火山岩盤を突き抜け、0 と 1 の電波が錆びた地上アンテナの先端から夜空へ放たれた。\n……1秒。5秒。10秒。制御室の誰もが息を呑んで、静まり返ったスピーカーを見つめる。',
    },
    {
      scene: './assets/scene_surface_rover.jpg',
      canvasScene: 'fx_beacon',
      canvasPhase: 1,
      dateline: '2094.11.24 21:05 // 42年ぶりの応答波',
      mood: 'dawn',
      sfx: 'powerup',
      speaker: 'mina',
      text: '……あっ！！ 待って、モニターの右端！！ 緑の波形が返ってきたよ！！\nノイズじゃない……はっきりしたデジタル信号が、外の世界から届いてる！！',
    },
    {
      scene: './assets/scene_ending_ch1.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: 'INCOMING SIGNAL // SHELTER ARK-3',
      mood: 'dawn',
      speaker: 'hako',
      text: '『……受信・復号完了！！ 発信元──沿岸部・地下シェルター【アーク3】！\n「こちらアーク3通信官カイ！ お前たちの "HELLO, WORLD." を受信した！ アーク7、まだ生きていたんだな……応答せよ！！」』',
    },
    {
      scene: './assets/scene_ending_ch1.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.11.24 21:06 // 118人の歓声',
      mood: 'dawn',
      speaker: null,
      text: 'ガラス扉の向こうに集まっていた住民たちから、地響きのような歓声が上がった。\n最初に NOT ゲートで酸欠から救った地下3区の空気清浄プラントの整備員たち、4ビット加算器で夕方の配給行列から解放された配給係のおばちゃん、そして3区の子どもたち──118人全員が肩を抱き合って笑い、泣いていた。',
    },
    {
      scene: './assets/scene_ending_ch1.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.11.24 21:07 // 湊 ミナの涙',
      mood: 'calm',
      speaker: 'mina',
      text: '私たち……ひとりじゃなかったんだね……！ 灰の向こうにも、同じように生き抜いていた人たちがいたんだよ……！\n全部、あなたが1粒の砂と1個のスイッチから諦めずに繋いでくれたおかげだよ！',
    },
    {
      scene: './assets/scene_ending_ch1.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.11.24 21:08 // 主任技師への昇格',
      mood: 'amber',
      speaker: 'kagari',
      text: '……見習い君。いや、今日この瞬間からは──【アーク7 主任技師】だ。\n戦前の工場も設計図も失われた地下で、君は人類が100年かけて築いたコンピュータ科学のすべてを、自分の手で一から再発明したんだよ。',
    },
    {
      scene: './assets/scene_ending_ch1.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.11.24 21:09 // 新時代最初の技師へ',
      mood: 'amber',
      speaker: 'kagari',
      text: `ここまで ${s.forgedChips} 種のカスタムチップを鍛え上げ、ついに自作CPUを起動させたアーク7新・主任技師──いま、どんな気持ちだい？`,
      choices: [
        {
          label: '「砂とスイッチから本当に頭脳が創れるなんて、自分でも驚いてます！」',
          replySpeaker: 'kagari',
          replyText: 'ふふっ、それこそが計算機科学の一番美しい魔法さ！ どんなに巨大な人工知能も宇宙船も、根っこをたどれば君が今日つないだ「0と1の小さなスイッチ」の積み重ねなんだよ。',
        },
        {
          label: '「シェルターの118人が笑顔になってくれたのが、何より嬉しいです！」',
          replySpeaker: 'mina',
          replyText: 'えへへ……ほら見て、3区の子どもたちが窓に張りついて手を振ってるよ！ 「すごい技師さん、いつか本物の青空を見せてね！」って約束してるんだからね！',
        },
        {
          label: '「アーク3と連絡を取り合って、必ずみんなで地上へ出ましょう！」',
          replySpeaker: 'hako',
          replyText: '『頼もしいな、新・主任技師！ お前なら本当にこのぶ厚い地下の蓋をこじ開けちまいそうだぜ。オレもその日までリレーを鳴らし続けてやるよ！』',
        },
      ],
    },
    {
      scene: './assets/scene_ending_ch1.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.11.24 21:11 // 古い相棒の誇り',
      mood: 'calm',
      speaker: 'hako',
      text: '『……ふっ。戦前の骨董品だったオレのリレー筐体も、お前が組み上げた新しい頭脳【ARK-4】と肩を並べて働けるとはな。悪くない気分だぜ、主任技師。』',
    },
    {
      scene: './assets/scene_surface_rover.jpg',
      canvasScene: 'fx_beacon',
      canvasPhase: 1,
      dateline: 'URGENT PACKET // 2094.11.24 21:14 — アーク3からの第2報',
      mood: 'alert',
      sfx: 'alarm',
      speaker: 'hako',
      text: '『……おっと待て、主任！ アーク3のカイから緊急の第2報が入電した！\n「朗報と緊急警告だ！ 地上の放射能雲はすでに晴れ、本物の青空が戻っている！ ……だが聞け、アーク7の真上にある旧地熱ダムの氷河湖が、融雪で決壊寸前だ！ 明朝の融雪ピークで地下が水没する前に、地上大ハッチを開けて高台へ脱出しろ！！」』',
    },
    {
      scene: './assets/scene_ending_ch1.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: 'CHAPTER I COMPLETE // NEXT: 青空への帰還',
      mood: 'dawn',
      sfx: 'powerup',
      chapterCard: {
        roman: 'CHAPTER I · COMPLETE',
        title: '文明再起動 ── 完結',
        sub: '解放：第二章「青空への帰還」（STAGE 18〜26）',
      },
      speaker: null,
      text: '地下400メートルの長い夜が終わり、新しい物語の扉が開かれた。\n次なる挑戦は、君の自作CPUに「条件分岐」と「命令メモリ（ROM）」、そして「アセンブリ言語」を宿らせ、夜明け前に42年間閉ざされた地上大ハッチを自らの手で開くこと──第二章『青空への帰還』、いま開幕！',
    },
  ];
}

/**
 * CHAPTER II GRAND ENDING — Clearing Stage 26 (id: stage_24, `青空へのカウントダウン・大ハッチ開門`)
 */
export function buildChapter2EndingSteps(rawStats = {}) {
  const s = formatStats(rawStats);
  return [
    {
      scene: './assets/scene_machinery.jpg',
      dateline: 'FINAL CLOCK // 2094.11.25 06:40 — 全開信号 1111 送出',
      mood: 'amber',
      bgm: 'finale',
      fx: 'shake',
      sfx: 'powerup',
      speaker: 'hako',
      text: `『……主任による最終開門クロック入力を確認！ 外部回路ゼロ・純粋4行 JNZ ループ（LDI 3 → SUB 1 → JNZ 1）のカウントダウン 3 → 2 → 1 → 0 ➔ 3番地【LDI 15 (00:1111)】が、お前自身の【ASM_ENC】・4ワード焼付マスクROM・【ARK4_SYS（${s.ark4SysNand} NAND／実機 MOSFET ${s.ark4SysTr} 個＋抵抗 ${s.ark4SysPull} 本）】を完全通過！！\n全開信号 1111 出力──地上メインハッチ、全4基の爆破ボルト同時開放！！』`,
    },
    {
      scene: './assets/scene_shelter_hub.jpg',
      canvasScene: 'fx_hatch_light',
      dateline: '2094.11.25 06:41 // 42年間の封印が解ける音',
      mood: 'dawn',
      fx: 'shake',
      sfx: 'powerup',
      speaker: null,
      text: '──ガコンッ！！ ガコンッ！！ ガコンッ！！ ガコンッ！！\n重厚な4本のロックピンが順に弾け飛び、42年分の錆を払い落としながら、厚さ1.5メートルの鉛の大扉がゆっくりと空へ向かって押し上げられていく。',
    },
    {
      scene: './assets/scene_ending_bluesky.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: 'GRAND FINALE // 2094.11.25 06:42 — 青空への帰還',
      mood: 'bluesky',
      sfx: 'powerup',
      chapterCard: {
        roman: 'GRAND FINALE',
        title: '青空への帰還',
        sub: 'A.D. 2094 — 42年ぶりの太陽と風',
      },
      speaker: null,
      text: '鉄のスロープへ、眩しすぎるほどの白い光が一筋、また一筋と流れ込んできた。\n地下には決して存在しなかった匂い──潮風と、濡れた草木と、朝の太陽の匂いが、アーク7の奥まで一気に吹き抜けていく。',
    },
    {
      scene: './assets/scene_ending_bluesky.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.11.25 06:43 // はじめての太陽',
      mood: 'bluesky',
      speaker: 'mina',
      text: '……あっ……っ！ まぶしい……っ！ 風が、こんなにあたたかいんだ……！！',
    },
    {
      scene: './assets/scene_ending_bluesky.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.11.25 06:43 // 23年越しの約束',
      mood: 'bluesky',
      speaker: 'mina',
      text: '見て、主任さん、博士！！ 天井がないよ！！ どこまでも、どこまでも真っ青だよ……！！\nこれが……23年間ずっと地下で夢に見ていた、本物の【青空】なんだね……！！',
    },
    {
      scene: './assets/scene_ending_bluesky.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.11.25 06:44 // あなたが繋いだ118人',
      mood: 'bluesky',
      speaker: null,
      text: 'ミナの後ろから、鉄のスロープを踏みしめる118人分の足音が響き、ひとり、またひとりと光の中へ歩み出てくる。\n君がこれまで一つひとつの回路で救ってきた、かけがえのない顔ぶれだった。',
    },
    {
      scene: './assets/scene_ending_bluesky.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.11.25 06:45 // すべての回路が結んだ命',
      mood: 'bluesky',
      speaker: null,
      text: 'たった1個の NOT ゲートで酸欠の危機を乗り越えた地下3区の空気清浄プラントの整備員たち。4ビット加算器で公平な水配給を守り抜いた配給係のおばちゃん。SRラッチの揺れ警報で頭上の氷河ダムの異変まで見抜いてくれた岩盤監視員さん。\nそして3区の子どもたちが、水耕室で大切に育てたレタスの鉢を本物の太陽へ向かって高く掲げて笑っている。',
    },
    {
      scene: './assets/scene_ending_bluesky.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.11.25 06:46 // 42年ぶりの深呼吸',
      mood: 'bluesky',
      speaker: 'kagari',
      text: '……42年ぶりだよ。戦前の地上を知っている最後の世代として、いつか君たちをあの暗闇から外へ連れ出してやりたかった。\nまさか生きているうちに、もう一度この太陽の下で胸いっぱい深呼吸ができるなんてね……。',
    },
    {
      scene: './assets/scene_ending_bluesky.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.11.25 06:47 // 丘の向こうからの光',
      mood: 'bluesky',
      sfx: 'powerup',
      speaker: 'hako',
      text: '『おーい人間ども、崖の向こうを見ろ！ オレの受信アンテナに強烈な近距離信号──アーク3の探査ローバーがヘッドライトを点滅させながら、こっちへ全速力で走ってくるぞ！！』',
    },
    {
      scene: './assets/scene_ending_bluesky.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.11.25 06:48 // 繋がった二つのシェルター',
      mood: 'bluesky',
      speaker: 'mina',
      text: '本当だ！！ ローバーの上から大きな旗を振ってる人が見えるよ！！\n無線が鳴ってる──「ようこそ地上へ、アーク7！ お前たちが送った "HELLO, WORLD." と自作コンピュータが、俺たちを繋いだぞ！」って……！！',
    },
    {
      scene: './assets/scene_opening_aether.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.11.25 06:49 // 相棒からの手向け',
      mood: 'amber',
      speaker: 'hako',
      text: '『……なあ、主任技師。最初の日、真っ暗なB4の作業台で「P型シリコン」と「N型シリコン」を恐る恐る並べていた頃を覚えてるか？』',
    },
    {
      scene: './assets/scene_ending_bluesky.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.11.25 06:50 // 砂からOSまでの軌跡',
      mood: 'bluesky',
      speaker: 'hako',
      text: `『たった1粒の砂から MOSFET と抵抗を鍛え上げ、${s.ark4SysNand} 個の NAND ゲート（実機 MOSFET ${s.ark4SysTr} 個＋プルアップ抵抗 ${s.ark4SysPull} 本）の自律CPU【ARK4_SYS】、命令エンコーダ【ASM_ENC】、4ワード焼付マスクROM、そして外部回路ゼロの純粋な4行 JNZ ループまで──このまま本物のシリコンウェハーへ焼き付けられるお前だけの計算機で、本当にこの扉を開けちまった。\n……お前は紛れもなく、新時代最高のエンジニアだぜ。』`,
    },
    {
      scene: './assets/scene_ending_bluesky.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.11.25 06:51 // 新しい朝への問いかけ',
      mood: 'bluesky',
      speaker: 'kagari',
      text: 'さあ、アーク7最高主任技師。42年ぶりに取り戻したこの青空の下で──君の計算機とともに、次はどんな未来を創りたいかい？',
      choices: [
        {
          label: '「アーク3と手を取り合って、地上に新しい街とネットワークを築きます！」',
          replySpeaker: 'kagari',
          replyText: '素晴らしい答えだ！ たった4ビットの計算機から始まった人類の歴史が、やがて世界中を繋ぐインターネットを生んだように──今度は君たちの手で、もっと優しい文明を創っていこう！',
        },
        {
          label: '「まずはミナや子どもたちと一緒に、この広い青空の下を思いっきり走りたいです！」',
          replySpeaker: 'mina',
          replyText: 'ふふっ、大賛成！！ 約束だよ、主任さん！ 今日だけは回路図もハンダごてもぜんぶ作業台に置いて、子どもたちと一緒に緑の丘の向こうの海まで見に行こうね！！',
        },
        {
          label: '「もっと大きな計算機を作って、この知識を次の世代へ残していきます！」',
          replySpeaker: 'kagari',
          replyText: 'あぁ、それが何よりの宝物になる！ 君が自分の手で組み上げたチップとモジュール図鑑は、新しい世界の最初の教科書として、何百年先までも受け継がれていくはずだよ。',
        },
      ],
    },
    {
      scene: './assets/scene_ending_bluesky.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.11.25 06:53 // 新しい朝へ',
      mood: 'bluesky',
      speaker: 'mina',
      text: 'ありがとう、主任さん。あなたと一緒に過ごした地下の作業台も、パチッと点いた最初のランプも、私は一生忘れないよ。\n……さあ、行こう！ 新しい朝が、私たちのことを待ってるよ！',
    },
    {
      scene: './assets/scene_ending_bluesky.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: 'CHAPTER II COMPLETE // NEXT: 記憶の大地',
      mood: 'bluesky',
      sfx: 'powerup',
      chapterCard: {
        roman: 'CHAPTER II · COMPLETE',
        title: '青空への帰還 ── 完結',
        sub: `解放：第三章「記憶の大地」（STAGE 27〜42）· ARK4_SYS (${s.ark4SysNand} NAND)`,
      },
      speaker: null,
      text: `たった1粒の砂（シリコン）から鍛えた 480 NAND（実機 MOSFET ${s.ark4SysTr}個＋抵抗 ${s.ark4SysPull}本）の自律CPUと焼付ROMが、118人全員を42年ぶりの青空へ導いた。\nそして地上で合流したアーク3とともに、新しい街を築くための次なる跳躍──「書き換え可能な記憶（SRAM）」と「1バイト（8ビット）汎用計算機」の物語、第三章『記憶の大地』がいま幕を開ける！`,
    },
  ];
}

/**
 * CHAPTER III GRAND ENDING — Clearing Stage 42 (`stage_42`, 真の汎用ループ乗算＆242人配給演算)
 */
export function buildChapter3EndingSteps(rawStats = {}) {
  const s = formatStats(rawStats);
  return [
    {
      scene: './assets/scene_horizon_camp.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.12.01 16:40 // 開拓拠点ホライズン・中央管理棟',
      mood: 'amber',
      bgm: 'finale',
      fx: 'shake',
      sfx: 'powerup',
      speaker: 'hako',
      text: `『……全サイクル完了！ 君が組んだ8ビット汎用計算機【ARK8_SYS（${s.ark8SysNand} NAND／実機 MOSFET ${s.ark8SysTr}個＋プルアップ抵抗 ${s.ark8SysPull}本）】の SRAM[2] に、総配給数【242（11110010）】が正確に書き込まれ、HALT 信号で美しく停止したぞ！！』`,
    },
    {
      scene: './assets/scene_horizon_camp.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.12.01 16:42 // 242人分の新しい暮らし',
      mood: 'bluesky',
      sfx: 'powerup',
      speaker: 'kai',
      text: 'おいおい、マジかよ……！ 16ビットの命令コードから4本のレジスタと16バイトの書き換えSRAMを全部フル稼働させて、アーク7の118人と俺たちアーク3の124人──242人分の食料と電力の配分表が一瞬で出ちまったぜ！！',
    },
    {
      scene: './assets/scene_horizon_camp.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.12.01 16:43 // もう15で止まらない',
      mood: 'bluesky',
      speaker: 'mina',
      text: 'すごいよ、主任さん！！ つい数日前まで「15」までしか数えられなかったのに、いまは 242人全員の名前も、今日の太陽発電の余剰も、書き換えできる SRAM の棚にちゃんと覚えさせられるんだね……！！',
    },
    {
      scene: './assets/scene_horizon_camp.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.12.01 16:45 // 1万個のMOSFETが刻んだ歴史',
      mood: 'dawn',
      speaker: 'kagari',
      text: '4ビットから8ビット（1バイト）へ。固定配線のマスクROMから書き換え可能なSRAMへ。そして1本のACCから4本の汎用レジスタ（R0〜R3）と Load/Store 構造へ──君はたった数日間で、人類が1960年代から70年代にかけて駆け上がった半導体革命を、1ミリの飛躍もなく地上で再現してみせたんだ！',
    },
    {
      scene: './assets/scene_horizon_camp.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.12.01 16:47 // 夕焼けの開拓地にて',
      mood: 'dawn',
      speaker: null,
      text: '丘の上のソーラーパネルが茜色の光を反射し、風力タービンがゆっくりと回る。アーク7とアーク3の子どもたちが一緒に駆け回り、広場には焼きたてのパンと海風の匂いが満ちていた。',
    },
    {
      scene: './assets/scene_horizon_camp.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.12.01 16:50 // カイからの問いかけ',
      mood: 'dawn',
      speaker: 'kai',
      text: 'なあ主任、俺ずっと気になってたんだ。あんたが砂から組み上げてきたこの計算機──この先、どこまでデカくしていくつもりなんだ？',
      choices: [
        {
          label: '「誰がどんなアプリを書いても安全に同時に動く、本物の『OS』まで作り上げます！」',
          replySpeaker: 'kagari',
          replyText: 'ほうっ……UNIX のような本物のカーネルとマルチタスクOSか！ 素晴らしい野望だ！ 今作った R0〜R3 と物理リセット線 RST、そして16ビット命令の空き枠は、まさにその日のために設計したんだよ！',
        },
        {
          label: '「画面に文字を映して、242人みんながキーボードで使える道具にしたいです！」',
          replySpeaker: 'mina',
          replyText: 'わぁ、いいね！！ 2進数のランプだけじゃなく、本物の文字画面に「おはようございます」って出たら、子どもたちも絶対よろこぶよ！',
        },
        {
          label: '「他のシェルターとも通信して、地上の仲間全員を1つのネットワークで繋ぎます！」',
          replySpeaker: 'kai',
          replyText: '最高だな！ アーク3とアーク7だけじゃ終わらせねえ。この広い青空の下、まだ眠ってる連中を全員起こしてやろうぜ！',
        },
      ],
    },
    {
      scene: './assets/scene_surface_rover.jpg',
      canvasScene: 'fx_beacon',
      dateline: '2094.12.01 17:04 // 緊急受信：北方420km・未知の電波',
      mood: 'alert',
      fx: 'shake',
      sfx: 'error',
      speaker: 'hako',
      text: '『……待て、全員静かにしろ！！ 長距離受信アンテナが、北方420kmから強烈なデジタル搬送波を捉えたぞ！ 識別コードは──【ARK-5（北方気象観測シェルター）】！！』',
    },
    {
      scene: './assets/scene_surface_rover.jpg',
      canvasScene: 'fx_beacon',
      dateline: '2094.12.01 17:05 // 届いたのは「メッセージ」だけではなかった',
      mood: 'alert',
      speaker: 'kai',
      text: 'アーク5が生きてたのか！？ すぐ解読してくれ、ハコ！ 何て送ってきてる！？',
    },
    {
      scene: './assets/scene_surface_rover.jpg',
      canvasScene: 'fx_beacon',
      dateline: '2094.12.01 17:06 // ハーバード型の限界',
      mood: 'alert',
      speaker: 'hako',
      text: '『テキストは「大気異常データあり・至急解読用プログラムを受信し実行せよ」──だがな主任、後ろに続いて送られてきているのは、生きた機械語プログラムそのものだ！\n今の ARK8_SYS は命令が固定の【マスクROM】側、データだけが【SRAM】側（ハーバード型）だ。外部から届いた新しいプログラムを、そのまま実行することができない！！』',
    },
    {
      scene: './assets/scene_horizon_camp.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.12.01 17:08 // 真のノイマン型への扉',
      mood: 'amber',
      sfx: 'powerup',
      speaker: 'kagari',
      text: '……ついにその時が来たな、主任！\n「命令」と「データ」を同じ1本の大きな16ビットRAMに載せ、起動用ブートROMから外部プログラムをメモリへ読み込んで走らせる──真の【ストアードプログラム方式（16ビット統一ノイマン型）】へ進化する時だ！',
    },
    {
      scene: './assets/scene_horizon_camp.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: 'CHAPTER III COMPLETE // ROAD TO ARK-OS',
      mood: 'bluesky',
      sfx: 'powerup',
      chapterCard: {
        roman: 'CHAPTER III · COMPLETE',
        title: '記憶の大地 ── 完結',
        sub: `自作8bit計算機 ARK8_SYS (${s.ark8SysNand} NAND / MOSFET ${s.ark8SysTr}個＋抵抗 ${s.ark8SysPull}本) 完成`,
      },
      speaker: null,
      text: `バス束線・書き込み可能SRAM・リセット付8bitレジスタ・Z/C/Nフラグ付ALU・4本汎用レジスタ・16バイト主記憶・16ビット拡張命令対応【ARK8_SYS】──すべての部品を砂のMOSFETから1ミリの飛躍もなく組み上げ、242人の地上拠点「ホライズン」に計算の記憶が宿った。\nそして物語は次なる舞台、第4章『汎用計算機とブート（16bit真ノイマン型）』──やがて誕生する自作UNIX系OS『ARK-OS』への道へと続く！`,
    },
  ];
}
