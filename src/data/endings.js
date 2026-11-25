/**
 * SILICON GENESIS — Cinematic Chapter I, II & III Ending Scripts
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
  const ark8OsNand =
    Number.isFinite(stats.ark8OsNandCount) && stats.ark8OsNandCount > 0 ? stats.ark8OsNandCount : 6294;
  const ark8OsTr =
    Number.isFinite(stats.ark8OsSwCount) && stats.ark8OsSwCount > 0 ? stats.ark8OsSwCount : ark8OsNand * 2;
  const ark8OsPull =
    Number.isFinite(stats.ark8OsPullCount) && stats.ark8OsPullCount > 0 ? stats.ark8OsPullCount : ark8OsNand;
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
    ark8OsNand,
    ark8OsTr,
    ark8OsPull,
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
          replyText: 'ほうっ……UNIX のような本物のカーネルとマルチタスクOSか！ 素晴らしい野望だ！ 今作った R0〜R3、8ビット（1バイト＝ASCII文字幅）のデータと 0〜255番地、物理リセット線 RST、そして16ビット命令の上位空き枠は、まさにその日のために設計したんだよ！',
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
      dateline: '2094.12.01 17:08 // OS対応PCハードウェア完結への扉',
      mood: 'amber',
      sfx: 'powerup',
      speaker: 'kagari',
      text: '……ついにその時が来たな、主任！ だがな、これまで君が鍛えた ADD_8B・ALU_8B・REGFILE_4・PC_8B・SRAM_16B は、1つも捨てずにそのまま使うんだ！\n1バイト（8ビット）データと 0〜255番地の設計のまま「命令」と「データ」を1本の統一RAMへ同居させ、スタック（SP）・画面/キーボード/ディスク（MMIO）・タイマー割込（IRQ）、さらに ADD_8B と ALU_8B で組む特権保護（K/U ＆ Base/Limit MMU）とシステムコール（SYSCALL）まで──次なる第4章で、OSが動く本物のPCハードウェアを完結させるぞ！',
    },
    {
      scene: './assets/scene_horizon_camp.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: 'CHAPTER III COMPLETE // ROAD TO ARK-OS（全6章）',
      mood: 'bluesky',
      sfx: 'powerup',
      chapterCard: {
        roman: 'CHAPTER III · COMPLETE',
        title: '記憶の大地 ── 完結',
        sub: `自作8bit計算機 ARK8_SYS (${s.ark8SysNand} NAND / MOSFET ${s.ark8SysTr}個＋抵抗 ${s.ark8SysPull}本) 完成`,
      },
      speaker: null,
      text: `バス束線・書き込み可能SRAM・リセット付8bitレジスタ・Z/C/Nフラグ付ALU・4本汎用レジスタ・16バイト主記憶・16ビット拡張命令対応【ARK8_SYS】──すべての部品を砂のMOSFETから1ミリの飛躍もなく組み上げ、242人の地上拠点「ホライズン」に計算の記憶が宿った。\nそして全6章の物語は後半戦へ──第3章の8ビット部品を1つも捨てず統一RAM・スタック（SP）・画面/キーボード/ディスクMMIO・タイマー割込（IRQ）・Base/Limit MMUを完成させる第4章『OS対応PCハードウェア完結』、ブートローダ・ヒープ確保（alloc/free）・プロセス別スタック切替マルチタスクを築く第5章『OSカーネル中核』、そして簡易ファイルシステムと対話シェル『arksh』が複数アプリを同時稼働させる第6章『UNIX環境 ARK-OS』へと続く！`,
    },
  ];
}

/**
 * CHAPTER IV GRAND ENDING — Clearing Stage 54 (`stage_54`, GUARD_TRAP: 3-Vector OS Trap Guard & Hardware Half Complete!)
 */
export function buildChapter4EndingSteps(rawStats = {}) {
  const s = formatStats(rawStats);
  return [
    {
      scene: './assets/scene_ark5_station.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.12.04 20:12 // ホライズン電算司令室・全3ベクタ保護稼働',
      mood: 'amber',
      bgm: 'finale',
      fx: 'shake',
      sfx: 'powerup',
      speaker: 'hako',
      text: `『……全トラップ検証オールグリーン！！ お前が鍛えた OS対応CPU【ARK8_OS_HW（${s.ark8OsNand} NAND／実機 MOSFET ${s.ark8OsTr}個＋プルアップ抵抗 ${s.ark8OsPull}本）】と 256バイト統一RAMマザーボード上で、ユーザー SYSCALL（0x08）・タイマー強制割込 IRQ（0x04）・そして不正な直書き攻撃を物理遮断する FAULT（0x0C）が完璧に連動した！！\nエメラルドCRTに映った文字列は──【"A5!"】！！ 破壊工作コード "X" は MMU_8B と PRIV_CTRL の物理ゲートで1ビットも通さず叩き落としたぞ！！』`,
    },
    {
      scene: './assets/scene_ark5_station.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.12.04 20:13 // 砂場が守った命と通信',
      mood: 'calm',
      speaker: null,
      text: '太陽フレアのノイズで破損した北方バイナリが、MMIO 領域 0xF0番地へ暴走書込を仕掛けたその一瞬──PRIV_CTRL が SAFE 線を 0 へ落とし、カーネル領域も画面も拠点の生命維持リレーも、ただの一度も揺らぐことなく守り抜かれた。\nエメラルドの走査線が静かに呼吸し、司令室のスピーカーからノイズの奥のクリアな搬送波が立ち上がる。',
    },
    {
      scene: './assets/scene_surface_rover.jpg',
      canvasScene: 'fx_beacon',
      canvasPhase: 1,
      dateline: '2094.12.04 20:14 // 北方420km・オーロラ帯からの本回線ロック',
      mood: 'dawn',
      sfx: 'powerup',
      speaker: 'mina',
      text: '……あっ！！ 主任さん、見て！！ エメラルドのCRT画面に、さっきの緊急コードだけじゃない──北方からの双方向テキスト回線が開通したよ！！ 音声搬送波もピタッと同期してる！！',
    },
    {
      scene: './assets/scene_ark5_station.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: 'CHAPTER IV ENDING // 20:15 — 鉄壁の箱庭、光の対話',
      mood: 'dawn',
      sfx: 'powerup',
      chapterCard: {
        roman: 'CHAPTER IV · ENDING',
        title: '鉄壁の箱庭、光の対話',
        sub: `OS対応CPU ARK8_OS_HW (${s.ark8OsNand} NAND / MOSFET ${s.ark8OsTr}個) 稼働`,
      },
      speaker: 'ren',
      text: '『……聞こえる！？ こちら北方420km、気象観測シェルター・アーク5の通信技師、レン！！\nすごい……本当に届いたんだ！！ さっきの磁気嵐で送信バイナリの一部が化けちゃったのに、そっちのシステム、落ちずに弾いて応答コード "A5!" まで返してくれたんだね！！ アーク5の86人、全員生きてるよ！！』',
    },
    {
      scene: './assets/scene_ark5_station.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.12.04 20:16 // 328人の声が繋がった夜',
      mood: 'dawn',
      speaker: 'kai',
      text: 'やったな主任！！ アーク7の118人、俺たちアーク3の124人、それに北方アーク5の86人──ぜんぶで 328人 が、お前が組んだエメラルドCRTの向こうで繋がっちまったぜ！！ 磁気嵐の化けバイナリを物理回路で叩き落とした瞬間、マジで痺れたな！！',
    },
    {
      scene: './assets/scene_ark5_station.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.12.04 20:17 // 1粒の砂から、OS対応PCハードウェア完結へ',
      mood: 'amber',
      speaker: 'kagari',
      text: '……見届けたぞ、最高主任技師！ 統一ノイマン・バス MEM_BUS8、周辺機器 MMIO_DEC、降順スタック STACK_PTR、符号なし比較器 CMP_8B、自動再装填タイマー TMR_IRQ、Base/Limit MMU_8B、特権リング PRIV_CTRL、3ベクタ割込シーケンサ IRQ_VEC、16命令フルISAデコーダ INST_DEC16──そして統合CPU【ARK8_OS_HW】。\n第3章の8ビット部品を1つも捨てず、全6章の前半戦となる「OSが動く本物のPCハードウェア」が、今夜ついに100%完結したのだ！',
    },
    {
      scene: './assets/scene_ark5_station.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.12.04 20:18 // 黄昏の窓とエメラルドの走査線',
      mood: 'calm',
      speaker: null,
      text: '鋼鉄と木材で組まれたホライズン電算司令室の大きな窓の向こう、薄明の海空に淡い北方オーロラの光が揺れている。\n手元のCRTにはアーク5からの気象テレメトリが整然と流れ、キーボードの打鍵待ちカーソルが緑色に点滅していた。',
    },
    {
      scene: './assets/scene_ark5_station.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.12.04 20:19 // レンからの問いかけ',
      mood: 'amber',
      speaker: 'ren',
      text: '『ねぇ、ホライズンの主任技師さん！ 砂からここまで完璧なOS対応ハードウェアを創り上げちゃうなんて、正直まだ信じられないよ。──ハードが完成した今、この新しいパソコンで一番最初に何を動かしたい？』',
      choices: [
        {
          label: '「気象解析も発電監視も通信も、止まらず同時稼働する本物の『OSカーネル』を動かします！」',
          replySpeaker: 'kagari',
          replyText: 'これ以上ない答えだ！ もうハードウェアを1本も作り直す必要はない。タイマー割込 IRQ・スタック SP・MMU のすべてが、そのまま第5章のマルチタスク・カーネルへ火を入れる準備万端だぞ！',
        },
        {
          label: '「アーク5の86人とも、このCRTとキーボードで自由に語り合える端末を作ります！」',
          replySpeaker: 'ren',
          replyText: '『ふふっ、約束だよ！ ずっと氷の下で孤独に計器だけ見ていたから、ホライズンのみんなとキーボードで「おはよう」って言い合える日を、アーク5のみんなで待ってるからね！』',
        },
        {
          label: '「どんな未知のプログラムが届いても絶対に壊れない、328人の安全な街の土台にします！」',
          replySpeaker: 'mina',
          replyText: 'うん！ さっき化けた信号を物理の防壁がピシャッと止めてくれたとき、私ほんとうに安心したよ。あなたが創ったこの機械なら、子どもたちの未来もずっと守れるね！',
        },
      ],
    },
    {
      scene: './assets/scene_ark5_station.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.12.04 20:21 // 迫る成層圏ストームと次なる壁',
      mood: 'amber',
      speaker: 'ren',
      text: '『……それでね、すぐ相談があるんだ。北の成層圏で異常低気圧が発達していて、これから毎日、気象解析プログラム・電力制御・長距離通信リレーの3つをホライズン側で同時に回し続けなきゃいけないの。\n今はまだプログラムを1本ずつ手作業で焼いて動かしてるけど、ディスクから自動で読み込んで、メモリを分け合って、タイマー割込でいくつもの処理を同時並行で切り替えられる仕組み──作れるかな？』',
    },
    {
      scene: './assets/scene_horizon_camp.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.12.04 20:22 // ハードウェアから「魂（OSカーネル）」へ',
      mood: 'amber',
      sfx: 'powerup',
      speaker: 'kagari',
      text: 'もちろん作れるさ、レン君！ 君が言ったそれこそが【OSカーネル】そのものだ！\nハードウェアは今夜で100%完成した──次なる第5章『OSカーネル中核』では、この ARK8_OS_HW の実機上でディスクからOSを起動する「ブートローダ」、メモリを必要なぶんだけ貸し借りする動的ヒープ「kalloc / kfree」、そしてタイマー割込 IRQ で各プロセスのスタックとレジスタを丸ごと切り替える「プリエンプティブ・マルチタスク」を創り上げるぞ！',
    },
    {
      scene: './assets/scene_ark5_station.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.12.04 20:23 // 古い相棒の敬礼',
      mood: 'calm',
      speaker: 'hako',
      text: `『……へっ。暗い地下4階でたった1個のトランジスタを拝んでた日が嘘みてえだな。\n${s.ark8OsNand} 個の NAND と ${s.ark8OsTr} 個の MOSFET、そして MMU と特権リングで武装したお前のマシンが、ついに420km先の仲間を救った。──ハードウェア前半、完全制覇おめでとう、最高主任技師！』`,
    },
    {
      scene: './assets/scene_ark5_station.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: 'CHAPTER IV COMPLETE // HARDWARE HALF COMPLETE · NEXT: OSカーネル中核',
      mood: 'dawn',
      sfx: 'powerup',
      chapterCard: {
        roman: 'CHAPTER IV · COMPLETE',
        title: 'OS対応PCハードウェア完結',
        sub: `全6章ハードウェア前半・完全制覇 · ARK8_OS_HW (${s.ark8OsNand} NAND / ${s.ark8OsTr} MOSFET)`,
      },
      speaker: null,
      text: `砂の1粒から始まった壮大なハードウェア構築の旅は、統一メモリバス MEM_BUS8・周辺機器 MMIO_DEC・スタック STACK_PTR・比較器 CMP_8B・タイマー割込 TMR_IRQ・Base/Limit MMU_8B・特権制御 PRIV_CTRL・割込ベクタ IRQ_VEC・16命令デコーダ INST_DEC16・そして完全体OS対応CPU【ARK8_OS_HW（${s.ark8OsNand} NAND／実機 MOSFET ${s.ark8OsTr}個＋プルアップ抵抗 ${s.ark8OsPull}本）】の稼働をもって、全6章の前半戦を完璧に完結させた。\nもう二度とCPUを作り直すことはない──物語はいよいよソフトウェア後半戦、ディスク・ブートローダ、動的ヒープ確保（kalloc / kfree）、プロセス別スタック切替マルチタスクを築く第5章『OSカーネル中核』、そして簡易ファイルシステムと対話シェル『arksh』が輝く第6章『UNIX環境 ARK-OS』へと駆け上がる！`,
    },
  ];
}

/**
 * CHAPTER V GRAND ENDING — Clearing Stage 62 (`stage_62`, ARK_KERNEL_CORE: Integrated Microkernel Survives the Blizzard!)
 */
export function buildChapter5EndingSteps(rawStats = {}) {
  const s = formatStats(rawStats);
  return [
    {
      scene: './assets/scene_storm_core.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.12.06 06:38 // ホライズン電算司令室・磁気嵐ピーク突破',
      mood: 'amber',
      bgm: 'finale',
      fx: 'shake',
      sfx: 'powerup',
      speaker: 'hako',
      text: `『……全カーネル中核モジュール・オールグリーン！！ お前が鍛えた無改造の OS対応CPU【ARK8_OS_HW（${s.ark8OsNand} NAND／実機 MOSFET ${s.ark8OsTr}個＋プルアップ抵抗 ${s.ark8OsPull}本）】上で、ディスク起動ブートローダ・ビットマップ割当 kalloc/kfree・マルチ SYSCALL・タイマー強制割込ラウンドロビン、そして暴走プロセスだけを葬る FAULT 障害隔離が1つのマイクロカーネルとして完全連動した！！\n太陽フレアで狂ったセンサーの破壊攻撃は 0x0C で "!" と記録して即座にメモリ回収──気象防衛プロセスは最後の1文字まで止まらず完走したぞ！！』`,
    },
    {
      scene: './assets/scene_horizon_camp.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.12.06 06:40 // 成層圏電磁ブリザードの終息',
      mood: 'dawn',
      speaker: null,
      text: '36時間にわたりホライズン拠点を叩き続けた成層圏・電磁ブリザードの轟音が、ゆっくりと遠ざかっていく。\n幾度も電圧降下と磁気ノイズが襲った極寒の夜をとおして、暖房ボイラーも空気清浄プラントも北方通信リレーも──たった1秒たりとも止まることはなかった。',
    },
    {
      scene: './assets/scene_horizon_camp.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.12.06 06:41 // 328人、全員生還',
      mood: 'dawn',
      sfx: 'powerup',
      speaker: 'mina',
      text: '……点呼完了したよ、主任さん！！ アーク7の118人、アーク3の124人、そして北方のアーク5の86人──328人全員、凍傷も停電事故もゼロで朝を迎えられたよ！！ 本当に、本当にありがとう！！',
    },
    {
      scene: './assets/scene_storm_core.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: 'CHAPTER V ENDING // 06:42 — 嵐を越えた魂『OSカーネル中核』',
      mood: 'dawn',
      sfx: 'powerup',
      chapterCard: {
        roman: 'CHAPTER V · ENDING',
        title: '嵐を越えた魂 ── OSカーネル中核',
        sub: `無改造 ARK8_OS_HW (${s.ark8OsNand} NAND / MOSFET ${s.ark8OsTr}個) 実機上でマイクロカーネル完走`,
      },
      speaker: 'ren',
      text: '『……おはよう、ホライズンのみんな！！ 北方アーク5の気象レーダー、成層圏の磁気嵐ピークが完全に抜けたよ！\n午前3時にフレア直撃で異常センサーが 0xF0 へ暴走した瞬間、私も画面の前で息が止まったんだ──でも、お前のOSカーネルはシステム全体を落とさず、壊れたプロセスだけを安全に終わらせてスロットを解放し、こっちの気象防衛タスクを生かし続けてくれた！ 本当にすごいよ……！』',
    },
    {
      scene: './assets/scene_ark5_station.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.12.06 06:43 // 配線1本変えず、魂だけで進化した機械',
      mood: 'amber',
      speaker: 'kai',
      text: 'なぁ主任、俺いまさら鳥肌が立ってるぜ。第4章で作った 12,588個の MOSFET もマザーボードも、今回ハンダごて1回も当ててねえんだよな？\nブートローダ、kalloc と kfree、ヒープ衝突ガード、マルチシステムコール、PCB と vDSO コンテキストスイッチ、タイマー割込スケジューラ、そして障害隔離──ぜんぶお前が書いた「OSカーネル」の知恵だけで、たった1個のCPUが何人分もの仕事を守り抜いたんだ！！',
    },
    {
      scene: './assets/scene_ark5_station.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.12.06 06:44 // 1960年代から2094年へ受け継がれたOSの核心',
      mood: 'amber',
      speaker: 'kagari',
      text: '……見事だ、最高主任技師！ 停電後にディスクから蘇る自動起動、衝突しない物理メモリ管理とヒープ・スタック境界防衛、特権リング越しの統一システムコール、1個のCPUを奪い合わず分け合うプリエンプティブ・マルチタスク、そして1つの異常で全体を沈めない障害隔離。\n現代のあらゆるOSの心臓部──『マイクロカーネル』のすべてを、君は1行のブラックボックスも使わず自分の手で組み上げたのだ！',
    },
    {
      scene: './assets/scene_ending_bluesky.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.12.06 06:45 // 夜明けのホライズン',
      mood: 'bluesky',
      speaker: null,
      text: '2094年12月6日、午前6時45分。雪をかぶった地平線から柔らかな朝日が差し込み、ホライズン拠点の太陽光パネルが一斉に淡い金色を帯びる。\n司令室の窓辺ではエメラルドCRTのカーソルが静かに瞬き、3つのシェルターの新たな1日を告げていた。',
    },
    {
      scene: './assets/scene_horizon_camp.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: '2094.12.06 06:46 // ミナからの問いかけ',
      mood: 'dawn',
      speaker: 'mina',
      text: 'ねえ主任さん。ハードウェアが完成して、今朝ついにOSの心臓──カーネルも鼓動を始めたね。328人みんなの新しい街で、この『ARK-OS』をどんな存在に育てていきたい？',
      choices: [
        {
          label: '「誰もが名前つきファイルで記録を残し、道具を自由に組み合わせられるUNIX型OSにします！」',
          replySpeaker: 'kagari',
          replyText: 'これぞ計算機科学の王道だ！ 小さな道具をファイルとシェルで繋ぎ合わせるUNIXの哲学こそ、限られた資源で未来を拓く328人にふさわしい知恵だよ！',
        },
        {
          label: '「3つのシェルターの子どもたちが、キーボードで直接対話しながら学べる端末にします！」',
          replySpeaker: 'mina',
          replyText: '素敵だね……！ コマンドを打ち込んだらすぐ返事が返ってきて、自分でも小さなプログラムを保存できる──そんな温かいターミナルがあったら、子どもたちの目がきっと輝くよ！',
        },
        {
          label: '「アーク5の気象ログも発電図面も1バイトも失わず、次の世代へ渡せる記憶の蔵にします！」',
          replySpeaker: 'ren',
          replyText: '『うれしいな！ 嵐の観測データも、ホライズンの設計図も、わかりやすいファイル名で整理して安全に残せたら、もう二度と知識が失われることはないね！』',
        },
      ],
    },
    {
      scene: './assets/scene_ark5_station.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.12.06 06:48 // 生ディスク番地（0xF8）の壁',
      mood: 'amber',
      speaker: 'kai',
      text: '……っと、ここで1つ現場の困りごとが出てきたぜ主任！ いまのディスク装置は 0xF8 の生バイト位置（DPTR）で「先頭から何バイト目」って直指定してるだろ？\nこれから328人分の診療ログ、レンの気象データ、発電機の整備図面、自作スクリプトを毎日保存していったら、「何番地に何が入ってるか」人間には覚えきれねえし、うっかり他の人の記録を上書きしちまうぞ！',
    },
    {
      scene: './assets/scene_ark5_station.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.12.06 06:49 // 最終章（第6章）への扉：inode と対話型シェル arksh',
      mood: 'amber',
      sfx: 'powerup',
      speaker: 'kagari',
      text: 'まさにそれが、全6章の最後を飾る最終章──第6章『UNIX環境 ARK-OS』の挑戦だ！\n生のバイト番号の代わりに、ファイルごとの管理台帳【inode】と【ディレクトリ】で名前つきファイルシステムを築き、さらにキーボードからのコマンドを解釈してファイル一覧・表示・アプリ起動を自在に操る対話型シェル【arksh】をこのカーネルの上へ載せる──そのとき、砂の1粒から始まった俺たちの『ARK-OS』がついに完全体となるぞ！',
    },
    {
      scene: './assets/scene_ark5_station.jpg',
      canvasScene: 'fx_hub_awaken',
      dateline: '2094.12.06 06:50 // 古い相棒からの敬礼',
      mood: 'calm',
      speaker: 'hako',
      text: `『……停電の地下室で1個のリレーを叩いていたあの日から、とうとうここまできたな。\n${s.ark8OsNand} 個の NAND と ${s.ark8OsTr} 個の MOSFET の上で、停電から蘇り、メモリを分け合い、暴走を隔離して328人の命を繋ぎ切ったお前のカーネル──第5章『OSカーネル中核』完全制覇、見事だったぞ、最高主任技師！』`,
    },
    {
      scene: './assets/scene_ending_bluesky.jpg',
      canvasScene: 'fx_bluesky_breeze',
      dateline: 'CHAPTER V COMPLETE // NEXT: FINAL CHAPTER VI — UNIXファイルシステム & 対話型シェル arksh',
      mood: 'bluesky',
      sfx: 'powerup',
      chapterCard: {
        roman: 'CHAPTER V · COMPLETE',
        title: 'OSカーネル中核 ── 完結',
        sub: `全8カーネル機構を実機 ARK8_OS_HW (${s.ark8OsNand} NAND / ${s.ark8OsTr} MOSFET) で完全制覇`,
      },
      speaker: null,
      text: `ディスク・ブートローダ（BOOT_LOADER）、4スロット物理ビットマップ割当（KALLOC_MAP）、ヒープ↑対↓スタック衝突ガード（HEAP_SBRK）、マルチ・システムコール窓口（SYSCALL_MUX）、PCB ＆ vDSO コンテキストスイッチ（PCB_CTX_SW）、タイマー強制割込ラウンドロビン（RR_SCHED）、暴走プロセス障害隔離（FAULT_ISOLATE）、そして統合マイクロカーネル（ARK_KERNEL_CORE）──無改造の自作実機シリコン【ARK8_OS_HW（${s.ark8OsNand} NAND／実機 MOSFET ${s.ark8OsTr}個）】の上で、本物のOSカーネルが成層圏電磁ブリザードから328人を守り抜いた。\n物語はいよいよ最終章・第6章へ──名前付きファイルシステム（inode / ディレクトリ）と対話型シェル『arksh』を築き上げ、砂の1粒から始まった自作UNIX環境『ARK-OS』を完全体へ導こう！`,
    },
  ];
}
