/* ================= STAR7 世界观 / 成员 / 卡池数据 ================= */
/* 成员立绘 / 头像 / SR 日常 / SSR 舞台：全部走 assets/ 同域相对路径 */
const ART = {
  sy:'assets/sy_main.webp', ja:'assets/ja_main.webp', bl:'assets/bl_main.webp',
  wy:'assets/wy_main.webp', gy:'assets/gy_main.webp', lq:'assets/lq_main.webp', xz:'assets/xz_main.webp'
};
const ART_AV = {
  sy:'assets/sy_avatar.webp', ja:'assets/ja_avatar.webp', bl:'assets/bl_avatar.webp',
  wy:'assets/wy_avatar.webp', gy:'assets/gy_avatar.webp', lq:'assets/lq_avatar.webp', xz:'assets/xz_avatar.webp'
};
const ART_SR = {
  sy:'assets/sy_sr.webp', ja:'assets/ja_sr.webp', bl:'assets/bl_sr.webp',
  wy:'assets/wy_sr.webp', gy:'assets/gy_sr.webp', lq:'assets/lq_sr.webp', xz:'assets/xz_sr.webp'
};
const ART_SSR = {
  sy:'assets/sy_ssr.webp', ja:'assets/ja_ssr.webp', bl:'assets/bl_ssr.webp',
  wy:'assets/wy_ssr.webp', gy:'assets/gy_ssr.webp', lq:'assets/lq_ssr.webp', xz:'assets/xz_ssr.webp'
};

const MEMBERS = [
  {
    key:'sy', name:'沈星野', en:'SHEN XINGYE', role:'队长 · 主舞',
    color:'#8fc4ff', color2:'#cfe6ff', ink:'#20344f',
    bg1:'#243a63', bg2:'#0e1830',
    hair:'#cfd9ef', hair2:'#8fa4c8', eye:'#8fd4ff', skin:'#ffe9dd', skin2:'#f3c6b9',
    cloth:'#22253c', cloth2:'#3d4363', trim:'#d9c58f',
    hairStyle:'wolf', eyeStyle:'cool',
    tag:'冷感队长', accessory:'starcuff',
    birthday:'3月14日', birthMD:'03-14', selfIntro:'我是沈星野。跟着我，别掉队。',
    intro:'台上是锋利到不近人情的队长，台下会替所有人把矿泉水拧开。'
  },
  {
    key:'ja', name:'江予安', en:'JIANG YUAN', role:'主唱 · 甜系担当',
    color:'#ffbe8a', color2:'#ffe3c4', ink:'#5a3520',
    bg1:'#5c3a2c', bg2:'#251410',
    hair:'#c99a72', hair2:'#8e6247', eye:'#ffcf7a', skin:'#ffeadc', skin2:'#f2c3ad',
    cloth:'#f4e3cf', cloth2:'#d9bda2', trim:'#ff9f6e',
    hairStyle:'curtain', eyeStyle:'soft',
    tag:'温柔主唱', accessory:'scarf',
    birthday:'3月24日', birthMD:'03-24', selfIntro:'我是江予安，今天的甜度由你决定。',
    intro:'声音像刚出炉的舒芙蕾，会在深夜给粉丝的私信一条条点已读。'
  },
  {
    key:'bl', name:'白鹿鸣', en:'BAI LUMING', role:'作曲 · 氛围担当',
    color:'#c9a6ff', color2:'#ecdcff', ink:'#3b2360',
    bg1:'#3c2a60', bg2:'#150f26',
    hair:'#cdbcf0', hair2:'#9a86c9', eye:'#b98cff', skin:'#fdeade', skin2:'#eac0b4',
    cloth:'#efe8f6', cloth2:'#b9a7d8', trim:'#8d6ad6',
    hairStyle:'longwave', eyeStyle:'lazy',
    tag:'天才作曲', accessory:'headphone',
    birthday:'9月2日', birthMD:'09-02', selfIntro:'白鹿鸣。歌写完了，你要听吗？',
    intro:'写歌时会把窗帘拉死，凌晨三点发来一段 demo，附言只有一句「你听听」。'
  },
  {
    key:'wy', name:'温以宁', en:'WEN YINING', role:'门面 · 舞蹈',
    color:'#9fe6cf', color2:'#dcfff4', ink:'#1f4a3f',
    bg1:'#224b46', bg2:'#0c1d1b',
    hair:'#2d2a36', hair2:'#15131c', eye:'#7fe0c3', skin:'#ffe8df', skin2:'#efc2b8',
    cloth:'#1b1c24', cloth2:'#343642', trim:'#e7e3d6',
    hairStyle:'hime', eyeStyle:'elegant',
    tag:'清冷舞者', accessory:'pearl',
    birthday:'8月18日', birthMD:'08-18', selfIntro:'温以宁。看好了，这一支只跳一次。',
    intro:'练舞练到镜面起雾，谢幕时却会偷偷把花束分给后台每一个人。'
  },
  {
    key:'gy', name:'顾时一', en:'GU SHIYI', role:'Rapper · 舞台担当',
    color:'#ff9a92', color2:'#ffd9cf', ink:'#5a221f',
    bg1:'#5c2626', bg2:'#210b0b',
    hair:'#8c2f34', hair2:'#5a1b20', eye:'#ffcf88', skin:'#ffe6d6', skin2:'#efb89f',
    cloth:'#3a1416', cloth2:'#67262a', trim:'#c9c9d4',
    hairStyle:'slick', eyeStyle:'bold',
    tag:'舞台炸弹', accessory:'chain',
    birthday:'11月11日', birthMD:'11-11', selfIntro:'顾时一。音浪够大，就跟我一起喊。',
    intro:'嗓门最大、脾气最软。台上炸场，台下会记得每个工作人员的名字。'
  },
  {
    key:'lq', name:'林青禾', en:'LIN QINGHE', role:'忙内 · 运动担当',
    color:'#9fe0a8', color2:'#e1ffdf', ink:'#234d2b',
    bg1:'#2a4a35', bg2:'#0d1c13',
    hair:'#7fd3b6', hair2:'#3f9d88', eye:'#a8e7a0', skin:'#ffe9d9', skin2:'#f1c3a8',
    cloth:'#d9efe0', cloth2:'#8fc9ab', trim:'#57a882',
    hairStyle:'crop', eyeStyle:'bright',
    tag:'阳光忙内', accessory:'band',
    birthday:'5月20日', birthMD:'05-20', selfIntro:'林青禾！水我带了两瓶，给你一瓶。',
    intro:'永远多带一瓶水、多带一件外套，被哥哥们叫做「移动补给站」。'
  },
  {
    key:'xz', name:'夏知遥', en:'XIA ZHIYAO', role:'视觉 · 摄影担当',
    color:'#ffc1a3', color2:'#ffe7d6', ink:'#5a3226',
    bg1:'#5a3a32', bg2:'#23100c',
    hair:'#e8c3a2', hair2:'#b98a67', eye:'#ffa98c', skin:'#ffecdf', skin2:'#f4c5b4',
    cloth:'#ffe1cf', cloth2:'#f3bfa4', trim:'#ff9d86',
    hairStyle:'airwave', eyeStyle:'sweet',
    tag:'镜头捕手', accessory:'clip',
    birthday:'1月16日', birthMD:'01-16', selfIntro:'夏知遥。别动，这个角度很好看。',
    intro:'总在拍别人，自己的相册里只有模糊的合照和半张侧脸。'
  }
];
const MEMBER_BY_KEY = Object.fromEntries(MEMBERS.map(m => [m.key, m]));

const CARD_NAMES = {
  sy:['练习室的灯','凌晨三点的琴','雨天公交站','舞台侧幕','未寄出的信','月光练习曲','只对你温柔','星轨回响'],
  ja:['烤箱前的手套','周三的便利店','共享耳机','午后的甜度','围裙与糖霜','雨夜告白','心跳配方','蜜糖星期天'],
  bl:['谱纸上的猫','深夜电台','旧钢琴','月光下的即兴','耳机里的雨','为你写的第一首歌','零点合奏','银河协奏曲'],
  wy:['镜前的第七次','丝带与舞鞋','后台的薄荷茶','谢幕之后','独舞的夜','月光下的独舞','被你看见','黑天鹅之约'],
  gy:['鼓点与心跳','皮夹克的雨','麦克风试音','深夜排练室','副歌之前','为你唱到沙哑','生日那天的歌','万人合唱时'],
  lq:['篮球场的午后','偷吃的冰淇淋','练习生笔记','单车后座','晒伤的夏天','毕业那天','操场上的告白','盛夏限定'],
  xz:['镜头外的小动作','奶茶三分糖','候机厅','海边的帽子','偷拍的睡颜','落日与汽水','你在我镜头里','夏日终章']
};
const CARD_QUOTES = {
  sy:['灯亮之前，先把舞步练到不会出错。','琴声停在半空，像没说完的话。','雨把城市按了静音，只剩你在等车。','幕布外面很吵，我只听得见自己的心跳。','信写了很多遍，最后只寄出一张空白。','这首曲子没有名字，因为它是写给你的。','我对全世界都很冷，除了你。','这一次，我循着你的光而来。'],
  ja:['手套上还留着糖霜的温度。','每周三的关东煮，多给你一串。','耳机分你一半，歌单里全是想说的话。','甜度刚好，和你笑起来的时候一样。','围裙系好，今天只做你爱吃的那道。','雨太大了，伞下的话，你听见了吗？','心动过速，处方是再看你一眼。','星期天的蜜糖，可以续杯。'],
  bl:['猫趴在谱纸上，把降B压成了一声呼噜。','深夜电台放的是我还没发表的那首。','旧钢琴走音了，但它记得你的名字。','月光落下来，我随手弹了一整夜。','耳机里下雨，外面却是晴天。','第一首歌写得很慢，因为每个字都要像你。','零点整，我们隔着城市合奏。','银河很吵，我只想听见你的和声。'],
  wy:['第七次转身，镜子里的我终于满意。','丝带系紧，舞鞋磨破了也不停。','薄荷茶是凉的，等你下台才敢递过去。','谢幕之后，灯灭了，我还在原地。','一个人的舞台，也要跳到最后。','月光是唯一的观众，你是第二个。','被你看见的那一秒，我差点忘了动作。','黑天鹅也会累，但不会在你面前低头。'],
  gy:['鼓点砸下来，心跳比它还快半拍。','皮夹克被雨淋透，也懒得撑伞。','试音的时候，我偷偷唱了你的名字。','排练室的灯亮到凌晨，副歌还是不够狠。','副歌之前，先让我看你一眼。','唱到沙哑也没关系，你听见就值得。','生日那天的歌，我只唱给一个人。','万人合唱的时候，我在找你的口型。'],
  lq:['午后的篮球场，风把球衣吹得很鼓。','冰淇淋融化得比我的暗恋还快。','笔记最后一页，写满了你的名字。','单车后座的风，是我藏不住的开心。','晒伤了也要笑，因为你在拍我。','毕业那天，校服第二颗扣子没送出去。','操场上喊的那句，被风吹散了一半。','这个夏天限定的，只有我和你。'],
  xz:['镜头外的小动作，才是真正的你。','奶茶三分糖，和你一样刚刚好。','候机厅的广播很吵，我只看你。','海边的帽子被吹跑，你笑得最大声。','偷拍你睡着的样子，存进私密相册。','落日和汽水，都是夏天的滤镜。','取景框很小，刚好装下你。','夏日终章，但我还想再拍一季。']
};

/* ================= 集齐成员：长独白 / 称号 / 语音 ================= */
const COLLECT_LINES = {
  sy:'八张卡，你都收好了。谢谢。',
  ja:'甜度刚刚好，和你一样。',
  bl:'（小声，有点惊讶）八首歌……现在都在你手里了。',
  wy:'（语气很淡，带一点颤）被你完整看见的感觉，很好。',
  gy:'下一场，你还来吗？',
  lq:'（元气，又有点舍不得）这个夏天，不算结束！',
  xz:'再给我一季，好不好？'
};
const COLLECT_TITLE = key => (MEMBER_BY_KEY[key] ? MEMBER_BY_KEY[key].name + '的完整星轨' : '完整星轨');

/* SSR 深读长独白（80–130 字，语气贴合角色） */
const SSR_LONG = {
  sy:'星轨很长，长到我以为，有些人注定只能隔着舞台看。可你一张一张，把我拼了回来。练习室的灯，没寄出的信，只给你的温柔，原来我一直在等的，不是完美的舞台，是有人愿意把不完美的我也收进卡册。这一次，换我朝你走过来。',
  ja:'甜度从少糖到全糖，你好像都试过了。其实我最喜欢的，是你把我所有味道都记得的样子。烤箱前的手套，周三的便利店，耳机里分你一半的歌，这些平常的日子，被你一张一张收进了卡册。星期天可以续杯，喜欢也可以。',
  bl:'八首歌，有的写给夜，有的写给雨，有的只写给一个人。……谱纸上的猫、旧钢琴、耳机里的雨，那些没发表的 demo，你都听完了。……现在它们都在你手里了。……那我……是不是也可以稍微任性一点，把下一首只写给你？',
  wy:'镜子前的第七遍，谢幕后的安静，黑天鹅终于落了地。丝带、舞鞋、后台那杯凉掉的薄荷茶，你都记得。原来被人完整看见，比独舞还让人腿软。这一支，我只跳给你看。',
  gy:'从第一声鼓点到万人合唱，你都在。皮夹克被雨淋透的那晚，试音时偷偷唱你的名字，副歌前看你的那一眼。嗓子哑了也没关系，我最想让你听见的，都已经唱过了。下一场，还来吗？',
  lq:'冰淇淋化了，扣子没送出去，操场上的告白被风吹走了一半。可你把它们都收好了，单车后座的风，晒伤的夏天，毕业那天的校服。那这个夏天，就不算结束。下一次，换我先开口。',
  xz:'镜头里的你，镜头外的你，我好像都拍到了。三分糖的奶茶，候机厅的广播，海边被吹跑的帽子，全在取景框里。可我还是贪心。夏日终章之后，能不能再给我一季？这次，我想站在镜头里面。'
};

/* 语音台词（预录配音 assets/voice/<成员>_<类型>.mp3；无对应音频时静默） */
const VOICE_LINES = {
  sy:{ ssr:'这一次，我循着你的光来了。', collect:'八张卡，你都收好了。谢谢。', birthday:'今天是我生日。可以，只看着我吗？', idle:'跟紧我，别掉队。', thanks:'谢了。', long:'星轨很长，长到我以为，有些人注定只能隔着舞台看。可你一张一张，把我拼了回来。练习室的灯，没寄出的信，只给你的温柔，原来我一直在等的，不是完美的舞台，是有人愿意把不完美的我也收进卡册。这一次，换我朝你走过来。' },
  ja:{ ssr:'今天的甜度，由你决定哦。', collect:'甜度刚刚好，和你一样。', birthday:'我的生日愿望是，再见到你。', idle:'饭要好好吃，觉也要好好睡，知道吗？', thanks:'谢谢你呀。', long:'甜度从少糖到全糖，你好像都试过了。其实我最喜欢的，是你把我所有味道都记得的样子。烤箱前的手套，周三的便利店，耳机里分你一半的歌，这些平常的日子，被你一张一张收进了卡册。星期天可以续杯，喜欢也可以。' },
  bl:{ ssr:'（很轻，慢吞吞）这首歌……只写给你。', collect:'（小声，有点惊讶）八首歌……现在都在你手里了。', birthday:'（犹豫一下）今天……能听我弹一首吗？', idle:'（刚睡醒，沙哑）新写的副歌，你先听听。', thanks:'（小声）……谢了。', long:'八首歌，有的写给夜，有的写给雨，有的只写给一个人。……谱纸上的猫、旧钢琴、耳机里的雨，那些没发表的 demo，你都听完了。……现在它们都在你手里了。……那我……是不是也可以稍微任性一点，把下一首只写给你？' },
  wy:{ ssr:'（清冷，咬字干净）这一支，只跳一次。', collect:'（语气很淡，带一点颤）被你完整看见的感觉，很好。', birthday:'（轻声）谢幕之后，别急着走。', idle:'（平静）看好了。', thanks:'（淡淡）谢谢。', long:'镜子前的第七遍，谢幕后的安静，黑天鹅终于落了地。丝带、舞鞋、后台那杯凉掉的薄荷茶，你都记得。原来被人完整看见，比独舞还让人腿软。这一支，我只跳给你看。' },
  gy:{ ssr:'音浪够大，就跟我一起喊！', collect:'下一场，你还来吗？', birthday:'今天的歌，我只唱给一个人。', idle:'嗓子哑了也没事，你听得见就行。', thanks:'谢啦！', long:'从第一声鼓点到万人合唱，你都在。皮夹克被雨淋透的那晚，试音时偷偷唱你的名字，副歌前看你的那一眼。嗓子哑了也没关系，我最想让你听见的，都已经唱过了。下一场，还来吗？' },
  lq:{ ssr:'（跑过来喘着气，笑）水我带了两瓶，给你一瓶！', collect:'（元气，又有点舍不得）这个夏天，不算结束！', birthday:'（期待，语速快）今天能陪我跑一圈吗？就一圈！', idle:'（开朗）外套我多带了一件，冷了就跟我说！', thanks:'（大声）谢谢哥！……啊不对，谢谢你！', long:'冰淇淋化了，扣子没送出去，操场上的告白被风吹走了一半。可你把它们都收好了，单车后座的风，晒伤的夏天，毕业那天的校服。那这个夏天，就不算结束。下一次，换我先开口。' },
  xz:{ ssr:'别动，这个角度很好看。', collect:'再给我一季，好不好？', birthday:'今天，我想拍你。', idle:'站那儿别跑，我对个焦。', thanks:'谢了，这张送你。', long:'镜头里的你，镜头外的你，我好像都拍到了。三分糖的奶茶，候机厅的广播，海边被吹跑的帽子，全在取景框里。可我还是贪心。夏日终章之后，能不能再给我一季？这次，我想站在镜头里面。' }
};

/* 终章全员寄语 */
const FINALE_MSGS = {
  sy:'三十天，你一次都没掉队。',
  ja:'每天都记得吃饭了吗？',
  bl:'最后一首歌，写给你们。',
  wy:'谢幕之后，灯还为你亮着。',
  gy:'下一次，也要一起喊。',
  lq:'补给站永远给你留一瓶水。',
  xz:'最后一张，我想拍我们。'
};

const RARITY_ORDER = ['N','R','SR','SSR'];
const RARITY_INFO = {
  N:{ rate:.60, shard:1,  exchange:10,  label:'N',  glow:'#efe9f0' },
  R:{ rate:.30, shard:3,  exchange:25,  label:'R',  glow:'#8fc2ff' },
  SR:{ rate:.08, shard:8, exchange:80,  label:'SR', glow:'#c495ff' },
  SSR:{ rate:.02, shard:30, exchange:150, label:'SSR', glow:'#ffd98b' }
};
const RARITY_LAYOUT = [['N','N','N','R','R','SR','SR','SSR']];

const CARDS = [];
MEMBERS.forEach(m => {
  RARITY_LAYOUT[0].forEach((rar, i) => {
    CARDS.push({
      id: m.key + '-' + i,
      member: m.key,
      idx: i,
      rarity: rar,
      name: CARD_NAMES[m.key][i],
      quote: CARD_QUOTES[m.key][i],
      scene: (i + MEMBERS.indexOf(m)) % 4
    });
  });
});
const CARD_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));
const CARDS_BY_MEMBER = {};
MEMBERS.forEach(m => { CARDS_BY_MEMBER[m.key] = CARDS.filter(c => c.member === m.key); });

const GAME = {
  PRICE1: 19,
  PRICE10: 169,
  /* v4 P-08：每日首次单抽半价，给单抽一个存在理由 */
  PRICE1_FIRST: 9,
  PITY_MAX: 60,
  START_MONEY: 500,
  TOTAL_DAYS: 30,
  TOTAL_CARDS: 56,
  DAILY_MIN: 45,
  DAILY_MAX: 70,
  TEN_MIN_SR: true,
  UP_KEY: 'sy',
  UP_CHANCE: 0.5,
  /* 旅程从 3 月 5 日开始：第 10 天=3/14（沈星野生日），第 20 天=3/24（江予安生日） */
  START_MONTH: 3,
  START_DAY: 5,
  COLLECT_REWARD_MONEY: 188,
  COLLECT_REWARD_SHARD: 30,
  /* v4 P-08：碎片寄卖卖出率 2→4，提高重复卡变现能力 */
  SHARD_SELL_RATE: 4,
  SAVE_KEY: 'star7_chai_xiao_v2',
  /* P6-一：存档码版本升级到 5；v>=5 的存档码必须带签名，v<=4 老码才允许无签名 */
  SAVE_VER: 5,
  /* P6-二：版本号单一常量，页面 meta 与 __game.version 均由此输出 */
  VERSION: 'v5.1',
  SAVE_BACKUP_KEY: 'star7_chai_xiao_v2_backup',
  /* v4 P-07：生活费存款上限，削弱囤钱到 25 天的收益 */
  SAVE_CAP: 600,
  /* v4 P-07：第 25 天彩排加成仅前 20 抽生效，之后回落 2% */
  BOOST_25_FREE_PULLS: 20,
  /* v4 P-07：单局碎片合理上限，防止存档篡改让历史最高失真 */
  MAX_SHARDS: 5000
};

const TITLES = {
  emperor: { name:'欧皇本皇', desc:'金光从屏幕里溢出来，连你自己都不敢相信。', quote:'“三十天里，星轨真的为你偏了方向。”' },
  poor:    { name:'吃土也要抽', desc:'钱包空了，卡册却沉甸甸的。', quote:'“泡面可以吃一个月，限定不能等。”' },
  calm:    { name:'理智小粉丝', desc:'你精打细算，把每一包都拆在刀刃上。', quote:'“喜欢是喜欢，日子也要好好过。”' },
  allround: { name:'全能追星人', desc:'卡册、碎片、生活费，你一样都没落下。', quote:'“追星不是逃课，是另一门必修。”' },
  unlucky: { name:'非酋转世', desc:'金光总在别人的屏幕里，你依然没有放弃。', quote:'“下一包，一定下一包。”' },
  collector:{ name:'卡册收藏家', desc:'五十六个位置，你几乎把整片星轨都收进了册子。', quote:'“每一张卡，都是一次认真喜欢。”' },
  normal:  { name:'星轨旅人', desc:'不疾不徐，你走完了这段三十天的旅程。', quote:'“星轨很长，我们慢慢走。”' }
};
