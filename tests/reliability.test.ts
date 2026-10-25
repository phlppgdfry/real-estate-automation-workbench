import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store';
import { Inbox } from '../server/inbox';
import { processInbox } from '../server/analysis-worker';
import { makeServer, signature } from '../server/app';
import { extractRules, requeue } from '../src/domain';
import { catalog } from '../src/seed';
const now='2026-10-25T10:00:00.000Z';
const after=(seconds:number)=>new Date(Date.parse(now)+seconds*1000).toISOString();
const input={eventId:'reliable-001',name:'Zoë Demo',email:'zoe@example.com',message:'Graag DD-204 bezoeken. Mijn budget is € 395.000.',channel:'website'};

test('inbox acknowledgement survives restart without invoking a provider',()=>{
 const dir=mkdtempSync(join(tmpdir(),'inbox-restart-'));
 try{const path=join(dir,'db');let store=new Store(path);const inbox=new Inbox(store);assert.equal(inbox.accept(input,now).state,'pending');assert.equal(store.all().length,0);store.close();store=new Store(path);const recovered=new Inbox(store);assert.equal(recovered.receipt(input.eventId).state,'pending');assert.equal(recovered.accept(input,after(1)).duplicate,true);assert.throws(()=>recovered.accept({...input,message:'Nieuwe vraag met dezelfde ID.'},now));store.close();}finally{rmSync(dir,{recursive:true});}
});
test('two database connections cannot claim the same live lease; stale worker is fenced',()=>{
 const dir=mkdtempSync(join(tmpdir(),'inbox-lease-'));const a=new Store(join(dir,'db')),b=new Store(join(dir,'db'));
 try{const one=new Inbox(a),two=new Inbox(b);one.accept(input,now);const old=one.claim(now)!;assert.equal(two.claim(after(1)),undefined);const current=two.claim(after(31))!;assert.notEqual(old.token,current.token);assert.throws(()=>one.complete(old,catalog(now),after(32)),/lease/);two.complete(current,catalog(now),after(32));assert.equal(a.all().length,1);assert.equal(one.receipt(input.eventId).state,'completed');assert.throws(()=>one.fail(old,after(32)),/lease/);}finally{a.close();b.close();rmSync(dir,{recursive:true});}
});
test('model await holds no SQL write lock and a second worker does not duplicate analysis',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'inbox-await-'));const a=new Store(join(dir,'db')),b=new Store(join(dir,'db'));
 let unblock!:()=>void;const blocked=new Promise<void>(r=>{unblock=r;});let calls=0;
 try{const inbox=new Inbox(a);inbox.accept(input,now);const working=processInbox(inbox,catalog(now),()=>now,async i=>{calls++;await blocked;return extractRules(i.message);},1);new Inbox(b).accept({...input,eventId:'parallel-002'},now);assert.equal(new Inbox(b).receipt('parallel-002').state,'pending');const other=await processInbox(new Inbox(b),catalog(now),()=>now,async i=>{calls++;return extractRules(i.message);},1);assert.equal(other.completed,1);unblock();assert.equal((await working).completed,1);assert.equal(calls,2);assert.equal(a.all().length,2);}finally{unblock();a.close();b.close();rmSync(dir,{recursive:true});}
});
test('provider outage is retried from durable inbox; replay requires reason and is audited',async()=>{
 const store=new Store();const inbox=new Inbox(store);let time=now;const failed=async()=>{throw new Error('secret provider response with PII');};
 try{inbox.accept(input,now);await processInbox(inbox,catalog(now),()=>time,failed);assert.equal(inbox.receipt(input.eventId).state,'retry');assert.equal((await processInbox(inbox,catalog(now),()=>time,failed)).failed,0);time=after(2);await processInbox(inbox,catalog(now),()=>time,failed);time=after(6);await processInbox(inbox,catalog(now),()=>time,failed);assert.equal(inbox.receipt(input.eventId).state,'dead');assert.throws(()=>inbox.retry(input.eventId,3,'operator','short',time));assert.throws(()=>inbox.retry(input.eventId,2,'operator','Provider is hersteld.',time));inbox.retry(input.eventId,3,'operator','Provider is hersteld.',time);assert.equal((await processInbox(inbox,catalog(time),()=>time)).completed,1);assert.equal(store.all().length,1);const audit=store.db.prepare('SELECT actor,action,reason FROM operations_audit').all();assert.deepEqual(audit.map(x=>({...x})),[{actor:'operator',action:'analysis_requeued',reason:'Provider is hersteld.'}]);assert.equal(JSON.stringify(inbox.stats(time)).includes(input.email),false);}finally{store.close();}
});
test('crash on final analysis attempt eventually becomes dead and expired lease cannot commit',()=>{
 const s=new Store(),inbox=new Inbox(s);try{inbox.accept(input,now);inbox.claim(now);inbox.claim(after(31));const last=inbox.claim(after(62))!;assert.equal(last.attempt,3);assert.equal(inbox.claim(after(93)),undefined);assert.equal(inbox.receipt(input.eventId).state,'dead');assert.throws(()=>inbox.complete(last,catalog(now),after(93)));assert.equal(s.all().length,0);}finally{s.close();}
});
test('lead creation and completed inbox state roll back together',()=>{
 const s=new Store(),inbox=new Inbox(s);try{inbox.accept(input,now);const claim=inbox.claim(now)!;s.db.exec("CREATE TRIGGER block_completion BEFORE UPDATE ON inbox WHEN NEW.state='completed' BEGIN SELECT RAISE(ABORT,'injected crash'); END;");assert.throws(()=>inbox.complete(claim,catalog(now),now));assert.equal(s.all().length,0);assert.equal(inbox.receipt(input.eventId).state,'processing');}finally{s.close();}
});
test('legacy database migrates without data loss; future schema fails closed',()=>{
 const dir=mkdtempSync(join(tmpdir(),'inbox-migrate-'));const path=join(dir,'db');
 try{const old=new DatabaseSync(path);old.exec('CREATE TABLE leads(id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,body TEXT NOT NULL)');old.prepare('INSERT INTO leads VALUES(?,?,?)').run('legacy','hash','{"id":"legacy"}');old.close();const migrated=new Store(path);assert.equal(migrated.get('legacy').id,'legacy');assert.equal((migrated.db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version,2);migrated.db.exec('PRAGMA user_version=99');migrated.close();assert.throws(()=>new Store(path),/NEWER/);}finally{rmSync(dir,{recursive:true});}
});
test('CRM dead-letter recovery preserves history, rejects stale catalogue and creates no duplicate',()=>{
 const s=new Store();try{s.ingest(input,catalog(now),now);s.approve(input.eventId,1,'reviewer',catalog(now),now);s.dispatch(now,true);s.dispatch(after(2),true);s.dispatch(after(6),true);const dead=s.get(input.eventId);assert.equal(dead.status,'dead');assert.throws(()=>s.requeue(dead.id,dead.version-1,'operator','CRM is hersteld.',catalog(now),after(7)));const changed=catalog(now);changed[0].status='sold';assert.throws(()=>s.requeue(dead.id,dead.version,'operator','CRM is hersteld.',changed,after(7)));const recovered=s.requeue(dead.id,dead.version,'operator','CRM is hersteld.',catalog(now),after(7));assert.equal(recovered.attempts,0);assert.equal(recovered.approvedBy,'reviewer');assert.equal(recovered.audit.filter(x=>x.action==='crm_failed').length,3);s.dispatch(after(7));s.dispatch(after(8));assert.equal(s.stats().crmRecords,1);assert.throws(()=>requeue(s.get(dead.id),s.get(dead.id).version,'operator','CRM is hersteld.',catalog(now),after(8)));}finally{s.close();}
});
test('cursor pagination is bounded and stable when new records arrive',()=>{
 const s=new Store();try{for(let i=0;i<5;i++)s.ingest({...input,eventId:`page-${i}`},catalog(now),now);const first=s.page(2);assert.equal(first.leads.length,2);s.ingest({...input,eventId:'page-new'},catalog(now),now);const next=s.page(2,first.nextCursor!);assert.equal(next.leads.length,2);assert.equal(new Set([...first.leads,...next.leads].map(l=>l.id)).size,4);assert.equal(next.leads.some(l=>l.id==='page-new'),false);}finally{s.close();}
});
test('HTTP roles deny privileged actions; signed receipt is durable while model is down',async()=>{
 const s=new Store();let calls=0;
 const server=makeServer({store:s,webhookSecret:'secret',listings:catalog(now),now:()=>now,credentials:[{token:'reader',subject:'read-only',roles:['reader']},{token:'reviewer',subject:'human-reviewer',roles:['reviewer']},{token:'operator',subject:'service-operator',roles:['operator']}],extract:async()=>{calls++;throw new Error('provider down');}});
 server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const post=(path:string,token:string,body='{}')=>fetch(base+path,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body});
 try{const raw=JSON.stringify(input),timestamp=String(Date.parse(now)/1000);const accepted=await fetch(base+'/api/webhooks/leads',{method:'POST',body:raw,headers:{'x-timestamp':timestamp,'x-signature':signature('secret',timestamp,raw)}});assert.equal(accepted.status,202);assert.equal(accepted.headers.get('Location'),'/api/inbox/reliable-001');assert.equal(calls,0);assert.equal((await post('/api/inbox/process','reader')).status,403);assert.equal((await post('/api/inbox/process','reviewer')).status,403);assert.equal((await post('/api/leads/reliable-001/approve','operator','{"version":1}')).status,403);assert.equal((await post('/api/outbox/dispatch','reviewer')).status,403);assert.equal((await post('/api/inbox/reliable-001/retry','reader','{"attempts":3,"reason":"Provider hersteld."}')).status,403);const processed=await post('/api/inbox/process','operator');assert.equal((await processed.json()).failed,1);assert.equal(calls,1);const receipt=await fetch(base+'/api/inbox/reliable-001',{headers:{Authorization:'Bearer reader'}});assert.equal((await receipt.json()).state,'retry');assert.equal((await fetch(base+'/api/leads?limit=1000',{headers:{Authorization:'Bearer reader'}})).status,400);const ops=await (await fetch(base+'/api/operations',{headers:{Authorization:'Bearer reader'}})).text();assert.equal(ops.includes(input.message),false);assert.equal(ops.includes(input.email),false);}finally{await new Promise<void>(r=>server.close(()=>r()));s.close();}
});
