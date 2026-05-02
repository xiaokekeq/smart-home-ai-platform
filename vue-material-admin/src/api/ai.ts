import { createPrefixedAiRequest } from './axios';
import type { RootInterface } from './axios';
import type { AxiosRequestConfig } from 'axios';

/**
 * 这个文件同时负责两类 AI 接口：
 * 1. 普通 HTTP 请求，例如 `/chat`、`/suggestion`、`/music`
 * 2. 流式 HTTP 请求 `/chat/stream`
 *
 * 其中最值得重点理解的是 `streamAssistant`。
 * 它不是“等后端把完整 JSON 一次性返回”，
 * 而是“持续读取后端返回的文本流”，边收到边处理。
 *
 * 当前项目使用的是 SSE（Server-Sent Events，服务器推送事件）格式，
 * 但前端没有使用浏览器原生的 EventSource，而是使用：
 * - axios 发起请求（底层走 fetch adapter）
 * - response.body.getReader() 持续读流
 * - 手动解析 SSE 的 event/data 文本块
 *
 * 原因是这里的接口需要：
 * - POST
 * - Authorization 请求头
 * - JSON body
 *
 * 原生 EventSource 更适合简单的 GET 场景；
 * 这里为了兼容现有接口设计，选择了 axios + 手动解析 SSE。
 */

export interface AiRequestMessage {
    // 消息角色，和后端以及大模型消息格式保持一致
    role: 'user' | 'assistant';
    // 消息文本内容
    content: string;
}

export interface AskAssistantRequest {
    // 把完整对话历史发给后端，后端据此继续多轮对话
    messages: AiRequestMessage[];
}

export type AiCommandParams = Record<string, unknown>;

export interface AiCommandBase {
    // 指令动作，例如 turn_on / set_temp / activate_scene
    action: string;
    // 指令意图分类，例如 device_control / scene_mode
    intent: string;
    // 指令参数，例如 { temp: 24 }
    params: AiCommandParams;
    // 指令作用目标，例如 living_room_ac
    target: string;
}

export interface AiCommand extends AiCommandBase {}

export interface AiCommandResult extends AiCommandBase {
    // 是否执行成功
    success: boolean;
    // 后端返回的执行结果说明
    message: string;
}

export interface AskAssistantResponseData {
    // 展示给用户看的 markdown 回复文本
    message: string;
    // AI 解析出的结构化命令
    commands: AiCommand[];
    // 每条命令的实际执行结果
    commandResults: AiCommandResult[];
}

export interface AiSuggestionResponseData {
    title: string;
    desc: string;
    actionText: string;
    actionType: 'openHomeAc' | 'closeCurtain' | 'openCarAc' | 'chargeCar' | 'none';
}

export interface AiPlayMusic {
    playing: boolean;
    trackName: string;
    artist: string;
    volume: number;
    cover: string;
}

export interface StreamAssistantDoneData {
    // 流式输出结束时，后端会把完整 markdown message 再发一次
    message: string;
    // 同时带回这次 AI 执行过的命令列表
    commands: AiCommand[];
    // 同时带回这次 AI 执行命令后的结果列表
    commandResults: AiCommandResult[];
}

export interface StreamAssistantCallbacks {
    // 收到 start 事件时触发
    onStart?: () => void | Promise<void>;
    // 收到 chunk 事件时触发，调用方通常把文本增量拼到当前消息上
    onChunk?: (chunk: string) => void | Promise<void>;
    // 收到 done 事件时触发
    onDone?: (data: StreamAssistantDoneData) => void | Promise<void>;
    // HTTP 错误或 SSE error 事件时触发
    onError?: (message: string) => void | Promise<void>;
    // 允许调用方主动中断请求
    signal?: AbortSignal;
}

const aiRequest = createPrefixedAiRequest('/ai');

/**
 * 把一个完整的 SSE 事件块解析成结构化对象。
 *
 * 一个典型的 SSE block 长这样：
 * event: chunk
 * data: {"delta":"你好"}
 *
 * 两个 block 之间会用空行分隔，也就是 `\n\n`。
 *
 * 这里先把每一行拆出来，再识别：
 * - `event:` 行表示事件名
 * - `data:` 行表示负载
 *
 * 注意：SSE 允许一个事件里出现多行 data，
 * 所以这里用数组收集，再用换行拼回去。
 */
const parseSseBlock = (block: string) => {
    // 如果后端没有写 event，SSE 可以认为默认事件名是 message
    let event = 'message';
    const dataLines: string[] = [];

    block.split('\n').forEach((line) => {
        if (line.startsWith('event:')) {
            event = line.slice('event:'.length).trim();
            return;
        }

        if (line.startsWith('data:')) {
            dataLines.push(line.slice('data:'.length).trimStart());
        }
    });

    // 没有 data 的 block 说明不是一个有效业务事件，直接忽略
    if (!dataLines.length) return null;

    return {
        event,
        // 多行 data 重新拼回成一个字符串
        data: dataLines.join('\n'),
    };
};

const createStreamRequestConfig = (
    data: AskAssistantRequest,
    signal?: AbortSignal
): AxiosRequestConfig<AskAssistantRequest> => ({
    url: `/chat/stream`,
    method: 'post',
    data,
    signal,
    adapter: 'fetch',
    responseType: 'stream',
    headers: {
        Accept: 'text/event-stream',
    },
});

export const ApiAi = {
    // 非流式接口：一次请求，直接拿到完整响应
    askAssistant: (data: AskAssistantRequest): Promise<RootInterface<AskAssistantResponseData>> => {
        return aiRequest({
            url: `/chat`,
            method: 'post',
            data,
        });
    },

    /**
     * 流式接口：持续读取后端返回的 SSE 文本流。
     *
     * 整个过程可以理解成下面几步：
     * 1. 用 axios 发起 POST 请求（底层走 fetch adapter）
     * 2. 拿到 ReadableStream
     * 3. 从 ReadableStream 中逐块读取字节流
     * 4. 用 TextDecoder 把字节流解码成字符串
     * 5. 用 buffer 拼接“上次没读完整”的半截事件
     * 6. 按 `\n\n` 切出一个个完整 SSE block
     * 7. 解析每个 block 的 event/data
     * 8. 根据事件名分别调用 onStart / onChunk / onDone / onError
     */
    streamAssistant: async (
        data: AskAssistantRequest,
        callbacks: StreamAssistantCallbacks = {}
    ) => {
        const responseStream = await aiRequest.request<
            ReadableStream<Uint8Array>,
            ReadableStream<Uint8Array>,
            AskAssistantRequest
        >(createStreamRequestConfig(data, callbacks.signal));

        // 判断后端有没有响应异常
        if (!responseStream) {
            const message = 'Streaming response body is empty';
            await callbacks.onError?.(message);
            throw new Error(message);
        }

        // getReader() 返回读取器，后面通过 reader.read() 一块一块读数据
        const reader = responseStream.getReader();

        /**
         * reader.read() 读出来的 value 不是字符串，而是 Uint8Array 字节数组。
         * SSE 本质上传的是文本，所以要先把字节流解码成字符串。
         */
        const decoder = new TextDecoder('utf-8');

        /**
         * buffer 用来缓存“不完整的半截事件块”。
         *
         * 这是流式编程里很关键的一点：
         * 网络返回的 chunk 边界，不等于业务事件边界。
         *
         * 举个例子，一个完整 SSE block 可能是：
         * event: chunk
         * data: {"delta":"你好"}
         *
         * 但一次 reader.read() 拿到的内容，可能只有前半截：
         * event: chunk
         * data: {"de
         *
         * 如果你这时直接 JSON.parse，一定会报错。
         * 所以必须先把半截内容留在 buffer 里，等下一次读到后续内容再拼完整。
         */
        let buffer = '';

        while (true) {
            // done = true 表示流已经结束，后端没有更多内容了
            const { done, value } = await reader.read();
            if (done) break;

            /**
             * decode(value, { stream: true }) 有两个作用：
             * 1. 把 Uint8Array 解码成字符串
             * 2. 告诉解码器“这是连续流”，避免多字节字符被拆开时出现乱码
             *
             * replace(/\r\n/g, '\n') 是为了统一换行格式，
             * 方便后面稳定地按 `\n\n` 识别一个 SSE block 的结束位置。
             */
            buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

            /**
             * SSE 协议里，一个事件块和下一个事件块之间用空行分隔，
             * 所以这里可以按 `\n\n` 把当前 buffer 拆成若干 block。
             */
            const blocks = buffer.split('\n\n');

            /**
             * 最后一个元素可能还是半截，不一定完整。
             * 所以先把它拿出来放回 buffer，留给下一轮继续拼接。
             */
            buffer = blocks.pop() || '';

            for (const block of blocks) {
                // 把原始文本块解析成 { event, data }
                const parsed = parseSseBlock(block);
                if (!parsed) continue;

                // 当前后端约定 data 一律是 JSON 字符串，所以这里直接 parse
                const payload = JSON.parse(parsed.data);

                /**
                 * 当前项目后端会发四种事件：
                 * - start: 流开始
                 * - chunk: 一小段增量文本
                 * - done: 流正常结束，携带完整 message 和 commands
                 * - error: 后端通过 SSE 主动发送错误
                 *
                 * 它们分别对应后端 ai.py 里的同名事件。
                 */
                if (parsed.event === 'start') {
                    await callbacks.onStart?.();
                    continue;
                }

                if (parsed.event === 'chunk') {
                    // 增量文本当前放在 payload.delta 里
                    await callbacks.onChunk?.(payload.delta || '');
                    continue;
                }

                if (parsed.event === 'done') {
                    // done 表示本次流式会话已经完整结束，直接返回最终数据
                    await callbacks.onDone?.(payload);
                    return payload;
                }

                if (parsed.event === 'error') {
                    // 这是 SSE 层面的业务错误，不是 HTTP 层状态码错误
                    const message = payload.message || 'AI stream failed';
                    await callbacks.onError?.(message);
                    throw new Error(message);
                }
            }
        }

        /**
         * 理论上正常结束时，后端应该会明确发送 done 事件。
         * 这里的 fallback 是一个防御性兜底：
         * 如果流结束了但没有收到 done，仍然返回一个稳定结构，避免调用方拿到 undefined。
         */
        const fallback = { message: '', commands: [], commandResults: [] } as StreamAssistantDoneData;
        await callbacks.onDone?.(fallback);
        return fallback;
    },

    // 首页 AI 建议卡片
    getAiSuggestion: (): Promise<RootInterface<AiSuggestionResponseData>> => {
        return aiRequest({
            url: `/suggestion`,
            method: 'get',
        });
    },

    // 音乐推荐接口
    getMusicRecommendation: (): Promise<RootInterface<AiPlayMusic>> => {
        return aiRequest({
            url: `/music`,
            method: 'get',
        });
    },
};
