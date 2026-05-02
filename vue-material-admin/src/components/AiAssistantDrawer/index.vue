<template>
    <v-navigation-drawer v-model="aiAssistant.isOpen" location="right" class="ai-assistant-drawer"
        :class="aiAssistant.isOpen ? 'drawer-open' : 'drawer-close'" :scrim="true" temporary>
        <div class="drawer-container">
            <!-- Header -->
            <div class="drawer-header">
                <div class="header-content">
                    <h2 class="header-title">AI 助手</h2>
                    <p class="header-subtitle">智能助手</p>
                </div>
                <v-btn icon="mdi-close" variant="text" size="small" @click="aiAssistant.closeDrawer()"
                    class="close-btn" />
            </div>

            <!-- Messages Container -->
            <div class="messages-container" ref="messagesContainer">
                <div v-if="aiAssistant.messages.length === 0" class="empty-state">
                    <v-icon size="64" color="primary" class="empty-icon">mdi-chat-outline</v-icon>
                    <h3 class="empty-title">开始对话</h3>
                    <p class="empty-subtitle">询问关于您的家和车的任何问题</p>
                </div>

                <transition-group name="message-list" class="message-list">
                    <div v-for="message in aiAssistant.messages" :key="message.id" class="message-wrapper"
                        :class="{ 'user-message': message.role === 'user', 'ai-message': message.role === 'assistant' }">
                        <div :class="['message-bubble', `role-${message.role}`]">
                            <!-- Empty streaming assistant messages show a loader first; real text takes over once chunks arrive. -->
                            <Loading v-if="message.role === 'assistant' && message.streaming && !message.content" />
                            <template v-else>
                                <div class="message-text" v-html="renderMessageContent(message.content)"></div>
                                <div
                                    v-if="message.role === 'assistant' && message.commandResults?.length"
                                    class="command-results"
                                >
                                    <div
                                        v-for="(result, index) in message.commandResults"
                                        :key="`${message.id}-result-${index}`"
                                        class="command-result"
                                    >
                                        <span
                                            class="command-result__status"
                                            :class="result.success ? 'is-success' : 'is-error'"
                                        >
                                            {{ result.success ? '已执行' : '未执行' }}
                                        </span>
                                        <span class="command-result__text">{{ result.message }}</span>
                                    </div>
                                </div>
                            </template>
                            <span v-if="message.timestamp" class="message-time">{{ formatTime(message.timestamp) }}</span>
                        </div>
                    </div>
                </transition-group>

                <!-- Loading Indicator（独立于消息列表之外，在整个列表的最底部显示） -->
            </div>

            <!-- Input Footer -->
            <div class="drawer-footer">
                <v-textarea v-model="inputMessage" placeholder="输入问题或命令..." rows="1" auto-grow max-rows="4" hide-details
                    variant="outlined" density="compact" class="input-field"
                    @keydown.enter.ctrl.prevent="sendMessage" />
                <v-btn icon="mdi-send" variant="tonal" size="small" class="send-btn"
                    :disabled="!inputMessage.trim() || aiAssistant.loading" @click="sendMessage" />
            </div>
        </div>
    </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAiAssistant } from '@/stores/useAiAssistant';
import Loading from '@/components/Loading/index.vue';

const aiAssistant = useAiAssistant();
const inputMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

// Escape raw model output first so any literal HTML is rendered as text instead of being executed by v-html.
const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const renderInlineMarkdown = (rawText: string) => {
    const escaped = escapeHtml(rawText);
    const codeTokens: string[] = [];
    // Freeze inline code spans as temporary tokens first, so later bold/italic replacements do not rewrite code content.
    // /`([^`]+)`/g 的含义：
    // 1. 最外层两个 ` 表示匹配一对反引号
    // 2. ([^`]+) 是第一个捕获组：
    //    - [] 表示字符集合
    //    - [^`] 表示“匹配一个不是反引号的字符”
    //    - + 表示前面的规则重复一次或多次
    //    - () 表示把这段内容单独捕获出来，所以回调里的 code 就是反引号中间的内容
    // 3. g 表示全局匹配，把整段文本里的所有行内代码都替换掉
    const withCodeTokens = escaped.replace(/`([^`]+)`/g, (_, code: string) => {
        const token = `\u0000CODE${codeTokens.length}\u0000`;
        codeTokens.push(`<code>${code}</code>`);
        return token;
    });

    // Apply a small, controlled subset of inline markdown after HTML has already been escaped.
    const withFormatting = withCodeTokens
        // /\*\*([^*\n]+)\*\*/g 匹配 **粗体**：
        // \*\* 表示字面量 **
        // ([^*\n]+) 表示中间内容：不是 * 且不是换行的字符，重复一次或多次
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
        // /__([^_\n]+)__/g 匹配 __粗体__，逻辑和 **粗体** 一样，只是分隔符换成了下划线
        .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
        // /\*([^*\n]+)\*/g 匹配 *斜体*：
        // 外层 \*...\* 匹配单个星号包裹的文本，捕获组里拿到的是中间真正的内容
        .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
        // /_([^_\n]+)_/g 匹配 _斜体_，逻辑和 *斜体* 一样，只是分隔符换成了下划线
        .replace(/_([^_\n]+)_/g, '<em>$1</em>')
        // /~~([^~\n]+)~~/g 匹配 ~~删除线~~
        .replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

    // Swap the temporary CODE tokens back into their saved <code>...</code> HTML fragments.
    return codeTokens.reduce(
        (result, codeHtml, index) => result.replace(`\u0000CODE${index}\u0000`, codeHtml),
        withFormatting
    );
};

const renderMessageContent = (rawContent: string) => {
    // Normalize line endings so the block parser only has to reason about '\n'.
    const lines = rawContent.replace(/\r\n/g, '\n').split('\n');
    const htmlParts: string[] = [];
    let paragraphLines: string[] = [];
    let listItems: string[] = [];
    let listTag: 'ul' | 'ol' | null = null;
    let codeLines: string[] = [];
    let inCodeBlock = false;

    // Each flush helper closes the current in-progress block before we switch to another markdown block type.
    const flushParagraph = () => {
        if (!paragraphLines.length) return;
        htmlParts.push(`<p>${paragraphLines.map(renderInlineMarkdown).join('<br />')}</p>`);
        paragraphLines = [];
    };

    const flushList = () => {
        if (!listTag || !listItems.length) return;
        htmlParts.push(`<${listTag}>${listItems.map((item) => `<li>${item}</li>`).join('')}</${listTag}>`);
        listItems = [];
        listTag = null;
    };

    const flushCodeBlock = () => {
        if (!inCodeBlock) return;
        htmlParts.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        inCodeBlock = false;
    };

    for (const line of lines) {
        // Triple backticks toggle fenced code block mode; inside that mode we preserve raw lines until closing fence.
        if (line.startsWith('```')) {
            flushParagraph();
            flushList();
            if (inCodeBlock) {
                flushCodeBlock();
            } else {
                inCodeBlock = true;
                codeLines = [];
            }
            continue;
        }

        if (inCodeBlock) {
            codeLines.push(line);
            continue;
        }

        // Blank lines terminate the current paragraph/list block.
        if (!line.trim()) {
            flushParagraph();
            flushList();
            continue;
        }

        // Headings and blockquotes are emitted immediately as their own blocks.
        // /^(#{1,6})\s+(.+)$/ 的含义：  0号位永远是整体匹配结果  1号位才是第一个捕获组  2号位是第二个捕获组
        // ^ 表示从行首开始匹配
        // (#{1,6}) 是第一个捕获组，表示 1 到 6 个 #，用来决定 h1 ~ h6
        // \s+ 表示后面必须跟至少一个空白字符
        // (.+) 是第二个捕获组，表示标题正文，至少有一个字符
        // $ 表示匹配到行尾结束
        const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
        if (headingMatch) {
            flushParagraph();
            flushList();
            const level = headingMatch[1].length;
            htmlParts.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
            continue;
        }

        // /^>\s?(.*)$/ 的含义：
        // ^> 表示这一行必须以 > 开头
        // \s? 表示 > 后面可以有 0 个或 1 个空格
        // (.*) 捕获后面的整段引用内容，可以为空
        const quoteMatch = /^>\s?(.*)$/.exec(line);
        if (quoteMatch) {
            flushParagraph();
            flushList();
            htmlParts.push(`<blockquote><p>${renderInlineMarkdown(quoteMatch[1])}</p></blockquote>`);
            continue;
        }

        // Consecutive list items are accumulated and flushed together as a single <ul> / <ol>.
        // /^\s*[-*+]\s+(.+)$/ 匹配无序列表：
        // ^\s* 表示行首允许有任意数量空白
        // [-*+] 表示列表标记可以是 -、*、+
        // \s+ 表示标记后面至少要有一个空格
        // (.+) 捕获真正的列表项内容
        const unorderedMatch = /^\s*[-*+]\s+(.+)$/.exec(line);
        if (unorderedMatch) {
            flushParagraph();
            if (listTag && listTag !== 'ul') flushList();
            listTag = 'ul';
            listItems.push(renderInlineMarkdown(unorderedMatch[1]));
            continue;
        }

        // /^\s*\d+\.\s+(.+)$/ 匹配有序列表：
        // ^\s* 表示行首允许空白
        // \d+ 表示一个或多个数字
        // \. 表示字面量小数点
        // \s+ 表示编号后面至少要有一个空格
        // (.+) 捕获列表项正文
        const orderedMatch = /^\s*\d+\.\s+(.+)$/.exec(line);
        if (orderedMatch) {
            flushParagraph();
            if (listTag && listTag !== 'ol') flushList();
            listTag = 'ol';
            listItems.push(renderInlineMarkdown(orderedMatch[1]));
            continue;
        }

        flushList();
        paragraphLines.push(line);
    }

    flushParagraph();
    flushList();
    flushCodeBlock();

    return htmlParts.join('') || '<p></p>';
};

const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const scrollToBottom = () => {
    if (!messagesContainer.value) return;
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
};

watch(
    () => [
        aiAssistant.isOpen,
        aiAssistant.loading,
        // Also watch content length so the drawer keeps scrolling while a single message is streaming in place.
        aiAssistant.messages
            .map(
                (message) =>
                    `${message.id}:${message.content.length}:${message.role === 'assistant' && message.streaming ? 1 : 0}`
            )
            .join('|'),
    ],
    async () => {
        scrollToBottom();
    },
    //flush: 'post'：等组件更新、DOM 渲染完成后再运行回调函数
    { flush: 'post' }
);

const sendMessage = async () => {
    if (!inputMessage.value.trim()) return;

    const content = inputMessage.value.trim();
    inputMessage.value = '';
    await aiAssistant.askAi(content);
};
</script>

<style scoped lang="scss">
.ai-assistant-drawer {
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    height: 100vh !important;
    width: 400px !important;
    z-index: 2000 !important;
    overflow: hidden !important;
    transform: translateX(100%) !important;
    opacity: 0 !important;
    visibility: hidden !important;
    transition: transform 0.25s ease;

    &.drawer-open {
        transform: translateX(0) !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
    }

    &.drawer-close {
        transform: translateX(100%) !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
    }

    .drawer-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        min-height: 0;
    }

    .drawer-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 20px 24px;
        border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
        box-shadow: 0 4px 16px rgba(var(--v-theme-primary), 0.25);

        .header-content {
            .header-title {
                font-size: 20px;
                font-weight: 700;
                color: white;
                margin: 0;
                letter-spacing: -0.3px;
            }

            .header-subtitle {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.8);
                margin: 4px 0 0 0;
                font-weight: 500;
                letter-spacing: -0.1px;
            }

            .close-btn {
                color: rgba(255, 255, 255, 0.8) !important;

                &:hover {
                    color: white !important;
                }
            }
        }
    }

    .messages-container {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 16px 24px;
        display: flex;
        flex-direction: column;
        background: var(--v-theme-surface);
        min-height: 0;

        &::-webkit-scrollbar {
            width: 6px;
        }

        &::-webkit-scrollbar-track {
            background: transparent;
        }

        &::-webkit-scrollbar-thumb {
            background: rgba(var(--v-theme-on-surface), 0.2);
            border-radius: 3px;

            &:hover {
                background: rgba(var(--v-theme-on-surface), 0.3);
            }
        }
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        color: rgba(var(--v-theme-on-surface), 0.6);

        .empty-icon {
            margin-bottom: 16px;
            opacity: 0.4;
        }

        .empty-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
            color: var(--v-theme-on-surface);
            letter-spacing: -0.2px;
        }

        .empty-subtitle {
            font-size: 13px;
            margin: 8px 0 0 0;
            color: rgba(var(--v-theme-on-surface), 0.5);
        }
    }

    .message-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .message-wrapper {
        display: flex;
        animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

        &.user-message {
            justify-content: flex-end;
        }

        &.ai-message {
            justify-content: flex-start;
        }
    }

    .message-bubble {
        max-width: 80%;
        padding: 12px 16px;
        border-radius: 18px;
        line-height: 1.5;
        word-wrap: break-word;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);

        &.role-user {
            background: linear-gradient(135deg, var(--v-theme-primary) 0%, rgba(var(--v-theme-primary), 0.85) 100%);
            border-radius: 18px 4px 18px 18px;
            color: white;
            box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
        }

        &.role-assistant {
            background: rgba(var(--v-theme-on-surface), 0.05);
            border-radius: 4px 18px 18px 18px;
            border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
            color: var(--v-theme-on-surface);
        }

        .message-text {
            margin: 0 0 4px 0;
            font-size: 14px;
            font-weight: 500;
            letter-spacing: -0.2px;
            white-space: pre-wrap;

            :deep(p),
            :deep(blockquote),
            :deep(pre),
            :deep(ul),
            :deep(ol),
            :deep(h1),
            :deep(h2),
            :deep(h3),
            :deep(h4),
            :deep(h5),
            :deep(h6) {
                margin: 0 0 8px;
            }

            :deep(p:last-child),
            :deep(blockquote:last-child),
            :deep(pre:last-child),
            :deep(ul:last-child),
            :deep(ol:last-child),
            :deep(h1:last-child),
            :deep(h2:last-child),
            :deep(h3:last-child),
            :deep(h4:last-child),
            :deep(h5:last-child),
            :deep(h6:last-child) {
                margin-bottom: 0;
            }

            :deep(h1),
            :deep(h2),
            :deep(h3) {
                font-size: 16px;
                line-height: 1.35;
            }

            :deep(h4),
            :deep(h5),
            :deep(h6) {
                font-size: 14px;
                line-height: 1.4;
            }

            :deep(ul),
            :deep(ol) {
                padding-left: 18px;
            }

            :deep(li + li) {
                margin-top: 4px;
            }

            :deep(blockquote) {
                padding-left: 12px;
                border-left: 3px solid rgba(var(--v-theme-primary), 0.45);
                opacity: 0.9;
            }

            :deep(code) {
                padding: 1px 5px;
                border-radius: 6px;
                background: rgba(var(--v-theme-on-surface), 0.08);
                font-family: Consolas, 'Courier New', monospace;
                font-size: 12px;
            }

            :deep(pre) {
                padding: 10px 12px;
                border-radius: 10px;
                overflow-x: auto;
                background: rgba(var(--v-theme-on-surface), 0.08);
            }

            :deep(pre code) {
                padding: 0;
                border-radius: 0;
                background: transparent;
                display: block;
                white-space: pre-wrap;
            }

            :deep(strong) {
                font-weight: 700;
            }

            :deep(em) {
                font-style: italic;
            }
        }

        .command-results {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin: 8px 0 4px;
        }

        .command-result {
            display: flex;
            gap: 8px;
            align-items: flex-start;
            padding: 8px 10px;
            border-radius: 10px;
            background: rgba(var(--v-theme-on-surface), 0.05);
        }

        .command-result__status {
            flex: 0 0 auto;
            font-size: 11px;
            line-height: 1.4;
            padding: 2px 6px;
            border-radius: 999px;
            font-weight: 700;

            &.is-success {
                background: rgba(var(--v-theme-success), 0.16);
                color: rgb(var(--v-theme-success));
            }

            &.is-error {
                background: rgba(var(--v-theme-error), 0.16);
                color: rgb(var(--v-theme-error));
            }
        }

        .command-result__text {
            font-size: 12px;
            line-height: 1.5;
            opacity: 0.88;
        }

        .message-time {
            font-size: 11px;
            opacity: 0.6;
            font-weight: 400;
        }
    }

    .loading-message {
        display: flex;
        justify-content: flex-start;
        padding: 8px 0;
    }

    .typing-indicator {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 12px 16px;
        background: rgba(var(--v-theme-on-surface), 0.05);
        border-radius: 18px;
        border: 1px solid rgba(var(--v-theme-on-surface), 0.1);

        span {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--v-theme-primary);
            animation: typing 1.4s infinite;

            &:nth-child(2) {
                animation-delay: 0.2s;
            }

            &:nth-child(3) {
                animation-delay: 0.4s;
            }
        }
    }

    .drawer-footer {
        display: flex;
        gap: 8px;
        padding: 16px 24px;
        border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
        background: var(--v-theme-surface);
        flex-shrink: 0;
        align-items: flex-end;

        .input-field {
            flex: 1;

            :deep(.v-field__control) {
                font-size: 13px;
                letter-spacing: -0.1px;

                textarea {
                    padding: 8px 12px !important;
                    resize: none;
                }
            }

            :deep(.v-field) {
                border-radius: 12px;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                background: rgba(var(--v-theme-primary), 0.05) !important;

                &:hover {
                    background: rgba(var(--v-theme-primary), 0.08) !important;
                    box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.15);
                }

                &.v-field--focused {
                    background: rgba(var(--v-theme-primary), 0.08) !important;
                    box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.25);
                }
            }
        }

        .send-btn {
            align-self: flex-end;
            border-radius: 12px !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            background: var(--v-theme-primary) !important;
            color: white !important;

            &:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(var(--v-theme-primary), 0.4);
            }
        }
    }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes typing {

    0%,
    60%,
    100% {
        transform: translateY(0);
        opacity: 0.6;
    }

    30% {
        transform: translateY(-8px);
        opacity: 1;
    }
}

.message-list-enter-active,
.message-list-leave-active {
    transition: all 0.3s ease;
}

.message-list-enter-from {
    opacity: 0;
    transform: translateY(10px);
}

.message-list-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}
</style>
