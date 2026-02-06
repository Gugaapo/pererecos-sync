import { useCallback, useEffect, useRef } from 'react';
import type { SyncState } from '../types/index';
import type { ClientMessage } from '../types/messages';
import { loadYouTubeApi } from '../lib/youtube';

const DRIFT_THRESHOLD = 2.0;

interface UseVideoPlayerOptions {
  containerId: string;
  sync: SyncState;
  isHost: boolean;
  send: (msg: ClientMessage) => void;
}

export function useVideoPlayer({ containerId, sync, isHost, send }: UseVideoPlayerOptions) {
  const playerRef = useRef<YT.Player | null>(null);
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;
  const syncRef = useRef(sync);
  syncRef.current = sync;
  const suppressEvents = useRef(false);
  const currentYtId = useRef<string | null>(null);
  const syncReportInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const readyRef = useRef(false);

  // Load video when youtube_id changes
  useEffect(() => {
    if (!sync.youtube_id) {
      currentYtId.current = null;
      if (playerRef.current && readyRef.current) {
        playerRef.current.stopVideo();
      }
      return;
    }

    const init = async () => {
      await loadYouTubeApi();

      if (!playerRef.current) {
        playerRef.current = new window.YT.Player(containerId, {
          width: '100%',
          height: '100%',
          videoId: sync.youtube_id!,
          playerVars: {
            autoplay: 1,
            controls: isHostRef.current ? 1 : 0,
            modestbranding: 1,
            rel: 0,
            start: Math.floor(sync.timestamp),
          },
          events: {
            onReady: () => {
              readyRef.current = true;
              currentYtId.current = sync.youtube_id;
            },
            onStateChange: onPlayerStateChange,
          },
        });
      } else if (sync.youtube_id !== currentYtId.current) {
        suppressEvents.current = true;
        playerRef.current.loadVideoById(sync.youtube_id!, sync.timestamp);
        currentYtId.current = sync.youtube_id;
        setTimeout(() => { suppressEvents.current = false; }, 1000);
      }
    };

    init();
  }, [sync.youtube_id, containerId]);

  // Sync correction on each sync message
  useEffect(() => {
    if (!playerRef.current || !readyRef.current || !sync.youtube_id) return;

    const player = playerRef.current;
    const currentTime = player.getCurrentTime?.() ?? 0;
    const serverTime = sync.timestamp;
    const drift = Math.abs(currentTime - serverTime);

    if (drift > DRIFT_THRESHOLD) {
      suppressEvents.current = true;
      player.seekTo(serverTime, true);
      setTimeout(() => { suppressEvents.current = false; }, 500);
    }

    const playerState = player.getPlayerState?.();
    if (sync.is_playing && playerState !== YT.PlayerState.PLAYING && playerState !== YT.PlayerState.BUFFERING) {
      suppressEvents.current = true;
      player.playVideo();
      setTimeout(() => { suppressEvents.current = false; }, 500);
    } else if (!sync.is_playing && playerState === YT.PlayerState.PLAYING) {
      suppressEvents.current = true;
      player.pauseVideo();
      setTimeout(() => { suppressEvents.current = false; }, 500);
    }
  }, [sync.timestamp, sync.is_playing, sync.youtube_id]);

  const onPlayerStateChange = useCallback((event: YT.OnStateChangeEvent) => {
    if (suppressEvents.current || !isHostRef.current) return;

    const player = playerRef.current;
    if (!player) return;

    switch (event.data) {
      case YT.PlayerState.PLAYING:
        send({ type: 'play' });
        break;
      case YT.PlayerState.PAUSED:
        send({ type: 'pause', timestamp: player.getCurrentTime() });
        break;
      case YT.PlayerState.ENDED:
        send({ type: 'video_ended' });
        break;
    }
  }, [send]);

  // Sync report every 5s
  useEffect(() => {
    syncReportInterval.current = setInterval(() => {
      if (playerRef.current && readyRef.current && syncRef.current.youtube_id) {
        const state = playerRef.current.getPlayerState?.();
        send({
          type: 'sync_report',
          timestamp: playerRef.current.getCurrentTime?.() ?? 0,
          state: String(state),
        });
      }
    }, 5000);
    return () => clearInterval(syncReportInterval.current);
  }, [send]);

  // Update controls visibility when host status changes
  useEffect(() => {
    // YT IFrame API doesn't allow changing controls after creation,
    // but we handle this via the overlay approach
  }, [isHost]);

  // Cleanup
  useEffect(() => {
    return () => {
      readyRef.current = false;
      clearInterval(syncReportInterval.current);
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  const seekTo = useCallback((time: number) => {
    if (playerRef.current && readyRef.current) {
      playerRef.current.seekTo(time, true);
      send({ type: 'seek', timestamp: time });
    }
  }, [send]);

  return { seekTo, playerRef };
}
