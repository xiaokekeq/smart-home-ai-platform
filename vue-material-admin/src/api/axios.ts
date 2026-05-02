import Axios from 'axios';
import router from '@/router';
import type {
    AxiosResponse,
    AxiosRequestConfig,
    AxiosError,
    AxiosPromise,
    InternalAxiosRequestConfig,
    AxiosInstance,
} from 'axios';
// 全局消息提示 store，请求失败时会用它统一弹出错误提示。
import { useSnackbarStore } from '@/stores/useSnackbarStore';

// 扩展 axios 的请求配置类型，允许自定义 loading / banErrTip 这类字段。
declare module 'axios' {
    export interface AxiosRequestConfig {
        loading?: boolean;
        banErrTip?: boolean;
    }
}

/**
 * @returns  {AxiosResponse} result
 * @tutorial see more:https://github.com/onlyling/some-demo/tree/master/typescript-width-axios
 */
// // 创建统一请求实例，baseURL 来自 .env 里的 VITE_API。
// const request = Axios.create({
//     baseURL: import.meta.env.VITE_API,
//     // baseURL: 'https://apifoxmock.com/m1/5061937-4723200-default',
//     // baseURL: 'http://localhost:8085',
//     timeout: 20000,
// });

// /**
//  * @description 请求发起前的拦截器
//  * @returns {AxiosRequestConfig} config
//  */
// // 请求拦截器：请求发出前统一把 token 挂到 Authorization 请求头里。
// request.interceptors.request.use((config: InternalAxiosRequestConfig<AxiosRequestConfig>) => {
//     const token = localStorage.getItem('accessToken');
//     config.headers.Authorization = token || '';
//     return config;
// });

// /**
//  * @description 响应收到后的拦截器
//  */
// request.interceptors.response.use(
//     /** 请求有响应 */
//     (response: AxiosResponse) => {
//         // console.log(response.data);
//         return Promise.resolve(response.data);
//     },
//     /** 请求无响应 */
//     async (error: AxiosError<RootInterface<void>>): Promise<AxiosPromise> => {
//         // 拿到全局消息提示 store，用于展示错误信息。
//         const snackbarEvent = useSnackbarStore();
//         if (error.response?.data?.message) {
//             // 优先显示后端返回的 message。
//             snackbarEvent.addItem(error.response?.data?.message);
//         } else {
//             // 否则退回显示 axios 自带错误信息。
//             snackbarEvent.addItem(error.message);
//         }
//         if (error.response?.status === 401) {
//             // 401 一般表示 token 失效，跳回登录页。
//             router.push('/login');
//         }
//         return Promise.reject(error);
//     }
// );

// export default request;

// 创建统一请求实例，baseURL 来自 .env 里的 VITE_API。
// 统一约定的接口返回结构。
function applyInterceptors(instance: AxiosInstance): void {
    instance.interceptors.request.use((config: InternalAxiosRequestConfig<AxiosRequestConfig>) => {
        const token = localStorage.getItem('accessToken');
        config.headers.Authorization = token || '';
        return config;
    });

    instance.interceptors.response.use(
        (response: AxiosResponse) => {
            const apiData = response.data;
            if (apiData.code && apiData.code !== 200) {
                const snackbarEvent = useSnackbarStore();
                snackbarEvent.addItem(apiData.message || '业务请求处理失败');
                return Promise.reject(new Error(apiData.message || 'Error'));
            }
            return Promise.resolve(apiData);
        },
        async (error: AxiosError<RootInterface<void>>): Promise<AxiosPromise> => {
            // 拿到全局消息提示 store，用于展示错误信息。
            const snackbarEvent = useSnackbarStore();
            if (error.response?.data?.message) {
                // 优先显示后端返回的 message。
                snackbarEvent.addItem(error.response?.data?.message);
            } else {
                // 否则退回显示 axios 自带错误信息。
                snackbarEvent.addItem(error.message);
            }
            if (error.response?.status === 401) {
                // 401 一般表示 token 失效，跳回登录页。
                router.push('/login');
            }
            return Promise.reject(error);
        }
    );
}

function createRequest(baseURL: string): AxiosInstance {
    const instance = Axios.create({
        baseURL,
        timeout: 20000,
    });
    applyInterceptors(instance);
    return instance;
}

export const request = createRequest(import.meta.env.VITE_API);

export const aiRequest = createRequest(import.meta.env.VITE_API_AI_BACKEND);

export const createPrefixedAiRequest = (prefix: string) => {
    return createRequest(import.meta.env.VITE_API_AI_BACKEND + prefix);
};
export interface RootInterface<T> {
    code: number;
    message: string;
    data: T;
    originUrl: string;
}

// 列表分页结构。
export interface ArrayResult<T> {
    pageData: T[];
    total: number;
}
