const test = require('node:test');
const assert = require('node:assert/strict');

const { extractJobRelevantBodyText } = require('../lib/detail_text');

test('extractJobRelevantBodyText keeps job description and drops related jobs', () => {
  const bodyText = [
    'AI智能体专家-垂直领域智能体 10-15K·14薪',
    '职位描述',
    '我们将为你提供真实的业务场景和海量数据。',
    '熟悉主流AI智能体开发框架（如Dify、Coze、LangChain、AutoGen等）。',
    '秦先生',
    '刚刚活跃',
    'BOSS 安全提示',
    '更多职位',
    '项目经理/主管（暖通和给排水中级职称）',
    '10-15K',
  ].join('\n');

  const result = extractJobRelevantBodyText(bodyText);

  assert.match(result, /Dify、Coze、LangChain、AutoGen/);
  assert.doesNotMatch(result, /暖通/);
  assert.doesNotMatch(result, /更多职位/);
});

test('extractJobRelevantBodyText keeps facility ops keywords when they are inside job description', () => {
  const bodyText = [
    '基础设施运维工程师/值班长（驻日本等） 12-20K',
    '职位描述',
    '电气',
    '暖通',
    'UPS',
    'IDC机房运维',
    '负责数据中心运行、维修、技术巡视检查工作。',
    'BOSS 安全提示',
    '更多职位',
    'AI智能体专家',
  ].join('\n');

  const result = extractJobRelevantBodyText(bodyText);

  assert.match(result, /暖通/);
  assert.match(result, /UPS/);
  assert.match(result, /IDC机房运维/);
  assert.doesNotMatch(result, /更多职位/);
});

test('extractJobRelevantBodyText falls back to original text when no marker exists', () => {
  const bodyText = '无明确段落标记，但这里仍然是正文';
  assert.equal(extractJobRelevantBodyText(bodyText), bodyText);
});
