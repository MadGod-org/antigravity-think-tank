const test = require('node:test');
const assert = require('node:assert/strict');
require('../i18n.js');
const { translate, roleText, formatNumber, skillNames } = globalThis.ThinkTankI18n;
const roles = require('../role_catalog.json');

test('translates known panel copy while preserving unrecognized user text', () => {
  assert.equal(translate('نمای کلی', 'en'), 'Overview');
  assert.equal(translate('custom user message', 'en'), 'custom user message');
  assert.equal(translate('نمای کلی', 'fa'), 'نمای کلی');
});

test('provides English profile labels without changing role identity', () => {
  const role = { id: 'security_reviewer', title: 'متخصص امنیت', specialty: 'تهدید، دسترسی و حفاظت داده' };
  assert.equal(roleText(role, 'title', 'en'), 'Security Specialist');
  assert.equal(roleText(role, 'specialty', 'en'), 'Threats, access, and data protection');
});

test('provides English titles, specialties, and summaries for every team role', () => {
  for (const role of roles) {
    for (const field of ['title', 'specialty', 'description']) {
      assert.notEqual(roleText(role, field, 'en'), role[field], `${role.id} ${field} should have English copy`);
      assert.ok(roleText(role, field, 'en').length > 0, `${role.id} ${field} should not be empty`);
    }
    for (const skill of role.skills || []) {
      assert.ok(skillNames[skill], `${role.id} skill ${skill} should have an English label`);
    }
  }
});

test('formats numbers using the selected panel language', () => {
  assert.equal(formatNumber(1234, 'en'), '1,234');
  assert.equal(formatNumber(1234, 'fa'), '۱٬۲۳۴');
});

test('translates WBS subtasks board, council consensus matrix, and deliberation bar copy between Persian and English', () => {
  assert.equal(translate('بورد تقسیم کار و پیشرفت پروژه', 'en'), 'Work Breakdown & Project Progress Board');
  assert.equal(translate('ماتریس آراء، توافق و نقدهای شورای ساب‌ایجنت‌ها', 'en'), 'Subagent Council Consensus, Votes & Critiques Matrix');
  assert.equal(translate('📋 واگذاری تسک', 'en'), '📋 Assign Task');
  assert.equal(translate('▶ شروع اجرا', 'en'), '▶ Start');
  assert.equal(translate('✓ تکمیل شد', 'en'), '✓ Complete');
  assert.equal(translate('بورد تقسیم کار و پیشرفت پروژه', 'fa'), 'بورد تقسیم کار و پیشرفت پروژه');
});

