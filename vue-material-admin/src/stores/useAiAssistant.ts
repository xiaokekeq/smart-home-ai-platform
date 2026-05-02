import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ApiAi, type AiCommand, type AiCommandResult, type AiRequestMessage } from '@/api/ai';
import { useDashboardStore } from './useDashboard';

type ChatRole = AiRequestMessage['role'];
const STREAM_INTERRUPTED_SUFFIX = '\n\n[回复中断，请稍后重试]';

interface UiMessageBase {
    id: string;
    role: ChatRole;
    content: string;
    timestamp: number;
}

export interface UserMessage extends UiMessageBase {
    role: 'user';
}

export interface AssistantMessage extends UiMessageBase {
    role: 'assistant';
    streaming?: boolean;
    commands?: AiCommand[];
    commandResults?: AiCommandResult[];
}

export type AiMessage = UserMessage | AssistantMessage;

interface AddMessageOptions {
    id?: string;
    timestamp?: number;
    streaming?: boolean;
    commands?: AiCommand[];
    commandResults?: AiCommandResult[];
}

type AiMessagePatch = Partial<Pick<UiMessageBase, 'content' | 'timestamp'>> &
    Partial<Pick<AssistantMessage, 'streaming' | 'commands' | 'commandResults'>>;

const appendInterruptedSuffixOnce = (content: string) => {
    if (!content || content.endsWith(STREAM_INTERRUPTED_SUFFIX)) {
        return content;
    }

    return `${content}${STREAM_INTERRUPTED_SUFFIX}`;
};

export const useAiAssistant = defineStore('aiAssistant', () => {
    const isOpen = ref(false);
    const messages = ref<AiMessage[]>([]);
    const loading = ref(false);
    const input = ref('');

    const openDrawer = () => {
        isOpen.value = true;
    };

    const closeDrawer = () => {
        isOpen.value = false;
    };

    const generateMessageId = () => {
        // Prefer the browser's native UUID generator when available so each chat message gets a stable unique id.
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }

        return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    };

    const addMessage = (role: ChatRole, content: string, options: AddMessageOptions = {}) => {
        const messageBase: UiMessageBase = {
            id: options.id || generateMessageId(),
            role,
            content,
            timestamp: options.timestamp ?? Date.now(),
        };
        const nextMessage: AiMessage =
            role === 'assistant'
                ? {
                    ...messageBase,
                    role: 'assistant',
                    streaming: options.streaming ?? false,
                    commands: options.commands,
                    commandResults: options.commandResults,
                }
                : {
                    ...messageBase,
                    role: 'user',
                };

        messages.value.push(nextMessage);
        return nextMessage.id;
    };

    const updateMessage = (id: string, patch: AiMessagePatch) => {
        // Streaming mode keeps mutating the same assistant bubble instead of creating many small messages.
        const target = messages.value.find((item) => item.id === id);
        if (!target) return;
        Object.assign(target, patch);
    };

    const appendToMessage = (id: string, chunk: string) => {
        // Each SSE chunk is appended onto the current assistant message content.
        const target = messages.value.find((item) => item.id === id);
        if (!target) return;
        target.content += chunk;
    };

    const clearMessages = () => {
        messages.value = [];
        input.value = '';
    };

    const buildHistoryPayload = () => {
        // The backend only needs role/content; local-only fields such as id/timestamp stay in the UI layer.
        return messages.value.map(({ role, content }) => ({ role, content }));
    };

    const askAi = async (question: string) => {
        if (!question.trim() || loading.value) return;

        const dashboardStore = useDashboardStore();
        const trimmedQuestion = question.trim();

        addMessage('user', trimmedQuestion);
        input.value = '';
        loading.value = true;

        const requestMessages = buildHistoryPayload();
        // Insert an empty assistant message first; incoming stream chunks append into this same bubble.
        const assistantMessageId = addMessage('assistant', '', { streaming: true });

        try {
            await ApiAi.streamAssistant(
                { messages: requestMessages },
                {
                    onStart: () => {
                        // Mark the placeholder assistant message as actively streaming once the backend confirms the SSE session started.
                        updateMessage(assistantMessageId, {
                            streaming: true,
                            commands: [],
                            commandResults: [],
                        });
                    },
                    onChunk: (chunk) => {
                        appendToMessage(assistantMessageId, chunk);
                    },
                    onDone: async (data) => {
                        // Close the streaming state and refresh dashboard data after AI-side actions complete.
                        const currentContent =
                            messages.value.find((item) => item.id === assistantMessageId)
                                ?.content || '';
                        updateMessage(assistantMessageId, {
                            content: data.message || currentContent,
                            streaming: false,
                            commands: data.commands,
                            commandResults: data.commandResults,
                        });
                        await dashboardStore.getDashboard();
                    },
                    onError: (message) => {
                        // Keep any partial text that already streamed in, and append an interruption hint instead of silently stopping.
                        const target = messages.value.find((item) => item.id === assistantMessageId);
                        if (target) {
                            updateMessage(assistantMessageId, {
                                content: target.content
                                    ? appendInterruptedSuffixOnce(target.content)
                                    : message || '抱歉，AI 助手暂时无法回答，请稍后重试。',
                            });
                        }
                        updateMessage(assistantMessageId, { streaming: false });
                    },
                }
            );
        } catch (error) {
            console.error('AI 助手流式调用失败:', error);
            const fallbackMessage = '抱歉，AI 助手暂时无法回答，请稍后重试。';
            const target = messages.value.find((item) => item.id === assistantMessageId);

            if (target) {
                updateMessage(assistantMessageId, {
                    content: target.content
                        ? appendInterruptedSuffixOnce(target.content)
                        : fallbackMessage,
                    streaming: false,
                });
            }
        } finally {
            loading.value = false;
        }
    };

    return {
        isOpen,
        messages,
        loading,
        input,
        openDrawer,
        closeDrawer,
        addMessage,
        clearMessages,
        askAi,
    };
});
