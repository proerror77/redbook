function hasText(text, needle) {
  return String(text || '').includes(String(needle || ''));
}

function bodyShowsApplySuccess(bodyText) {
  const text = String(bodyText || '');
  return [
    '继续沟通',
    '已向BOSS发送消息',
    '已向BOSS发送',
    '留在此页',
  ].some((needle) => hasText(text, needle));
}

function urlShowsChat(afterUrl) {
  return /\/web\/geek\/chat\b/.test(String(afterUrl || ''));
}

function classifyApplyOutcome({ afterBodyText, afterUrl, modalResult }) {
  if (modalResult?.found) {
    return {
      applied: true,
      mode: modalResult.clicked ? 'sent_message_modal_stay' : 'sent_message_modal_visible',
    };
  }

  if (urlShowsChat(afterUrl)) {
    return {
      applied: true,
      mode: 'chat_navigation',
    };
  }

  if (bodyShowsApplySuccess(afterBodyText)) {
    return {
      applied: true,
      mode: 'detail_success_signal',
    };
  }

  return {
    applied: false,
    mode: 'clicked_apply',
  };
}

function dismissSentMessageModalScript() {
  return `(() => {
    function textOf(node) {
      return (node?.innerText || node?.textContent || '').replace(/\\s+/g, ' ').trim();
    }
    function clickNode(node) {
      const rect = node.getBoundingClientRect();
      node.scrollIntoView({ block: 'center' });
      ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach((type) => {
        node.dispatchEvent(new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          view: window,
        }));
      });
    }
    const modal = Array.from(document.querySelectorAll('div, section, aside'))
      .find((node) => {
        const text = textOf(node);
        return text.includes('已向BOSS发送消息') && text.includes('留在此页');
      });
    if (!modal) {
      return JSON.stringify({ found: false, clicked: false });
    }
    const stayButton = Array.from(modal.querySelectorAll('a, button, span'))
      .find((node) => textOf(node) === '留在此页');
    if (!stayButton) {
      return JSON.stringify({ found: true, clicked: false, reason: 'stay_button_not_found' });
    }
    clickNode(stayButton);
    return JSON.stringify({ found: true, clicked: true, text: textOf(stayButton) });
  })()`;
}

module.exports = {
  bodyShowsApplySuccess,
  classifyApplyOutcome,
  dismissSentMessageModalScript,
};
