const test = require('node:test');
const assert = require('node:assert/strict');

const {
  deriveMatchHints,
  isBigCompanyText,
  isExplicitRejectionText,
  isOffsiteEmailText,
  matchJobAgainstChatTriage,
} = require('../lib/chat_triage');

test('deriveMatchHints extracts company hints from recruiter titles', () => {
  const hints = deriveMatchHints('贺女士SHEIN招聘HR负责人', '昨天 谢谢！请发到邮箱');
  assert.ok(hints.includes('SHEIN'));
});

test('rejection and offsite email classifiers match BOSS chat previews', () => {
  assert.equal(isExplicitRejectionText('抱歉，您的项目经验与本岗位匹配度有所差距，祝您早日找到合适的工作'), true);
  assert.equal(isOffsiteEmailText('谢谢！可以麻烦把过往项目经历（英文）一并发到邮箱 hr@example.com 吗？'), true);
  assert.equal(isBigCompanyText('李女士字节跳动招聘HR'), true);
  assert.equal(isBigCompanyText('张世哲吉利研究院云解决方案架构负责人'), true);
  assert.equal(isBigCompanyText('蒋烁淼驻云集团CEO'), true);
});

test('matchJobAgainstChatTriage blocks jobs that match chat triage hints', () => {
  const match = matchJobAgainstChatTriage(
    { company: '理想汽车', title: 'AI Agent 应用架构师' },
    {
      blockedEntries: [
        {
          category: 'explicit_rejection',
          matchHints: ['理想汽车'],
        },
      ],
    }
  );
  assert.deepEqual(match.category, 'explicit_rejection');
});
