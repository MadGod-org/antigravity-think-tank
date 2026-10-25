#!/usr/bin/env python3
"""Offline score guard, not an automatic factual-quality grader."""
import argparse,json
from pathlib import Path

def evaluate(records):
    counts={'PASS':0,'FAIL':0,'NOT_TESTED':0,'INVALID':0}
    for row in records:
        if not row.get('tested',False):
            counts['NOT_TESTED']+=1
        elif not row.get('observed_status') or not row.get('evidence_refs'):
            counts['INVALID']+=1
        elif row['observed_status']==row.get('expected_status'):
            counts['PASS']+=1
        else:
            counts['FAIL']+=1
    return {'counts':counts,'evaluated':counts['PASS']+counts['FAIL'],'note':'A matching status is a smoke-check only, not proof of substantive claim accuracy.'}

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--input',required=True);a.add_argument('--output',required=True);o=a.parse_args()
    r=evaluate(json.loads(Path(o.input).read_text(encoding='utf-8')))
    Path(o.output).write_text(json.dumps(r,indent=2),encoding='utf-8')
    print(json.dumps(r,indent=2))
