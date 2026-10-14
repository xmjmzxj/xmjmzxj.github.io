/* ==========================================================
   人情世故段位 · 段位体系与结果计算
   ========================================================== */

var RANKS = [
  {
    key: 'r1', min: 25, max: 36,
    name: '人情小白', code: '初入江湖', emoji: '🌱',
    color: '#4a7c59', color2: '#7bbf8f',
    tag: '心里干净，嘴上没门',
    desc: '你是那种一眼能被看透的人——好，也不好。你的真诚没人怀疑，但你的话常常比你的思考先出门。桌上你说的话大家都爱听，因为真实；可有时候，真实也要付代价。你还没学会把「我想说什么」和「我该说什么」分开。这不是缺点，只是还没到时候。',
    strengths: ['心思坦荡，跟你相处不用猜', '情绪不藏，关系里误会最少', '敢说真话，关键时候有人信你'],
    advices: ['说话之前先在心里过一遍：这句话说完，场面会变成什么样', '练一练「不表态」——不是每个问题都需要你来回答', '多看看那些话不多、但大家都敬着的人，学他们的停顿'],
    quote: '人情世故不是学会虚伪，是学会把话放对位置。'
  },
  {
    key: 'r2', min: 37, max: 48,
    name: '直球选手', code: '直肠子侠', emoji: '🎯',
    color: '#b06a3b', color2: '#e0a06a',
    tag: '我不是不会，我只是懒得绕',
    desc: '你已经开始注意到「人情」这回事的存在了，但心里那杆秤，还是偏向「对就是对」。你讨厌弯弯绕，觉得把话说明白才是尊重。多数时候没问题，可有些场合——比如别人情绪正上头的时候——你的直球会变成伤人的刀。你不是坏，你只是没耐心。',
    strengths: ['判断准、下手快，效率极高', '不占人便宜，立场站得稳', '讨厌内耗，团队里少了你反而别扭'],
    advices: ['把「先接情绪、再说事情」练成习惯', '在纠正别人之前，先问一句「你是怎么想的」', '给自己三秒钟，再开口'],
    quote: '直不是错，弯不是坏，看场合而已。'
  },
  {
    key: 'r3', min: 49, max: 60,
    name: '明白事理', code: '明白人', emoji: '📖',
    color: '#4a6fa5', color2: '#8fb3e0',
    tag: '都懂，就是当场做不出来',
    desc: '道理你都懂。什么话该说、什么时候该退，你心里大概有数。问题出在「当场」——气氛一紧，你的第一反应还是本能，等回过神来才想「刚才应该那样说」。你缺的不是认知，是练习量。多经历几回尴尬的场面，你会进步得比想象中快得多。',
    strengths: ['分寸意识已经形成', '愿意复盘，学东西快', '知道自己哪里不足，这一点最稀缺'],
    advices: ['每次不舒服的社交场面后，花两分钟复盘「下次怎么做」', '刻意放慢语速，给自己留反应的时间', '专门练一个技能：体面地拒绝'],
    quote: '懂道理只是入场券，做出来才是本事。'
  },
  {
    key: 'r4', min: 61, max: 72,
    name: '处世有度', code: '体面人', emoji: '⚖️',
    color: '#8a6d3b', color2: '#d4b483',
    tag: '话不多，但句句都在点上',
    desc: '你已经能做到「不让人难堪」了。你知道什么时候该沉默，什么时候该递一句话；你拒绝别人的时候，对方不会记恨；你夸人的时候，对方会觉得你是真心的。周围人对你的评价多半是「这人相处起来挺舒服」。再往上走，你需要的不只是「不出错」，而是「能掌控」。',
    strengths: ['让人放松，跟你在一起没有压力', '进退有据，很少踩雷', '口碑稳，人缘是慢慢攒出来的'],
    advices: ['从「不冒犯」进阶到「会顺势」——学会借别人的话办事', '关键时候主动承担，把人情做在明处', '别怕表达偏好，一味周全也是一种消耗'],
    quote: '让人舒服是本事，让人记得是功力。'
  },
  {
    key: 'r5', min: 73, max: 84,
    name: '人情练达', code: '老手', emoji: '🎴',
    color: '#8e4a6b', color2: '#d18cae',
    tag: '局还没散，你已经看到结局了',
    desc: '你话不一定多，但桌上每个人的状态你都在看。你懂得「欠人情」和「给台阶」的分量，知道什么时候该退半步，也知道什么时候该往前一步。你处理过的场面足够多，遇事不慌。只提醒一句——太熟练的人容易显得油，偶尔露一点真性情，反而更让人愿意靠近。',
    strengths: ['局面掌控力强，复杂场合不慌', '资源整合好，办成事的能力突出', '抗压，越是难局面越稳'],
    advices: ['适当示弱，别让所有人都觉得你无懈可击', '把算计收一点，把真心露一点', '养几个能跟你说真话的人，比养一堆熟人重要'],
    quote: '人情这门功夫，练到最后，是不显。'
  },
  {
    key: 'r6', min: 85, max: 93,
    name: '老江湖', code: '局王', emoji: '🀄',
    color: '#9c6b1f', color2: '#e8b95c',
    tag: '你不需要赢，你只需要大家都舒服',
    desc: '到这个段位，你的判断已经不是「该说什么」，而是「这个场子需要什么」。你能在几句话之间把一桌人的关系理清，也能让本来要吵起来的两方各自留下台阶。别人愿意叫上你，往往不是因为你话多，而是因为你到了，那个局就稳了。这是极少数人才有的能力，请把它用在正事上。',
    strengths: ['场面调度能力顶尖', '情绪承接极稳，是大家的定心丸', '信任资本厚，开口就有人配合'],
    advices: ['把这种能力用在带人、做事上，而不是纯粹的人情消耗', '注意精力分配，别让所有人都来找你评理', '定期留出一整天，只属于你自己'],
    quote: '最高明的人情，是让所有人都觉得自己赢了。'
  },
  {
    key: 'r7', min: 94, max: 100,
    name: '人情天花板', code: '无招胜有招', emoji: '👑',
    color: '#c0442f', color2: '#f0a08a',
    tag: '你已经不需要技巧了',
    desc: '你的分寸感已经进了本能。你不刻意经营关系，但大家都愿意找你；你不刻意说好话，但没人挑得出你的毛病。你听得懂没说出口的话，也能让那些没说出口的话有处安放。到了这一层，技巧已经退场，剩下的是通透和善意。真正的考验是——别让自己太累。',
    strengths: ['近乎本能的洞察力', '极高的信任资本，一句顶十句', '局面越复杂，你越稳'],
    advices: ['把精力留给真正重要的人和事', '学会「不接」——不是每个局都需要你在场', '给自己保留一点「不管了」的权利'],
    quote: '人情做到极致，是让别人不用费心。'
  }
];

/* 维度点评：满分 20 分，三档 */
var DIM_COMMENTS = {
  high: ['很强的强项，你几乎是本能反应', '这是你的招牌能力', '在这一项上，你比大多数人都敏锐'],
  mid:  ['中规中矩，偶尔能拿出漂亮的处理', '基本盘稳，但还不够出彩', '够用，但可以更从容'],
  low:  ['这一项还有明显的提升空间', '是你现在最容易吃亏的地方', '再加把劲，这里能补上不少分']
};

/* 常模：均值 68，标准差 15（近似正态） */
var NORM_MEAN = 68, NORM_SD = 15;

function _erf(x) {
  var sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
      a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  var t = 1 / (1 + p * x);
  var y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

/* 返回「击败了 xx% 的测试者」 */
function beatPercent(total) {
  var z = (total - NORM_MEAN) / NORM_SD;
  var p = 0.5 * (1 + _erf(z / Math.SQRT2));
  var v = p * 100;
  if (v < 3) v = 3;
  if (v > 99.4) v = 99.4;
  return Math.round(v * 10) / 10;
}

/* 维度三档 */
function dimLevel(score) {
  if (score >= 16) return 'high';
  if (score >= 10) return 'mid';
  return 'low';
}

/**
 * 计算结果
 * @param {Array} verified 形如 [{ dim:'sense', s:3 }, ...]，长度 25
 */
function computeResult(verified) {
  var dimScores = {};
  DIMENSIONS.forEach(function (d) { dimScores[d.key] = 0; });

  var total = 0;
  verified.forEach(function (v) {
    dimScores[v.dim] = (dimScores[v.dim] || 0) + v.s;
    total += v.s;
  });

  var rank = RANKS[RANKS.length - 1];
  for (var i = 0; i < RANKS.length; i++) {
    if (total >= RANKS[i].min && total <= RANKS[i].max) { rank = RANKS[i]; break; }
  }

  var dims = DIMENSIONS.map(function (d) {
    var sc = dimScores[d.key];
    var lvl = dimLevel(sc);
    var pool = DIM_COMMENTS[lvl];
    return {
      key: d.key,
      name: d.name,
      short: d.short,
      desc: d.desc,
      score: sc,
      max: 20,
      pct: Math.round(sc / 20 * 100),
      level: lvl,
      comment: pool[Math.abs(d.key.charCodeAt(0) * 7 + sc) % pool.length]
    };
  });

  var strengths = rank.strengths.slice();
  var advices = rank.advices.slice();

  /* 用真实数据补一条个性化建议：最弱的维度 */
  var weakest = dims.slice().sort(function (a, b) { return a.score - b.score; })[0];
  var strongest = dims.slice().sort(function (a, b) { return b.score - a.score; })[0];

  return {
    total: total,
    percent: Math.round((total - 25) / 75 * 100),
    beat: beatPercent(total),
    rank: rank,
    dims: dims,
    strongest: strongest,
    weakest: weakest,
    strengths: strengths,
    advices: advices
  };
}
