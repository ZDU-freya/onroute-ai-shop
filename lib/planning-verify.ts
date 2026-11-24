import assert from 'node:assert/strict';
import {allMerchants,activities,transitLines,taskTypes,themes,defaultConfig,newStop,calculate,generateWeekend} from '../data/planning';
assert(allMerchants.length>=40);assert(activities.length>=15);assert.equal(transitLines.length,5);assert(Object.keys(taskTypes).length>=12);
const tasks=['取快递','买菜','买奶茶'].map(t=>newStop(t));
const c={...defaultConfig,limit:120,budget:200};const r=calculate(tasks,c);assert.equal(r.total,r.traffic+tasks.reduce((a,s)=>a+s.stay,0)+r.wait);assert.equal(r.extra,r.total-r.base);assert.equal(r.problems.length,0);
assert(calculate(tasks,{...c,limit:1}).problems.some(p=>p.includes('超过上限')));assert(calculate(tasks,{...c,budget:1}).problems.some(p=>p.includes('超过预算')));
assert.equal(tasks.length,3);assert(tasks.every(t=>t.must));
const skipped=calculate(tasks.map((s,i)=>i===0?{...s,status:'已跳过' as const}:s),c);assert(skipped.total<r.total);
for(const [i,theme] of Object.keys(themes).entries()){const wc={...c,kind:'weekend' as const,theme,district:[0,1,2,3,1][i],departure:theme==='烟火生活'?'18:00':'14:00',budget:1000,available:600,people:2,strategy:'经典体验'};const plan=generateWeekend(wc);assert.equal(plan.length,3,theme+' 应匹配三个主题活动');assert(!calculate(plan,wc).problems.length,theme+' 应有可行演示路线')}
const wc={...c,kind:'weekend' as const,theme:'都市享受',district:1,departure:'14:00',budget:1000,available:600,people:10};assert(calculate(generateWeekend(wc),wc).problems.some(p=>p.includes('最多支持')));
const short={...wc,people:2,available:30};assert(calculate(generateWeekend(short),short).problems.some(p=>p.includes('超出可用时间')));
const closed={...tasks[0],merchant:11};assert(calculate([closed],c).problems.some(p=>p.includes('停止营业')));
console.log('PASS V3：数据规模、通勤计算、时间冲突、预算冲突、跳过重算、五主题、人数预约约束、营业限制。');
