import {mkdir,writeFile} from 'node:fs/promises';
const scene='One adult man with short black hair wearing an opaque cobalt blue rain jacket and black trousers, rainy night at a wet zebra crossing beside an amber-lit bus stop. Cool blue ambient light, wet pavement.';
const shots=[
 ['environmental-wide','Wide full-body photograph from across the street. The man walks left to right at the right third, entire head and both shoes visible. Wet zebra stripes lead toward the amber bus stop.'],
 ['high-angle-geometry','High-angle photograph looking downward at 45 degrees from a platform 4 metres high. Complete man walking diagonally across wet zebra stripes, ground fills most of frame, both shoes visible.'],
 ['extreme-detail','Extreme close-up of the adult male hands fastening the zipper of his cobalt blue rain jacket. Only hands and blue sleeve and zipper visible. Blurred wet zebra stripes and amber bus stop lights behind. Face outside the frame.']
];
const results=[];
for(const [language,prompt] of shots){
 const request={request_id:'camera-verification-'+Date.now()+'-'+language,brief:scene,scene_brief:scene,generator:'external-image-service',provider:'huggingface',model:'black-forest-labs/FLUX.1-schnell',billing_mode:'free-credit-first',candidate_count:1,steps:4,seed:206020,aspect_ratio:'landscape-wide',shot_contract:{shot_id:'blue-rain-'+language,shot_language:language,generator_prompt:prompt,must_show:['cobalt blue rain jacket','rainy night','wet zebra crossing'],reject_if:['daylight','brown jacket','female subject']},dry_run:false};
 const response=await fetch('http://127.0.0.1:8004/v1/photoatelier/external-generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(150000)});
 const result=await response.json(); results.push({request,status:response.status,result});
 console.log(JSON.stringify({language,status:response.status,output:result.generation?.output,error:result.detail}));
 if(!response.ok) break;
}
await mkdir('outputs',{recursive:true});
await writeFile('outputs/camera-verification-20260920.json',JSON.stringify(results,null,2));
