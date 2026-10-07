import { readFile, mkdir, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
const base = 'http://127.0.0.1:8126';
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(html.slice(html.indexOf('function normalizeDirectorContractList('), html.indexOf('async function buildIdentityLockWorkflowForPlan(')), context);
const cases = [
    {theme:'联调测试：旅馆长廊',scene:'旧旅馆玻璃长廊',modelDesc:'成年女性，黑色长发，深色长袖服装',extra:'横屏16:9，各镜头按自身景别构图',duration:'1小时'},
    {theme:'联调测试：雨夜街头',scene:'雨夜斑马线与公交站',modelDesc:'成年男性，蓝色外套',extra:'竖屏，各镜头按自身动作和机位',duration:'1小时'}
];
async function post(route, body) {
    const response = await fetch(base + route, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(130000)});
    const result = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(result));
    return result;
}
const report = {createdAt:new Date().toISOString(),plans:[],renders:[]};
for (const input of cases) {
    const plan = await post('/api/director/plan',input);
    const record = {input,plan,checks:[]};
    for (const [index,shot] of plan.shotList.entries()) {
        try {
            const bundle = context.compileDirectorShotContract(shot.directorContract);
            const request = {request_id:plan.director.requestId+'-audit-'+index,brief:[plan.director.submittedBrief,'当前分镜：'+shot.description,bundle.section].join('\n'),generator:'external-image-service',provider:'huggingface',model:'black-forest-labs/FLUX.1-schnell',billing_mode:'free-credit-first',candidate_count:1,shot_index:shot.sourceShotIndex ?? index,shot_contract:shot.directorContract,aspect_ratio:input.extra.includes('横屏')?'landscape-wide':'portrait',dry_run:true};
            request.scene_brief = plan.director.submittedBrief;
            const result = await post('/api/director/generate-candidate', request);
            const selected = result.generation.request.selected_shot;
            record.checks.push({index,language:shot.directorContract.shot_language,matches:selected.shot_id===shot.directorContract.shot_id && selected.shot_language===shot.directorContract.shot_language,selected,request,prompt:result.generation.request.prompt,negative:result.generation.request.negative_prompt});
        } catch(error) { record.checks.push({index,error:error.message}); }
    }
    report.plans.push(record);
    console.log(JSON.stringify({theme:input.theme,count:record.checks.length,checks:record.checks.map(({index,language,matches,error})=>({index,language,matches,error}))}));
}
if (process.argv.includes('--render')) {
    for (const record of report.plans) {
        const check = record.checks.find(row=>row.matches);
        if (!check) continue;
        try { report.renders.push(await post('/api/director/generate-candidate',{...check.request,dry_run:false})); }
        catch(error) {report.renders.push({error:error.message});}
    }
}
await mkdir(new URL('../outputs/',import.meta.url),{recursive:true});
await writeFile(new URL('../outputs/shot-mapping-audit.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify({renders:report.renders.map(r=>r.generation?.output || r.error)}));
