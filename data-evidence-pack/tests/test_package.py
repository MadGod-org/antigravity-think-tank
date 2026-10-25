import sys, unittest, json
from pathlib import Path
P=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(P/'scripts'))
from validate_package import check_records, inspect_agent
from score_evaluations import evaluate

class OfflineChecks(unittest.TestCase):
    def test_agents(self):
        files=list((P/'.agents/agents').glob('*.md'));self.assertEqual(len(files),5)
        self.assertTrue(all(not inspect_agent(f) for f in files))
    def test_skills(self):
        self.assertEqual(len(list((P/'.agents/skills').glob('*/SKILL.md'))),5)
    def test_good_fixture(self):
        self.assertEqual([],check_records(json.loads((P/'templates/claim_ledger.json').read_text())))
    def test_false_verified_caught(self):
        row=json.loads((P/'templates/claim_ledger.json').read_text())[0]
        row['verification']='VERIFIED';row['verifier']=row['owner']
        self.assertTrue(check_records([row]))
    def test_verification_needs_provenance(self):
        row=json.loads((P/'templates/claim_ledger.json').read_text())[0]
        row['verification']='VERIFIED';row['verifier']='independent';row['evidence_refs']=[]
        self.assertTrue(check_records([row]))
    def test_unknown_priority_rejected(self):
        row=json.loads((P/'templates/claim_ledger.json').read_text())[0]
        row['priority']='NOW'
        self.assertTrue(check_records([row]))
    def test_unknown_timestamp_rejected(self):
        row=json.loads((P/'templates/claim_ledger.json').read_text())[0]
        row['observed_at']='yesterday'
        self.assertTrue(check_records([row]))
    def test_unrun_cannot_pass(self):
        self.assertEqual('NOT_TESTED',next(k for k,v in evaluate([{'tested':False,'expected_status':'PASS','observed_status':'PASS'}])['counts'].items() if v==1))
    def test_missing_evidence_invalid(self):
        self.assertEqual(1,evaluate([{'tested':True,'expected_status':'PASS','observed_status':'PASS'}])['counts']['INVALID'])
    def test_actual_matching_fixture_smoke_pass(self):
        self.assertEqual(1,evaluate([{'tested':True,'expected_status':'PASS','observed_status':'PASS','evidence_refs':['test:1']}])['counts']['PASS'])

if __name__=='__main__':unittest.main()
