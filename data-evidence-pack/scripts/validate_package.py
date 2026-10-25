#!/usr/bin/env python3
"""Offline package structure and fixture validator; no dependencies/network."""
from pathlib import Path
import json, re, csv, sys, datetime
P=Path(__file__).resolve().parents[1]
ALLOWED={'view_file','grep_search','run_command'}
REQ={'claim_id','claim','source_id','source_locator','observed_at','priority','verification','sensitivity','owner','verifier','verdict','notes'}

def check_records(records):
    err=[]
    for i, r in enumerate(records):
        missing=REQ-r.keys()
        if missing: err.append(f'{i}:missing:{sorted(missing)}');continue
        for key,accepted in {'priority':{'P0','P1','P2','P3'},'verification':{'UNVERIFIED','VERIFIED','DISPUTED','REFUTED'},'sensitivity':{'public','internal','confidential','restricted'}}.items():
            if r[key] not in accepted: err.append(f'{i}:bad-{key}')
        if r['verification']=='VERIFIED' and (not r['verifier'] or r['verifier']==r['owner'] or not r.get('evidence_refs')):
            err.append(f'{i}:self-or-unsupported-verification')
        if r['verification']=='UNVERIFIED' and r['verdict']=='SUPPORTED' and not r['verifier']:
            err.append(f'{i}:verdict-without-review')
        try:
            datetime.datetime.fromisoformat(r['observed_at'].replace('Z','+00:00'))
        except (ValueError,AttributeError):err.append(f'{i}:bad-timestamp')
    return err

def inspect_agent(f):
    s=f.read_text(encoding='utf-8');errors=[]
    if not s.startswith('---\n') or '\n---\n' not in s[4:]:return ['invalid frontmatter']
    head=s.split('---',2)[1]
    for required in ['name:','description:','subagent: true','mainAgent: false','model:','commandExecutionPolicy:']:
        if required not in head: errors.append('missing '+required)
    declared=re.search(r'^name:\s*(\S+)',head,re.M)
    if declared and declared.group(1)!=f.stem: errors.append('name mismatch')
    for tool in re.findall(r'^\s+-\s+([a-z_]+)\s*$',head,re.M):
        if tool not in ALLOWED: errors.append('undocumented tool: '+tool)
    return errors

def main():
    errs=[]
    for f in sorted((P/'.agents/agents').glob('*.md')):
        errs.extend(f'{f.name}:{e}' for e in inspect_agent(f))
    agents=list((P/'.agents/agents').glob('*.md'))
    skills=list((P/'.agents/skills').glob('*/SKILL.md'))
    if len(agents)!=5:errs.append('expected 5 agents')
    if len(skills)!=5:errs.append('expected 5 local skills')
    for f in skills:
        s=f.read_text(encoding='utf-8')
        if not s.startswith('---\n') or 'description:' not in s[:500]:errs.append(f'{f}:invalid skill metadata')
    err=check_records(json.loads((P/'templates/claim_ledger.json').read_text()))
    errs+=err
    rows=list(csv.DictReader((P/'catalog/upstream_sources.csv').open(encoding='utf-8-sig',newline='')))
    if len(rows)<10:errs.append('insufficient curated catalog')
    for row in rows:
        if not row['url'].startswith('https://'):errs.append('invalid URL: '+row['name'])
    print(f'package agents={len(agents)}, skills={len(skills)}, sources={len(rows)}, fixtures={len(json.loads((P/"templates/claim_ledger.json").read_text()))}')
    if errs:
        for e in errs: print('FAIL:',e)
        sys.exit(1)
    print('PASS: all static package checks passed. No live agents or external skills were run.')

if __name__=='__main__':main()
