<template>
    <v-card class="music_card">
        <!-- <img src="../../../assets/cover2.jpg" class="card_bg" /> -->
        <audio
            ref="audio"
            :key="music.url"
            preload="auto"
            id="audio"
            hidden
            :src="music.url"
            @loadedmetadata="onLoadedMetadata"
            @timeupdate="onTimeUpdate"
            @ended="onEnded"
        >
            <!-- <source type="audio/mpeg" />
            <source src="/sound/ngm.mp3" type="audio/mpeg" /> -->
        </audio>
        <div class="music_wrap pa-4">
            <div class="zjbg">
                <img :src="music.cover" class="zj_img" width="120" height="120" />
                <div
                    class="zj_y"
                    :class="{
                        zj_play: music.playing,
                    }"
                >
                    <img :src="music.cover" class="zj_cd_fm" width="72" height="72" />
                    <img src="../../../assets/cd-mine.png" class="zj_cd_bg" width="120" />
                </div>
            </div>
            <div class="slider pt-2">
                <div class="d-flex">
                    <div class="">
                        <div class="text-h6">Music Card</div>
                        <v-card-subtitle class="pl-0">{{ music.trackName }}</v-card-subtitle>
                    </div>
                    <div class="icon_group d-flex justify-space-around mt-2">
                        <v-btn variant="text" icon="mdi-skip-previous" />
                        <v-btn
                            v-if="music.playing"
                            variant="tonal"
                            :color="mainStore.settings.primary"
                            icon="mdi-pause"
                            size="large"
                            @click="onPlay"
                            style="font-size: 24px"
                        />
                        <v-btn
                            v-else
                            variant="tonal"
                            :color="mainStore.settings.primary"
                            icon="mdi-play-circle"
                            size="large"
                            @click="onPlay"
                            style="font-size: 24px"
                        />
                        <v-btn variant="text" icon="mdi-skip-next" />
                        <!-- <v-btn variant="text" icon="mdi-playlist-music-outline" /> -->
                    </div>
                </div>
                <v-slider
                    class="mt-4 ml-0"
                    :model-value="progress"
                    @update:model-value="onSeek"
                    :color="mainStore.settings.primary"
                    hide-details
                />
            </div>
        </div>
    </v-card>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useAppStore } from '@/stores/useAppStore';
import { useEnvironmentStore } from '@/stores/useEnvironmentStore';

const environmentStore = useEnvironmentStore();
const mainStore = useAppStore();
// music 只是“读取 store 当前音乐数据”的映射，本身不存独立状态，所以用 computed。
const music = computed(() => environmentStore.livingRoom.music);
// audio 是模板里的 <audio> DOM 引用，需要在运行时拿到真实元素，所以用 ref。
const audio = ref<HTMLAudioElement | null>(null);
// progress 会被播放进度和拖动条不断修改，它是组件内部可写状态，所以用 ref。
const progress = ref(0);

// 对音乐状态的写操作统一回到 store，避免去修改 computed 产生的派生值。
const syncMusicState = (payload: Partial<typeof environmentStore.livingRoom.music>) => {
    Object.assign(environmentStore.livingRoom.music, payload);
};

const syncPlayingState = (playing: boolean) => {
    syncMusicState({ playing });
};

const onPlay = async () => {
    if (!audio.value || !music.value.url) {
        return;
    }

    if (music.value.playing) {
        audio.value.pause();
        syncPlayingState(false);
        return;
    }

    try {
        await audio.value.play();
        syncPlayingState(true);
    } catch (error) {
        syncPlayingState(false);
        console.error('Failed to play audio:', error);
    }
};

const onLoadedMetadata = () => {
    // 音频元数据加载完成后，浏览器才能拿到真实时长。
    syncMusicState({ duration: audio.value?.duration || 0 });
};

const onTimeUpdate = () => {
    if (!audio.value || !music.value.duration) {
        progress.value = 0;
        return;
    }

    progress.value = (audio.value.currentTime / music.value.duration) * 100;
};

const onSeek = (value: number) => {
    progress.value = value;

    if (!audio.value || !music.value.duration) {
        return;
    }

    // slider 是 0-100，需要换算成音频当前时间。
    audio.value.currentTime = (value / 100) * music.value.duration;
};

const onEnded = () => {
    progress.value = 0;
    syncPlayingState(false);
};

onBeforeUnmount(() => {
    // 组件销毁前暂停音频，避免离开页面后还在播放。
    audio.value?.pause();
});

onMounted(async () => {
    // 先等后端音乐数据写入 store，再让 <audio> 重新加载最新的 url。
    await environmentStore.getMusic();
    progress.value = 0;
    syncPlayingState(false);

    if (!audio.value || !music.value.url) {
        return;
    }

    await nextTick();
    audio.value.load();
});
</script>
<style scoped lang="scss">
.music_card {
    overflow: hidden;
    position: relative;

    .card_bg {
        width: 100%;
        position: absolute;
        left: 0;
        top: 50%;
        transform: translate(0, -50%);
        z-index: -1;
        filter: blur(25px);
        // opacity: 0.6;
    }

    .bg {
        height: 100%;
        position: absolute;
        margin-left: 150px;
        transform: translate(-50%, 0);
        filter: blur(25px);
        // opacity: 0.6;
    }

    .music_wrap {
        position: relative;
        z-index: 2;
        display: flex;

        // color: #ffffff;
        .play_btn {
            background: rgba(255, 255, 255, 0.2);
        }

        .zjbg {
            position: relative;
            flex: 0 1 180px;
            transition: all 0.3s;

            .zj_img {
                position: relative;
                z-index: 3;
                border-radius: 4px;
            }

            .zj_y {
                position: absolute;
                right: 0;
                top: 0;
                animation-fill-mode: forwards;
                transition: all 0.2s;

                &::after {
                    content: '';
                    display: block;
                    width: 16px;
                    height: 16px;
                    background: #efefef;
                    border-radius: 50%;
                    position: absolute;
                    z-index: 2;
                    top: 50%;
                    left: 50%;
                    margin-left: -9px;
                    margin-top: -8px;
                    box-shadow: inset 1px 1px rgba(255, 255, 255, 0.2);
                }

                .zj_cd_fm {
                    border-radius: 50%;
                    position: absolute;
                    top: 24px;
                    left: 24px;
                    z-index: 2;
                }
            }

            .zj_y.zj_play {
                animation: zzzzz 5s linear infinite;

                @keyframes zzzzz {
                    0% {
                        transform: rotateZ(0deg);
                    }

                    100% {
                        transform: rotateZ(360deg);
                    }
                }
            }
        }

        // .zjbg.zj_play {
        //     // flex: 0 0 180px;
        // }
        .slider {
            flex: 1;
            margin-left: 16px;
        }

        .icon_group {
            margin-left: auto;
            flex: 0 0 170px;
        }
    }
}
</style>
