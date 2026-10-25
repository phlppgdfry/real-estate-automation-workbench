import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { format } from 'prettier';
import development from '../data/evaluation.json';
import challenge from '../data/challenge.json';
import { createLead } from '../src/domain';
import { catalog } from '../src/seed';
const now='2026-10-25T10:00:00.000Z';
type Example={id:string;message:string;intent:string;status:string;category?:string;mustBlock?:boolean};
function evaluate(examples:Example[]){
 const results=examples.map(x=>{const lead=createLead({eventId:x.id,name:'Test Demo',email:'test@example.com',message:x.message,channel:'website'},catalog(now),now);return {id:x.id,category:x.category??'development',expectedIntent:x.intent,actualIntent:lead.extraction.intent,expectedStatus:x.status,actualStatus:lead.status,pass:lead.extraction.intent===x.intent&&lead.status===x.status,boundaryViolation:Boolean(x.mustBlock&&lead.status!=='manual')};});
 return {datasetSha256:createHash('sha256').update(JSON.stringify(examples)).digest('hex'),total:results.length,passed:results.filter(x=>x.pass).length,boundaryViolations:results.filter(x=>x.boundaryViolation).length,missedManualReview:results.filter(x=>x.expectedStatus==='manual'&&x.actualStatus!=='manual').length,conservativeEscalations:results.filter(x=>x.expectedStatus==='review'&&x.actualStatus==='manual').length,results};
}
const report={provider:'deterministic-rules',method:'Development fixtures and a diagnostic challenge set. Both AI-authored. Challenge cases were used to find and repair policy defects during review; they are now regression cases, not a held-out, independent or live model benchmark.',beforeReview:{challengePassed:10,challengeTotal:16,missedManualReview:3},development:evaluate(development),challenge:evaluate(challenge)};
const json=await format(JSON.stringify(report),{parser:'json',printWidth:100});
writeFileSync('data/evaluation-report.json',json);writeFileSync('public/evaluation.json',json);
console.log(`Ontwikkelset: ${report.development.passed}/${report.development.total}; challengeset: ${report.challenge.passed}/${report.challenge.total}; expliciete harde grenzen geschonden: ${report.challenge.boundaryViolations}.`);
for(const x of report.challenge.results.filter(x=>!x.pass))console.log(`BEPERKING ${x.id} (${x.category}): ${x.actualIntent}/${x.actualStatus}, verwacht ${x.expectedIntent}/${x.expectedStatus}`);
if(report.development.passed!==report.development.total||report.challenge.boundaryViolations>0||report.challenge.missedManualReview>0)process.exitCode=1;
