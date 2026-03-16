function firstIndexOf(text, markers) {
  for (const marker of markers) {
    const index = String(text || '').indexOf(marker);
    if (index >= 0) {
      return index;
    }
  }
  return -1;
}

function extractJobRelevantBodyText(bodyText) {
  const text = String(bodyText || '');
  if (!text) {
    return '';
  }

  const startMarkers = ['职位描述', '岗位职责', '工作内容'];
  const endMarkers = [
    'BOSS 安全提示',
    '工商信息',
    '工作地址',
    '更多职位',
    '看过该职位的人还看了',
    '精选职位',
    '公司介绍',
    '页面更新时间',
  ];

  const start = firstIndexOf(text, startMarkers);
  if (start < 0) {
    return text;
  }

  const sliced = text.slice(start);
  const end = firstIndexOf(sliced, endMarkers);
  return end >= 0 ? sliced.slice(0, end).trim() : sliced.trim();
}

module.exports = {
  extractJobRelevantBodyText,
};
